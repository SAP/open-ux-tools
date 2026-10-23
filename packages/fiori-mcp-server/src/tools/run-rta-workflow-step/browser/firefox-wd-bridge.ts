import { get as httpGet } from 'node:http';
import { createServer } from 'node:net';
import type { ChildProcess } from 'node:child_process';
import { start as startGeckodriver } from 'geckodriver';
import WebDriverClass, { type Client } from 'webdriver';
import { logger } from '../../../utils/logger.js';
import type { FrontendActionResult, FrontendActionTransport } from './types.js';

/**
 * Picks a free TCP port on the loopback interface by binding to port 0 and
 * reading back the OS-assigned port. Avoids the collisions and orphaned-process
 * port poisoning that a fixed port suffers when a prior geckodriver did not shut
 * down cleanly. Overridable via GECKODRIVER_PORT when a specific port is needed.
 */
function findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const srv = createServer();
        srv.on('error', reject);
        srv.listen(0, '127.0.0.1', () => {
            const addr = srv.address();
            if (addr && typeof addr === 'object') {
                const { port } = addr;
                srv.close(() => resolve(port));
            } else {
                srv.close(() => reject(new Error('Could not determine a free port for geckodriver')));
            }
        });
    });
}

/**
 * Milliseconds to wait for geckodriver to become ready.
 */
const GECKODRIVER_START_TIMEOUT_MS = 15000;

/**
 * Script timeout for executeAsyncScript calls. FrontendActionsAPI may take
 * up to 60 s to start RTA, plus we want headroom.
 */
const SCRIPT_TIMEOUT_MS = 90000;

/** Geckodriver child process — kept to SIGTERM on stopBrowser(). */
let geckodriverProcess: ChildProcess | undefined;

/**
 * SIGTERMs the geckodriver child (if any) and clears the handle. Safe to call
 * when no process is running. Used both on a failed session start (so a crashed
 * `newSession` does not leave an orphan holding the port) and on stopBrowser().
 */
function killGeckodriver(): void {
    if (geckodriverProcess?.pid !== undefined) {
        try {
            process.kill(geckodriverProcess.pid, 'SIGTERM');
        } catch {
            // already exited
        }
    }
    geckodriverProcess = undefined;
}

/** Active WebDriver client — one per Node process (one Firefox window). */
let wdClient: Client | undefined;
let sessionStartPromise: Promise<Client> | undefined;

/** site URL → RPC handle. */
const connectionRegistry: Map<string, SessionRPC> = new Map();

interface SessionRPC {
    callFrontendAction<TReturn = unknown>(
        actionName: string,
        payload?: Record<string, unknown>,
        frameId?: string
    ): Promise<FrontendActionResult<TReturn>>;
    close(): Promise<void>;
}

/**
 * Converts a FrontendActions contract name to the method name on the API.
 * e.g. "com.sap.ui.flex.startRTA.v1" → "startRTA"
 *
 * @param actionName
 */
function toMethodName(actionName: string): string {
    const match = /^com\.sap\.ui\.flex\.(.+)\.v\d+$/.exec(actionName);
    if (!match?.[1]) {
        throw new Error(`Cannot derive method name from action "${actionName}"`);
    }
    return match[1];
}

/**
 * Polls geckodriver's /status endpoint until it reports ready.
 *
 * @param port
 * @param timeoutMs
 */
function waitForGeckodriver(port: number, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + timeoutMs;

        function poll(): void {
            const req = httpGet(`http://127.0.0.1:${port}/status`, (res) => {
                const chunks: Buffer[] = [];
                res.on('data', (c: Buffer) => chunks.push(c));
                res.on('end', () => {
                    try {
                        const body = JSON.parse(Buffer.concat(chunks).toString()) as {
                            value?: { ready?: boolean };
                        };
                        if (body.value?.ready === true) {
                            resolve();
                        } else {
                            retry();
                        }
                    } catch {
                        retry();
                    }
                });
            });
            req.on('error', retry);
        }

        function retry(): void {
            if (Date.now() >= deadline) {
                reject(new Error(`Geckodriver did not become ready on port ${port} within ${timeoutMs} ms`));
                return;
            }
            setTimeout(poll, 300);
        }

        poll();
    });
}

/**
 * Downloads geckodriver if absent, launches it, and opens a WebDriver session
 * against headless Firefox. Deduplicates concurrent callers.
 */
