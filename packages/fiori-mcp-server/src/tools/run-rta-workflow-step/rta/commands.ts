import type { FrontendActionResult, FrontendActionTransport } from '../browser';
import type { Action, EditorPage, ElementContext, Overlay } from './types';

const ACTION_PREFIX = 'com.sap.ui.flex';
const ACTION_VERSION = 'v1';

/**
 * Error raised when a Joule frontend action returns `isSuccess === false`.
 */
export class FrontendActionError extends Error {
    public readonly code: string;
    constructor(actionName: string, code: string, message: string | null | undefined) {
        super(`Frontend action ${actionName} failed [${code}]: ${message ?? '(no message)'}`);
        this.name = 'FrontendActionError';
        this.code = code;
    }
}

const action = (name: string): string => `${ACTION_PREFIX}.${name}.${ACTION_VERSION}`;

/**
 * Returns `payload` on success, throws `FrontendActionError` on failure.
 */
function unwrap<T>(actionName: string, result: FrontendActionResult<T>): T {
    if (!result.isSuccess) {
        const code = result.error?.code ?? 'GENERIC_ERROR';
        throw new FrontendActionError(actionName, code, result.error?.message);
    }
    return result.payload as T;
}

/** Starts Runtime Authoring on the editor page. */
export async function startRta(transport: FrontendActionTransport, page: EditorPage): Promise<{ rtaStarted: boolean }> {
    const name = action('startRTA');
    return unwrap(name, await transport.callFrontendAction<{ rtaStarted: boolean }>(page.site, name, {}, page.frameId));
}

/** Returns all editable overlays exposed by the running RTA instance. */
export async function getOverlays(transport: FrontendActionTransport, page: EditorPage): Promise<Overlay[]> {
    const name = action('getOverlaysInformation');
    return unwrap(name, await transport.callFrontendAction<Overlay[]>(page.site, name, {}, page.frameId));
}

/** Returns the actions available for the given control. */
export async function getActions(
    transport: FrontendActionTransport,
    page: EditorPage,
    controlId: string
): Promise<Action[]> {
    const name = action('getActions');
    return unwrap(name, await transport.callFrontendAction<Action[]>(page.site, name, { controlId }, page.frameId));
}

/** Returns context information for the given control + action combination. */
export async function getElementContext(
    transport: FrontendActionTransport,
    page: EditorPage,
    controlId: string,
    actionId: string
): Promise<ElementContext> {
    const name = action('getContext');
    return unwrap(
        name,
        await transport.callFrontendAction<ElementContext>(page.site, name, { controlId, actionId }, page.frameId)
    );
}

/** Executes an RTA action on a control with the prepared payload. */
export async function executeAction(
    transport: FrontendActionTransport,
    page: EditorPage,
    controlId: string,
    actionId: string,
    payload: Record<string, unknown>
): Promise<boolean> {
    const name = action('callAction');
    return unwrap(
        name,
        await transport.callFrontendAction<boolean>(page.site, name, { controlId, actionId, payload }, page.frameId)
    );
}

/** Persists all RTA changes that have been applied so far. */
export async function saveChanges(transport: FrontendActionTransport, page: EditorPage): Promise<boolean> {
    const name = action('saveChanges');
    return unwrap(name, await transport.callFrontendAction<boolean>(page.site, name, {}, page.frameId));
}

/** Switches the running RTA instance to visualization mode. */
export async function startVisualization(
    transport: FrontendActionTransport,
    page: EditorPage
): Promise<{ visualizationStarted: boolean }> {
    const name = action('startVisualization');
    return unwrap(
        name,
        await transport.callFrontendAction<{ visualizationStarted: boolean }>(page.site, name, {}, page.frameId)
    );
}

/**
 * Tears down the RTA session. With a page, only that site's page is closed;
 * without one, the underlying transport (browser) stops entirely.
 */
export async function stopRta(transport: FrontendActionTransport, page?: EditorPage): Promise<void> {
    if (page) {
        await transport.disconnectSite(page.site);
    } else {
        await transport.stopBrowser();
    }
}
