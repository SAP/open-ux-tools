import { EventEmitter } from 'node:events';
import type * as FirefoxWdBridgeModule from '../../../../../src/tools/run-rta-workflow-step/browser/firefox-wd-bridge.js';

// --- geckodriver mock -------------------------------------------------------

const startGeckodriverMock = jest.fn();

jest.unstable_mockModule('geckodriver', () => ({
    start: (...args: unknown[]) => startGeckodriverMock(...args)
}));

// --- webdriver mock ---------------------------------------------------------

const newSessionMock = jest.fn();

jest.unstable_mockModule('webdriver', () => ({
    default: { newSession: (...args: unknown[]) => newSessionMock(...args) }
}));

// --- node:http mock ---------------------------------------------------------

const httpGetMock = jest.fn();

jest.unstable_mockModule('node:http', () => ({
    get: (...args: unknown[]) => httpGetMock(...args)
}));

// --- helpers ----------------------------------------------------------------

const SITE_A = 'http://localhost:8080/a';
const SITE_B = 'http://localhost:8080/b';

function makeFakeChild(pid = 12345): EventEmitter & { pid: number; stdout: EventEmitter; stderr: EventEmitter } {
    const child = new EventEmitter() as EventEmitter & { pid: number; stdout: EventEmitter; stderr: EventEmitter };
    child.pid = pid;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    return child;
}

/**
 * A fake WebDriver Client with jest mocks for the methods we use.
 */
function makeFakeClient() {
    return {
        navigateTo: jest.fn(async () => undefined),
        executeAsyncScript: jest.fn(async () => ({ result: { isSuccess: true, payload: 'ok', error: null } })),
        setTimeouts: jest.fn(async () => undefined),
        switchToParentFrame: jest.fn(async () => undefined),
        deleteSession: jest.fn(async () => undefined)
    };
}

/**
 * Configures mocks for a successful geckodriver start + WebDriver session.
 */
function setupSession(client = makeFakeClient()) {
    const child = makeFakeChild();
    startGeckodriverMock.mockResolvedValue(child);

    // http.get mock: geckodriver /status returns ready immediately.
    httpGetMock.mockImplementation((_url: string, cb: (res: EventEmitter & { statusCode: number }) => void) => {
        const res = new EventEmitter() as EventEmitter & { statusCode: number };
        res.statusCode = 200;
        setTimeout(() => {
            res.emit('data', Buffer.from(JSON.stringify({ value: { ready: true } })));
            res.emit('end');
        }, 0);
        cb(res);
        return new EventEmitter();
    });

    newSessionMock.mockResolvedValue(client);
    return { client, child };
}

async function loadBridge(): Promise<typeof FirefoxWdBridgeModule> {
    return import('../../../../../src/tools/run-rta-workflow-step/browser/firefox-wd-bridge');
}

beforeEach(() => {
    jest.resetModules();
    startGeckodriverMock.mockReset();
    newSessionMock.mockReset();
    httpGetMock.mockReset();
});

