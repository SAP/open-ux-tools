import { EventEmitter } from 'node:events';
import { chmodSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type * as PlaywrightBridgeModule from '../../../../../src/tools/run-rta-workflow-step/browser/playwright-bridge.js';
import type * as SessionModule from '../../../../../src/tools/run-rta-workflow-step/browser/session.js';

// --- playwright-core mock --------------------------------------------------

class FakeFrameElement {
    constructor(private readonly id: string | null) {}
    async getAttribute(name: string): Promise<string | null> {
        return name === 'id' ? this.id : null;
    }
}

class FakeFrame {
    public readonly evaluate = jest.fn<Promise<unknown>, [unknown, unknown?]>(async () => ({
        isSuccess: true,
        payload: 'frame',
        error: null
    }));
    public readonly frameElement = jest.fn(async () => new FakeFrameElement(this.id));
    public readonly waitForFunction = jest.fn(async () => undefined);
    constructor(public readonly id: string | null) {}
}

class FakePage extends EventEmitter {
    public readonly evaluate = jest.fn<Promise<unknown>, [unknown, unknown?]>(async () => ({
        isSuccess: true,
        payload: 'page',
        error: null
    }));
    public readonly waitForFunction = jest.fn(async () => undefined);
    public readonly goto = jest.fn(async () => undefined);
    public currentUrl: string;
    public readonly url = jest.fn(() => this.currentUrl);
    public readonly title = jest.fn(async () => '');
    public readonly close = jest.fn(async () => {
        this.emit('close');
    });
    private readonly frameList: FakeFrame[];
    constructor(frames: FakeFrame[] = [], url = 'http://localhost:8080/a') {
        super();
        this.frameList = frames;
        this.currentUrl = url;
    }
    frames(): FakeFrame[] {
        return this.frameList;
    }
}

class FakeContext {
    public readonly newPage: jest.Mock;
    public readonly close = jest.fn(async () => undefined);
    public readonly request = {
        get: jest.fn(async (_url: string, _opts?: unknown) => ({
            status: () => 200,
            headers: () => ({ 'content-type': 'application/xml' }),
            text: async () => '<edmx:Edmx/>'
        }))
    };
    public readonly storageState = jest.fn(async (opts?: { path?: string }) => {
        if (opts?.path) {
            this.savedPaths.push(opts.path);
        }
        return { cookies: [], origins: [] };
    });
    public readonly savedPaths: string[] = [];
    public options: unknown;
    constructor(newPage: jest.Mock, options: unknown) {
        this.newPage = newPage;
        this.options = options;
    }
}

class FakeBrowser extends EventEmitter {
    public readonly close = jest.fn(async () => {
        this.connected = false;
        this.emit('disconnected');
    });
    public readonly newPage = jest.fn();
    public readonly contexts: FakeContext[] = [];
    public readonly newContext = jest.fn(async (options?: unknown) => {
        const context = new FakeContext(this.newPage, options);
        this.contexts.push(context);
        return context;
    });
    public connected = true;
    isConnected(): boolean {
        return this.connected;
    }
}

const launchMock = jest.fn();

jest.unstable_mockModule('playwright-core', () => ({
    chromium: {
        launch: (...args: unknown[]) => launchMock(...args)
    }
}));

// registerSite calls isCFEnvironment(appPath); mock it so tests choose CF vs ABAP
// by the appPath they register, without touching the filesystem.
const mockIsCFEnvironment = jest.fn<(appPath: string) => Promise<boolean>>();
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    isCFEnvironment: mockIsCFEnvironment
}));

// --- helpers ---------------------------------------------------------------

const SITE_A = 'http://localhost:8080/a';
// A second editor on a DIFFERENT origin (port). connectionRegistry keys by
// origin — one editor per origin — so a distinct second page needs a distinct
// port, not just a different path on the same port.
const SITE_B = 'http://localhost:8082/b';

