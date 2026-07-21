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
        await page.close();
        await context.close();
    };

    return { callFrontendAction, close };
}

/**
 * Returns `true` when the error message indicates Playwright could not find
 * the browser binary it was asked to launch (system Chrome missing, bundled
 * Chromium not installed, channel unavailable). Used to decide whether to
 * retry the launch with Playwright's bundled Chromium.
 *
 * @param error Error thrown by `chromium.launch()`.
 * @returns Whether the launch failed due to a missing browser binary.
 */
function isMissingBrowserError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }
    const message = error.message.toLowerCase();
    return (
        message.includes("executable doesn't exist") ||
        message.includes('executable does not exist') ||
        message.includes('failed to find') ||
        message.includes('not installed') ||
        message.includes('no such file or directory')
    );
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
        } catch (error) {
            if (!isMissingBrowserError(error)) {
                throw error;
            }
            logger.warn(
                `Primary browser launch failed (${
                    error instanceof Error ? error.message : String(error)
                }); retrying with Playwright bundled Chromium.`
            );
            try {
                return await chromium.launch({ headless: false, args: launchArgs });
            } catch (fallbackError) {
                if (isMissingBrowserError(fallbackError)) {
                    throw new Error(INSTALL_HINT);
                }
                throw fallbackError;
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

        await page.goto(site, { waitUntil: 'networkidle', timeout: 60000 });

        rpc = await createPageRPC(page, context);
        connectionRegistry.set(site, rpc);
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

    for (const [site, rpc] of connectionRegistry.entries()) {
        try {
            await rpc.close();
        } catch {
            // Ignore errors when closing pages.
        }
        connectionRegistry.delete(site);
    }

    try {
        await browser.close();
    } catch {
        // Ignore errors when closing the browser.
    }

    browser = undefined;
    browserStartPromise = undefined;
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