describe('browser/firefox-wd-bridge', () => {
    test('first callFrontendAction starts geckodriver, opens session, navigates, evaluates', async () => {
        const client = makeFakeClient();
        // First executeAsyncScript call is the DOMContentLoaded wait, second is the action.
        client.executeAsyncScript
            .mockResolvedValueOnce(undefined) // DOMContentLoaded
            .mockResolvedValueOnce({ result: { isSuccess: true, payload: { rtaStarted: true }, error: null } });
        setupSession(client);

        const fs = await loadBridge();
        const result = await fs.callFrontendAction(SITE_A, 'com.sap.ui.flex.startRTA.v1', {});

        expect(startGeckodriverMock).toHaveBeenCalledTimes(1);
        expect(newSessionMock).toHaveBeenCalledTimes(1);
        expect(client.navigateTo).toHaveBeenCalledWith(SITE_A);
        expect(client.executeAsyncScript).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ isSuccess: true, payload: { rtaStarted: true }, error: null });

        await fs.stopBrowser();
    });

    test('reuses session on second callFrontendAction for same site', async () => {
        const client = makeFakeClient();
        client.executeAsyncScript
            .mockResolvedValueOnce(undefined)  // DOMContentLoaded for SITE_A
            .mockResolvedValueOnce({ result: { isSuccess: true, payload: 'first', error: null } })
            .mockResolvedValueOnce({ result: { isSuccess: true, payload: 'second', error: null } });
        setupSession(client);

        const fs = await loadBridge();
        const r1 = await fs.callFrontendAction(SITE_A, 'com.sap.ui.flex.startRTA.v1');
        const r2 = await fs.callFrontendAction(SITE_A, 'com.sap.ui.flex.getOverlays.v1');

        expect(startGeckodriverMock).toHaveBeenCalledTimes(1);
        expect(newSessionMock).toHaveBeenCalledTimes(1);
        expect(client.navigateTo).toHaveBeenCalledTimes(1);
        expect(r1.payload).toBe('first');
        expect(r2.payload).toBe('second');

        await fs.stopBrowser();
    });

    test('frameId triggers frame-switching script then switches back', async () => {
        const client = makeFakeClient();
        client.executeAsyncScript
            .mockResolvedValueOnce(undefined)   // DOMContentLoaded
            .mockResolvedValueOnce(0)            // findFrame: index 0
            .mockResolvedValueOnce({ result: { isSuccess: true, payload: 'inside-frame', error: null } });
        // switchToFrame cast — just check it's called
        (client as unknown as { switchToFrame: jest.Mock }).switchToFrame = jest.fn(async () => undefined);
        setupSession(client);

        const fs = await loadBridge();
        const result = await fs.callFrontendAction(SITE_A, 'com.sap.ui.flex.startRTA.v1', {}, 'preview');

        expect((client as unknown as { switchToFrame: jest.Mock }).switchToFrame).toHaveBeenCalledWith(0);
        expect(client.switchToParentFrame).toHaveBeenCalled();
        expect(result.payload).toBe('inside-frame');

        await fs.stopBrowser();
    });

    test('unknown frameId throws', async () => {
        const client = makeFakeClient();
        client.executeAsyncScript
            .mockResolvedValueOnce(undefined) // DOMContentLoaded
            .mockResolvedValueOnce(-1);       // findFrame: not found
        setupSession(client);

        const fs = await loadBridge();
        await expect(fs.callFrontendAction(SITE_A, 'com.sap.ui.flex.startRTA.v1', {}, 'nonexistent'))
            .rejects.toThrow('Frame with id "nonexistent" not found after 30s');

        await fs.stopBrowser();
    });

    test('error from executeAsyncScript wraps into FrontendActionResult error', async () => {
        const client = makeFakeClient();
        client.executeAsyncScript
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce({ error: 'RTA not started' });
        setupSession(client);

        const fs = await loadBridge();
        const result = await fs.callFrontendAction(SITE_A, 'com.sap.ui.flex.startRTA.v1');

        expect(result.isSuccess).toBe(false);
        expect(result.error?.message).toBe('RTA not started');

        await fs.stopBrowser();
    });

    test('unsupported FrontendActionsAPI method returns ACTION_NOT_SUPPORTED', async () => {
        const client = makeFakeClient();
        client.executeAsyncScript
            .mockResolvedValueOnce(undefined) // DOMContentLoaded
            .mockResolvedValueOnce({ unsupported: 'getPageActions' });
        setupSession(client);

        const fs = await loadBridge();
        const result = await fs.callFrontendAction(SITE_A, 'com.sap.ui.flex.getPageActions.v1');

        expect(result.isSuccess).toBe(false);
        expect(result.error?.code).toBe('ACTION_NOT_SUPPORTED');
        expect(result.error?.message).toContain('getPageActions');

        await fs.stopBrowser();
    });

    test('retries startRTA on a transient key-user permission error, then succeeds', async () => {
        const client = makeFakeClient();
        client.executeAsyncScript
            .mockResolvedValueOnce(undefined) // DOMContentLoaded
            .mockResolvedValueOnce({
                result: {
                    isSuccess: false,
                    payload: null,
                    error: { code: 'GENERIC_ERROR', message: 'You do not have key user permissions.' }
                }
            })
            .mockResolvedValueOnce({
                result: { isSuccess: true, payload: { rtaStarted: true }, error: null }
            });
        setupSession(client);

        const fs = await loadBridge();
        const result = await fs.callFrontendAction(SITE_A, 'com.sap.ui.flex.startRTA.v1');

        expect(result.isSuccess).toBe(true);
        // One DOMContentLoaded wait + two action attempts (failed then retried OK).
        expect(client.executeAsyncScript).toHaveBeenCalledTimes(3);

        await fs.stopBrowser();
    }, 15000);

    test('disconnectSite navigates to about:blank and removes the entry', async () => {
        const client = makeFakeClient();
        client.executeAsyncScript
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce({ result: { isSuccess: true, payload: 'ok', error: null } });
        setupSession(client);

        const fs = await loadBridge();
        await fs.callFrontendAction(SITE_A, 'com.sap.ui.flex.startRTA.v1');
        expect(fs.isRegistryEmpty()).toBe(false);

        await fs.disconnectSite(SITE_A);

        expect(client.navigateTo).toHaveBeenLastCalledWith('about:blank');
        expect(fs.isRegistryEmpty()).toBe(true);

        await fs.stopBrowser();
    });

    test('stopBrowser ends session and kills geckodriver', async () => {
        const client = makeFakeClient();
        client.executeAsyncScript
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce({ result: { isSuccess: true, payload: 'ok', error: null } });
        const { child } = setupSession(client);

        const fs = await loadBridge();
        await fs.callFrontendAction(SITE_A, 'com.sap.ui.flex.startRTA.v1');
        await fs.stopBrowser();

        expect(client.deleteSession).toHaveBeenCalledTimes(1);
        // Child process kill is called for the geckodriver pid.
        expect(child.pid).toBe(12345);
    });

    test('stopBrowser is a no-op when no session was started', async () => {
        const fs = await loadBridge();
        await expect(fs.stopBrowser()).resolves.toBeUndefined();
        expect(newSessionMock).not.toHaveBeenCalled();
    });

    test('concurrent callFrontendAction calls share a single session start', async () => {
        const client = makeFakeClient();
        client.executeAsyncScript
            .mockResolvedValueOnce(undefined)  // DOMContentLoaded SITE_A
            .mockResolvedValueOnce(undefined)  // DOMContentLoaded SITE_B
            .mockResolvedValueOnce({ result: { isSuccess: true, payload: 'first', error: null } })
            .mockResolvedValueOnce({ result: { isSuccess: true, payload: 'second', error: null } });
        setupSession(client);

        const fs = await loadBridge();
        const [r1, r2] = await Promise.all([
            fs.callFrontendAction(SITE_A, 'com.sap.ui.flex.startRTA.v1'),
            fs.callFrontendAction(SITE_B, 'com.sap.ui.flex.startRTA.v1')
        ]);

        expect(startGeckodriverMock).toHaveBeenCalledTimes(1);
        expect(newSessionMock).toHaveBeenCalledTimes(1);
        expect(r1.payload).toBe('first');
        expect(r2.payload).toBe('second');

        await fs.stopBrowser();
    });

    test('throws when action name does not match expected contract format', async () => {
        const client = makeFakeClient();
        client.executeAsyncScript.mockResolvedValueOnce(undefined); // DOMContentLoaded
        setupSession(client);

        const fs = await loadBridge();
        await expect(fs.callFrontendAction(SITE_A, 'invalidActionName'))
            .rejects.toThrow('Cannot derive method name from action "invalidActionName"');

        await fs.stopBrowser();
    });

    test('honors FIREFOX_EXECUTABLE_PATH env var', async () => {
        const original = process.env.FIREFOX_EXECUTABLE_PATH;
        process.env.FIREFOX_EXECUTABLE_PATH = '/custom/firefox';
        try {
            const client = makeFakeClient();
            client.executeAsyncScript
                .mockResolvedValueOnce(undefined)
                .mockResolvedValueOnce({ result: { isSuccess: true, payload: 'ok', error: null } });
            setupSession(client);

            const fs = await loadBridge();
            await fs.callFrontendAction(SITE_A, 'com.sap.ui.flex.startRTA.v1');

            expect(startGeckodriverMock).toHaveBeenCalledWith(
                expect.objectContaining({ binary: '/custom/firefox' })
            );
            expect(newSessionMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    capabilities: expect.objectContaining({
                        'moz:firefoxOptions': expect.objectContaining({ binary: '/custom/firefox' })
                    })
                })
            );

            await fs.stopBrowser();
        } finally {
            if (original === undefined) {
                delete process.env.FIREFOX_EXECUTABLE_PATH;
            } else {
                process.env.FIREFOX_EXECUTABLE_PATH = original;
            }
        }
    });

    test('honors GECKODRIVER_PORT env var', async () => {
        const original = process.env.GECKODRIVER_PORT;
        process.env.GECKODRIVER_PORT = '19999';
        try {
            const client = makeFakeClient();
            client.executeAsyncScript
                .mockResolvedValueOnce(undefined)
                .mockResolvedValueOnce({ result: { isSuccess: true, payload: 'ok', error: null } });
            setupSession(client);

            const fs = await loadBridge();
            await fs.callFrontendAction(SITE_A, 'com.sap.ui.flex.startRTA.v1');

            expect(startGeckodriverMock).toHaveBeenCalledWith(
                expect.objectContaining({ port: 19999 })
            );
            expect(newSessionMock).toHaveBeenCalledWith(
                expect.objectContaining({ port: 19999 })
            );

            await fs.stopBrowser();
        } finally {
            if (original === undefined) {
                delete process.env.GECKODRIVER_PORT;
            } else {
                process.env.GECKODRIVER_PORT = original;
            }
        }
    });

    test('isRegistryEmpty returns false while a site is open', async () => {
        const client = makeFakeClient();
        client.executeAsyncScript
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce({ result: { isSuccess: true, payload: 'ok', error: null } });
        setupSession(client);

        const fs = await loadBridge();
        expect(fs.isRegistryEmpty()).toBe(true);

        await fs.callFrontendAction(SITE_A, 'com.sap.ui.flex.startRTA.v1');
        expect(fs.isRegistryEmpty()).toBe(false);

        await fs.stopBrowser();
        expect(fs.isRegistryEmpty()).toBe(true);
    });
});
