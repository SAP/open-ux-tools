import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type BrowserContext, type Page } from 'playwright-core';
import { isCFEnvironment } from '@sap-ux/adp-tooling';
import { logger } from '../../../utils/logger.js';

// Session state shared across the browser bridge.
//   `siteMeta` — site origin → { projectKey, isCf }. Rewritten by every `start`
//      (via registerSite), so the project currently running on a reused port
//      always wins; a previous project's metadata can never be served to a new
//      one. It is the bridge from "I only have `site` here" (deeper context-build
//      code) to "which project is this, and is it CF".
//   `sessionByProject` — projectKey (the adaptation project's appPath) → saved
//      login state { authOrigin?, storageState? }. Keyed by PROJECT, not by port,
//      so two projects sharing a port (one stopped, the next started) never
//      cross-contaminate cookies. `storageState` survives `disconnectSite` so an
//      authenticated login is reused across re-`start` of the SAME project.
//      ABAP projects are never stored here (see the isCf hard-skip below).
const siteMeta: Map<string, SiteMeta> = new Map();
const sessionByProject: Map<string, SessionState> = new Map();

/** In-memory Playwright storage state (shape returned by `context.storageState()`). */
export type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

/**
 * Per-origin metadata recorded by `start`: which project owns the current page
 * on this site, and whether it is a Cloud Foundry project (ABAP projects skip
 * all session seeding/snapshotting).
 */
interface SiteMeta {
    projectKey: string;
    isCf: boolean;
}

/**
 * Per-project session state. Populated when an authenticated context is
 * snapshotted for a CF project.
 */
interface SessionState {
    storageState?: StorageState;
}

/**
 * Records, for a site, which adaptation project is being started on it and
 * whether that project is Cloud Foundry. Called by `start` before the first
 * context is built. Overwrites any metadata a previous project left on this
 * site (e.g. after stop→start on a reused port), so the current project always
 * wins. `appPath` is the project's root; it doubles as the session key.
 *
 * @param site Editor URL being started.
 * @param appPath Adaptation project root (identity + session key).
 */
export async function registerSite(site: string, appPath: string): Promise<void> {
    let isCf = false;
    try {
        isCf = await isCFEnvironment(appPath);
    } catch (error) {
        logger.warn(
            `Could not determine CF environment for '${appPath}': ${error instanceof Error ? error.message : String(error)}`
        );
    }
    siteMeta.set(originKey(site), { projectKey: appPath, isCf });
}

/**
 * Removes the recorded metadata for a site (on disconnect). The project's saved
 * session in `sessionByProject` is intentionally kept so a later re-`start` of
 * the same project can reuse its login.
 *
 * @param site Editor URL being disconnected.
 */
export function forgetSite(site: string): void {
    siteMeta.delete(originKey(site));
}

/** Bounded probe for the webclient bridge: generous for a valid app, far below the 60 s action timeout. */
const BRIDGE_PROBE_MS = 8000;

/** Markers that positively identify a backend login / IdP page (CF XSUAA, SAML reentrance, generic logon). */
const LOGIN_PAGE_MARKERS =
    /saml2|oauth\/authorize|xsuaa|\/login|sap-ui-login|j_security_check|identity provider|sign in|logon/i;

/** Guidance returned to the AI/skill when a backend login page is detected. */
export const LOGIN_REQUIRED_MESSAGE =
    'The editor URL redirected to a backend login page (e.g. Cloud Foundry XSUAA or ABAP reentrance). ' +
    'Complete the login once in the opened (headed) browser, then call the "start" step again. ' +
    'Set PLAYWRIGHT_SESSION_STATE_PATH to a directory to reuse the session across restarts (incl. headless).';

/**
 * Clears all in-memory session state. Called when the browser disconnects or
 * is stopped, so a fresh process state is rebuilt on the next launch.
 */
export function clearSessions(): void {
    siteMeta.clear();
    sessionByProject.clear();
}

/**
 * Reads a boolean-ish environment value. Treats `"true"`/`"1"` as true.
 *
 * @param value Raw environment variable value.
 * @returns `true` when the value opts in.
 */
function truthyEnv(value: string | undefined): boolean {
    return value === 'true' || value === '1';
}

/**
 * Whether the browser should launch headless. Default is headed (`false`),
 * matching the pre-existing behaviour; `PLAYWRIGHT_HEADLESS=true|1` opts in.
 *
 * @returns `true` when headless mode is requested.
 */
export function isHeadless(): boolean {
    return truthyEnv(process.env.PLAYWRIGHT_HEADLESS);
}

/**
 * Optional directory for cross-restart session persistence. When set, each
 * origin's storage state is also written to / read from a file in this
 * directory. Unset ⇒ in-memory only (no disk footprint).
 *
 * @returns The configured directory, or `undefined`.
 */
function sessionDir(): string | undefined {
    const dir = process.env.PLAYWRIGHT_SESSION_STATE_PATH;
    return dir && dir.length > 0 ? dir : undefined;
}

/**
 * Normalises a URL to its origin (scheme + host + port). Returns the raw input
 * when it cannot be parsed, so callers always get a usable map key.
 *
 * @param url URL or origin string.
 * @returns The origin, or the input unchanged if unparseable.
 */
