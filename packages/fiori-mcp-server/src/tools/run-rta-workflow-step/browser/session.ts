import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type BrowserContext, type Page } from 'playwright-core';
import { logger } from '../../../utils/logger.js';

// Session state shared across the browser bridge.
//   `sessionStateByKey` — resolved session key → in-memory Playwright storage
//      state (cookies/localStorage). Survives `disconnectSite` so an
//      authenticated login is reused across re-`start` within the process.
//   `backendBySiteOrigin` — site origin → backend origin, learned the first
//      time a `start` observes an off-loopback (IdP/approuter) redirect.
//      Membership also gates session reuse: only sites that redirect (CF
//      XSUAA / ABAP reentrance) are ever snapshotted — a plain localhost ABAP
//      app never is, so its behaviour is unchanged.
const sessionStateByKey: Map<string, StorageState> = new Map();
const backendBySiteOrigin: Map<string, string> = new Map();

/** In-memory Playwright storage state (shape returned by `context.storageState()`). */
export type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

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
    sessionStateByKey.clear();
    backendBySiteOrigin.clear();
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
 * backend's storage state is also written to / read from a file in this
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
function originKey(url: string): string {
    try {
        return new URL(url).origin;
    } catch {
        return url;
    }
}

/**
 * Resolves the session key for a site: the learned backend origin when a
 * redirect has been observed, otherwise the site's own origin.
 *
 * @param site Editor URL.
 * @returns The session key under which storage state is stored/looked up.
 */
function resolveSessionKey(site: string): string {
    const siteOrigin = originKey(site);
    return backendBySiteOrigin.get(siteOrigin) ?? siteOrigin;
}

/**
 * Whether the site has been observed to redirect to a backend.
 *
 * @param site Editor URL.
 * @returns `true` when the site has been observed to redirect to a backend.
 */
function isRedirectingSite(site: string): boolean {
    return backendBySiteOrigin.has(originKey(site));
}

/**
 * Maps a session key to a filesystem-safe file name for on-disk persistence.
 *
 * @param key Session key (an origin).
 * @returns A sanitised `<key>.json` file name.
 */
function sessionFileName(key: string): string {
    return `${key.replace(/[^a-zA-Z0-9.-]+/g, '_')}.json`;
}

/**
 * Builds the `newContext` options for a site, seeding storage state from a
 * prior authenticated session when one is armed and available. Seeding is
 * gated on {@link isRedirectingSite}, so non-redirecting (ABAP) sites always
 * get a plain context — unchanged behaviour.
 *
 * @param site Editor URL.
 * @returns Context options with an optional `storageState` seed.
 */
export function buildContextOptions(site: string): { viewport: null; storageState?: StorageState | string } {
    if (!isRedirectingSite(site)) {
        return { viewport: null };
    }
    const key = resolveSessionKey(site);
    const inMemory = sessionStateByKey.get(key);
    if (inMemory) {
        return { viewport: null, storageState: inMemory };
    }
    const dir = sessionDir();
    if (dir) {
        // Playwright accepts a path and silently starts fresh if it is unreadable,
        // but guard the join so a bad key can never seed from an unexpected path.
        return { viewport: null, storageState: join(dir, sessionFileName(key)) };
    }
    return { viewport: null };
}

/**
 * Snapshots an authenticated context's storage state under its session key —
 * always in memory, and additionally to disk when `PLAYWRIGHT_SESSION_STATE_PATH`
 * is set. Gated on {@link isRedirectingSite}: a non-redirecting site is never
 * snapshotted. All failures are logged and swallowed so a `start` never fails
 * because of persistence.
 *
 * @param site Editor URL (used to resolve the session key and the gate).
 * @param context The live, authenticated browser context.
 */
export async function persistSessionState(site: string, context: BrowserContext): Promise<void> {
    if (!isRedirectingSite(site)) {
        return;
    }
    const key = resolveSessionKey(site);
    try {
        const state = await context.storageState();
        sessionStateByKey.set(key, state);
        const dir = sessionDir();
        if (dir) {
            // The state holds live session cookies (credential material). Write it
            // ourselves with restrictive modes — owner-only dir (0o700) and file
            // (0o600) — rather than Playwright's default world-readable write. The
            // explicit chmod also tightens an already-existing file (writeFile's
            // mode only applies on create).
            await mkdir(dir, { recursive: true, mode: 0o700 });
            const file = join(dir, sessionFileName(key));
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

/**
 * Records a `siteOrigin → backendOrigin` mapping when the page landed on an
 * off-loopback origin, arming session reuse for that site on the next `start`.
 *
 * @param site Original editor URL requested.
 * @param landedUrl The URL the page actually landed on after redirects.
 */
export function recordBackendOrigin(site: string, landedUrl: string): void {
    const siteOrigin = originKey(site);
    const landedOrigin = originKey(landedUrl);
    let landedHost: string;
    try {
        landedHost = new URL(landedUrl).hostname;
    } catch {
        return;
    }
    const offLoopback = landedHost !== 'localhost' && landedHost !== '127.0.0.1';
    // Prefer the first off-loopback origin seen (approuter/backend host) and do
    // not overwrite it with a later hop (e.g. the final IdP), to avoid merging
    // two different backends that share one IdP tenant.
    if (offLoopback && !backendBySiteOrigin.has(siteOrigin)) {
        backendBySiteOrigin.set(siteOrigin, landedOrigin);
    }
}
