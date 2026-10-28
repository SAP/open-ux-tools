// Environment-variable configuration surface for the Playwright browser driver.
// Kept in one place so the knobs the driver reads (headless mode, cross-restart
// session directory) are discoverable together rather than scattered.

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
export function sessionDir(): string | undefined {
    const dir = process.env.PLAYWRIGHT_SESSION_STATE_PATH;
    return dir && dir.length > 0 ? dir : undefined;
}

/** Default budget to wait for a human to complete an interactive backend login. */
const DEFAULT_LOGIN_WAIT_MS = 120_000;

/**
 * How long `start` keeps the browser window open and polls for the webclient
 * bridge while a human completes an interactive backend login (CF XSUAA / ABAP
 * reentrance). `PLAYWRIGHT_LOGIN_WAIT_MS` overrides the default; a non-positive
 * or unparseable value falls back to the default.
 *
 * @returns The login wait budget in milliseconds.
 */
export function loginWaitMs(): number {
    const raw = Number(process.env.PLAYWRIGHT_LOGIN_WAIT_MS);
    return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_LOGIN_WAIT_MS;
}

/** Default budget to wait for the editor's `app-loaded` readiness signal. */
const DEFAULT_APP_LOADED_WAIT_MS = 60_000;

/**
 * How long `start` waits for the adaptation editor's `app-loaded` signal (the
 * preview iframe finished booting) before proceeding to `startRTA`.
 * `PLAYWRIGHT_APP_LOADED_WAIT_MS` overrides the default; a non-positive or
 * unparseable value falls back to the default.
 *
 * @returns The app-loaded wait budget in milliseconds.
 */
export function appLoadedWaitMs(): number {
    const raw = Number(process.env.PLAYWRIGHT_APP_LOADED_WAIT_MS);
    return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_APP_LOADED_WAIT_MS;
}
