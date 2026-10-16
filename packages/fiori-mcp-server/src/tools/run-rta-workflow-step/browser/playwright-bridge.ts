import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, type Browser, type BrowserContext, type Frame, type Page } from 'playwright-core';
import { logger } from '../../../utils/logger.js';
import type { FrontendActionResult, FrontendActionTransport, NeedsUserActionPayload } from './types.js';

// Module-scope singleton state.
//   `browser` — launched once and reused for the lifetime of the Node process.
//   `browserStartPromise` — deduplicates concurrent launches so the first
//      caller's `chromium.launch()` is awaited by everyone else.
//   `connectionRegistry` — site URL → open page handle. One entry per editor URL.
//   `sessionStateByKey` — resolved session key → in-memory Playwright storage
//      state (cookies/localStorage). Survives `disconnectSite` so an
//      authenticated login is reused across re-`start` within the process.
//   `backendBySiteOrigin` — site origin → backend origin, learned the first
//      time a `start` observes an off-loopback (IdP/approuter) redirect.
//      Membership also gates session reuse: only sites that redirect (CF
//      XSUAA / ABAP reentrance) are ever snapshotted — a plain localhost ABAP
//      app never is, so its behaviour is unchanged.
let browser: Browser | undefined;
let browserStartPromise: Promise<Browser> | undefined;
const connectionRegistry: Map<string, PageRPC> = new Map();
const sessionStateByKey: Map<string, StorageState> = new Map();
const backendBySiteOrigin: Map<string, string> = new Map();

/** In-memory Playwright storage state (shape returned by `context.storageState()`). */
type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

/** Bounded probe for the webclient bridge: generous for a valid app, far below the 60 s action timeout. */
const BRIDGE_PROBE_MS = 8000;

/** Markers that positively identify a backend login / IdP page (CF XSUAA, SAML reentrance, generic logon). */
const LOGIN_PAGE_MARKERS =
    /saml2|oauth\/authorize|xsuaa|\/login|sap-ui-login|j_security_check|identity provider|sign in|logon/i;

/** Guidance returned to the AI/skill when a backend login page is detected. */
const LOGIN_REQUIRED_MESSAGE =
    'The editor URL redirected to a backend login page (e.g. Cloud Foundry XSUAA or ABAP reentrance). ' +
    'Complete the login once in the opened (headed) browser, then call the "start" step again. ' +
    'Set PLAYWRIGHT_SESSION_STATE_PATH to a directory to reuse the session across restarts (incl. headless).';

/**
 * Reads a boolean-ish environment value. Treats `"true"`/`"1"` as true.
 *
 * @param value Raw environment variable value.
 * @returns `true` when the value opts in.
 */
function truthyEnv(value: string | undefined): boolean {
    return value === 'true' || value === '1';
}

/**
 * Whether the browser should launch headless. Default is headed (`false`),
 * matching the pre-existing behaviour; `PLAYWRIGHT_HEADLESS=true|1` opts in.
 *
 * @returns `true` when headless mode is requested.
 */
function isHeadless(): boolean {
    return truthyEnv(process.env.PLAYWRIGHT_HEADLESS);
}

/**
 * Optional directory for cross-restart session persistence. When set, each
 * backend's storage state is also written to / read from a file in this
 * directory. Unset ⇒ in-memory only (no disk footprint).
 *
 * @returns The configured directory, or `undefined`.
 */
function sessionDir(): string | undefined {
    const dir = process.env.PLAYWRIGHT_SESSION_STATE_PATH;
    return dir && dir.length > 0 ? dir : undefined;
}

/**
 * Normalises a URL to its origin (scheme + host + port). Returns the raw input
 * when it cannot be parsed, so callers always get a usable map key.
 *
 * @param url URL or origin string.
 * @returns The origin, or the input unchanged if unparseable.
 */
function originKey(url: string): string {
    try {
        return new URL(url).origin;
    } catch {
        return url;
    }
}

/**
 * Resolves the session key for a site: the learned backend origin when a
 * redirect has been observed, otherwise the site's own origin.
 *
 * @param site Editor URL.
 * @returns The session key under which storage state is stored/looked up.
 */
function resolveSessionKey(site: string): string {
    const siteOrigin = originKey(site);
    return backendBySiteOrigin.get(siteOrigin) ?? siteOrigin;
}

/**
 * Whether the site has been observed to redirect to a backend.
 *
 * @param site Editor URL.
 * @returns `true` when the site has been observed to redirect to a backend.
 */
function isRedirectingSite(site: string): boolean {
    return backendBySiteOrigin.has(originKey(site));
}

/**
 * Maps a session key to a filesystem-safe file name for on-disk persistence.
 *
 * @param key Session key (an origin).
 * @returns A sanitised `<key>.json` file name.
 */
function sessionFileName(key: string): string {
    return `${key.replace(/[^a-zA-Z0-9.-]+/g, '_')}.json`;
}

/**
 * Builds the `newContext` options for a site, seeding storage state from a
 * prior authenticated session when one is armed and available. Seeding is
 * gated on {@link isRedirectingSite}, so non-redirecting (ABAP) sites always
 * get a plain context — unchanged behaviour.
 *
 * @param site Editor URL.
 * @returns Context options with an optional `storageState` seed.
 */
function buildContextOptions(site: string): { viewport: null; storageState?: StorageState | string } {
    if (!isRedirectingSite(site)) {
        return { viewport: null };
    }
    const key = resolveSessionKey(site);
    const inMemory = sessionStateByKey.get(key);
    if (inMemory) {
        return { viewport: null, storageState: inMemory };
    }
    const dir = sessionDir();
    if (dir) {
        // Playwright accepts a path and silently starts fresh if it is unreadable,
        // but guard the join so a bad key can never seed from an unexpected path.
        return { viewport: null, storageState: join(dir, sessionFileName(key)) };
    }
    return { viewport: null };
}

