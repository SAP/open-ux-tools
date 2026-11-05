import { chromium, type Browser, type BrowserContext, type Frame, type Page } from 'playwright-core';
import { logger } from '../../../utils/logger.js';
import { appLoadedWaitMs, isHeadless, loginWaitMs } from './env.js';
import { installAppLoadedListener, waitForAppLoaded } from './editor-ready.js';
import {
    isBackendLoginPage,
    LOGIN_REQUIRED_MESSAGE,
    LOGIN_WAIT_MESSAGE,
    probeUi5Loaded,
    waitForLogin,
    type NeedsUserActionPayload
} from './login-page.js';
import { originKey } from './origin.js';
import { buildContextOptions, forgetSite, persistSessionState } from './session.js';
import type { FetchViaContextResult, FrontendActionResult, FrontendActionTransport } from './types.js';

// Browser driver for the adaptation-editor automation.
//
// This module is OUR Node-side component (not anything in the page): it owns a
// single shared Chromium, keeps a registry of open editor pages by origin, and
// runs frontend actions by evaluating into the page. It drives the browser — it
// is not itself a "bridge".
//
// Frontend actions (Flex `FrontendActionsAPI` and UFA `ActionHelpers`) are reached
// by `sap.ui.require`-ing the implementing UI5 module on the page and calling the
// method directly — there is no Joule webclient bridge in this transport. Readiness
// is therefore keyed off the UI5 loader (`sap.ui.require`) being present, not off
// any injected bridge object.

/** Outcome of classifying a freshly-navigated editor page. */
type EditorReadiness = { outcome: 'ready' | 'login-timed-out' } | { outcome: 'error'; status: number | undefined };

// Module-scope singleton state.
//   `browser` — launched once and reused for the lifetime of the Node process.
//   `browserStartPromise` — deduplicates concurrent launches so the first
//      caller's `chromium.launch()` is awaited by everyone else.
//   `connectionRegistry` — site ORIGIN → open page handle. One editor per origin
//      (the editor path is a constant, so the port/origin is the identity); the
//      full URL is kept on the handle for `page.goto`. Keyed by origin to match
//      the per-origin session state in `./session.js`, but kept a separate map
//      because a page is torn down on disconnect while the session survives it.
let browser: Browser | undefined;
let browserStartPromise: Promise<Browser> | undefined;
const connectionRegistry: Map<string, PageRPC> = new Map();

/**
 * Internal RPC handle for a single browser page.
 */
interface PageRPC {
    /** The full editor URL this page was opened with — used for `page.goto` / diagnostics. */
    readonly fullUrl: string;
    /** The context owning this page — used to snapshot session state before close. */
    readonly context: BrowserContext;
    /** Invoke a frontend action on this page. */
    callFrontendAction<TReturn = unknown>(
        actionName: string,
        payload?: Record<string, unknown>,
        frameId?: string
    ): Promise<FrontendActionResult<TReturn>>;
    /** Close the underlying Playwright page. */
    close(): Promise<void>;
}

/**
 * AMD module paths of the two frontend-action APIs on the running UI5 page.
 *   - Flex RTA actions (`start`, `getOverlaysInformation`, `callAction`, …) live
 *     on `sap/ui/rta/api/FrontendActionsAPI` and return the Flex envelope
 *     `{ isSuccess, payload, error }`.
 *   - Generic Unified Frontend Actions (`describeUI`, `executeAction`, …) live on
 *     `sap/ui/joule/frontend/util/ActionHelpers` and return raw results (a UI tree,
 *     or `{ success, error? }`).
 */
const FLEX_ACTIONS_MODULE = 'sap/ui/rta/api/FrontendActionsAPI';
const UFA_ACTIONS_MODULE = 'sap/ui/joule/frontend/util/ActionHelpers';
/** Prefix (trailing dot included) shared by every Unified Frontend Action contract name. */
export const UFA_PREFIX = 'com.sap.ui.unified.frontend.actions.';
const FLEX_RE = /^com\.sap\.ui\.flex\.(.+)\.v\d+$/;

