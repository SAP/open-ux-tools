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
}
