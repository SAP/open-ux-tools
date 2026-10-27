import { isNeedsUserAction } from '../browser/index.js';
import type { FrontendActionResult, FrontendActionTransport } from '../browser/index.js';
import { formatXml, writeContextMetadata } from '../../../utils/index.js';
import type {
    ActionsCatalog,
    EditorPage,
    ElementContext,
    GetODataMetadataResult,
    InteractiveElement,
    ODataMetadataEntry,
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
 * Starts Runtime Authoring on the editor page. The caller (the bridge) awaits the
 * editor's `app-loaded` signal before invoking this, so `startRTA` does not race
 * a half-booted RuntimeAuthoring.
 *
 * @param transport Transport used to deliver the call.
 * @param page Target editor page.
 * @returns `{ rtaStarted: true }` once RTA has started, or a `backend_login_required` signal.
 */
export async function startRta(transport: FrontendActionTransport, page: EditorPage): Promise<StartRtaResult> {
    const name = action('startRTA');
    const payload = unwrap<unknown>(name, await transport.callFrontendAction(page.site, name, {}, page.frameId));
    if (isNeedsUserAction(payload)) {
        return { rtaStarted: false, needsUserAction: payload.__needsUserAction, message: payload.message };
    }
    return { rtaStarted: true };
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

/**
 * Builds the `$metadata` URL for an OData data-source `uri` against the editor
 * `site` origin. Relative, leading-slash, and trailing-slash URIs all resolve
 * to `<site-origin>/<uri>$metadata`; a URI that already ends in `$metadata` is
 * left as-is (no duplication).
 *
 * Pins the host to the editor origin: an absolute or protocol-relative `uri`
 * that resolves to a foreign origin is rejected, so the authenticated browser
 * context can never be aimed at an off-origin host (SSRF guard).
 *
 * @param site Editor URL (localhost); only its origin is used.
 * @param uri OData data-source URI from the manifest (usually relative).
 * @returns Absolute `$metadata` URL on the site origin.
 * @throws Error when `uri` resolves to an origin other than the site origin.
 */
function buildMetadataUrl(site: string, uri: string): string {
    const origin = new URL(site).origin;
    const resolved = new URL(uri, `${origin}/`);
    if (resolved.origin !== origin) {
        throw new Error(`Refusing to fetch OData metadata from a foreign origin: ${resolved.origin}`);
    }
    if (!resolved.pathname.endsWith('/$metadata')) {
        resolved.pathname = `${resolved.pathname.replace(/\/+$/, '')}/$metadata`;
    }
    return resolved.toString();
}

/**
 * Maximum formatted-EDMX length (characters) returned inline in a step result.
 * Larger metadata is written to disk instead, so a multi-megabyte service
 * document cannot overflow the model's token budget.
 */
const INLINE_METADATA_MAX_CHARS = 100_000;

/**
 * Derives a filesystem-safe base name from an OData URI, so two URIs map to
 * distinct files and no path separator or special character can escape the
 * target directory.
 *
 * @param uri OData data-source URI.
 * @returns A sanitised base name (letters, digits, underscores).
 */
function safeName(uri: string): string {
    return uri.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'service';
}

/**
 * Fetches OData `$metadata` (EDMX) for each supplied data-source URI through the
 * authenticated browser context registered for `site`. CF projects have no ABAP
 * provider, so this is the way to obtain real EDMX — the fetch rides the
 * approuter session held by the `start`ed editor.
 *
 * Each entry is independent: a login-page/non-XML response or a failed fetch
 * becomes a per-entry `error` rather than failing the whole batch. A missing
 * session (no `start`) surfaces as the transport's thrown error on the first URI.
 *
 * EDMX under {@link INLINE_METADATA_MAX_CHARS} is returned inline as `metadata`.
 * Larger EDMX is written to `<appPath>/webapp/.context/<name>-metadata.xml` and
 * returned as `{ metadataFile, sizeBytes }`; if no `appPath` is given it cannot
 * be saved and the entry is an `error` (never inlined, which would overflow).
 *
 * @param transport Transport whose `fetchViaContext` carries the auth cookies.
 * @param site Editor URL returned by `start`; its origin is the fetch target.
 * @param uris OData data-source URIs (the `entries[].url` from `read_odata_metadata_adp`).
 * @param appPath Adaptation project root; large metadata is saved under its `webapp/.context`.
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
                const isXml = contentType.toLowerCase().includes('xml');
                const looksEdmx = /<edmx:|<\?xml/i.test(body);
                if (!isXml || !looksEdmx) {
                    return {
                        url: uri,
                        error: `Expected EDMX but received "${contentType}" (status ${status}) — the editor session may have lost authentication; re-run the "start" step.`
                    };
                }
                const formatted = formatXml(body);
                if (formatted.length < INLINE_METADATA_MAX_CHARS) {
                    return { url: uri, metadata: formatted };
                }
                const metadataFile = writeContextMetadata(appPath, safeName(uri), formatted);
                return { url: uri, metadataFile, sizeBytes: Buffer.byteLength(formatted) };
            } catch (error) {
                return { url: uri, error: error instanceof Error ? error.message : String(error) };
            }
        })
    );
    return { entries };
}
