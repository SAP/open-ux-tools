import { type Frame, type Page } from 'playwright-core';
import { isLoopbackHost } from './origin.js';

// Backend login / IdP page detection. A CF editor URL may redirect to an XSUAA
// login page instead of serving the app, in which case the Joule webclient bridge never injects.
// These helpers let the browser driver tell "slow but valid app" apart from "needs interactive login".

/** Bounded probe for the webclient bridge: generous for a valid app, far below the 60 s action timeout. */
const BRIDGE_PROBE_MS = 8000;

/** Markers that positively identify a backend login / IdP page (CF XSUAA, SAML reentrance, generic logon). */
const LOGIN_PAGE_MARKERS =
    /saml2|oauth\/authorize|xsuaa|\/login|sap-ui-login|j_security_check|identity provider|sign in|logon/i;

/** Guidance returned to the AI/skill when the interactive login was not completed in time. */
export const LOGIN_REQUIRED_MESSAGE =
    'The editor URL redirected to a backend login page (e.g. Cloud Foundry XSUAA) and ' +
    'the login was not completed in time. The browser window was closed. Call the "start" step again to ' +
    'reopen it, complete the login in the opened (headed) browser while the step waits, and it will ' +
    'continue automatically. Set PLAYWRIGHT_SESSION_STATE_PATH to a directory to reuse the session across ' +
    'restarts (incl. headless), and PLAYWRIGHT_LOGIN_WAIT_MS to adjust how long the step waits for login.';

/** Up-front notice logged while the step keeps the window open and waits for the human to log in. */
export const LOGIN_WAIT_MESSAGE =
    'Backend login required. A browser window has opened on the login page — please complete the login ' +
    'there. The "start" step is waiting and will continue automatically once you are signed in.';

/**
 * Reserved payload the browser driver returns from `start`/`restart` when the
 * editor URL served a backend login page instead of the app. It rides a
 * successful (`isSuccess: true`) envelope so `unwrap` does not throw — "needs
 * login" is distinct from a genuine action failure.
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
 * Resolves the frame whose iframe element has `id === frameId`, or `undefined`
 * when `frameId` is omitted or no such frame exists. The editor runs inside the
 * `preview` iframe, so the webclient bridge lives on that frame's window.
 *
 * @param page The editor page.
 * @param frameId The iframe element id to resolve (e.g. `preview`).
 * @returns The matching frame, or `undefined`.
 */
async function resolveFrame(page: Page, frameId: string | undefined): Promise<Frame | undefined> {
    if (!frameId) {
        return undefined;
    }
    for (const frame of page.frames()) {
        const element = await frame.frameElement().catch(() => undefined);
        const id = element ? await element.getAttribute('id').catch(() => null) : null;
        if (id === frameId) {
            return frame;
        }
    }
    return undefined;
}

/**
 * Probes once (bounded) for the Joule webclient bridge. Checks the `frameId`
 * iframe's window when it resolves, else the top-level page. Resolves `true` when
 * the bridge appears within {@link BRIDGE_PROBE_MS}, `false` on timeout — never throws.
 *
 * @param page The page just navigated to the editor URL.
 * @param frameId Optional iframe element id hosting the editor (e.g. `preview`).
 * @returns `true` if the webclient bridge is present.
 */
export async function probeBridge(page: Page, frameId?: string): Promise<boolean> {
    const target: Page | Frame = (await resolveFrame(page, frameId)) ?? page;
    try {
        await target.waitForFunction(
            () =>
                !!(
                    window as unknown as {
                        sapdas?: { webclientBridge?: { getFrontendActions?: () => unknown } };
                    }
                ).sapdas?.webclientBridge?.getFrontendActions,
            undefined,
            { timeout: BRIDGE_PROBE_MS }
        );
        return true;
    } catch {
        return false;
    }
}

/**
 * Keeps the open login window alive and polls {@link probeBridge} while a human
 * logs in, up to `budgetMs`. Resolves `true` the moment the bridge appears,
 * `false` if the budget elapses. Never throws and never closes the page.
 *
 * On a live page each probe blocks for `BRIDGE_PROBE_MS`, so the loop paces itself.
 * A closed page is the exception — its probe rejects instantly and can never
 * recover, so we stop rather than poll a dead target for the whole budget.
 *
 * @param page The page sitting on the backend login screen.
 * @param budgetMs Total time to wait for login before giving up.
 * @param frameId Optional iframe element id hosting the editor (e.g. `preview`).
 * @returns `true` if the bridge appeared within the budget, else `false`.
 */
export async function waitForLogin(page: Page, budgetMs: number, frameId?: string): Promise<boolean> {
    const deadline = Date.now() + budgetMs;
    // Always probe at least once so a zero/tiny budget still makes one attempt.
    do {
        if (await probeBridge(page, frameId)) {
            return true;
        }
        // A closed page can never serve the bridge — stop instead of spinning.
        if (page.isClosed()) {
            return false;
        }
    } while (Date.now() < deadline);
    return false;
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
    const offLoopback = !isLoopbackHost(host);
    const markerHit =
        LOGIN_PAGE_MARKERS.test(url) || LOGIN_PAGE_MARKERS.test(title) || LOGIN_PAGE_MARKERS.test(bodyText);
    return offLoopback || markerHit;
}
