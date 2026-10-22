// Environment-variable configuration surface for the Playwright browser bridge.
// Kept in one place so the knobs the bridge reads (headless mode, cross-restart
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