async function startSession(): Promise<Client> {
    if (wdClient) {
        return wdClient;
    }
    if (sessionStartPromise) {
        return sessionStartPromise;
    }

    // Assign sessionStartPromise synchronously (no await before it) so concurrent
    // callers dedupe onto the same start. Port resolution — which awaits
    // findFreePort() — happens INSIDE the promise, not before it; awaiting here
    // would reopen the race and start geckodriver twice.
    sessionStartPromise = (async (): Promise<Client> => {
        const port = process.env.GECKODRIVER_PORT ? parseInt(process.env.GECKODRIVER_PORT, 10) : await findFreePort();
        const firefoxBinary = process.env.FIREFOX_EXECUTABLE_PATH ?? '/extbin/bin/firefox';
        const cacheDir = process.env.GECKODRIVER_CACHE_DIR ?? `${process.env.HOME ?? '/tmp'}/.geckodriver`;

        logger.info(`Starting geckodriver on port ${port} (cache: ${cacheDir})`);

        // geckodriver.start() auto-downloads the binary if not in cacheDir.
        // host: '127.0.0.1' overrides the default '0.0.0.0' to avoid binding on all interfaces.
        geckodriverProcess = await startGeckodriver({
            port,
            host: '127.0.0.1',
            cacheDir,
            binary: firefoxBinary,
            spawnOpts: { stdio: ['ignore', 'pipe', 'pipe'] }
        });

        geckodriverProcess.stdout?.on('data', (c: Buffer) => logger.debug(`geckodriver: ${c.toString().trim()}`));
        geckodriverProcess.stderr?.on('data', (c: Buffer) => logger.debug(`geckodriver: ${c.toString().trim()}`));

        geckodriverProcess.on('exit', () => {
            geckodriverProcess = undefined;
            wdClient = undefined;
            sessionStartPromise = undefined;
            connectionRegistry.clear();
        });

        await waitForGeckodriver(port, GECKODRIVER_START_TIMEOUT_MS);
        logger.info(`Geckodriver ready on port ${port}`);

        const client = await WebDriverClass.newSession({
            hostname: '127.0.0.1',
            port,
            // directConnect is an Appium-only feature (rewrites the endpoint from
            // "appium:directConnect*" capabilities after session creation). We drive
            // geckodriver/Marionette directly, never Appium, so disable it. Leaving it
            // on (the webdriver default) makes newSession() run setupDirectConnect(),
            // which dereferences client.capabilities and throws
            // "Cannot read properties of undefined (reading 'appium:directConnectProtocol')"
            // in the esbuild-bundled build.
            enableDirectConnect: false,
            capabilities: {
                browserName: 'firefox',
                'moz:firefoxOptions': {
                    binary: firefoxBinary,
                    args: ['-headless']
                }
            },
            logLevel: 'silent'
        });

        // Set generous timeouts: implicit=0, pageLoad=60s, script=90s.
        await client.setTimeouts(0, 60000, SCRIPT_TIMEOUT_MS);

        return client;
    })();

    try {
        wdClient = await sessionStartPromise;
        return wdClient;
    } catch (error) {
        sessionStartPromise = undefined;
        // A failed newSession/setTimeouts leaves geckodriver running and holding
        // its port; kill it so the next startSession() can bind a fresh one.
        killGeckodriver();
        throw error;
    }
}

/**
 * Runs `sap/ui/rta/api/FrontendActionsAPI` in the current browsing context
 * via `executeAsyncScript`. WebDriver's executeScript is synchronous, so we
 * use executeAsyncScript with the callback pattern for the Promise-based API.
 *
 * @param client
 * @param actionName
 * @param payload
 */
