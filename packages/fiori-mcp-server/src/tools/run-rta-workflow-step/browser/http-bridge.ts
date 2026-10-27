import type { FrontendActionResult, FrontendActionTransport } from './types.js';
import { requireEditorSession, stopEditorSession } from '../../../utils/editor-session.js';
import { logger } from '../../../utils/logger.js';

// Allow the preview relay's 60-second action deadline to return its own error.
const REQUEST_TIMEOUT_MS = 70000;

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
        throw new Error('This editor has no HTTP relay. Enable SAP_FIORI_MCP_ADP_HTTP_TRANSPORT and reopen it.');
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
 * Calls a frontend action. Only transient startRTA permission checks are retried;
 * edits and ambiguous network failures are never replayed.
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
    const maxRetries = actionName === 'com.sap.ui.flex.startRTA.v1' ? 4 : 0;
    for (let attempt = 0; ; attempt++) {
        const response = await requestRelay(site, actionName, payload, frameId);
        if (response.error) {
            return { isSuccess: false, payload: null, error: { code: 'RELAY_ERROR', message: response.error } };
        }
        if (!isFrontendResult(response.result)) {
            throw new Error('Editor relay returned an invalid frontend result');
        }
        // UI5 supplies the payload type; the relay can only validate its envelope.
        const result = response.result as FrontendActionResult<TReturn>;
        if (attempt >= maxRetries || result.isSuccess || !/key user permission/i.test(result.error?.message ?? '')) {
            return result;
        }
        logger.debug(`HTTP relay: startRTA key-user check not ready, retry ${attempt + 1}/${maxRetries}`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
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
    const ready = await requestRelay(site, '__ready__');
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

/** HTTP relay for an automatically opened Simple Browser editor. */
export const httpTransport: FrontendActionTransport = {
    callFrontendAction: callFrontendActionHttp,
    disconnectSite: async () => {},
    stopBrowser: async () => {},
    reloadPage: reloadPageHttp,
    // Closing the owned tab and process also stops polling; no browser acknowledgement is needed.
    stopEditor: stopEditorSession
};
