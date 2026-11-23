import { mkdir, open, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { type BrowserContext } from 'playwright-core';
import { isCFEnvironment } from '@sap-ux/adp-tooling';
import { logger } from '../../../utils/logger.js';
import { sessionDir } from './env.js';
import { originKey } from './origin.js';

// Session state shared across the browser driver.
//   `siteMeta` — site origin → { projectKey, isCf }. Rewritten by every `start`
//      (via registerSite), so the project currently running on a reused port
//      always wins and a previous project's metadata is never served to a new one.
//   `sessionByProject` — projectKey (the project's appPath) → saved login state.
//      Keyed by PROJECT, not port, so two projects sharing a port never cross-
//      contaminate cookies. Survives `disconnectSite` so a login is reused across
//      re-`start` of the SAME project. ABAP projects are never stored (isCf skip).
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
 * Records which adaptation project is being started on a site and whether it is
 * Cloud Foundry. Called by `start` before the first context is built. Overwrites
 * any metadata a previous project left on this site (stop→start on a reused port),
 * so the current project always wins. `appPath` doubles as the session key.
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
 * Maps a session key (the project's appPath) to a short, filesystem-safe,
 * human-recognisable file name. The sanitised last path segment keeps it readable;
 * a truncated SHA-256 of the full key keeps two projects that share a last segment
 * from colliding onto one file (which would cross-seed their sessions). Same project
 * → same file (overwritten on refresh).
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
 * seeded; an ABAP or unregistered site gets a plain context. Keyed by project, so
 * a different project reusing the same port is never seeded from stale cookies.
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
 * Writes `data` to `file` with owner-only (`0o600`) permissions. Writes to a temp
 * file opened `O_CREAT | O_EXCL` at `0o600`, then atomically renames it over `file`,
 * so a reader never sees a partial or world-readable intermediate. The temp file is removed on failure.
 *
 * @param file Destination path.
 * @param data File contents.
 */
async function writeFileSecure(file: string, data: string): Promise<void> {
    const tmp = `${file}.${randomBytes(6).toString('hex')}.tmp`;
    try {
        const handle = await open(tmp, 'wx', 0o600);
        try {
            await handle.writeFile(data);
        } finally {
            await handle.close();
        }
        await rename(tmp, file);
    } catch (error) {
        await rm(tmp, { force: true });
        throw error;
    }
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
            // owner-only (dir 0o700, file 0o600) via a fresh temp file + atomic rename
            // so the real file is never momentarily readable and a concurrent reader
            // always sees a complete file — never Playwright's default world-readable
            // write, and never a stale file re-opened at a looser mode.
            await mkdir(dir, { recursive: true, mode: 0o700 });
            const file = join(dir, sessionFileName(projectKey));
            await writeFileSecure(file, JSON.stringify(state));
        }
    } catch (error) {
        logger.warn(`Failed to persist RTA session state: ${error instanceof Error ? error.message : String(error)}`);
    }
}
