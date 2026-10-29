import { chromium, type Browser, type BrowserContext, type Frame, type Page } from 'playwright-core';
import { logger } from '../../../utils/logger.js';
import type { FrontendActionResult, FrontendActionTransport } from './types.js';

// Module-scope singleton state.
//   `browser` — launched once and reused for the lifetime of the Node process.
//   `browserStartPromise` — deduplicates concurrent launches so the first
//      caller's `chromium.launch()` is awaited by everyone else.
//   `connectionRegistry` — site URL → open page handle. One entry per editor URL.
let browser: Browser | undefined;
let browserStartPromise: Promise<Browser> | undefined;
const connectionRegistry: Map<string, PageRPC> = new Map();

/**
 * Internal RPC handle for a single browser page.
 */
interface PageRPC {
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
 *     or `{ success, error? }`). Requiring this module directly avoids the Joule
 *     webclient bridge — and therefore the `sap-ui-xx-initializeJoule` URL flag
 *     that would otherwise be needed to register that bridge.
 */
const FLEX_ACTIONS_MODULE = 'sap/ui/rta/api/FrontendActionsAPI';
const UFA_ACTIONS_MODULE = 'sap/ui/joule/frontend/util/ActionHelpers';
const UFA_PREFIX = 'com.sap.ui.unified.frontend.actions.';
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
        // Flex actions already return the { isSuccess, payload, error } envelope.
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
    return { isSuccess: true, payload: raw, error: null };
}

/**
 * Wraps a Playwright `Page` in an RPC handle that invokes frontend actions by
 * `sap.ui.require`-ing the implementing module on the page and calling the
 * method directly — no `window.sapdas.webclientBridge`, so no dependency on the
 * `sap-ui-xx-initializeJoule` flag.
 *
 * Flex actions already return the `{ isSuccess, payload, error }` envelope. UFA
 * actions (`ActionHelpers`) return raw results, so this layer normalizes them
 * into the same envelope: a `{ success: false, error }` result becomes
 * `{ isSuccess: false, error }`; anything else becomes `{ isSuccess: true,
 * payload: <raw> }`. Callers therefore see one consistent shape.
 *
 * @param page The Playwright page to wrap.
 * @param context The BrowserContext that owns the page; closed together with the page on `rpc.close()`.
 * @returns An RPC handle for the page.
 */
async function createPageRPC(page: Page, context: BrowserContext): Promise<PageRPC> {
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

        // Wait up to 60 s for the UI5 loader to be present (RTA needs time to start).
        // This is just `sap.ui.require` — not the Joule bridge — so it is satisfied
        // without the sap-ui-xx-initializeJoule flag.
        await (executionContext as Page | Frame).waitForFunction(
            () => !!(window as unknown as { sap?: { ui?: { require?: unknown } } }).sap?.ui?.require,
            undefined,
            { timeout: 60000 }
        );

        const response = await executionContext.evaluate(
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
                const method = api[fn];
                if (typeof method !== 'function') {
                    throw new Error(`Frontend action "${fn}" is not available on ${mod}`);
                }
                // Return the raw method result; normalization into the Flex envelope
                // happens in Node (normalizeUfaResult) so that pure logic stays testable.
                return await (method as (arg: unknown) => unknown).call(api, p);
            },
            { mod: module, fn: method, p: payload }
        );
        return normalizeUfaResult(response, ufa) as FrontendActionResult<TReturn>;
    };

    const close = async (): Promise<void> => {
        await page.close().catch(() => undefined);
        await context.close().catch(() => undefined);
    };

    return { callFrontendAction, close };
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
                headless: false,
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
                return await chromium.launch({ headless: false, args: launchArgs });
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
 * Invokes a frontend action (Flex or UFA) on the page hosting `site` by
 * requiring the implementing UI5 module (`FrontendActionsAPI` or `ActionHelpers`)
 * on the page. Reuses an existing page if one is registered for the site;
 * otherwise opens a new one.
 *
 * @param site URL to load (typically the adaptation editor URL).
 * @param actionName Frontend action contract name, e.g. `com.sap.ui.flex.startRTA.v1`.
 * @param payload Object payload forwarded to the frontend action.
 * @param frameId Optional frame element id to scope the call to an iframe.
 * @returns The frontend action result envelope.
 */
export async function callFrontendAction<TReturn = unknown>(
    site: string,
    actionName: string,
    payload: Record<string, unknown> = {},
    frameId?: string
): Promise<FrontendActionResult<TReturn>> {
    const activeBrowser = await startBrowser();
    let rpc = connectionRegistry.get(site);

    if (!rpc) {
        const context = await activeBrowser.newContext({ viewport: null });
        const page: Page = await context.newPage();

        page.on('pageerror', (err) => {
            logger.warn(`Page error for ${site}: ${err.message}`);
        });

        page.on('close', () => {
            connectionRegistry.delete(site);
        });

        try {
            await page.goto(site, { waitUntil: 'networkidle', timeout: 60000 });
            rpc = await createPageRPC(page, context);
            connectionRegistry.set(site, rpc);
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
    const rpc = connectionRegistry.get(site);
    if (rpc) {
        await rpc.close();
        connectionRegistry.delete(site);
    }
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
        [...connectionRegistry.entries()].map(async ([site, rpc]) => {
            try {
                await rpc.close();
            } catch {
                // Ignore errors when closing pages.
            }
            connectionRegistry.delete(site);
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
 * Default transport — the Playwright-backed implementation bound from this
 * module's exports. The `rta/` layer consumes this when no transport is
 * injected explicitly.
 */
export const defaultTransport: FrontendActionTransport = {
    callFrontendAction,
    disconnectSite,
    stopBrowser
};
