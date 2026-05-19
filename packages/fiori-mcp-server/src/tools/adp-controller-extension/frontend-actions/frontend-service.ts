import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Browser, type Frame, type Page } from 'playwright-core';
import { logger } from '../../../utils/logger';

/**
 * Result envelope returned by every Joule frontend action.
 */
export interface FrontendActionResult<T = unknown> {
    isSuccess: boolean;
    payload: T | null;
    error: { code: string; message: string | null } | null;
}

/**
 * Internal RPC handle for a single browser page.
 */
interface PageRPC {
    callFrontendAction<TReturn = unknown>(
        actionName: string,
        payload?: Record<string, unknown>,
        frameId?: string
    ): Promise<FrontendActionResult<TReturn>>;
    close(): Promise<void>;
}

/**
 * Persisted state about a Chrome instance launched by this module. Stored
 * on disk so that subsequent Node processes (e.g. successive skill steps)
 * can reattach to the same browser via CDP rather than each launching their
 * own.
 */
interface PersistentBrowserState {
    pid: number;
    cdpEndpoint: string;
    userDataDir: string;
}

const STATE_DIR = join(tmpdir(), 'fiori-mcp-rta');
const STATE_FILE = join(STATE_DIR, 'browser-state.json');

/**
 * Wraps a Playwright `Page` in an RPC handle that invokes Joule frontend
 * actions through `window.sapdas.webclientBridge.getFrontendActions()`.
 *
 * @param page The Playwright page to wrap.
 * @returns The RPC handle.
 */
async function createPageRPC(page: Page): Promise<PageRPC> {
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
                const bridge = (
                    window as unknown as { sapdas?: { webclientBridge?: { getFrontendActions?: () => unknown } } }
                ).sapdas?.webclientBridge;
                if (!bridge?.getFrontendActions) {
                    throw new Error('window.sapdas.webclientBridge.getFrontendActions is not available on the page');
                }
                const actions = bridge.getFrontendActions() as Array<{
                    frontend_action_name: string;
                    function: (arg: unknown) => unknown;
                }>;
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
    };

    return { callFrontendAction, close };
}

let browser: Browser | undefined;
let browserStartPromise: Promise<Browser> | undefined;
const connectionRegistry: Map<string, PageRPC> = new Map();

/**
 * Resolves the Chrome/Chromium executable path. Selection priority:
 *
 * 1. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` — explicit absolute path.
 * 2. `PLAYWRIGHT_BROWSER_CHANNEL` — Playwright channel name (`chrome`,
 *    `chrome-beta`, `msedge`, etc.). We resolve it ourselves because we
 *    spawn the binary directly (Playwright resolves channels internally
 *    only when going through `chromium.launch`, which we no longer do).
 * 3. Default: `chrome` channel — i.e. a system-installed Google Chrome.
 *
 * Note: covers Chromium-family browsers only. Real Firefox / WebKit support
 * would require a separate launch path.
 */
function resolveBrowserExecutable(): string {
    const explicit = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    if (explicit) {
        return explicit;
    }
    const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL ?? 'chrome';
    const macOsPaths: Record<string, string> = {
        chrome: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        'chrome-beta': '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
        'chrome-canary': '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        msedge: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        'msedge-beta': '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta',
        'msedge-dev': '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev'
    };
    if (process.platform === 'darwin' && macOsPaths[channel] && existsSync(macOsPaths[channel])) {
        return macOsPaths[channel];
    }
    // Fall back to letting Playwright resolve the channel (for Linux/Windows or
    // any darwin path not in the table). This will still work as long as the
    // browser is on PATH or in a standard Playwright location.
    throw new Error(
        `Unable to resolve browser executable for channel "${channel}". ` +
            `Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to an absolute path.`
    );
}

/**
 * Reads persisted browser state from disk if present and the recorded process
 * is still alive. Returns `undefined` otherwise (and removes any stale file).
 */
function readState(): PersistentBrowserState | undefined {
    if (!existsSync(STATE_FILE)) {
        return undefined;
    }
    try {
        const raw = readFileSync(STATE_FILE, 'utf8');
        const state = JSON.parse(raw) as PersistentBrowserState;
        // `process.kill(pid, 0)` is a liveness probe — throws if the process
        // is gone. We also accept ESRCH/EPERM as "not alive for us".
        try {
            process.kill(state.pid, 0);
            return state;
        } catch {
            rmSync(STATE_FILE, { force: true });
            return undefined;
        }
    } catch {
        rmSync(STATE_FILE, { force: true });
        return undefined;
    }
}

function writeState(state: PersistentBrowserState): void {
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8');
}

/**
 * Spawns a fresh Chrome with `--remote-debugging-port=0`, waits for the
 * `DevToolsActivePort` file to be written by Chrome, parses the actual port,
 * persists the resulting CDP endpoint to disk, and returns it. The Chrome
 * process is detached so it survives this Node process exiting.
 */
