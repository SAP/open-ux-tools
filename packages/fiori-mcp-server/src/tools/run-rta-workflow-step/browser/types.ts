/**
 * Result envelope returned by every Joule frontend action.
 */
export interface FrontendActionResult<T = unknown> {
    isSuccess: boolean;
    payload: T | null;
    error: { code: string; message: string | null } | null;
}

/**
 * Reserved payload the bridge returns from a `start`/`restart` call when the
 * editor URL served a backend login page (CF XSUAA / ABAP reentrance) instead
 * of the app, so the webclient bridge never injected. It rides a successful
 * (`isSuccess: true`) envelope so `unwrap` does not throw — "needs login" is
 * deliberately distinct from a genuine action failure (`isSuccess: false`).
 */
export interface NeedsUserActionPayload {
    __needsUserAction: 'backend_login_required';
    message: string;
}

/**
 * Type guard for {@link NeedsUserActionPayload}.
 *
 * @param value Unwrapped frontend-action payload.
 * @returns `true` when the payload is the reserved backend-login signal.
 */
export function isNeedsUserAction(value: unknown): value is NeedsUserActionPayload {
    return (
        typeof value === 'object' &&
        value !== null &&
        (value as Record<string, unknown>).__needsUserAction === 'backend_login_required'
    );
}

/**
 * Raw HTTP response surface returned by {@link FrontendActionTransport.fetchViaContext}.
 */
export interface FetchViaContextResult {
    status: number;
    contentType: string;
    body: string;
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
    /**
     * Issue an authenticated GET through the browser context registered for
     * `site`, reusing its approuter session cookies. Throws when no session is
     * registered for `site`.
     */
    fetchViaContext(site: string, url: string): Promise<FetchViaContextResult>;
    /** Close the page registered for `site`, if any. */
    disconnectSite(site: string): Promise<void>;
    /** Close every registered page and the underlying transport (browser). */
    stopBrowser(): Promise<void>;
}