async function invokeViaFrontendActionsAPI<TReturn>(
    client: Client,
    actionName: string,
    payload: Record<string, unknown>
): Promise<FrontendActionResult<TReturn>> {
    const method = toMethodName(actionName);

    // Arguments: [method, payload, done_callback].
    // done_callback is injected by WebDriver as the last argument of executeAsyncScript.
    const script = /* js */ `
        var method = arguments[0];
        var payload = arguments[1];
        var done = arguments[arguments.length - 1];
        var deadline = Date.now() + 60000;

        // Returns the real application component (not FLP/shell infrastructure).
        // The FLP shell loads before the app, so readyState=complete is not enough —
        // we must wait for the app component to appear in the registry.
        function getAppComponent() {
            // UI5 ≥1.120 deprecated sap.ui.getCore().mObjects — it returns an empty object {}.
            // Use Component.registry.all() when available; fall back to mObjects only when it
            // actually has entries (older UI5 where the new API doesn't exist).
            var mObjMap = sap.ui.getCore && sap.ui.getCore().mObjects && sap.ui.getCore().mObjects.component;
            var regMap = sap.ui.core && sap.ui.core.Component && sap.ui.core.Component.registry && sap.ui.core.Component.registry.all && sap.ui.core.Component.registry.all();
            var source = (regMap && Object.keys(regMap).length > 0) ? regMap : (mObjMap && Object.keys(mObjMap).length > 0 ? mObjMap : {});
            var comps = Object.values(source);
            return comps.find(function(c) {
                var id = c.getManifestEntry && c.getManifestEntry('sap.app') && c.getManifestEntry('sap.app').id || '';
                return id && id.indexOf('sap.ui.core') === -1 && id.indexOf('sap.ushell') === -1;
            }) || null;
        }

        function waitForSapRequire() {
            if (window.sap && window.sap.ui && typeof window.sap.ui.require === 'function') {
                // Wait for the app component before proceeding — avoids "t is null" from
                // RTA trying to attach before the component exists in the registry.
                if (!getAppComponent()) {
                    if (Date.now() < deadline) { setTimeout(waitForSapRequire, 200); }
                    else { done({ error: 'App component not found in registry after 60s' }); }
                    return;
                }
                window.sap.ui.require(['sap/ui/rta/api/FrontendActionsAPI'], function(api) {
                    // Some step → action mappings (e.g. getPageActions, callPageAction,
                    // pressInteractive) are not implemented by every FrontendActionsAPI
                    // version. Guard before calling so the caller gets a clean
                    // "unsupported" result instead of an opaque WebDriverError from
                    // dereferencing undefined.
                    if (typeof api[method] !== 'function') {
                        done({ unsupported: method });
                        return;
                    }
                    try {
                        Promise.resolve(api[method].call(api, payload)).then(
                            function(r) { done({ result: r }); },
                            function(e) { done({ error: String(e && e.message || e) }); }
                        );
                    } catch(e) {
                        done({ error: String(e && e.message || e) });
                    }
                }, function(e) {
                    done({ error: 'Failed to require FrontendActionsAPI: ' + String(e) });
                });
            } else if (Date.now() < deadline) {
                setTimeout(waitForSapRequire, 200);
            } else {
                done({ error: 'sap.ui.require not available after 60s' });
            }
        }
        waitForSapRequire();
    `;

    const response = ((await client.executeAsyncScript(script, [method, payload])) ?? {}) as {
        result?: unknown;
        error?: string;
        unsupported?: string;
    };

    if (response.unsupported) {
        return {
            isSuccess: false,
            payload: null,
            error: {
                code: 'ACTION_NOT_SUPPORTED',
                message: `FrontendActionsAPI has no method "${response.unsupported}" (action "${actionName}") in this UI5 version.`
            }
        } as FrontendActionResult<TReturn>;
    }

    if (response.error) {
        return {
            isSuccess: false,
            payload: null,
            error: { code: 'FRONTEND_ACTION_ERROR', message: response.error }
        } as FrontendActionResult<TReturn>;
    }

    // The injected script always resolves with a `result` envelope on success.
    // Guard against a missing one so callers always receive a well-formed
    // FrontendActionResult rather than `undefined`.
    if (response.result === undefined || response.result === null) {
        return {
            isSuccess: false,
            payload: null,
            error: { code: 'EMPTY_RESPONSE', message: `Action "${actionName}" returned no result.` }
        } as FrontendActionResult<TReturn>;
    }

    return response.result as FrontendActionResult<TReturn>;
}

/**
 * Switches into the iframe whose id matches `frameId`, runs `fn`, then
 * switches back to the top frame. If `frameId` is undefined, runs `fn`
 * in the current context.
 *
 * Uses executeAsyncScript to find the frame index (WebDriver's switchToFrame
 * accepts a numeric index or an element reference). We locate the iframe by
 * iterating window.frames and checking each frame's frameElement id.
 *
 * @param client
 * @param frameId
 * @param fn
 */
async function withFrame<T>(client: Client, frameId: string | undefined, fn: () => Promise<T>): Promise<T> {
    if (!frameId) {
        return fn();
    }

    // Poll for the iframe: the CPE shell injects it dynamically after React mounts,
    // so a one-shot querySelectorAll immediately after DOMContentLoaded finds nothing.
    const findScript = /* js */ `
        var id = arguments[0];
        var done = arguments[arguments.length - 1];
        var deadline = Date.now() + 30000;
        function poll() {
            var iframes = document.querySelectorAll('iframe');
            for (var i = 0; i < iframes.length; i++) {
                if (iframes[i].id === id) { done(i); return; }
            }
            if (Date.now() < deadline) { setTimeout(poll, 300); }
            else { done(-1); }
        }
        poll();
    `;
    const frameIndex = (await client.executeAsyncScript(findScript, [frameId])) as number;
    if (frameIndex === -1) {
        throw new Error(`Frame with id "${frameId}" not found after 30s`);
    }

    // switchToFrame with a number switches by frame index.
    await (client as unknown as { switchToFrame(id: number): Promise<void> }).switchToFrame(frameIndex);
    try {
        return await fn();
    } finally {
        await client.switchToParentFrame().catch(() => undefined);
    }
}