/**
 * Resolves a frontend-action contract name to the UI5 module that implements it
 * and the bare method to call on that module.
 *
 * `com.sap.ui.flex.startRTA.v1` → `{ module: FrontendActionsAPI, method: 'startRTA', ufa: false }`
 * `com.sap.ui.unified.frontend.actions.describeUI` → `{ module: ActionHelpers, method: 'describeUI', ufa: true }`
 *
 * @param actionName Fully-qualified contract name.
 * @returns The module path, method name, and whether it is a UFA action.
 */
export function resolveAction(actionName: string): { module: string; method: string; ufa: boolean } {
    if (actionName.startsWith(UFA_PREFIX)) {
        return { module: UFA_ACTIONS_MODULE, method: actionName.slice(UFA_PREFIX.length), ufa: true };
    }
    const flex = FLEX_RE.exec(actionName);
    if (flex) {
        return { module: FLEX_ACTIONS_MODULE, method: flex[1], ufa: false };
    }
    // Unknown shape — try it verbatim against the Flex API and let the page report
    // "method not available" rather than guessing a module here.
    return { module: FLEX_ACTIONS_MODULE, method: actionName, ufa: false };
}

/**
 * Normalizes the raw value returned by a frontend-action method into the Flex
 * `{ isSuccess, payload, error }` envelope.
 *
 * Flex actions (`isUfa === false`) already return that envelope, so the raw value
 * is passed through. UFA actions (`ActionHelpers`) return raw results instead: a
 * mutation returns `{ success: boolean, error?/message? }` and a describe returns
 * raw data (e.g. a UI tree). A `{ success: false }` result becomes
 * `{ isSuccess: false, error }` (reason preserved from `error`/`message`); anything
 * else becomes `{ isSuccess: true, payload: <raw> }`.
 *
 * Kept at module scope (rather than inside the browser `evaluate` closure) so it
 * runs in Node and is directly unit-testable.
 *
 * @param raw The value returned by the action method.
 * @param isUfa Whether the action is a UFA action needing normalization.
 * @returns The Flex result envelope.
 */
export function normalizeUfaResult(raw: unknown, isUfa: boolean): FrontendActionResult {
    if (!isUfa) {
        // Flex actions (FrontendActionsAPI) already return the { isSuccess, payload, error }
        // envelope verbatim, so the raw value IS a FrontendActionResult — the cast only
        // restores the type the runtime API already guarantees.
        return raw as FrontendActionResult;
    }
    const r = raw as { success?: boolean; error?: unknown; message?: unknown } | undefined;
    if (r && typeof r === 'object' && r.success === false) {
        const message =
            (typeof r.error === 'string' && r.error) ||
            (typeof r.message === 'string' && r.message) ||
            'UFA action failed';
        return { isSuccess: false, payload: null, error: { code: 'UFA_ACTION_FAILED', message } };
    }
    // A mutation action (e.g. executeAction) returns just a `{ success: true }` status
    // wrapper with no real return value — collapse that to a null payload rather than
    // echoing the wrapper. A describe action returns actual data (e.g. the UI tree),
    // which is kept as the payload.
    const isBareSuccess = r !== undefined && typeof r === 'object' && r.success === true && Object.keys(r).length === 1;
    return { isSuccess: true, payload: isBareSuccess ? null : raw, error: null };
}

/**
 * Serializes a value to JSON, replacing any already-seen object with the string
 * `"[Circular]"` so a self-referential graph does not throw. Exported and used
 * verbatim inside the page's `evaluate` (its source is serialized into the browser
 * by Playwright), so the in-page serialization and this unit-tested function are
 * the same logic. See the call site for why serialization happens in the page.
 *
 * @param value The value to serialize.
 * @returns The JSON string, with cycles broken by `"[Circular]"`.
 */
export function stringifyWithCircularGuard(value: unknown): string {
    const seen = new WeakSet<object>();
    return JSON.stringify(value, (_key: string, v: unknown) => {
        if (typeof v === 'object' && v !== null) {
            if (seen.has(v)) {
                return '[Circular]';
            }
            seen.add(v);
        }
        return v;
    });
}

