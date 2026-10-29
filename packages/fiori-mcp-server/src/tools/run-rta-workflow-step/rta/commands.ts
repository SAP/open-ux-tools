import type { FrontendActionResult, FrontendActionTransport } from '../browser/index.js';
import type {
    ActionsCatalog,
    DescribeUiResult,
    EditorPage,
    ElementContext,
    ExecuteUfaActionResult,
    Overlay,
    UiElementNode
} from './types.js';

const ACTION_PREFIX = 'com.sap.ui.flex';
const ACTION_VERSION = 'v1';
const UFA_PREFIX = 'com.sap.ui.unified.frontend.actions';

/**
 * Error raised when a Joule frontend action returns `isSuccess === false`.
 */
export class FrontendActionError extends Error {
    public readonly code: string;

    /**
     * Constructs the error with a message like `Frontend action <actionName> failed [<code>]: <message>`.
     *
     * @param actionName Fully-qualified frontend action name that failed.
     * @param code Error code from the action's result envelope, or `GENERIC_ERROR`.
     * @param message Human-readable error message from the result envelope.
     */
    constructor(actionName: string, code: string, message: string | null | undefined) {
        super(`Frontend action ${actionName} failed [${code}]: ${message ?? '(no message)'}`);
        this.name = 'FrontendActionError';
        this.code = code;
    }
}

/**
 * Builds a fully-qualified frontend action name (`com.sap.ui.flex.<name>.v1`).
 *
 * @param name Short action name, e.g. `startRTA`.
 * @returns The fully-qualified action name.
 */
const action = (name: string): string => `${ACTION_PREFIX}.${name}.${ACTION_VERSION}`;

/**
 * Returns the result payload on success; throws `FrontendActionError` on failure.
 *
 * @param actionName Fully-qualified action name, used in the error message.
 * @param result Frontend action result envelope.
 * @returns The unwrapped payload.
 */
function unwrap<T>(actionName: string, result: FrontendActionResult<T>): T {
    if (!result.isSuccess) {
        const code = result.error?.code ?? 'GENERIC_ERROR';
        throw new FrontendActionError(actionName, code, result.error?.message);
    }
    return result.payload as T;
}

/**
 * Starts Runtime Authoring on the editor page.
 *
 * @param transport Transport used to deliver the call.
 * @param page Target editor page.
 * @returns `{ rtaStarted: true }` once RTA has started.
 */
export async function startRta(transport: FrontendActionTransport, page: EditorPage): Promise<{ rtaStarted: boolean }> {
    const name = action('startRTA');
    return unwrap(name, await transport.callFrontendAction<{ rtaStarted: boolean }>(page.site, name, {}, page.frameId));
}

/**
 * Returns all editable overlays exposed by the running RTA instance together
 * with a deduplicated catalog of the RTA actions referenced by their
 * `actionIds`.
 *
 * @param transport Transport used to deliver the call.
 * @param page Target editor page.
 * @returns Overlays plus the catalog keyed by action id.
 */
export async function getOverlays(
    transport: FrontendActionTransport,
    page: EditorPage
): Promise<{ overlays: Overlay[]; actionsCatalog: ActionsCatalog }> {
    const name = action('getOverlaysInformation');
    return unwrap(
        name,
        await transport.callFrontendAction<{ overlays: Overlay[]; actionsCatalog: ActionsCatalog }>(
            page.site,
            name,
            {},
            page.frameId
        )
    );
}

/**
 * Returns context information for a control + action combination.
 *
 * @param transport Transport used to deliver the call.
 * @param page Target editor page.
 * @param controlId UI5 control id.
 * @param actionId Action id reported by the overlay's `actionIds`.
 * @returns The element context for the action.
 */
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

/**
 * Executes an RTA action on a control with the prepared payload.
 *
 * @param transport Transport used to deliver the call.
 * @param page Target editor page.
 * @param controlId UI5 control id.
 * @param actionId Action id reported by the overlay's `actionIds`.
 * @param payload Action-specific payload, shape determined by `getElementContext`.
 * @returns `true` if the action was applied.
 */
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