function setupBrowser(pages: FakePage[]): { browser: FakeBrowser; pages: FakePage[] } {
    const browser = new FakeBrowser();
    let i = 0;
    browser.newPage.mockImplementation(async () => {
        const page = pages[i++];
        if (!page) {
            throw new Error('No more fake pages queued');
        }
        return page;
    });
    launchMock.mockResolvedValue(browser);
    return { browser, pages };
}

async function loadPlaywrightBridge(): Promise<typeof PlaywrightBridgeModule> {
    return import('../../../../../src/tools/run-rta-workflow-step/browser/playwright-bridge');
}

/** Loads the session module (same graph as the bridge) to drive registerSite in tests. */
async function loadSession(): Promise<typeof SessionModule> {
    return import('../../../../../src/tools/run-rta-workflow-step/browser/session');
}

/**
 * Whether `dir`'s filesystem actually enforces POSIX file permissions. Some
 * filesystems (certain Docker/overlay/network mounts, non-POSIX temp dirs)
 * silently ignore `chmod`, leaving the creation-default mode (`0o666`). On those
 * the production `chmod(0o600)` is a no-op through no fault of the code, so the
 * on-disk-mode assertion would spuriously fail there. Probe once per call.
 *
 * @param dir Directory to probe (the test's own temp dir).
 * @returns `true` when a 0o600 chmod is reflected back by statSync.
 */
function fsHonorsChmod(dir: string): boolean {
    const probe = join(dir, '.chmod-probe');
    try {
        writeFileSync(probe, '', { mode: 0o600 });
        chmodSync(probe, 0o600);
        return (statSync(probe).mode & 0o777) === 0o600;
    } catch {
        return false;
    } finally {
        rmSync(probe, { force: true });
    }
}

beforeEach(() => {
    jest.resetModules();
    launchMock.mockReset();
    mockIsCFEnvironment.mockReset();
    mockIsCFEnvironment.mockResolvedValue(true); // default: treat registered sites as CF
    delete process.env.PLAYWRIGHT_SESSION_STATE_PATH;
    delete process.env.PLAYWRIGHT_HEADLESS;
});