/**
 * Wraps a Playwright `Page` in an RPC handle that invokes frontend actions by
 * `sap.ui.require`-ing the implementing module on the page and calling the
 * method directly.
 *
 * Flex actions already return the `{ isSuccess, payload, error }` envelope. UFA
 * actions (`ActionHelpers`) return raw results, so this layer normalizes them
 * into the same envelope: a `{ success: false, error }` result becomes
 * `{ isSuccess: false, error }`; anything else becomes `{ isSuccess: true,
 * payload: <raw> }`. Callers therefore see one consistent shape.
 *
 * @param page The Playwright page to wrap.
 * @param context The BrowserContext that owns the page; closed together with the page on `rpc.close()`.
 * @param fullUrl The full editor URL this page was opened with.
 * @returns An RPC handle for the page.
 */
async function createPageRPC(page: Page, context: BrowserContext, fullUrl: string): Promise<PageRPC> {
    await page.waitForFunction(() => document.readyState === 'complete', undefined, { timeout: 30000 });

    const callFrontendAction: PageRPC['callFrontendAction'] = async <TReturn = unknown>(
        actionName: string,
        payload: Record<string, unknown> = {},
        frameId?: string
    ): Promise<FrontendActionResult<TReturn>> => {
        let executionContext: Page | Frame = page;

        if (frameId) {
            let matched: Frame | undefined;
            for (const frame of page.frames()) {
                const element = await frame.frameElement().catch(() => undefined);
                if (!element) {
                    continue;
                }
                const id = await element.getAttribute('id');
                if (id === frameId) {
                    matched = frame;
                    break;
                }
            }
            if (!matched) {
                throw new Error(`Frame with id "${frameId}" not found`);
            }
            executionContext = matched;
        }

        const { module, method, ufa } = resolveAction(actionName);

        // Wait up to 60 s for the UI5 loader (`sap.ui.require`) to be present; RTA
        // needs time to start before the implementing modules can be required.
        await (executionContext as Page | Frame).waitForFunction(
            /* istanbul ignore next -- predicate runs in the browser page, not Node */
            () => !!(window as unknown as { sap?: { ui?: { require?: unknown } } }).sap?.ui?.require,
            undefined,
            { timeout: 60000 }
        );

        let serialized: string;
        try {
            serialized = await executionContext.evaluate(
                /* istanbul ignore next -- runs in the browser page, not Node; Playwright
                   serializes this closure's source and executes it there, so Node-side
                   coverage never observes it. The serialization logic it inlines is the
                   same as the unit-tested stringifyWithCircularGuard above. */
                async ({ mod, fn, p }: { mod: string; fn: string; p: Record<string, unknown> }) => {
                    const require = (
                        window as unknown as {
                            sap?: {
                                ui?: {
                                    require?: (
                                        deps: string[],
                                        cb: (api: unknown) => void,
                                        errback: (err: unknown) => void
                                    ) => void;
                                };
                            };
                        }
                    ).sap?.ui?.require;
                    if (!require) {
                        throw new Error('sap.ui.require is not available on the page');
                    }
                    const api = await new Promise<Record<string, unknown>>((resolve, reject) => {
                        require([mod], (loaded) => resolve(loaded as Record<string, unknown>), reject);
                    });
                    const fnImpl = api[fn];
                    if (typeof fnImpl !== 'function') {
                        throw new TypeError(`Frontend action "${fn}" is not available on ${mod}`);
                    }
                    const raw = await (fnImpl as (arg: unknown) => unknown).call(api, p);
                    // Serialize INSIDE the page and return a string, never the raw object.
                    // Playwright's CDP serializer deep-clones an evaluate() return value by
                    // value, and a large Fiori Elements UI tree (e.g. describeUI on an Object
                    // Page) overruns its reference-chain depth limit — "Cannot serialize
                    // result: object reference chain is too long". JSON.stringify has no such
                    // limit; a circular-reference-safe replacer keeps it from throwing on the
                    // rare self-referential graph (writing "[Circular]" instead). Node parses
                    // it back before normalization.
                    const seen = new WeakSet<object>();
                    return JSON.stringify(raw, (_key: string, value: unknown) => {
                        if (typeof value === 'object' && value !== null) {
                            if (seen.has(value)) {
                                return '[Circular]';
                            }
                            seen.add(value);
                        }
                        return value;
                    });
                },
                { mod: module, fn: method, p: payload }
            );
        } catch (error) {
            // Any failure from the page (module not loaded, method missing, require
            // unavailable, or the action throwing) is returned as a failure envelope so
            // the command layer surfaces it as a FrontendActionError instead of letting a
            // raw page exception escape as a fatal error.
            const message = error instanceof Error ? error.message : String(error);
            return { isSuccess: false, payload: null, error: { code: 'FRONTEND_ACTION_THREW', message } };
        }
        // `undefined` return (a void action) stringifies to the JS value undefined, not a
        // string — treat it as a null raw result so normalizeUfaResult sees "no payload".
        const response: unknown = serialized === undefined ? null : JSON.parse(serialized);
        return normalizeUfaResult(response, ufa) as FrontendActionResult<TReturn>;
    };

    const close = async (): Promise<void> => {
        await page.close().catch(() => undefined);
        await context.close().catch(() => undefined);
    };

    return { fullUrl, context, callFrontendAction, close };
}