export function originKey(url: string): string {
    try {
        return new URL(url).origin;
    } catch {
        return url;
    }
}

/**
 * Resolves the session key (project identity) for a site from the metadata
 * `start` recorded, or `undefined` when the site is unknown or not a CF project.
 * Session seeding/snapshotting only applies to CF projects, so a missing or
 * non-CF entry means "no session handling" (the ABAP hard-skip).
 *
 * @param site Editor URL.
 * @returns The project key for a CF site, else `undefined`.
 */
function cfProjectKey(site: string): string | undefined {
    const meta = siteMeta.get(originKey(site));
    return meta?.isCf ? meta.projectKey : undefined;
}

/**
 * Maps a session key to a filesystem-safe file name for on-disk persistence.
 *
 * @param key Session key (a project path).
 * @returns A sanitised `<key>.json` file name.
 */
function sessionFileName(key: string): string {
    return `${key.replace(/[^a-zA-Z0-9.-]+/g, '_')}.json`;
}

/**
 * Builds the `newContext` options for a site, seeding storage state from the
 * project's prior authenticated session when available. Only CF projects are
 * ever seeded: an ABAP project (or an unregistered site) always gets a plain
 * context. The session is keyed by project, so a different project reusing the
 * same port is never seeded from the previous project's cookies.
 *
 * @param site Editor URL.
 * @returns Context options with an optional `storageState` seed.
 */
export function buildContextOptions(site: string): { viewport: null; storageState?: StorageState | string } {
    const projectKey = cfProjectKey(site);
    if (!projectKey) {
        return { viewport: null };
    }
    const inMemory = sessionByProject.get(projectKey)?.storageState;
    if (inMemory) {
        return { viewport: null, storageState: inMemory };
    }
    const dir = sessionDir();
    if (dir) {
        // Playwright accepts a path and silently starts fresh if it is unreadable,
        // but guard the join so a bad key can never seed from an unexpected path.
        return { viewport: null, storageState: join(dir, sessionFileName(projectKey)) };
    }
    return { viewport: null };
}

/**
 * Snapshots an authenticated context's storage state under its project key —
 * always in memory, and additionally to disk when `PLAYWRIGHT_SESSION_STATE_PATH`
 * is set. Only CF projects are snapshotted; an ABAP (or unregistered) site is a
 * no-op. All failures are logged and swallowed so a `start` never fails because
 * of persistence.
 *
 * @param site Editor URL (used to resolve the project key and the CF gate).
 * @param context The live, authenticated browser context.
 */
export async function persistSessionState(site: string, context: BrowserContext): Promise<void> {
    const projectKey = cfProjectKey(site);
    if (!projectKey) {
        return;
    }
    try {
        const state = await context.storageState();
        const existing = sessionByProject.get(projectKey) ?? {};
        sessionByProject.set(projectKey, { ...existing, storageState: state });
        const dir = sessionDir();
        if (dir) {
            // The state holds live session cookies (credential material). Write it
            // ourselves with restrictive modes — owner-only dir (0o700) and file
            // (0o600) — rather than Playwright's default world-readable write. The
            // explicit chmod also tightens an already-existing file (writeFile's
            // mode only applies on create).
            await mkdir(dir, { recursive: true, mode: 0o700 });
            const file = join(dir, sessionFileName(projectKey));
            await writeFile(file, JSON.stringify(state), { mode: 0o600 });
            await chmod(file, 0o600);
        }
    } catch (error) {
        logger.warn(`Failed to persist RTA session state: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Probes once (bounded) for the Joule webclient bridge on the page. Resolves
 * `true` when the bridge appears within {@link BRIDGE_PROBE_MS}, `false` on
 * timeout — without throwing.
 *
 * @param page The page just navigated to the editor URL.
 * @returns `true` if the webclient bridge is present.
 */
export async function probeBridge(page: Page): Promise<boolean> {
    return page
        .waitForFunction(
            () =>
                !!(
                    window as unknown as {
                        sapdas?: { webclientBridge?: { getFrontendActions?: () => unknown } };
                    }
                ).sapdas?.webclientBridge?.getFrontendActions,
            undefined,
            { timeout: BRIDGE_PROBE_MS }
        )
        .then(() => true)
        .catch(() => false);
}

/**
 * Positively identifies a backend login / IdP page. Returns `true` only on a
 * concrete signal — the page navigated off the loopback interface (the editor
 * binds to localhost, so an off-loopback origin is an IdP redirect), or a known
 * login/SAML/OAuth marker appears in the URL, title, or body. Never classifies
 * on bridge-absence alone, so a slow-but-valid app is not mislabelled.
 *
 * @param url Current page URL (post-redirect).
 * @param title Current page title.
 * @param bodyText A bounded slice of the page body text.
 * @returns `true` when the page is a backend login page.
 */
export function isBackendLoginPage(url: string, title: string, bodyText: string): boolean {
    let host: string;
    try {
        host = new URL(url).hostname;
    } catch {
        return false;
    }
    const offLoopback = host !== 'localhost' && host !== '127.0.0.1';
    const markerHit =
        LOGIN_PAGE_MARKERS.test(url) || LOGIN_PAGE_MARKERS.test(title) || LOGIN_PAGE_MARKERS.test(bodyText);
    return offLoopback || markerHit;
}