describe('browser/playwright-bridge', () => {
    test('first callFrontendAction launches browser, opens page, navigates, evaluates', async () => {
        const page = new FakePage();
        const { browser } = setupBrowser([page]);
        page.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: { rtaStarted: true }, error: null });

        const fs = await loadPlaywrightBridge();
        const result = await fs.callFrontendAction(SITE_A, 'com.sap.ui.flex.startRTA.v1', {});

        expect(launchMock).toHaveBeenCalledTimes(1);
        expect(browser.newPage).toHaveBeenCalledTimes(1);
        expect(page.goto).toHaveBeenCalledWith(SITE_A, expect.objectContaining({ waitUntil: 'networkidle' }));
        expect(page.waitForFunction).toHaveBeenCalled();
        expect(page.evaluate).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ isSuccess: true, payload: { rtaStarted: true }, error: null });

        await fs.stopBrowser();
    });

    test('reuses page on second callFrontendAction for same site', async () => {
        const page = new FakePage();
        const { browser } = setupBrowser([page]);
        page.evaluate
            .mockResolvedValueOnce({ isSuccess: true, payload: 'first', error: null })
            .mockResolvedValueOnce({ isSuccess: true, payload: 'second', error: null });

        const fs = await loadPlaywrightBridge();
        const r1 = await fs.callFrontendAction(SITE_A, 'a');
        const r2 = await fs.callFrontendAction(SITE_A, 'b');

        expect(launchMock).toHaveBeenCalledTimes(1);
        expect(browser.newPage).toHaveBeenCalledTimes(1);
        expect(page.goto).toHaveBeenCalledTimes(1);
        expect(r1.payload).toBe('first');
        expect(r2.payload).toBe('second');

        await fs.stopBrowser();
    });

    test('same origin, different path reuses the one page (one editor per origin)', async () => {
        const page = new FakePage();
        const { browser } = setupBrowser([page]);
        page.evaluate
            .mockResolvedValueOnce({ isSuccess: true, payload: 'first', error: null })
            .mockResolvedValueOnce({ isSuccess: true, payload: 'second', error: null });

        const fs = await loadPlaywrightBridge();
        const r1 = await fs.callFrontendAction('http://localhost:8080/a', 'x');
        const r2 = await fs.callFrontendAction('http://localhost:8080/different-path', 'y');

        // Keyed by origin → both calls hit the SAME registered page; no second page opened.
        expect(browser.newPage).toHaveBeenCalledTimes(1);
        expect(page.goto).toHaveBeenCalledTimes(1);
        expect(r1.payload).toBe('first');
        expect(r2.payload).toBe('second');

        await fs.stopBrowser();
    });

    test('page close event evicts entry and creates fresh page on next call', async () => {
        const stalePage = new FakePage();
        const freshPage = new FakePage();
        const { browser } = setupBrowser([stalePage, freshPage]);

        stalePage.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'first', error: null });
        freshPage.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'second', error: null });

        const fs = await loadPlaywrightBridge();
        await fs.callFrontendAction(SITE_A, 'a');

        // Simulate page close evicting the registry entry
        await stalePage.close();

        const r2 = await fs.callFrontendAction(SITE_A, 'b');

        expect(browser.newPage).toHaveBeenCalledTimes(2);
        expect(freshPage.goto).toHaveBeenCalledTimes(1);
        expect(r2.payload).toBe('second');

        await fs.stopBrowser();
    });

    test('frameId resolves to matching frame and runs evaluate there', async () => {
        const matchedFrame = new FakeFrame('preview');
        const otherFrame = new FakeFrame('toolbar');
        const page = new FakePage([otherFrame, matchedFrame]);
        setupBrowser([page]);
        matchedFrame.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'inside-frame', error: null });

        const fs = await loadPlaywrightBridge();
        const result = await fs.callFrontendAction(SITE_A, 'a', {}, 'preview');

        expect(matchedFrame.evaluate).toHaveBeenCalledTimes(1);
        expect(otherFrame.evaluate).not.toHaveBeenCalled();
        expect(page.evaluate).not.toHaveBeenCalled();
        expect(result.payload).toBe('inside-frame');

        await fs.stopBrowser();
    });

    test('unknown frameId throws', async () => {
        const page = new FakePage([new FakeFrame('toolbar')]);
        setupBrowser([page]);

        const fs = await loadPlaywrightBridge();
        await expect(fs.callFrontendAction(SITE_A, 'a', {}, 'nonexistent')).rejects.toThrow(
            'Frame with id "nonexistent" not found'
        );

        await fs.stopBrowser();
    });

    test('disconnectSite closes the page and context, and removes the entry', async () => {
        const page = new FakePage();
        const { browser } = setupBrowser([page, new FakePage()]);
        page.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'first', error: null });

        const fs = await loadPlaywrightBridge();
        await fs.callFrontendAction(SITE_A, 'a');
        await fs.disconnectSite(SITE_A);

        expect(page.close).toHaveBeenCalledTimes(1);
        expect(browser.contexts[0].close).toHaveBeenCalledTimes(1);

        await fs.callFrontendAction(SITE_A, 'b');
        expect(browser.newPage).toHaveBeenCalledTimes(2);

        await fs.stopBrowser();
    });

    test('stopBrowser closes pages, contexts, and the browser, clears registry', async () => {
        const pageA = new FakePage();
        const pageB = new FakePage();
        const { browser } = setupBrowser([pageA, pageB]);
        pageA.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'a', error: null });
        pageB.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'b', error: null });

        const fs = await loadPlaywrightBridge();
        await fs.callFrontendAction(SITE_A, 'x');
        await fs.callFrontendAction(SITE_B, 'y');
        await fs.stopBrowser();

        expect(pageA.close).toHaveBeenCalled();
        expect(pageB.close).toHaveBeenCalled();
        expect(browser.contexts[0].close).toHaveBeenCalledTimes(1);
        expect(browser.contexts[1].close).toHaveBeenCalledTimes(1);
        expect(browser.close).toHaveBeenCalledTimes(1);
    });

    test('stopBrowser is a no-op when no browser was started', async () => {
        const fs = await loadPlaywrightBridge();
        await expect(fs.stopBrowser()).resolves.toBeUndefined();
        expect(launchMock).not.toHaveBeenCalled();
    });

    test('disconnected event clears registry; next call starts a fresh browser', async () => {
        const pageA = new FakePage();
        const { browser } = setupBrowser([pageA]);
        pageA.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'first', error: null });

        const fs = await loadPlaywrightBridge();
        await fs.callFrontendAction(SITE_A, 'a');

        browser.connected = false;
        browser.emit('disconnected');

        const pageB = new FakePage();
        const newBrowser = new FakeBrowser();
        newBrowser.newPage.mockResolvedValue(pageB);
        launchMock.mockResolvedValueOnce(newBrowser);
        pageB.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'second', error: null });

        const r2 = await fs.callFrontendAction(SITE_A, 'b');
        expect(launchMock).toHaveBeenCalledTimes(2);
        expect(r2.payload).toBe('second');

        await fs.stopBrowser();
    });

    test('honors PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH', async () => {
        const original = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = '/usr/bin/chromium-test';
        try {
            const page = new FakePage();
            setupBrowser([page]);
            page.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'ok', error: null });

            const fs = await loadPlaywrightBridge();
            await fs.callFrontendAction(SITE_A, 'a');

            expect(launchMock).toHaveBeenCalledWith(
                expect.objectContaining({ executablePath: '/usr/bin/chromium-test' })
            );

            await fs.stopBrowser();
        } finally {
            if (original === undefined) {
                delete process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
            } else {
                process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = original;
            }
        }
    });

    test('falls back to bundled Chromium when system Chrome is missing', async () => {
        const page = new FakePage();
        const browser = new FakeBrowser();
        browser.newPage.mockResolvedValue(page);
        page.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'ok', error: null });

        launchMock.mockRejectedValueOnce(
            new Error("Executable doesn't exist at /usr/bin/google-chrome (channel=chrome)")
        );
        launchMock.mockResolvedValueOnce(browser);

        const fs = await loadPlaywrightBridge();
        const result = await fs.callFrontendAction(SITE_A, 'a');

        expect(launchMock).toHaveBeenCalledTimes(2);
        // First attempt uses the channel; second omits it.
        expect(launchMock.mock.calls[0][0]).toEqual(expect.objectContaining({ channel: 'chrome' }));
        expect(launchMock.mock.calls[1][0]).not.toHaveProperty('channel');
        expect(launchMock.mock.calls[1][0]).not.toHaveProperty('executablePath');
        expect(result.isSuccess).toBe(true);

        await fs.stopBrowser();
    });

    test('throws an install hint when both system Chrome and bundled Chromium are missing', async () => {
        launchMock.mockRejectedValueOnce(new Error("Executable doesn't exist at /usr/bin/google-chrome"));
        launchMock.mockRejectedValueOnce(
            new Error("Executable doesn't exist at /Users/.cache/ms-playwright/chromium-1234/chrome-mac/Chromium.app")
        );

        const fs = await loadPlaywrightBridge();
        await expect(fs.callFrontendAction(SITE_A, 'a')).rejects.toThrow(/npx playwright install chromium/);
        expect(launchMock).toHaveBeenCalledTimes(2);
    });

    test('always retries with bundled Chromium when primary launch fails for any reason', async () => {
        launchMock.mockRejectedValueOnce(new Error('User data dir is locked by another process'));
        launchMock.mockRejectedValueOnce(new Error('bundled also missing'));

        const fs = await loadPlaywrightBridge();
        await expect(fs.callFrontendAction(SITE_A, 'a')).rejects.toThrow(/npx playwright install chromium/);
        expect(launchMock).toHaveBeenCalledTimes(2);
    });

    test('skips frame whose frameElement() rejects (null element guard)', async () => {
        // One frame whose frameElement throws (simulates detached frame), one that matches.
        const nullFrame = new FakeFrame(null);
        nullFrame.frameElement.mockRejectedValueOnce(new Error('detached'));
        const matchedFrame = new FakeFrame('preview');
        const page = new FakePage([nullFrame, matchedFrame]);
        setupBrowser([page]);
        matchedFrame.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'ok', error: null });

        const fs = await loadPlaywrightBridge();
        const result = await fs.callFrontendAction(SITE_A, 'a', {}, 'preview');
        expect(result.payload).toBe('ok');

        await fs.stopBrowser();
    });

    test('pageerror event handler fires without throwing', async () => {
        const page = new FakePage();
        setupBrowser([page]);
        page.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'ok', error: null });

        const fs = await loadPlaywrightBridge();
        await fs.callFrontendAction(SITE_A, 'a');

        // Emit pageerror — should not throw.
        expect(() => page.emit('pageerror', new Error('script error'))).not.toThrow();

        await fs.stopBrowser();
    });

    test('isRegistryEmpty returns true before any connection and false after one is open', async () => {
        const page = new FakePage();
        setupBrowser([page]);
        page.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'ok', error: null });

        const fs = await loadPlaywrightBridge();
        expect(fs.isRegistryEmpty()).toBe(true);

        await fs.callFrontendAction(SITE_A, 'a');
        expect(fs.isRegistryEmpty()).toBe(false);

        await fs.stopBrowser();
        expect(fs.isRegistryEmpty()).toBe(true);
    });

    test('throws install hint when fallback launch also fails', async () => {
        launchMock
            .mockRejectedValueOnce(new Error("Executable doesn't exist at /usr/bin/google-chrome"))
            .mockRejectedValueOnce(new Error('sandboxing policy violation'));

        const fs = await loadPlaywrightBridge();
        await expect(fs.callFrontendAction(SITE_A, 'a')).rejects.toThrow(/npx playwright install chromium/);
        expect(launchMock).toHaveBeenCalledTimes(2);
    });

    test('concurrent callFrontendAction calls reuse the same browser start promise', async () => {
        // given: two pages queued; two concurrent calls before the browser resolves
        const page1 = new FakePage();
        const page2 = new FakePage();
        const { browser } = setupBrowser([page1, page2]);
        page1.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'first', error: null });
        page2.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'second', error: null });

        const fs = await loadPlaywrightBridge();

        // Fire two concurrent calls (both will race to start the browser)
        const [r1, r2] = await Promise.all([fs.callFrontendAction(SITE_A, 'a'), fs.callFrontendAction(SITE_B, 'b')]);

        // Browser should only have been launched once (browserStartPromise deduplication)
        expect(launchMock).toHaveBeenCalledTimes(1);
        expect(r1.payload).toBe('first');
        expect(r2.payload).toBe('second');

        await fs.stopBrowser();
        expect(browser.close).toHaveBeenCalledTimes(1);
    });
    test('always retries with bundled Chromium when primary launch throws a non-Error value', async () => {
        launchMock.mockRejectedValueOnce('not an error object');
        launchMock.mockRejectedValueOnce(new Error('bundled also missing'));

        const fs = await loadPlaywrightBridge();
        await expect(fs.callFrontendAction(SITE_A, 'a')).rejects.toThrow(/npx playwright install chromium/);
        expect(launchMock).toHaveBeenCalledTimes(2);
    });

    // --- B1 (persistent session) + B2 (login-aware start) --------------------

    const CF_SITE = 'http://localhost:8083/local/editor.html';
    const IDP_URL = 'https://tenant.authentication.eu10.hana.ondemand.com/oauth/authorize?x=1';

    /**
     * A page whose first `waitForFunction` (the bridge probe) times out, while
     * subsequent waits (readyState / per-action bridge wait) resolve — i.e. the
     * login/ambiguous path. `url` is where the page landed after redirects.
     */
    function loginProbePage(url: string): FakePage {
        const page = new FakePage([], url);
        page.waitForFunction.mockReset();
        page.waitForFunction.mockRejectedValueOnce(new Error('probe timeout'));
        page.waitForFunction.mockResolvedValue(undefined);
        return page;
    }

    test('B2: backend login page returns needsUserAction signal without registering', async () => {
        const page = loginProbePage(IDP_URL);
        const { browser } = setupBrowser([page]);

        const fs = await loadPlaywrightBridge();
        const result = await fs.callFrontendAction(CF_SITE, 'com.sap.ui.flex.startRTA.v1', {});

        expect(result).toEqual({
            isSuccess: true,
            payload: expect.objectContaining({ __needsUserAction: 'backend_login_required' }),
            error: null
        });
        // Context torn down, nothing registered → next start reopens cleanly.
        expect(browser.contexts[0].close).toHaveBeenCalled();
        expect(fs.isRegistryEmpty()).toBe(true);

        await fs.stopBrowser();
    });

    test('B2: ambiguous slow localhost app keeps the old behaviour (no login signal)', async () => {
        const page = loginProbePage('http://localhost:8080/a'); // still loopback, no markers
        setupBrowser([page]);
        page.evaluate.mockResolvedValue({ isSuccess: true, payload: 'ok', error: null });

        const fs = await loadPlaywrightBridge();
        const result = await fs.callFrontendAction('http://localhost:8080/a', 'a');

        expect(result).toEqual({ isSuccess: true, payload: 'ok', error: null });
        expect(fs.isRegistryEmpty()).toBe(false);

        await fs.stopBrowser();
    });

    test('ABAP untouched: a site registered as non-CF is never seeded or snapshotted', async () => {
        const page = new FakePage(); // default: bridge present (probe resolves), localhost
        const { browser } = setupBrowser([page]);
        page.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'ok', error: null });

        mockIsCFEnvironment.mockResolvedValue(false); // ABAP
        const session = await loadSession();
        await session.registerSite(SITE_A, '/path/to/abap-project');
        const fs = await loadPlaywrightBridge();
        await fs.callFrontendAction(SITE_A, 'a');

        // newContext called WITHOUT storageState; storageState() never called.
        expect(browser.newContext).toHaveBeenCalledWith(expect.objectContaining({ viewport: null }));
        expect(browser.contexts[0].options).not.toHaveProperty('storageState');
        expect(browser.contexts[0].storageState).not.toHaveBeenCalled();

        await fs.stopBrowser();
    });

    test('a site never registered gets a plain context (no seeding)', async () => {
        const page = new FakePage();
        const { browser } = setupBrowser([page]);
        page.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'ok', error: null });

        const fs = await loadPlaywrightBridge(); // no registerSite call
        await fs.callFrontendAction(SITE_A, 'a');

        expect(browser.contexts[0].options).not.toHaveProperty('storageState');
        expect(browser.contexts[0].storageState).not.toHaveBeenCalled();

        await fs.stopBrowser();
    });

    test('B1: in-memory session reused across re-start for the same CF project', async () => {
        const appPage = new FakePage([], CF_SITE);
        appPage.evaluate.mockResolvedValue({ isSuccess: true, payload: { rtaStarted: true }, error: null });
        const appPage2 = new FakePage([], CF_SITE);
        appPage2.evaluate.mockResolvedValue({ isSuccess: true, payload: { rtaStarted: true }, error: null });

        const { browser } = setupBrowser([appPage, appPage2]);
        const session = await loadSession();
        await session.registerSite(CF_SITE, '/path/to/cf-project'); // CF (default mock)
        const fs = await loadPlaywrightBridge();

        await fs.callFrontendAction(CF_SITE, 'com.sap.ui.flex.startRTA.v1'); // app, snapshot on disconnect
        await fs.disconnectSite(CF_SITE);
        await session.registerSite(CF_SITE, '/path/to/cf-project'); // re-start same project
        await fs.callFrontendAction(CF_SITE, 'com.sap.ui.flex.startRTA.v1'); // app, seeded from snapshot

        // The second context must be seeded from the in-memory snapshot of the first.
        expect(browser.contexts[1].options).toEqual(
            expect.objectContaining({ storageState: { cookies: [], origins: [] } })
        );

        await fs.stopBrowser();
    });

    test('B1: per-project isolation — project A snapshot never seeds project B on the same port', async () => {
        const appA = new FakePage([], CF_SITE);
        appA.evaluate.mockResolvedValue({ isSuccess: true, payload: 'ok', error: null });
        const appB = new FakePage([], CF_SITE);
        appB.evaluate.mockResolvedValue({ isSuccess: true, payload: 'ok', error: null });

        const { browser } = setupBrowser([appA, appB]);
        const session = await loadSession();
        const fs = await loadPlaywrightBridge();

        // Project A on the port: snapshot stored under project A.
        await session.registerSite(CF_SITE, '/path/to/project-A');
        await fs.callFrontendAction(CF_SITE, 'a');
        await fs.disconnectSite(CF_SITE);

        // Project B reuses the SAME port: must NOT be seeded from A's snapshot.
        await session.registerSite(CF_SITE, '/path/to/project-B');
        await fs.callFrontendAction(CF_SITE, 'a');

        expect(browser.contexts[1].options).not.toHaveProperty('storageState');

        await fs.stopBrowser();
    });

    test('B1 disk opt-in: PLAYWRIGHT_SESSION_STATE_PATH writes a per-project file with 0600 perms', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'rta-sessions-'));
        process.env.PLAYWRIGHT_SESSION_STATE_PATH = dir;
        try {
            const appPage = new FakePage([], CF_SITE);
            appPage.evaluate.mockResolvedValue({ isSuccess: true, payload: { rtaStarted: true }, error: null });

            setupBrowser([appPage]);
            const session = await loadSession();
            await session.registerSite(CF_SITE, '/path/to/cf-project');
            const fs = await loadPlaywrightBridge();

            await fs.callFrontendAction(CF_SITE, 'a'); // app
            await fs.disconnectSite(CF_SITE); // snapshot → disk

            const files = readdirSync(dir);
            expect(files).toHaveLength(1);
            const written = join(dir, files[0]);
            // Owner-only file permissions (0o600) for credential material — asserted
            // only where the filesystem honours chmod (some mounts silently ignore it,
            // leaving the 0o666 creation default despite the code requesting 0o600).
            if (fsHonorsChmod(dir)) {
                expect(statSync(written).mode & 0o777).toBe(0o600);
            }
            expect(JSON.parse(readFileSync(written, 'utf8'))).toEqual({ cookies: [], origins: [] });

            await fs.stopBrowser();
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    test('B1 disk off by default: nothing is written to disk', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'rta-sessions-off-'));
        try {
            const appPage = new FakePage([], CF_SITE);
            appPage.evaluate.mockResolvedValue({ isSuccess: true, payload: { rtaStarted: true }, error: null });

            setupBrowser([appPage]);
            const session = await loadSession();
            await session.registerSite(CF_SITE, '/path/to/cf-project');
            const fs = await loadPlaywrightBridge();

            await fs.callFrontendAction(CF_SITE, 'a'); // app → in-memory only
            await fs.disconnectSite(CF_SITE);

            expect(readdirSync(dir)).toHaveLength(0);

            await fs.stopBrowser();
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    test('B1: snapshot write failure is swallowed', async () => {
        const appPage = new FakePage([], CF_SITE);
        appPage.evaluate.mockResolvedValue({ isSuccess: true, payload: { rtaStarted: true }, error: null });

        const { browser } = setupBrowser([appPage]);
        browser.newContext.mockImplementation(async (options?: unknown) => {
            const context = new FakeContext(browser.newPage, options);
            context.storageState.mockRejectedValue(new Error('disk full'));
            browser.contexts.push(context);
            return context;
        });

        const session = await loadSession();
        await session.registerSite(CF_SITE, '/path/to/cf-project');
        const fs = await loadPlaywrightBridge();
        const result = await fs.callFrontendAction(CF_SITE, 'a');
        expect(result).toEqual({ isSuccess: true, payload: { rtaStarted: true }, error: null });
        // disconnect triggers the snapshot, which throws internally but must not propagate.
        await fs.disconnectSite(CF_SITE);

        await fs.stopBrowser();
    });

    test('PLAYWRIGHT_HEADLESS=1 launches headless; default is headed', async () => {
        process.env.PLAYWRIGHT_HEADLESS = '1';
        const page = new FakePage();
        setupBrowser([page]);
        page.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'ok', error: null });

        const fs = await loadPlaywrightBridge();
        await fs.callFrontendAction(SITE_A, 'a');
        expect(launchMock).toHaveBeenCalledWith(expect.objectContaining({ headless: true }));
        await fs.stopBrowser();
    });

    test('default launch is headed when PLAYWRIGHT_HEADLESS unset', async () => {
        const page = new FakePage();
        setupBrowser([page]);
        page.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'ok', error: null });

        const fs = await loadPlaywrightBridge();
        await fs.callFrontendAction(SITE_A, 'a');
        expect(launchMock).toHaveBeenCalledWith(expect.objectContaining({ headless: false }));
        await fs.stopBrowser();
    });

    test('disconnected event clears session maps (next redirect re-arms the gate)', async () => {
        const loginPage = loginProbePage(IDP_URL);
        const appPage = new FakePage([], CF_SITE);
        appPage.evaluate.mockResolvedValue({ isSuccess: true, payload: { rtaStarted: true }, error: null });
        const { browser } = setupBrowser([loginPage, appPage]);

        const fs = await loadPlaywrightBridge();
        await fs.callFrontendAction(CF_SITE, 'a'); // login arms gate
        await fs.callFrontendAction(CF_SITE, 'a'); // app

        browser.connected = false;
        browser.emit('disconnected');

        // After disconnect, a fresh browser + a plain (unredirected) start must
        // NOT be seeded (gate cleared).
        const freshPage = new FakePage([], CF_SITE); // bridge present now
        const newBrowser = new FakeBrowser();
        newBrowser.newPage.mockResolvedValue(freshPage);
        launchMock.mockResolvedValueOnce(newBrowser);
        freshPage.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'ok', error: null });

        await fs.callFrontendAction(CF_SITE, 'a');
        expect(newBrowser.contexts[0].options).not.toHaveProperty('storageState');

        await fs.stopBrowser();
    });

    test('fetchViaContext returns status, content-type and body from the context request', async () => {
        const page = new FakePage();
        const { browser } = setupBrowser([page]);
        page.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'ok', error: null });

        const fs = await loadPlaywrightBridge();
        // Register a session for SITE_A so the registry has a PageRPC with a context.
        await fs.callFrontendAction(SITE_A, 'a');

        const out = await fs.defaultTransport.fetchViaContext(SITE_A, `${SITE_A}/svc/$metadata`);

        expect(out).toEqual({ status: 200, contentType: 'application/xml', body: '<edmx:Edmx/>' });
        expect(browser.contexts[0].request.get).toHaveBeenCalledWith(
            `${SITE_A}/svc/$metadata`,
            expect.objectContaining({ maxRedirects: 5 })
        );

        await fs.stopBrowser();
    });

    test('fetchViaContext throws a run-start-first error on registry miss', async () => {
        setupBrowser([]);
        const fs = await loadPlaywrightBridge();

        await expect(
            fs.defaultTransport.fetchViaContext('http://localhost:9999/x', 'http://localhost:9999/y')
        ).rejects.toThrow(/start.*step first/i);

        await fs.stopBrowser();
    });
});