const INSTALL_HINT =
    'Chromium executable not found. Install Playwright Chromium with `npx playwright install chromium` ' +
    '(one-time, ~120 MB), or set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to a Chrome/Chromium binary, ' +
    'or set PLAYWRIGHT_BROWSER_CHANNEL to a channel available on this machine.';

/**
 * Launches a singleton Chromium browser via Playwright, or returns the
 * existing instance. Browser selection priority:
 * 1. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` — explicit absolute path.
 * 2. `PLAYWRIGHT_BROWSER_CHANNEL` — Playwright channel (`chrome`, `msedge`, etc.).
 * 3. Default: `chrome` channel (system-installed Google Chrome).
 * 4. Fallback: Playwright's bundled Chromium (requires `npx playwright install chromium`).
 *
 * @returns The connected Chromium browser instance.
 */
async function startBrowser(): Promise<Browser> {
    if (browser?.isConnected()) {
        return browser;
    }
    if (browserStartPromise) {
        return browserStartPromise;
    }

    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL ?? (executablePath ? undefined : 'chrome');
    const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--start-maximized'];

    browserStartPromise = (async (): Promise<Browser> => {
        try {
            return await chromium.launch({
                headless: isHeadless(),
                executablePath: executablePath ?? undefined,
                channel,
                args: launchArgs
            });
        } catch (primaryError) {
            logger.warn(
                `Primary browser launch failed (${
                    primaryError instanceof Error ? primaryError.message : String(primaryError)
                }); retrying with Playwright bundled Chromium.`
            );
            try {
                return await chromium.launch({ headless: isHeadless(), args: launchArgs });
            } catch (fallbackError) {
                throw new Error(INSTALL_HINT);
            }
        }
    })();

    try {
        browser = await browserStartPromise;
        browser.on('disconnected', () => {
            browser = undefined;
            browserStartPromise = undefined;
            connectionRegistry.clear();
        });
        return browser;
    } catch (error) {
        browserStartPromise = undefined;
        throw error;
    }
}

/**
/**
 * Whether a navigation response status means the editor failed to load. A
 * missing status (`undefined` — e.g. `goto` returned no response) is treated as
 * "not a hard error" so only a concrete HTTP error (>= 400) fast-fails.
 *
 * @param status HTTP status from the navigation response, or `undefined`.
 * @returns `true` when the status is a client/server error (>= 400).
 */
function isEditorErrorStatus(status: number | undefined): boolean {
    return status !== undefined && status >= 400;
}

