import type { FetchViaContextResult, FrontendActionResult, FrontendActionTransport } from './types.js';
import type { NeedsUserActionPayload } from './login-page.js';
import { requireEditorSession, stopEditorSession } from '../../../adaptation-editor/editor-session.js';
import { logger } from '../../../utils/logger.js';

// Kept above the relay's 60s action deadline so its own 504 arrives before the fetch aborts.
const REQUEST_TIMEOUT_MS = 70000;

const START_RTA_ACTION = 'com.sap.ui.flex.startRTA.v1';
const START_RETRY_DELAY_MS = 2000;
const MAX_PERMISSION_RETRIES = 4;
const DEFAULT_RELAY_LOGIN_WAIT_MS = 120000;

const RELAY_LOGIN_REQUIRED_MESSAGE =
    'The adaptation editor could not be reached — it is likely still on the backend login screen. ' +
    'Open the Editor URL returned by open_adaptation_editor in your browser, complete any login there, then run the start step again.';

/**
 * Login wait budget in ms.
 *
 * @returns SAP_FIORI_MCP_ADP_RELAY_LOGIN_WAIT_MS, default 120000.
 */
function getRelayLoginWaitMs(): number {
    const raw = Number(process.env.SAP_FIORI_MCP_ADP_RELAY_LOGIN_WAIT_MS);
    return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_RELAY_LOGIN_WAIT_MS;
}

/**
 * @param ms Milliseconds to wait.
 * @returns A promise that resolves after `ms` milliseconds.
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RelayResponse {
    result?: unknown;
    clientId?: string;
    error?: string;
}

/**
 * Sends one command to the exact local editor owned by this MCP process.
 * Browser URLs are registry keys, never a source of inferred hostnames or ports.
 *
 * @param site Registered editor URL.
 * @param actionName Frontend action or lifecycle command.
 * @param payload Action parameters.
 * @param frameId Optional target frame.
 * @returns Validated relay response.
 */
async function requestRelay(
    site: string,
    actionName: string,
    payload: Record<string, unknown> = {},
    frameId?: string
): Promise<RelayResponse> {
    const session = requireEditorSession(site);
    if (!session.relayToken) {
        throw new Error(
            'This editor has no HTTP relay. It is enabled in BAS, or locally by setting SAP_FIORI_MCP_ADP_FORCE_AUTOOPEN; reopen the editor.'
        );
    }
    const endpoint = new URL('/adp/api/rta/action', session.localUrl);
    logger.debug(`HTTP relay: ${actionName}`);
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Relay-Token': session.relayToken },
        body: JSON.stringify({ actionName, payload, frameId }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        redirect: 'error'
    });
    // 504 means the browser client never answered (likely on the backend login screen). Handle it
    // on status alone, before response.json() — an ingress/proxy may return a non-JSON 504 page —
    // so isClientAbsent sees it and the login-wait path can engage.
    if (response.status === 504) {
        throw new Error('Editor relay HTTP 504');
    }
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new Error('Invalid editor relay response');
    }
    if ('error' in body && typeof body.error === 'string') {
        return { error: body.error };
    }
    if (!response.ok) {
        throw new Error(`Editor relay HTTP ${response.status}`);
    }
    if (!('result' in body) || !('clientId' in body) || typeof body.clientId !== 'string') {
        throw new Error('Invalid editor relay response');
    }
    return { result: body.result, clientId: body.clientId };
}

/**
 * Checks the UI5 result envelope without assuming the relay returned a frontend action.
 *
 * @param value Relay result.
 * @returns Whether the result is a frontend envelope.
 */
function isFrontendResult(value: unknown): value is FrontendActionResult {
    return (
        typeof value === 'object' &&
        value !== null &&
        'isSuccess' in value &&
        typeof value.isSuccess === 'boolean' &&
        'payload' in value
    );
}

/**
 * Converts a relay response into a frontend envelope.
 *
 * @param response Validated relay response.
 * @returns Frontend result envelope.
 */
function toFrontendResult<TReturn>(response: RelayResponse): FrontendActionResult<TReturn> {
    if (response.error) {
        return { isSuccess: false, payload: null, error: { code: 'RELAY_ERROR', message: response.error } };
    }
    if (!isFrontendResult(response.result)) {
        throw new Error('Editor relay returned an invalid frontend result');
    }
    return response.result as FrontendActionResult<TReturn>;
}

/**
 * Whether the error means no browser client answered (relay 504 or aborted request).
 *
 * @param error Error thrown by requestRelay.
 * @returns True when the client was absent rather than the request hard-failing.
 */
function isClientAbsent(error: unknown): boolean {
    return (
        error instanceof Error &&
        (/HTTP 504/.test(error.message) || error.name === 'TimeoutError' || error.name === 'AbortError')
    );
}

/**
 * Retries startRTA until it succeeds, the permission-check budget is exhausted,
 * or the login-wait deadline elapses. Uses recursion rather than a loop so each
 * attempt is a distinct async frame (no `await` inside a loop construct).
 *
 * @param site Registered editor URL.
 * @param payload Action parameters.
 * @param frameId Optional target frame.
 * @param deadline Absolute timestamp after which a missing client prompts for login.
 * @param permissionRetries Retries consumed so far for the key-user permission check.
 * @returns Frontend result envelope.
 */
