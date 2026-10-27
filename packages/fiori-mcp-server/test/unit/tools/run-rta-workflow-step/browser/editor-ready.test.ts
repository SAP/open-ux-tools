import { jest } from '@jest/globals';
import type { Page } from 'playwright-core';
import { installAppLoadedListener, waitForAppLoaded } from '../../../../../src/tools/run-rta-workflow-step/browser/editor-ready.js';

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

describe('browser/editor-ready', () => {
    test('installAppLoadedListener registers an init script', async () => {
        const page = createPage(async () => undefined);
        await installAppLoadedListener(page as unknown as Page);
        expect(page.addInitScript).toHaveBeenCalledTimes(1);
        // The init script is a function plus an argument object carrying the filter.
        const [, arg] = page.addInitScript.mock.calls[0] as [unknown, Record<string, string>];
        expect(arg).toMatchObject({ envelopeType: 'post-message-action', actionType: '[ext] app-loaded' });
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
