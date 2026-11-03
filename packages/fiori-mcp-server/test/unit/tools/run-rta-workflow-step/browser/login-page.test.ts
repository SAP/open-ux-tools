import { jest } from '@jest/globals';
import { type Page } from 'playwright-core';
import {
    isBackendLoginPage,
    isNeedsUserAction,
    waitForLogin
} from '../../../../../src/tools/run-rta-workflow-step/browser/login-page.js';

describe('isNeedsUserAction', () => {
    test('returns true for the reserved backend-login payload', () => {
        expect(isNeedsUserAction({ __needsUserAction: 'backend_login_required', message: 'x' })).toBe(true);
    });

    test('returns false for a normal payload', () => {
        expect(isNeedsUserAction({ rtaStarted: true })).toBe(false);
    });

    test('returns false for null, primitives, and arrays', () => {
        expect(isNeedsUserAction(null)).toBe(false);
        expect(isNeedsUserAction('backend_login_required')).toBe(false);
        expect(isNeedsUserAction([{ __needsUserAction: 'backend_login_required' }])).toBe(false);
    });

    test('returns false when the discriminator value differs', () => {
        expect(isNeedsUserAction({ __needsUserAction: 'something_else' })).toBe(false);
    });
});

describe('waitForLogin', () => {
    /** The probe's own timeout — the live-page probe blocks for this long per iteration. */
    const BRIDGE_PROBE_MS = 8000;

    /**
     * Builds a fake `Page` whose `waitForFunction` is driven by `impl` and whose
     * `isClosed()` reflects `closed`. Lets a test simulate a live page with a slow
     * probe, a live page whose bridge appears, or a closed/gone target.
     *
     * @param impl The `waitForFunction` behaviour; invoked once per probe iteration.
     * @param closed Whether the page reports itself as closed.
     * @returns A fake page plus the `waitForFunction` spy.
     */
    function fakePage(impl: () => Promise<unknown>, closed = false): { page: Page; waitForFunction: jest.Mock } {
        const waitForFunction = jest.fn(impl);
        const page = { frames: () => [], waitForFunction, isClosed: () => closed } as unknown as Page;
        return { page, waitForFunction };
    }

    afterEach(() => {
        jest.useRealTimers();
    });

    test('resolves true as soon as the bridge appears', async () => {
        const { page, waitForFunction } = fakePage(() => Promise.resolve(true));
        await expect(waitForLogin(page, 50_000)).resolves.toBe(true);
        expect(waitForFunction).toHaveBeenCalledTimes(1);
    });

    test('probes at least once even with a zero budget', async () => {
        const { page, waitForFunction } = fakePage(() => Promise.resolve(true));
        await expect(waitForLogin(page, 0)).resolves.toBe(true);
        expect(waitForFunction).toHaveBeenCalledTimes(1);
    });

    test('stops immediately when the page is closed instead of polling a dead target for the whole budget', async () => {
        // A closed target rejects instantly; without the isClosed() short-circuit
        // the loop would spin for the entire 50s budget.
        const { page, waitForFunction } = fakePage(() => Promise.reject(new Error('Target closed')), true);
        await expect(waitForLogin(page, 50_000)).resolves.toBe(false);
        expect(waitForFunction).toHaveBeenCalledTimes(1);
    });

    test('keeps probing a live page whose bridge is not yet present, until the budget elapses', async () => {
        jest.useFakeTimers();
        // Live page: waitForFunction rejects only after the full BRIDGE_PROBE_MS
        // (real Playwright timeout), so each iteration takes that long and the loop paces itself.
        const { page, waitForFunction } = fakePage(
            () => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), BRIDGE_PROBE_MS))
        );

        const promise = waitForLogin(page, 50_000);
        await jest.runAllTimersAsync();
        await expect(promise).resolves.toBe(false);

        const iterations = waitForFunction.mock.calls.length;
        expect(iterations).toBeGreaterThan(1);
        expect(iterations).toBeLessThanOrEqual(Math.ceil(50_000 / BRIDGE_PROBE_MS) + 1);
    });
});

describe('isBackendLoginPage', () => {
    test.each([
        'http://localhost:8080/test/adaptation-editor.html',
        'http://127.0.0.1:8080/test/adaptation-editor.html',
        'http://[::1]:8080/test/adaptation-editor.html'
    ])('a loopback editor page with no login markers is not a login page: %s', (url) => {
        expect(isBackendLoginPage(url, 'Adaptation Editor', 'app content')).toBe(false);
    });

    test('an off-loopback host is treated as an IdP redirect', () => {
        expect(isBackendLoginPage('https://idp.example.com/saml2/login', '', '')).toBe(true);
    });

    test.each([
        ['url marker', 'http://localhost:8080/oauth/authorize', '', ''],
        ['title marker', 'http://localhost:8080/', 'Sign in', ''],
        ['body marker', 'http://localhost:8080/', '', 'please logon to continue']
    ])('a login marker on a loopback host still flags a login page (%s)', (_label, url, title, body) => {
        expect(isBackendLoginPage(url, title, body)).toBe(true);
    });

    test('an unparseable URL is not classified as a login page', () => {
        expect(isBackendLoginPage('not-a-url', '', '')).toBe(false);
    });
});
