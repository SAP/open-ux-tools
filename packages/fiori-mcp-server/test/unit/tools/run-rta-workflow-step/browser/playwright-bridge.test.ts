import { EventEmitter } from 'node:events';
import type * as PlaywrightBridgeModule from '../../../../../src/tools/run-rta-workflow-step/browser/playwright-bridge.js';

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
    public readonly close = jest.fn(async () => {
        this.emit('close');
    });
    private readonly frameList: FakeFrame[];
    constructor(frames: FakeFrame[] = []) {
        super();
        this.frameList = frames;
    }
    frames(): FakeFrame[] {
        return this.frameList;
    }
}

class FakeBrowser extends EventEmitter {
    public readonly close = jest.fn(async () => {
        this.connected = false;
        this.emit('disconnected');
    });
    public readonly newPage = jest.fn();
    public readonly newContext = jest.fn(async () => ({
        newPage: this.newPage,
        close: jest.fn(async () => undefined)
    }));
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

// --- helpers ---------------------------------------------------------------

const SITE_A = 'http://localhost:8080/a';
const SITE_B = 'http://localhost:8080/b';

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

beforeEach(() => {
    jest.resetModules();
    launchMock.mockReset();
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

    test('disconnectSite closes the page and removes the entry', async () => {
        const page = new FakePage();
        const { browser } = setupBrowser([page, new FakePage()]);
        page.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'first', error: null });

        const fs = await loadPlaywrightBridge();
        await fs.callFrontendAction(SITE_A, 'a');
        await fs.disconnectSite(SITE_A);

        expect(page.close).toHaveBeenCalledTimes(1);

        await fs.callFrontendAction(SITE_A, 'b');
        expect(browser.newPage).toHaveBeenCalledTimes(2);

        await fs.stopBrowser();
    });

    test('stopBrowser closes pages and the browser, clears registry', async () => {
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

    test('does not retry when launch fails for an unrelated reason', async () => {
        launchMock.mockRejectedValueOnce(new Error('User data dir is locked by another process'));

        const fs = await loadPlaywrightBridge();
        await expect(fs.callFrontendAction(SITE_A, 'a')).rejects.toThrow(/locked by another process/);
        expect(launchMock).toHaveBeenCalledTimes(1);
    });

    test('isMissingBrowserError returns false for non-Error rejection so launch is not retried', async () => {
        launchMock.mockRejectedValueOnce('not an Error object');

        const fs = await loadPlaywrightBridge();
        await expect(fs.callFrontendAction(SITE_A, 'a')).rejects.toBe('not an Error object');
        expect(launchMock).toHaveBeenCalledTimes(1);
    });

    test('concurrent callFrontendAction calls reuse the same browserStartPromise', async () => {
        let resolveLaunch!: (b: FakeBrowser) => void;
        const launchDeferred = new Promise<FakeBrowser>((resolve) => {
            resolveLaunch = resolve;
        });
        launchMock.mockReturnValueOnce(launchDeferred);

        const browser = new FakeBrowser();
        const page1 = new FakePage();
        const page2 = new FakePage();
        let pageIdx = 0;
        const pages = [page1, page2];
        browser.newPage.mockImplementation(async () => pages[pageIdx++]);
        page1.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'first', error: null });
        page2.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'second', error: null });

        const fs = await loadPlaywrightBridge();
        const p1 = fs.callFrontendAction(SITE_A, 'action1');
        const p2 = fs.callFrontendAction(SITE_B, 'action2');

        resolveLaunch(browser);
        const [r1, r2] = await Promise.all([p1, p2]);

        // Both calls share the same browser launch — launchMock fires only once
        expect(launchMock).toHaveBeenCalledTimes(1);
        // Each site gets its own page
        expect(browser.newPage).toHaveBeenCalledTimes(2);
        expect(r1.payload).toBe('first');
        expect(r2.payload).toBe('second');

        await fs.stopBrowser();
    });

    test('pageerror event logs a warning with the site URL', async () => {
        const page = new FakePage();
        setupBrowser([page]);
        page.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'ok', error: null });

        const fs = await loadPlaywrightBridge();
        await fs.callFrontendAction(SITE_A, 'a');

        const loggerModule = await import('../../../../../src/utils/logger.js');
        const warnSpy = jest.spyOn(loggerModule.logger, 'warn').mockImplementation(jest.fn());

        page.emit('pageerror', new Error('script error'));

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(SITE_A));

        warnSpy.mockRestore();
        await fs.stopBrowser();
    });

    test('frameElement() returning null skips that frame and matches by id on next frame', async () => {
        const nullFrame = new FakeFrame(null);
        nullFrame.frameElement.mockResolvedValueOnce(null as any);
        const targetFrame = new FakeFrame('target');
        const page = new FakePage([nullFrame, targetFrame]);
        setupBrowser([page]);
        targetFrame.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'target-result', error: null });

        const fs = await loadPlaywrightBridge();
        const result = await fs.callFrontendAction(SITE_A, 'a', {}, 'target');

        expect(targetFrame.evaluate).toHaveBeenCalledTimes(1);
        expect(nullFrame.evaluate).not.toHaveBeenCalled();
        expect(result.payload).toBe('target-result');

        await fs.stopBrowser();
    });
});
