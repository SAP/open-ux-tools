import { type Frame, type Page } from 'playwright-core';

// Backend login / IdP page detection. A CF editor URL may redirect to an XSUAA
// login page instead of serving the app, in which case the Joule webclient bridge never injects.
// These helpers let the bridge tell "slow but valid app" apart from "needs interactive login".

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
/**
 * Resolves the frame whose iframe element has `id === frameId`, or `undefined`
 * when `frameId` is omitted or no such frame exists yet (e.g. the editor iframe
 * has not been created — as on a bare login page). The adaptation editor serves
 * the app inside the `preview` iframe, so the webclient bridge lives on that
 * frame's window, not the top-level page's.
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
 * Probes once (bounded) for the Joule webclient bridge. When `frameId` resolves
 * to an existing iframe (where the editor actually runs), the probe checks that
 * frame's window; otherwise it checks the top-level page. Resolves `true` when
 * the bridge appears within {@link BRIDGE_PROBE_MS}, `false` on timeout — without
 * throwing.
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
 * Keeps the (already-open) login window alive and polls for the webclient bridge
 * while a human completes the interactive login, up to `budgetMs`. Each poll is
 * a bounded {@link probeBridge} ({@link BRIDGE_PROBE_MS}) against the editor
 * iframe (`frameId`); the moment the bridge appears — i.e. the user has signed in
 * and the approuter served the app into that frame — it resolves `true`. Resolves
 * `false` if the budget elapses without the bridge. Never throws and never closes
 * the page; the caller owns teardown. The caller gates on the editor's
 * `app-loaded` signal afterwards, so this only needs to detect "logged in".
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
    const offLoopback = host !== 'localhost' && host !== '127.0.0.1';
    const markerHit =
        LOGIN_PAGE_MARKERS.test(url) || LOGIN_PAGE_MARKERS.test(title) || LOGIN_PAGE_MARKERS.test(bodyText);
    return offLoopback || markerHit;
}