/**
 * Builds the actionable error thrown when the editor URL served an HTTP error
 * page instead of the app, so `start` fails fast with a clear cause rather than
 * exhausting the 30 s readyState wait and 60 s per-action backstop on a dead page.
 *
 * @param status HTTP status the editor returned.
 * @param site Editor URL that was navigated to.
 * @returns The error to throw.
 */
function editorNotLoadedError(status: number | undefined, site: string): Error {
    return new Error(
        `The editor URL returned HTTP ${status} and the adaptation editor did not load. ` +
            `Check that the editor server is running at ${site} and, for a Cloud Foundry project, that its 'dist' has been built.`
    );
}

/**
 * Classifies a navigated editor page without owning its teardown. Probes for the
 * UI5 loader (`sap.ui.require`, in the editor iframe); if absent, distinguishes a
 * backend login page from a hard HTTP error from a slow-but-valid app.
 *
 * @param page The navigated editor page.
 * @param response The navigation response (for its HTTP status), or `null`.
 * @param frameId Optional iframe element id hosting the editor (e.g. `preview`).
 * @returns The readiness outcome for the caller to act on.
 */
async function classifyEditorReadiness(
    page: Page,
    response: Awaited<ReturnType<Page['goto']>>,
    frameId: string | undefined
): Promise<EditorReadiness> {
    if (await probeUi5Loaded(page, frameId)) {
        return { outcome: 'ready' };
    }
    const landedUrl = page.url();
    const [title, bodyText] = await Promise.all([
        page.title().catch(() => ''),
        page.evaluate(() => document.body?.innerText?.slice(0, 4000) ?? '').catch(() => '')
    ]);
    if (isBackendLoginPage(landedUrl, title, bodyText)) {
        // Keep the headed window open and block while the human signs in.
        logger.info(LOGIN_WAIT_MESSAGE);
        const loggedIn = await waitForLogin(page, loginWaitMs(), frameId);
        return { outcome: loggedIn ? 'ready' : 'login-timed-out' };
    }
    if (isEditorErrorStatus(response?.status())) {
        return { outcome: 'error', status: response?.status() };
    }
    // Slow-but-valid app: proceed and let the per-action readiness wait be the backstop.
    return { outcome: 'ready' };
}

/**
 * Invokes a frontend action (Flex or UFA) on the page hosting `site` by requiring
 * the implementing UI5 module (`FrontendActionsAPI` or `ActionHelpers`) on the
 * page. Reuses a registered page or (only when `allowOpen`) opens a new one.
 * Returns the result envelope; throws on transport/lookup failures.
 *
 * @param site URL to load (typically the adaptation editor URL).
 * @param actionName Frontend action contract name, e.g. `com.sap.ui.flex.startRTA.v1`.
 * @param payload Object payload forwarded to the frontend action.
 * @param frameId Optional frame element id to scope the call to an iframe.
 * @param allowOpen Open a page when none is registered (the `start`/`restart` path);
 * otherwise reject. Defaults to `false`.
 * @returns The frontend action result envelope.
 */
