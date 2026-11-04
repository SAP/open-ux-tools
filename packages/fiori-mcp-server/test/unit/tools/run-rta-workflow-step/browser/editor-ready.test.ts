import { jest } from '@jest/globals';
import type { Page } from 'playwright-core';
import {
    appLoadedListenerScript,
    installAppLoadedListener,
    waitForAppLoaded,
    type AppLoadedListenerConfig
} from '../../../../../src/tools/run-rta-workflow-step/browser/editor-ready.js';

/**
 * Minimal Page stub exposing only the methods editor-ready uses.
 */
function createPage(waitImpl: () => Promise<unknown>): {
    addInitScript: jest.Mock;
    waitForFunction: jest.Mock;
} {
    return {
        addInitScript: jest.fn(async () => undefined),
        waitForFunction: jest.fn(waitImpl)
    };
}

const CONFIG: AppLoadedListenerConfig = {
    envelopeType: 'post-message-action',
    actionType: '[ext] app-loaded',
    flag: '__sapUxAppLoadedSeen'
};
const ORIGIN = 'http://localhost:8081';

/**
 * Fake browser `window` that captures the `message` handler registered by the
 * listener script, so a test can drive it with synthetic events. `parent`
 * defaults to the window itself (top-window case); pass a different object to
 * simulate running inside an iframe.
 */
function createFakeWindow(options: { parent?: object; origin?: string } = {}): {
    win: Record<string, unknown> & {
        location: { origin: string };
        addEventListener: jest.Mock;
        parent: object;
    };
    dispatch: (event: { origin: string; data?: unknown }) => void;
} {
    let handler: ((event: { origin: string; data?: unknown }) => void) | undefined;
    const win = {
        location: { origin: options.origin ?? ORIGIN },
        addEventListener: jest.fn((type: string, cb: (event: { origin: string; data?: unknown }) => void) => {
            if (type === 'message') {
                handler = cb;
            }
        })
    } as unknown as {
        location: { origin: string };
        addEventListener: jest.Mock;
        parent: object;
    };
    win.parent = options.parent ?? win;
    return {
        win,
        dispatch: (event) => handler?.(event)
    };
}

/**
 * Installs the fake window as the global, runs {@link appLoadedListenerScript}
 * against it, and returns a `dispatch` that fires captured `message` events with
 * the fake window still in place (the handler reads `window` live). Call the
 * returned `restore` in a `finally` / afterEach to put the global back.
 */
function runListenerScript(
    fake: ReturnType<typeof createFakeWindow>,
    config: AppLoadedListenerConfig = CONFIG
): { dispatch: (event: { origin: string; data?: unknown }) => void; restore: () => void } {
    const globalRef = globalThis as unknown as { window?: unknown };
    const original = globalRef.window;
    globalRef.window = fake.win;
    appLoadedListenerScript(config);
    return {
        dispatch: fake.dispatch,
        restore: () => {
            globalRef.window = original;
        }
    };
}

describe('browser/editor-ready', () => {
    describe('appLoadedListenerScript', () => {
        let restore: (() => void) | undefined;

        afterEach(() => {
            restore?.();
            restore = undefined;
        });

        test('seeds the flag to false and registers a message listener on the top window', () => {
            const fake = createFakeWindow();
            ({ restore } = runListenerScript(fake));
            expect(fake.win[CONFIG.flag]).toBe(false);
            expect(fake.win.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
        });

        test('does nothing when running inside an iframe (window.parent !== window)', () => {
            const fake = createFakeWindow({ parent: {} });
            ({ restore } = runListenerScript(fake));
            expect(fake.win[CONFIG.flag]).toBeUndefined();
            expect(fake.win.addEventListener).not.toHaveBeenCalled();
        });

        test('flips the flag to true on a same-origin app-loaded message', () => {
            const fake = createFakeWindow();
            let dispatch: (event: { origin: string; data?: unknown }) => void;
            ({ dispatch, restore } = runListenerScript(fake));
            dispatch({ origin: ORIGIN, data: { type: CONFIG.envelopeType, action: { type: CONFIG.actionType } } });
            expect(fake.win[CONFIG.flag]).toBe(true);
        });

        test('ignores a cross-origin message even when the shape matches', () => {
            const fake = createFakeWindow();
            let dispatch: (event: { origin: string; data?: unknown }) => void;
            ({ dispatch, restore } = runListenerScript(fake));
            dispatch({
                origin: 'https://evil.example.com',
                data: { type: CONFIG.envelopeType, action: { type: CONFIG.actionType } }
            });
            expect(fake.win[CONFIG.flag]).toBe(false);
        });

        test('ignores a same-origin message with the wrong envelope type', () => {
            const fake = createFakeWindow();
            let dispatch: (event: { origin: string; data?: unknown }) => void;
            ({ dispatch, restore } = runListenerScript(fake));
            dispatch({ origin: ORIGIN, data: { type: 'other', action: { type: CONFIG.actionType } } });
            expect(fake.win[CONFIG.flag]).toBe(false);
        });

        test('ignores a same-origin message with the wrong action type', () => {
            const fake = createFakeWindow();
            let dispatch: (event: { origin: string; data?: unknown }) => void;
            ({ dispatch, restore } = runListenerScript(fake));
            dispatch({ origin: ORIGIN, data: { type: CONFIG.envelopeType, action: { type: '[ext] other' } } });
            expect(fake.win[CONFIG.flag]).toBe(false);
        });

        test('ignores a same-origin message with no data', () => {
            const fake = createFakeWindow();
            let dispatch: (event: { origin: string; data?: unknown }) => void;
            ({ dispatch, restore } = runListenerScript(fake));
            dispatch({ origin: ORIGIN, data: undefined });
            expect(fake.win[CONFIG.flag]).toBe(false);
        });
    });

    test('installAppLoadedListener registers the listener script as an init script', async () => {
        const page = createPage(async () => undefined);
        await installAppLoadedListener(page as unknown as Page);
        expect(page.addInitScript).toHaveBeenCalledTimes(1);
        const [fn, arg] = page.addInitScript.mock.calls[0] as [unknown, AppLoadedListenerConfig];
        // The injected script is the exact self-contained function we unit-test above.
        expect(fn).toBe(appLoadedListenerScript);
        expect(arg).toMatchObject({ envelopeType: CONFIG.envelopeType, actionType: CONFIG.actionType });
    });

    test('waitForAppLoaded resolves true when the flag is observed', async () => {
        const page = createPage(async () => undefined); // waitForFunction resolves → signal seen
        await expect(waitForAppLoaded(page as unknown as Page, 1000)).resolves.toBe(true);
    });

    test('waitForAppLoaded resolves false on timeout without throwing', async () => {
        const page = createPage(async () => {
            throw new Error('Timeout 1000ms exceeded');
        });
        await expect(waitForAppLoaded(page as unknown as Page, 1000)).resolves.toBe(false);
    });
});
