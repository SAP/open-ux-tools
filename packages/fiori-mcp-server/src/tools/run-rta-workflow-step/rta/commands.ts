import { isNeedsUserAction, UFA_PREFIX } from '../browser/index.js';
import type { FrontendActionResult, FrontendActionTransport } from '../browser/index.js';
import { formatXml, persistMetadata } from '../../../utils/index.js';
import { buildMetadataUrl, looksLikeEdmx } from './odata-metadata.js';
import type {
    ActionsCatalog,
    DescribeUiResult,
    EditorPage,
    ElementContext,
    ExecuteUfaActionResult,
    GetODataMetadataResult,
    ODataMetadataEntry,
    Overlay,
    UiElementNode
} from './types.js';

const ACTION_PREFIX = 'com.sap.ui.flex';
const ACTION_VERSION = 'v1';

// describe_ui exists for navigation: the caller needs each node's id (to press),
// type, label and tooltip (to recognize the control), and the children structure —
// never a control's `value`. Left unscoped, describeUI includes `value`, and for some
// controls `value` is the live UI5 control object itself; serializing one such
// node produced a ~6 MB payload on a real Object Page (99%+ of it a single node's
// `value`). Defaulting includedProperties to the navigation-relevant fields drops
// `value` and keeps the response ~200x smaller.
//
// `Tooltip` (→ node `description`) is essential, not optional: many controls resolve
// no meaningful visible label and fall back to their control-type name, so a page
// can carry a dozen buttons all labelled "Button" and the row-navigation cells all
// labelled "Button" too — indistinguishable without the tooltip, which carries the
// real intent ("Navigate Back", "Navigation", "Share", …). Omitting it is what left
// an agent unable to pick the right control among same-labelled ones.
//
// ('text' maps to label, 'Type' to type, 'Tooltip' to description in UITreeReader's
// PROP_NAME_MAP; 'children' is always retained by it.)
const NAVIGATION_PROPERTIES = ['id', 'text', 'Type', 'Tooltip'];

/**
 * Default depth for an unscoped `describe_ui` overview. Depth 2 shows the
 * top-level containers (pages, object page, RTA toolbar) and their immediate
 * children (sections, tabs, toolbar buttons) — enough to decide which subtree to
 * inspect — while keeping the response small on a large page. The model drills
 * into a `truncated` node by calling `describe_ui` again with its id as
 * `rootElementId` (which returns that subtree at full depth).
 */
const DEFAULT_DESCRIBE_UI_DEPTH = 2;

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
 * Raised when a first editor call lands on a backend login page (CF XSUAA / ABAP
 * reentrance) instead of the app. The browser driver encodes this as a reserved
 * `backend_login_required` sentinel payload on an otherwise-successful envelope;
 * {@link unwrap} decodes it centrally so any step — not just `start` — surfaces the
 * login prompt rather than returning the sentinel as a mistyped result.
 */
export class BackendLoginRequiredError extends Error {
    /**
     * @param guidance Human-readable instruction for completing the interactive login.
     */
    constructor(public readonly guidance: string) {
        super(guidance);
        this.name = 'BackendLoginRequiredError';
    }
}

/**
 * Returns the result payload on success; throws `FrontendActionError` on failure.
 * A reserved `backend_login_required` sentinel payload is decoded here and raised as
 * {@link BackendLoginRequiredError}, so every caller surfaces the login prompt instead
 * of treating the sentinel as a valid `T`.
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
    if (isNeedsUserAction(result.payload)) {
        throw new BackendLoginRequiredError(result.payload.message);
    }
    return result.payload as T;
}

/**
 * Result of a `startRta` call. On the normal path `rtaStarted` is `true`. When
 * the editor URL served a backend login page (CF XSUAA / ABAP reentrance),
 * `rtaStarted` is `false` and `needsUserAction` carries the structured signal
 * so the caller can prompt the human to log in and retry — instead of throwing.
 */
export interface StartRtaResult {
    rtaStarted: boolean;
    needsUserAction?: 'backend_login_required';
    message?: string;
}

/**
 * Starts Runtime Authoring on the editor page. The caller (the browser driver) awaits the
 * editor's `app-loaded` signal before invoking this, so `startRTA` does not race
 * a half-booted RuntimeAuthoring.
 *
 * @param transport Transport used to deliver the call.
 * @param page Target editor page.
 * @returns `{ rtaStarted: true }` once RTA has started, or a `backend_login_required` signal.
 */
