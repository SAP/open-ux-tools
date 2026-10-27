import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { type BrowserContext } from 'playwright-core';
import { isCFEnvironment } from '@sap-ux/adp-tooling';
import { logger } from '../../../utils/logger.js';
import { sessionDir } from './env.js';
import { originKey } from './origin.js';

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
 * Maps a session key (the project's appPath) to a short, filesystem-safe, and
 * human-recognisable file name for on-disk persistence. Combines the project's
 * last path segment (sanitised, so a human can tell which project a file belongs
 * to) with a truncated SHA-256 of the full key (so two projects that share a last
 * segment never collide onto the same file — which would cross-seed their
 * sessions). The same project always maps to the same file (overwritten on
 * refresh); different projects always map to different files.
 *
 * @param key Session key (a project path).
 * @returns A `<sanitised-last-segment>-<8-hex>.json` file name.
 */
export function sessionFileName(key: string): string {
    const segment = (key.split(/[/\\]/).findLast(Boolean) ?? 'project').replace(/[^a-zA-Z0-9.-]+/g, '_');
    const hash = createHash('sha256').update(key).digest('hex').slice(0, 8);
    return `${segment}-${hash}.json`;
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
        // Seed from the on-disk session only when the file actually exists.
        const file = join(dir, sessionFileName(projectKey));
        if (existsSync(file)) {
            return { viewport: null, storageState: file };
        }
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