/**
 * Persists all RTA changes that have been applied so far.
 *
 * @param transport Transport used to deliver the call.
 * @param page Target editor page.
 * @returns `true` if the changes were saved.
 */
export async function saveChanges(transport: FrontendActionTransport, page: EditorPage): Promise<boolean> {
    const name = action('saveChanges');
    return unwrap(name, await transport.callFrontendAction<boolean>(page.site, name, {}, page.frameId));
}

/**
 * Switches the running RTA instance to visualization mode.
 *
 * @param transport Transport used to deliver the call.
 * @param page Target editor page.
 * @returns `{ visualizationStarted: true }` once visualization mode is active.
 */
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
 * Tears down the RTA session. With a `page`, only that site's page is closed;
 * without one, the underlying transport (browser) stops entirely.
 *
 * @param transport Transport used to deliver the call.
 * @param page Optional editor page; omit to stop the whole transport.
 */
export async function stopRta(transport: FrontendActionTransport, page?: EditorPage): Promise<void> {
    if (page) {
        await transport.disconnectSite(page.site);
    } else {
        await transport.stopBrowser();
    }
}

/**
 * Returns a hierarchical tree of the current UI elements via the Unified
 * Frontend Action `describeUI`. Each node carries a UI5 control id, type,
 * label, and children. Use the `id` values as `elementId` in `executeUfaAction`.
 *
 * @param transport Transport used to deliver the call.
 * @param page Target editor page.
 * @param rootElementId Optional UI5 control id to scope the tree to a subtree.
 * @returns The UI element tree rooted at the given element (or the page root).
 */
export async function describeUi(
    transport: FrontendActionTransport,
    page: EditorPage,
    rootElementId?: string
): Promise<DescribeUiResult> {
    const name = `${UFA_PREFIX}.describeUI`;
    const params: Record<string, unknown> = {};
    if (rootElementId !== undefined) {
        params.rootElementId = rootElementId;
    }
    // ActionHelpers.describeUI returns the UI element tree directly; the transport
    // normalizes it into the Flex envelope, so `unwrap` yields the root node (and
    // throws FrontendActionError if the runtime reported a failure, e.g. root not found).
    return unwrap(name, await transport.callFrontendAction<UiElementNode>(page.site, name, params, page.frameId));
}

/**
 * Executes a Unified Frontend Action (UFA) on the running app. The primary
 * use-case is navigation: pass `actionName: "press"` and `elementId` set to a
 * UI5 control id (as returned by `describeUi`) to trigger a click.
 *
 * @param transport Transport used to deliver the call.
 * @param page Target editor page.
 * @param actionName UFA action name, e.g. `"press"`.
 * @param elementId Optional UI5 control id to target.
 * @param actionParameters Optional free-form key/value parameters for the action.
 * @returns `{ isSuccess, result }` — `isSuccess` is `false` when the action could not run.
 */
export async function executeUfaAction(
    transport: FrontendActionTransport,
    page: EditorPage,
    actionName: string,
    elementId?: string,
    actionParameters?: Record<string, unknown>
): Promise<ExecuteUfaActionResult> {
    const name = `${UFA_PREFIX}.executeAction`;
    const params: Record<string, unknown> = { actionName };
    if (elementId !== undefined) {
        params.elementId = elementId;
    }
    if (actionParameters !== undefined) {
        params.actionParameters = actionParameters;
    }
    // A failed press is not exceptional — the caller decides what to do — so read the
    // normalized envelope directly instead of unwrapping (which would throw). On success
    // the raw UFA result is in `payload`; on failure the transport puts the reason in
    // `error`, so surface that (the skill tells callers to report it to the user).
    const result = await transport.callFrontendAction<unknown>(page.site, name, params, page.frameId);
    return {
        isSuccess: result.isSuccess,
        result: result.isSuccess ? result.payload : (result.error ?? result.payload)
    };
}