/**
 * Snapshots an authenticated context's storage state under its session key —
 * always in memory, and additionally to disk when `PLAYWRIGHT_SESSION_STATE_PATH`
 * is set. Gated on {@link isRedirectingSite}: a non-redirecting site is never
 * snapshotted. All failures are logged and swallowed so a `start` never fails
 * because of persistence.
 *
 * @param site Editor URL (used to resolve the session key and the gate).
 * @param context The live, authenticated browser context.
 */
async function persistSessionState(site: string, context: BrowserContext): Promise<void> {
    if (!isRedirectingSite(site)) {
        return;
    }
    const key = resolveSessionKey(site);
    try {
        const state = await context.storageState();
        sessionStateByKey.set(key, state);
        const dir = sessionDir();
        if (dir) {
            // The state holds live session cookies (credential material). Write it
            // ourselves with restrictive modes — owner-only dir (0o700) and file
            // (0o600) — rather than Playwright's default world-readable write. The
            // explicit chmod also tightens an already-existing file (writeFile's
            // mode only applies on create).
            await mkdir(dir, { recursive: true, mode: 0o700 });
            const file = join(dir, sessionFileName(key));
            await writeFile(file, JSON.stringify(state), { mode: 0o600 });
            await chmod(file, 0o600);
        }
    } catch (error) {
        logger.warn(`Failed to persist RTA session state: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Probes once (bounded) for the Joule webclient bridge on the page. Resolves
 * `true` when the bridge appears within {@link BRIDGE_PROBE_MS}, `false` on
 * timeout — without throwing.
 *
 * @param page The page just navigated to the editor URL.
 * @returns `true` if the webclient bridge is present.
 */
async function probeBridge(page: Page): Promise<boolean> {
    return page
        .waitForFunction(
            () =>
                !!(
                    window as unknown as {
                        sapdas?: { webclientBridge?: { getFrontendActions?: () => unknown } };
                    }
                ).sapdas?.webclientBridge?.getFrontendActions,
            undefined,
            { timeout: BRIDGE_PROBE_MS }
        )
        .then(() => true)
        .catch(() => false);
}

/**
 * Positively identifies a backend login / IdP page. Returns `true` only on a
 * concrete signal — the page navigated off the loopback interface (the editor
 * binds to localhost, so an off-loopback origin is an IdP redirect), or a known
 * login/SAML/OAuth marker appears in the URL, title, or body. Never classifies
 * on bridge-absence alone, so a slow-but-valid app is not mislabelled.
 *
 * @param url Current page URL (post-redirect).
 * @param title Current page title.
 * @param bodyText A bounded slice of the page body text.
 * @returns `true` when the page is a backend login page.
 */
function isBackendLoginPage(url: string, title: string, bodyText: string): boolean {
    let host: string;
    try {
        host = new URL(url).hostname;
    } catch {
        return false;
    }
    const offLoopback = host !== 'localhost' && host !== '127.0.0.1';
    const markerHit =
        LOGIN_PAGE_MARKERS.test(url) || LOGIN_PAGE_MARKERS.test(title) || LOGIN_PAGE_MARKERS.test(bodyText);
    return offLoopback || markerHit;
}

/**
 * Records a `siteOrigin → backendOrigin` mapping when the page landed on an
 * off-loopback origin, arming session reuse for that site on the next `start`.
 *
 * @param site Original editor URL requested.
 * @param landedUrl The URL the page actually landed on after redirects.
 */
function recordBackendOrigin(site: string, landedUrl: string): void {
    const siteOrigin = originKey(site);
    const landedOrigin = originKey(landedUrl);
    let landedHost: string;
    try {
        landedHost = new URL(landedUrl).hostname;
    } catch {
        return;
    }
    const offLoopback = landedHost !== 'localhost' && landedHost !== '127.0.0.1';
    // Prefer the first off-loopback origin seen (approuter/backend host) and do
    // not overwrite it with a later hop (e.g. the final IdP), to avoid merging
    // two different backends that share one IdP tenant.
    if (offLoopback && !backendBySiteOrigin.has(siteOrigin)) {
        backendBySiteOrigin.set(siteOrigin, landedOrigin);
    }
}

/**
 * Internal RPC handle for a single browser page.
 */
interface PageRPC {
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

    return { context, callFrontendAction, close };
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
            sessionStateByKey.clear();
            backendBySiteOrigin.clear();
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
        const context = await activeBrowser.newContext(buildContextOptions(site));
        const page: Page = await context.newPage();

        page.on('pageerror', (err) => {
            logger.warn(`Page error for ${site}: ${err.message}`);
        });

        page.on('close', () => {
            connectionRegistry.delete(site);
        });

        try {
            await page.goto(site, { waitUntil: 'networkidle', timeout: 60000 });

            // Bounded probe for the webclient bridge. On success → app page.
            // On timeout → distinguish a backend login page from a slow app.
            const bridgeReady = await probeBridge(page);
            if (!bridgeReady) {
                const landedUrl = page.url();
                recordBackendOrigin(site, landedUrl);
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
        // Snapshot before closing to catch any mid-session token rotation (gated).
        await persistSessionState(site, rpc.context);
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
                await persistSessionState(site, rpc.context);
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
    sessionStateByKey.clear();
    backendBySiteOrigin.clear();
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