export async function callFrontendAction<TReturn = unknown>(
    site: string,
    actionName: string,
    payload: Record<string, unknown> = {},
    frameId?: string,
    allowOpen = false
): Promise<FrontendActionResult<TReturn>> {
    const key = originKey(site);
    let rpc = connectionRegistry.get(key);

    if (!rpc) {
        if (!allowOpen) {
            throw new Error('No active editor session for this site. Run the "start" step first.');
        }
        const activeBrowser = await startBrowser();
        const context = await activeBrowser.newContext(buildContextOptions(site));
        const page: Page = await context.newPage();

        // Install the editor `app-loaded` listener before any navigation, so a
        // signal fired during boot is never missed.
        await installAppLoadedListener(page);

        page.on('pageerror', (err) => {
            logger.warn(`Page error for ${site}: ${err.message}`);
        });

        page.on('close', () => {
            connectionRegistry.delete(key);
        });

        try {
            const response = await page.goto(site, { waitUntil: 'networkidle', timeout: 60000 });

            const readiness = await classifyEditorReadiness(page, response, frameId);
            // Two terminal outcomes tear down and exit here; `ready` falls through.
            if (readiness.outcome === 'login-timed-out') {
                await context.close().catch(() => undefined);
                const loginPayload: NeedsUserActionPayload = {
                    __needsUserAction: 'backend_login_required',
                    message: LOGIN_REQUIRED_MESSAGE
                };
                return { isSuccess: true, payload: loginPayload as unknown as TReturn, error: null };
            }
            if (readiness.outcome === 'error') {
                await context.close().catch(() => undefined);
                throw editorNotLoadedError(readiness.status, site);
            }

            // Persist the (CF-gated) session for reuse, then gate on the editor's `app-loaded` signal
            // before running any action, so `startRTA` does not race a half-booted RuntimeAuthoring.
            await persistSessionState(site, context);
            await waitForAppLoaded(page, appLoadedWaitMs());

            rpc = await createPageRPC(page, context, site);
            connectionRegistry.set(key, rpc);
        } catch (err) {
            await context.close().catch(() => undefined);
            throw err;
        }
    }

    return rpc.callFrontendAction<TReturn>(actionName, payload, frameId);
}

/**
 * Closes the page registered for `site` and removes it from the registry.
 *
 * @param site URL whose page should be closed.
 */
export async function disconnectSite(site: string): Promise<void> {
    const key = originKey(site);
    const rpc = connectionRegistry.get(key);
    if (rpc) {
        // Snapshot before closing to catch any mid-session token rotation (CF only).
        await persistSessionState(site, rpc.context);
        await rpc.close();
        connectionRegistry.delete(key);
    }
    // Drop the site→project metadata so a different project started on this port
    // next is not treated as the one that just stopped. The project's saved
    // session (keyed by project) is kept for a same-project re-start.
    forgetSite(site);
}

/**
 * Closes every registered page and the browser itself. Safe to call when no
 * browser is running.
 */
export async function stopBrowser(): Promise<void> {
    if (!browser) {
        return;
    }

    await Promise.all(
        [...connectionRegistry.entries()].map(async ([key, rpc]) => {
            try {
                await persistSessionState(rpc.fullUrl, rpc.context);
                await rpc.close();
            } catch {
                // Ignore errors when closing pages.
            }
            connectionRegistry.delete(key);
        })
    );

    try {
        await browser.close();
    } catch {
        // Ignore errors when closing the browser.
    }

    browser = undefined;
    browserStartPromise = undefined;
}

/**
 * Returns `true` when no editor pages are currently open.
 * Used by the `stop` step to decide whether to shut down the browser.
 *
 * @returns `true` if the connection registry has no entries, `false` otherwise.
 */
export function isRegistryEmpty(): boolean {
    return connectionRegistry.size === 0;
}

/**
 * Issues an authenticated GET through the browser context registered for
 * `site`, reusing its approuter session cookies. Does not launch a browser or
 * open a page — if no session is registered for `site`, throws so the caller
 * can tell the agent to run the `start` step first.
 *
 * @param site URL whose registered context should issue the request.
 * @param url Absolute URL to GET (resolved against the localhost `site` origin by the caller).
 * @returns The response status, content-type, and body text.
 */
export async function fetchViaContext(site: string, url: string): Promise<FetchViaContextResult> {
    const rpc = connectionRegistry.get(originKey(site));
    if (!rpc) {
        throw new Error('No active editor session for this site. Run the "start" step first.');
    }
    const response = await rpc.context.request.get(url, { maxRedirects: 5 });
    return {
        status: response.status(),
        contentType: response.headers()['content-type'] ?? '',
        body: await response.text()
    };
}

/**
 * Default transport — the Playwright-backed implementation bound from this
 * module's exports. The `rta/` layer consumes this when no transport is
 * injected explicitly.
 */
export const defaultTransport: FrontendActionTransport = {
    callFrontendAction,
    fetchViaContext,
    disconnectSite,
    stopBrowser
};