async function startRtaWithRetry<TReturn>(
    site: string,
    payload: Record<string, unknown>,
    frameId: string | undefined,
    deadline: number,
    permissionRetries: number
): Promise<FrontendActionResult<TReturn>> {
    try {
        const result = toFrontendResult<TReturn>(await requestRelay(site, START_RTA_ACTION, payload, frameId));
        if (
            result.isSuccess ||
            permissionRetries >= MAX_PERMISSION_RETRIES ||
            !/key user permission/i.test(result.error?.message ?? '')
        ) {
            return result;
        }
        logger.debug(
            `HTTP relay: startRTA key-user check not ready, retry ${permissionRetries + 1}/${MAX_PERMISSION_RETRIES}`
        );
        await delay(START_RETRY_DELAY_MS);
        return startRtaWithRetry(site, payload, frameId, deadline, permissionRetries + 1);
    } catch (error) {
        if (!isClientAbsent(error)) {
            throw error;
        }
        if (Date.now() >= deadline) {
            logger.debug('HTTP relay: login wait budget elapsed with no editor client; prompting for login');
            const loginPayload: NeedsUserActionPayload = {
                __needsUserAction: 'backend_login_required',
                message: RELAY_LOGIN_REQUIRED_MESSAGE
            };
            return { isSuccess: true, payload: loginPayload as unknown as TReturn, error: null };
        }
        await delay(START_RETRY_DELAY_MS);
        return startRtaWithRetry(site, payload, frameId, deadline, permissionRetries);
    }
}

/**
 * Calls a frontend action over the relay. Non-start actions are single-shot. The `startRTA`
 * path delegates to `startRtaWithRetry` for its bounded key-user and login-wait logic.
 *
 * @param site Registered editor URL.
 * @param actionName Fully-qualified frontend action.
 * @param payload Action parameters.
 * @param frameId Optional target frame.
 * @returns Frontend result envelope.
 */
async function callFrontendActionHttp<TReturn = unknown>(
    site: string,
    actionName: string,
    payload: Record<string, unknown> = {},
    frameId?: string
): Promise<FrontendActionResult<TReturn>> {
    if (actionName !== START_RTA_ACTION) {
        return toFrontendResult<TReturn>(await requestRelay(site, actionName, payload, frameId));
    }
    return startRtaWithRetry<TReturn>(site, payload, frameId, Date.now() + getRelayLoginWaitMs(), 0);
}

/**
 * Reloads once, then waits for readiness from a different browser document.
 * The preview service retires the old document before acknowledging reload.
 *
 * @param site Registered editor URL.
 */
async function reloadPageHttp(site: string): Promise<void> {
    const reloaded = await requestRelay(site, '__reload__');
    if (reloaded.error || !reloaded.clientId) {
        throw new Error(`Editor reload failed: ${reloaded.error ?? 'missing document acknowledgement'}`);
    }
    // Target the default preview frame: __ready__ resolves the editor window via frameId, so a
    // top-level editor with a child preview frame needs it; an in-frame client ignores it.
    const ready = await requestRelay(site, '__ready__', {}, 'preview');
    const readyError = isFrontendResult(ready.result) ? ready.result.error?.message : undefined;
    if (
        ready.error ||
        ready.clientId === reloaded.clientId ||
        !isFrontendResult(ready.result) ||
        !ready.result.isSuccess
    ) {
        throw new Error(
            `Reloaded editor did not become ready: ${ready.error ?? readyError ?? 'no fresh ready document'}`
        );
    }
}

/**
 * Fetches a URL through the editor page's authenticated same-origin context via the relay
 * `__fetch__` command. The injected browser client performs the fetch (reusing the editor
 * session cookies) and returns the status, content-type, and body — the relay equivalent of
 * the Playwright transport's `fetchViaContext`, used by `get_odata_metadata` for CF projects.
 *
 * @param site Registered editor URL.
 * @param url Absolute URL to GET; the relay client rejects anything not same-origin as the editor.
 * @returns The response status, content-type, and body text.
 */
async function fetchViaContextHttp(site: string, url: string): Promise<FetchViaContextResult> {
    const response = await requestRelay(site, '__fetch__', { url });
    if (response.error) {
        throw new Error(`Editor relay fetch failed: ${response.error}`);
    }
    if (!isFrontendResult(response.result)) {
        throw new Error('Editor relay returned an invalid fetch result');
    }
    const result = response.result;
    if (!result.isSuccess || result.payload === null) {
        throw new Error(result.error?.message ?? 'Editor relay fetch failed');
    }
    // The relay client returns { status, contentType, body } as the envelope payload.
    return result.payload as FetchViaContextResult;
}

/** HTTP relay for the editor in a user browser tab, opened automatically or manually. */
export const httpTransport: FrontendActionTransport = {
    callFrontendAction: callFrontendActionHttp,
    fetchViaContext: fetchViaContextHttp,
    disconnectSite: async () => {},
    stopBrowser: async () => {},
    reloadPage: reloadPageHttp,
    // Stop the owned server without requiring a responsive browser; the user closes the external tab.
    stopEditor: stopEditorSession
};