/**
 * Navigates to `site` and returns an RPC handle for it.
 *
 * @param client
 * @param site
 */
async function createSessionRPC(client: Client, site: string): Promise<SessionRPC> {
    await client.navigateTo(site);

    // Wait for the page to be fully loaded (readyState=complete), not just parsed
    // (DOMContentLoaded). The CPE shell React app mounts and injects the preview iframe
    // after DOMContentLoaded, so we need the full load to ensure it exists.
    const readyScript = /* js */ `
        var done = arguments[arguments.length - 1];
        if (document.readyState === 'complete') { done(); return; }
        window.addEventListener('load', function() { done(); }, { once: true });
    `;
    await client.executeAsyncScript(readyScript, []);

    const callFrontendAction = async <TReturn = unknown>(
        actionName: string,
        payload: Record<string, unknown> = {},
        frameId?: string
    ): Promise<FrontendActionResult<TReturn>> =>
        withFrame(client, frameId, () => invokeViaFrontendActionsAPI<TReturn>(client, actionName, payload));

    const close = async (): Promise<void> => {
        await client.navigateTo('about:blank').catch(() => undefined);
    };

    return { callFrontendAction, close };
}

/**
 * Invokes a frontend action on the page hosting `site`. Reuses an existing
 * RPC handle if registered; otherwise navigates to the site first.
 *
 * @param site
 * @param actionName
 * @param payload
 * @param frameId
 */
export async function callFrontendAction<TReturn = unknown>(
    site: string,
    actionName: string,
    payload: Record<string, unknown> = {},
    frameId?: string
): Promise<FrontendActionResult<TReturn>> {
    const client = await startSession();
    let rpc = connectionRegistry.get(site);

    if (!rpc) {
        rpc = await createSessionRPC(client, site);
        connectionRegistry.set(site, rpc);
    }

    // The key-user permission check reads flex `/flex/data/` settings that may not
    // be cached yet on a freshly (re)loaded page, so startRTA can transiently fail
    // with "You do not have key user permissions" even though the backend reports
    // isKeyUser:true. Retry a few times before surfacing it.
    const KEY_USER_RETRY_PATTERN = /key user permission/i;
    const MAX_KEY_USER_RETRIES = 4;
    const KEY_USER_RETRY_DELAY_MS = 2000;

    let lastResult = await rpc.callFrontendAction<TReturn>(actionName, payload, frameId);
    for (
        let attempt = 1;
        attempt <= MAX_KEY_USER_RETRIES &&
        !lastResult.isSuccess &&
        KEY_USER_RETRY_PATTERN.test(lastResult.error?.message ?? '');
        attempt++
    ) {
        logger.info(
            `startRTA key-user check not ready, retry ${attempt}/${MAX_KEY_USER_RETRIES} after ${KEY_USER_RETRY_DELAY_MS} ms`
        );
        await new Promise((resolve) => setTimeout(resolve, KEY_USER_RETRY_DELAY_MS));
        lastResult = await rpc.callFrontendAction<TReturn>(actionName, payload, frameId);
    }
    return lastResult;
}

/**
 * Removes the RPC handle for `site` (navigates it to about:blank).
 *
 * @param site
 */
export async function disconnectSite(site: string): Promise<void> {
    const rpc = connectionRegistry.get(site);
    if (rpc) {
        await rpc.close();
        connectionRegistry.delete(site);
    }
}

/**
 * Ends the WebDriver session and kills geckodriver.
 */
export async function stopBrowser(): Promise<void> {
    if (!wdClient) {
        return;
    }

    for (const [, rpc] of connectionRegistry.entries()) {
        await rpc.close().catch(() => undefined);
    }
    connectionRegistry.clear();

    await wdClient.deleteSession().catch(() => undefined);
    wdClient = undefined;
    sessionStartPromise = undefined;

    killGeckodriver();
}

/**
 * Returns true when no editor pages are currently open.
 */
export function isRegistryEmpty(): boolean {
    return connectionRegistry.size === 0;
}

/**
 * Firefox/geckodriver WebDriver transport.
 *
 * On first use: auto-downloads geckodriver (via the `geckodriver` npm package)
 * if not already cached, launches it, and opens a WebDriver session against
 * headless Firefox (`/extbin/bin/firefox` by default, or FIREFOX_EXECUTABLE_PATH).
 * RTA actions are driven via `executeAsyncScript` using
 * `sap/ui/rta/api/FrontendActionsAPI` — no relay, no injected client.js.
 */
export const firefoxWdTransport: FrontendActionTransport = {
    callFrontendAction,
    disconnectSite,
    stopBrowser
};