async function spawnDetachedChrome(): Promise<PersistentBrowserState> {
    const executablePath = resolveBrowserExecutable();
    const userDataDir = join(STATE_DIR, `profile-${process.pid}-${Date.now()}`);
    mkdirSync(userDataDir, { recursive: true });

    const args = [
        `--user-data-dir=${userDataDir}`,
        '--remote-debugging-port=0',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-dev-shm-usage'
    ];

    const child: ChildProcess = spawn(executablePath, args, {
        detached: true,
        stdio: 'ignore'
    });
    child.unref();

    if (!child.pid) {
        throw new Error('Failed to spawn browser process');
    }

    const portFile = join(userDataDir, 'DevToolsActivePort');
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
        if (existsSync(portFile)) {
            const content = readFileSync(portFile, 'utf8').trim();
            const [portStr] = content.split('\n');
            const port = Number.parseInt(portStr, 10);
            if (Number.isFinite(port) && port > 0) {
                const cdpEndpoint = `http://127.0.0.1:${port}`;
                const state: PersistentBrowserState = { pid: child.pid, cdpEndpoint, userDataDir };
                writeState(state);
                return state;
            }
        }
        await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('Timed out waiting for Chrome to expose its CDP port');
}

/**
 * Returns a Playwright `Browser` connected to a long-running Chrome process.
 *
 * - If a persisted state file points at a live Chrome process, attach via
 *   `connectOverCDP`. The browser survives across Node processes.
 * - Otherwise, spawn a fresh detached Chrome, persist its CDP endpoint, and
 *   attach to it.
 *
 * The returned `Browser` is held in module scope so concurrent calls in the
 * same Node process share one connection.
 */
async function startBrowser(): Promise<Browser> {
    if (browser?.isConnected()) {
        return browser;
    }
    if (browserStartPromise) {
        return browserStartPromise;
    }

    browserStartPromise = (async () => {
        let state = readState();
        if (!state) {
            state = await spawnDetachedChrome();
        }
        try {
            return await chromium.connectOverCDP(state.cdpEndpoint);
        } catch (error) {
            // Stale state — clear it and retry once with a fresh spawn.
            logger.warn(`Failed to attach to existing Chrome (${String(error)}); spawning a fresh one.`);
            rmSync(STATE_FILE, { force: true });
            state = await spawnDetachedChrome();
            return await chromium.connectOverCDP(state.cdpEndpoint);
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
 * Finds an existing page already navigated to `site` in the connected
 * browser. Used after a fresh `connectOverCDP` to pick up the page that an
 * earlier process opened, instead of opening a duplicate tab.
 */
async function findExistingPage(activeBrowser: Browser, site: string): Promise<Page | undefined> {
    for (const context of activeBrowser.contexts()) {
        for (const page of context.pages()) {
            if (page.url() === site) {
                return page;
            }
        }
    }
    return undefined;
}

/**
 * Invokes a Joule frontend action on the page hosting `site`. Reuses an
 * existing page (across Node processes via CDP) if one is open at that URL;
 * otherwise opens a new one. Throws on transport / lookup failures; returns
 * the FA's result envelope for the caller to inspect.
 *
 * @param site URL to load (typically the adaptation editor URL).
 * @param actionName Frontend action identifier, e.g. `com.sap.ui.flex.startRTA.v1`.
 * @param payload Single object payload forwarded to the FA function.
 * @param frameId Optional frame element id to scope the call to an iframe.
 * @returns The FA result envelope.
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
        const existing = await findExistingPage(activeBrowser, site);
        if (existing) {
            existing.on('close', () => {
                connectionRegistry.delete(site);
            });
            rpc = await createPageRPC(existing);
            connectionRegistry.set(site, rpc);
        }
    }

    if (!rpc) {
        const contexts = activeBrowser.contexts();
        const context = contexts.length > 0 ? contexts[0] : await activeBrowser.newContext();
        const page: Page = await context.newPage();

        page.on('pageerror', (err) => {
            logger.warn(`Page error for ${site}: ${err.message}`);
        });

        page.on('close', () => {
            connectionRegistry.delete(site);
        });

        await page.goto(site, { waitUntil: 'networkidle', timeout: 60000 });

        rpc = await createPageRPC(page);
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
 * Tears down the persistent Chrome process (across Node processes) and
 * removes any persisted state. Safe to call when no browser is running.
 */
export async function stopBrowser(): Promise<void> {
    // Disconnect this process's Playwright `Browser` first so we don't sit
    // on a dead websocket.
    if (browser) {
        for (const [site, rpc] of connectionRegistry.entries()) {
            try {
                await rpc.close();
            } catch {
                // Ignore errors when closing pages.
            }
            connectionRegistry.delete(site);
        }
        try {
            // `close()` would also try to kill the process. We just want to
            // disconnect; the persistent process is killed below via SIGTERM.
            await browser.close();
        } catch {
            // Ignore errors when closing the browser.
        }
        browser = undefined;
        browserStartPromise = undefined;
    }

    // Kill the detached Chrome process, if any.
    const state = readState();
    if (state) {
        try {
            process.kill(state.pid, 'SIGTERM');
        } catch {
            // Already gone.
        }
        try {
            rmSync(state.userDataDir, { recursive: true, force: true });
        } catch {
            // Ignore — it's a temp dir.
        }
        rmSync(STATE_FILE, { force: true });
    }
}
