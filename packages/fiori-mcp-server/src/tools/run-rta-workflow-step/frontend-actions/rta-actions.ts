import { callFrontendAction, disconnectSite, type FrontendActionResult, stopBrowser } from './frontend-service';
import type { Action, ElementContext, Overlay } from './types';

/**
 * Site coordinates shared by every RTA action.
 */
export interface RtaSite {
    /** Editor URL returned by `open_adaptation_editor`. */
    site: string;
    /** Optional iframe element id (e.g. `"preview"`) to scope the call to. */
    frameId?: string;
}

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

const ACTION_PREFIX = 'com.sap.ui.flex';
const ACTION_VERSION = 'v1';
const action = (name: string): string => `${ACTION_PREFIX}.${name}.${ACTION_VERSION}`;

/**
 * Unwraps the FA result envelope: returns `payload` on success, throws on
 * failure. Centralizes the error path so each step function stays a
 * one-liner.
 *
 * @param actionName Action name for the error message.
 * @param result FA result envelope.
 * @returns The success payload.
 */
function unwrap<T>(actionName: string, result: FrontendActionResult<T>): T {
    if (!result.isSuccess) {
        const code = result.error?.code ?? 'GENERIC_ERROR';
        throw new FrontendActionError(actionName, code, result.error?.message);
    }
    return result.payload as T;
}

/**
 * Starts Runtime Authoring on the page hosting `s.site`.
 *
 * @param s Site coordinates.
 * @returns `{ rtaStarted: true }` on success.
 */
export async function startRta(s: RtaSite): Promise<{ rtaStarted: boolean }> {
    const name = action('startRTA');
    const result = await callFrontendAction<{ rtaStarted: boolean }>(s.site, name, {}, s.frameId);
    return unwrap(name, result);
}

/**
 * Returns all editable overlays currently exposed by the running RTA
 * instance.
 *
 * @param s Site coordinates.
 * @returns Array of overlays.
 */
export async function getOverlays(s: RtaSite): Promise<Overlay[]> {
    const name = action('getOverlaysInformation');
    const result = await callFrontendAction<Overlay[]>(s.site, name, {}, s.frameId);
    return unwrap(name, result);
}

/**
 * Returns the actions available for the given control.
 *
 * @param s Site coordinates.
 * @param controlId Target UI5 control id.
 * @returns Array of available actions.
 */
export async function getActions(s: RtaSite, controlId: string): Promise<Action[]> {
    const name = action('getActions');
    const result = await callFrontendAction<Action[]>(s.site, name, { controlId }, s.frameId);
    return unwrap(name, result);
}

/**
 * Returns context information for the given control + action combination.
 * The latest Joule API requires both `controlId` and `actionId`.
 *
 * @param s Site coordinates.
 * @param controlId Target UI5 control id.
 * @param actionId Action whose context should be retrieved.
 * @returns Element context.
 */
export async function getElementContext(s: RtaSite, controlId: string, actionId: string): Promise<ElementContext> {
    const name = action('getContext');
    const result = await callFrontendAction<ElementContext>(s.site, name, { controlId, actionId }, s.frameId);
    return unwrap(name, result);
}

/**
 * Executes an RTA action on a control with the prepared payload.
 *
 * @param s Site coordinates.
 * @param controlId Target UI5 control id.
 * @param actionId Id of the action to execute (from `getActions`).
 * @param payload Action-specific payload forwarded to `createCommands`.
 * @returns `true` on success.
 */
export async function executeAction(
    s: RtaSite,
    controlId: string,
    actionId: string,
    payload: Record<string, unknown>
): Promise<boolean> {
    const name = action('callAction');
    const result = await callFrontendAction<boolean>(s.site, name, { controlId, actionId, payload }, s.frameId);
    return unwrap(name, result);
}

/**
 * Persists all RTA changes that have been applied so far.
 *
 * @param s Site coordinates.
 * @returns `true` on success.
 */
export async function saveChanges(s: RtaSite): Promise<boolean> {
    const name = action('saveChanges');
    const result = await callFrontendAction<boolean>(s.site, name, {}, s.frameId);
    return unwrap(name, result);
}

/**
 * Switches the running RTA instance to visualization mode.
 *
 * @param s Site coordinates.
 * @returns `{ visualizationStarted: true }` on success.
 */
export async function startVisualization(s: RtaSite): Promise<{ visualizationStarted: boolean }> {
    const name = action('startVisualization');
    const result = await callFrontendAction<{ visualizationStarted: boolean }>(s.site, name, {}, s.frameId);
    return unwrap(name, result);
}

/**
 * Tears down the RTA browser session. With a site argument, only that site's
 * page is closed. Without a site argument, the entire browser shuts down.
 *
 * @param s Optional site coordinates; if omitted, the browser stops entirely.
 */
export async function stopRta(s?: RtaSite): Promise<void> {
    if (s) {
        await disconnectSite(s.site);
    } else {
        await stopBrowser();
    }
}
