/**
 * Result envelope returned by every Joule frontend action.
 */
export interface FrontendActionResult<T = unknown> {
    isSuccess: boolean;
    payload: T | null;
    error: { code: string; message: string | null } | null;
}

/**
 * Transport that delivers Joule frontend action calls to the running
 * adaptation editor. The `rta/` layer depends on this interface, not on the
 * concrete Playwright implementation, so a fake transport can be injected
 * for tests or a different transport plugged in without touching the command wrappers.
 */
export interface FrontendActionTransport {
    /** Invoke a frontend action on the page hosting `site`. */
    callFrontendAction<TReturn = unknown>(
        site: string,
        actionName: string,
        payload?: Record<string, unknown>,
        frameId?: string
    ): Promise<FrontendActionResult<TReturn>>;
    /** Close the page registered for `site`, if any. */
    disconnectSite(site: string): Promise<void>;
    /** Close every registered page and the underlying transport (browser). */
    stopBrowser(): Promise<void>;
    /**
     * Reloads the page hosting `site` so the adaptation editor re-reads the
     * on-disk `webapp/changes` (used by the `restart` step after new fragment /
     * controller files have been written). Optional: transports that drive the
     * browser directly can reload it; the HTTP relay transport asks the editor
     * page to reload itself. When absent, the `restart` step falls back to
     * re-invoking `startRTA` in the already-loaded page.
     */
    reloadPage?(site: string): Promise<void>;
    /** Close the owned tab/server and report server termination, without process discovery. */
    stopEditor?(site: string): Promise<boolean>;
}
