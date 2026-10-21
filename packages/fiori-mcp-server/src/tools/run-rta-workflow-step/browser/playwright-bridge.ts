import { chromium, type Browser, type BrowserContext, type Frame, type Page } from 'playwright-core';
import { logger } from '../../../utils/logger.js';
import {
    buildContextOptions,
    clearSessions,
    forgetSite,
    isBackendLoginPage,
    isHeadless,
    LOGIN_REQUIRED_MESSAGE,
    originKey,
    persistSessionState,
    probeBridge
} from './session.js';
import type {
    FetchViaContextResult,
    FrontendActionResult,
    FrontendActionTransport,
    NeedsUserActionPayload
} from './types.js';

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
 * Shape of the Joule webclient bridge as exposed on the editor page's
 * `window` object. Only the surface we use is typed.
 */
interface WebclientBridgeWindow {
    sapdas?: {
        webclientBridge?: {
            getFrontendActions?: () => Array<{
                frontend_action_name: string;
                function: (arg: unknown) => unknown;
            }>;
        };
    };
}

/**
 * Wraps a Playwright `Page` in an RPC handle that invokes Joule frontend
 * actions through `window.sapdas.webclientBridge.getFrontendActions()`.
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

        // Wait up to 60 s for the bridge to be registered (RTA needs time to start).
        await (executionContext as Page | Frame).waitForFunction(
            () =>
                !!(
                    window as unknown as {
                        sapdas?: { webclientBridge?: { getFrontendActions?: () => unknown } };
                    }
                ).sapdas?.webclientBridge?.getFrontendActions,
            undefined,
            { timeout: 60000 }
        );

        const response = await executionContext.evaluate(
            async ({ name, p }: { name: string; p: Record<string, unknown> }) => {
                const bridge = (window as unknown as WebclientBridgeWindow).sapdas?.webclientBridge;
                if (!bridge?.getFrontendActions) {
                    throw new Error('window.sapdas.webclientBridge.getFrontendActions is not available on the page');
                }
                const actions = bridge.getFrontendActions();
                const entry = actions.find((a) => a.frontend_action_name === name);
                if (!entry) {
                    throw new Error(`Frontend action "${name}" not registered`);
                }
                return await entry.function(p);
            },
            { name: actionName, p: payload }
        );
        return response as FrontendActionResult<TReturn>;
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
            clearSessions();
        });
        return browser;
    } catch (error) {
        browserStartPromise = undefined;
        throw error;
    }
}

/**
 * Invokes a Joule frontend action on the page hosting `site`. Reuses an
 * existing page if one is registered for the site; otherwise opens a new
 * one. Throws on transport / lookup failures; returns the frontend action
 * result envelope (including `isSuccess === false` payloads) for the caller to inspect.
 *
 * @param site URL to load (typically the adaptation editor URL).
 * @param actionName Frontend action identifier, e.g. `com.sap.ui.flex.startRTA.v1`.
 * @param payload Object payload forwarded to the frontend action function.
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
    const key = originKey(site);
    let rpc = connectionRegistry.get(key);

    if (!rpc) {
        const context = await activeBrowser.newContext(buildContextOptions(site));
        const page: Page = await context.newPage();

        page.on('pageerror', (err) => {
            logger.warn(`Page error for ${site}: ${err.message}`);
        });

        page.on('close', () => {
            connectionRegistry.delete(key);
        });

        try {
            await page.goto(site, { waitUntil: 'networkidle', timeout: 60000 });

            // Bounded probe for the webclient bridge. On success → app page.
            // On timeout → distinguish a backend login page from a slow app.
            const bridgeReady = await probeBridge(page);
            if (!bridgeReady) {
                const landedUrl = page.url();
                const [title, bodyText] = await Promise.all([
                    page.title().catch(() => ''),
                    page.evaluate(() => document.body?.innerText?.slice(0, 4000) ?? '').catch(() => '')
                ]);
                if (isBackendLoginPage(landedUrl, title, bodyText)) {
                    // Not the app — a backend login page. Tear down and return the
                    // structured signal (riding a success envelope so `unwrap` does
                    // not throw). Do NOT register, so the next `start` reopens cleanly.
                    await context.close().catch(() => undefined);
                    const loginPayload: NeedsUserActionPayload = {
                        __needsUserAction: 'backend_login_required',
                        message: LOGIN_REQUIRED_MESSAGE
                    };
                    return { isSuccess: true, payload: loginPayload as unknown as TReturn, error: null };
                }
                // Ambiguous (slow/error page): fall through to the existing behaviour —
                // register and let the per-action 60 s wait run as a backstop.
            } else {
                // Authenticated app reached — persist the session for reuse (gated).
                await persistSessionState(site, context);
            }

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
    clearSessions();
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
