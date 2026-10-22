import { type Page } from 'playwright-core';

// Backend login / IdP page detection. A CF editor URL may redirect to an XSUAA
// login page instead of serving the app, in which case the Joule webclient bridge never injects.
// These helpers let the bridge tell "slow but valid app" apart from "needs interactive login".

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
