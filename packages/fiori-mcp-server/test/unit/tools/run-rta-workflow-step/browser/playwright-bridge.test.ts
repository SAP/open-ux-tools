import { EventEmitter } from 'node:events';
import type * as PlaywrightBridgeModule from '../../../../../src/tools/run-rta-workflow-step/browser/playwright-bridge';

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
    public connected = true;
    isConnected(): boolean {
        return this.connected;
    }
}

const launchMock = jest.fn();

jest.mock('playwright-core', () => ({
    chromium: {
        launch: (...args: unknown[]) => launchMock(...args)
    }
}));

jest.mock('../../../../../src/utils/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
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
        // First call: just the actual call. Second call: liveness probe (rejects with "not registered" -> reuse OK), then actual call.
        page.evaluate
            .mockResolvedValueOnce({ isSuccess: true, payload: 'first', error: null })
            .mockRejectedValueOnce(new Error('Frontend action "__liveness__" not registered'))
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

    test('liveness probe failure (real transport error) evicts entry and creates fresh page', async () => {
        const stalePage = new FakePage();
        const freshPage = new FakePage();
        const { browser } = setupBrowser([stalePage, freshPage]);

        // First call uses stalePage.
        stalePage.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'first', error: null });
        // Second call: liveness probe throws "page closed" -> evict, open freshPage.
        stalePage.evaluate.mockRejectedValueOnce(new Error('Target page, context or browser has been closed'));
        freshPage.evaluate.mockResolvedValueOnce({ isSuccess: true, payload: 'second', error: null });

        const fs = await loadPlaywrightBridge();
        await fs.callFrontendAction(SITE_A, 'a');
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
});