export async function startRta(transport: FrontendActionTransport, page: EditorPage): Promise<StartRtaResult> {
    const name = action('startRTA');
    try {
        // `start`/`restart` is the only path allowed to open a fresh editor page.
        unwrap<unknown>(name, await transport.callFrontendAction(page.site, name, {}, page.frameId, true));
        return { rtaStarted: true };
    } catch (error) {
        // `unwrap` decodes the backend-login sentinel into this error for every
        // caller; `start` is the one that treats it as a benign retry signal
        // (prompt the user to log in) rather than a hard failure.
        if (error instanceof BackendLoginRequiredError) {
            return { rtaStarted: false, needsUserAction: 'backend_login_required', message: error.guidance };
        }
        throw error;
    }
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
 * Returns a copy of `node` whose descendants are trimmed to `maxDepth` levels
 * (the root is depth 1). A node at the depth boundary that has children keeps no
 * `children`, and is instead marked `truncated: true` with `childCount` set to
 * the number of omitted direct children, signalling the caller to drill in with
 * `rootElementId`. `maxDepth <= 0` means no trimming (full tree).
 *
 * @param node The root node to trim.
 * @param maxDepth Maximum depth to retain, or `0` for the full tree.
 * @param depth The current node's depth (1 for the root); used internally.
 * @returns The trimmed node (a new object; the input is not mutated).
 */
export function trimTreeToDepth(node: UiElementNode, maxDepth: number, depth = 1): UiElementNode {
    const { children, ...rest } = node;
    if (!children || children.length === 0) {
        return { ...rest };
    }
    if (maxDepth > 0 && depth >= maxDepth) {
        return { ...rest, truncated: true, childCount: children.length };
    }
    return { ...rest, children: children.map((child) => trimTreeToDepth(child, maxDepth, depth + 1)) };
}

/**
 * Returns a hierarchical tree of the current UI elements via the Unified
 * Frontend Action `describeUI`. Each node carries a UI5 control id, type,
 * label, and children. Use the `id` values as `elementId` in `executeUfaAction`.
 * The response is scoped to {@link NAVIGATION_PROPERTIES} so a large page returns
 * a navigation-sized tree rather than every control's (potentially huge) value.
 *
 * Without `rootElementId` the tree is trimmed to {@link DEFAULT_DESCRIBE_UI_DEPTH}
 * so a large page returns a shallow overview instead of thousands of nodes; a node
 * with hidden children is marked `truncated` with a `childCount`. With
 * `rootElementId` the caller is drilling into a specific (already small) subtree,
 * so the full depth of that subtree is returned.
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
    const name = `${UFA_PREFIX}describeUI`;
    const params: Record<string, unknown> = { includedProperties: NAVIGATION_PROPERTIES };
    if (rootElementId !== undefined) {
        params.rootElementId = rootElementId;
    }
    // ActionHelpers.describeUI returns the rendered controls as a FOREST (an array of
    // top-level nodes), not a single root; the transport normalizes it into the Flex
    // envelope, so `unwrap` yields that array (and throws FrontendActionError if the
    // runtime reported a failure, e.g. root not found).
    const forest = unwrap(
        name,
        await transport.callFrontendAction<UiElementNode[]>(page.site, name, params, page.frameId)
    );
    // describeUI has no depth parameter, so trim here: a scoped (rootElementId) call
    // is an intentional drill-down and returns its full subtree; an unscoped call
    // returns a shallow overview (each top-level node trimmed) the caller can expand.
    return rootElementId !== undefined
        ? forest
        : forest.map((node) => trimTreeToDepth(node, DEFAULT_DESCRIBE_UI_DEPTH));
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
    const name = `${UFA_PREFIX}executeAction`;
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

/**
 * Fetches OData `$metadata` (EDMX) for each supplied data-source URI through the authenticated
 * browser context registered for `site` — the way to obtain real EDMX for a CF project, which has
 * no ABAP provider. Each URI is independent: a bad response or failed fetch becomes a per-entry
 * `error`, small EDMX is returned inline as `metadata`, and large EDMX is spilled to `.context`
 * as `{ metadataFile, sizeBytes }` (see `persistMetadata`).
 *
 * @param transport Transport whose `fetchViaContext` carries the auth cookies.
 * @param site Editor URL returned by `start`; its origin is the fetch target.
 * @param uris OData data-source URIs (the `entries[].url` from `read_odata_metadata_adp`).
 * @param appPath Adaptation project root; large metadata is saved under its `.context`.
 * @returns One entry per URI: inline `metadata`, a `metadataFile` reference, or an `error`.
 */
export async function getODataMetadata(
    transport: FrontendActionTransport,
    site: string,
    uris: string[],
    appPath: string
): Promise<GetODataMetadataResult> {
    const entries: ODataMetadataEntry[] = await Promise.all(
        uris.map(async (uri): Promise<ODataMetadataEntry> => {
            try {
                const { status, contentType, body } = await transport.fetchViaContext(
                    site,
                    buildMetadataUrl(site, uri)
                );
                if (status < 200 || status >= 300) {
                    return { url: uri, error: `Failed to fetch OData metadata (status ${status}).` };
                }
                const isXml = contentType.toLowerCase().includes('xml');
                const looksEdmx = looksLikeEdmx(body);
                if (!isXml || !looksEdmx) {
                    return {
                        url: uri,
                        error: `Expected EDMX but received "${contentType}" (status ${status}) — the editor session may have lost authentication; re-run the "start" step.`
                    };
                }
                const formatted = formatXml(body);
                return { url: uri, ...persistMetadata(appPath, uri, formatted) };
            } catch (error) {
                return { url: uri, error: error instanceof Error ? error.message : String(error) };
            }
        })
    );
    return { entries };
}
