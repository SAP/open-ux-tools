import type { FrontendActionResult, FrontendActionTransport } from '../browser/index.js';
import type {
    ActionsCatalog,
    EditorPage,
    ElementContext,
    InteractiveElement,
    Overlay,
    PageActionRunResult,
    RegisteredPageAction
} from './types.js';

const ACTION_PREFIX = 'com.sap.ui.flex';
const ACTION_VERSION = 'v1';

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
 * Returns currently-applicable registered page actions plus a best-effort
 * scan of press-able controls in the live view (root view, static area,
 * open dialogs/popovers).
 *
 * `interactiveTruncated` is set to `true` when the scanner hit its internal
 * cap; in that case some press-able controls were omitted from `interactive`.
 *
 * @param transport Transport used to deliver the call.
 * @param page Target editor page.
 * @returns Registered actions, interactive elements, and an optional truncation flag.
 */
export async function getPageActions(
    transport: FrontendActionTransport,
    page: EditorPage
): Promise<{
    registered: RegisteredPageAction[];
    interactive: InteractiveElement[];
    interactiveTruncated?: true;
}> {
    const name = action('getPageActions');
    return unwrap(
        name,
        await transport.callFrontendAction<{
            registered: RegisteredPageAction[];
            interactive: InteractiveElement[];
            interactiveTruncated?: true;
        }>(page.site, name, {}, page.frameId)
    );
}

/**
 * Invokes a registered page action by id. The action's `isValid` is
 * re-checked before `run()`; a stale "valid" from a previous
 * `getPageActions` falls through as `needs_user_action`.
 *
 * @param transport Transport used to deliver the call.
 * @param page Target editor page.
 * @param id Action id, e.g. `loadData`.
 * @returns The page-action run result.
 */
export async function callPageAction(
    transport: FrontendActionTransport,
    page: EditorPage,
    id: string
): Promise<PageActionRunResult> {
    const name = action('callPageAction');
    return unwrap(name, await transport.callFrontendAction<PageActionRunResult>(page.site, name, { id }, page.frameId));
}

/**
 * Triggers a real user-gesture click on the control with `controlId` and
 * waits best-effort for the page to settle. The page probes a handful of
 * observable signals (registered-action set, ObjectPage selected section,
 * focus, open dialogs, location hash) at 200 / 400 / 800 ms after the
 * click; the result `note` describes the change or reports
 * `"no observable state change"`.
 *
 * @param transport Transport used to deliver the call.
 * @param page Target editor page.
 * @param controlId DOM/UI5 id of the element to press.
 * @returns The page-action run result.
 */
export async function pressInteractive(
    transport: FrontendActionTransport,
    page: EditorPage,
    controlId: string
): Promise<PageActionRunResult> {
    const name = action('pressInteractive');
    return unwrap(
        name,
        await transport.callFrontendAction<PageActionRunResult>(page.site, name, { controlId }, page.frameId)
    );
}
