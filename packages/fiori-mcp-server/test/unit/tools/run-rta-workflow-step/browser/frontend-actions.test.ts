import { describe, expect, jest, test } from '@jest/globals';
import {
    normalizeUfaResult,
    resolveAction,
    runActionInPage
} from '../../../../../src/tools/run-rta-workflow-step/browser/frontend-actions.js';

describe('resolveAction', () => {
    test('maps a Flex contract name to FrontendActionsAPI + bare method', () => {
        expect(resolveAction('com.sap.ui.flex.startRTA.v1')).toEqual({
            module: 'sap/ui/rta/api/FrontendActionsAPI',
            method: 'startRTA',
            ufa: false
        });
        expect(resolveAction('com.sap.ui.flex.getOverlaysInformation.v2')).toEqual({
            module: 'sap/ui/rta/api/FrontendActionsAPI',
            method: 'getOverlaysInformation',
            ufa: false
        });
    });

    test('maps a UFA contract name to ActionHelpers + bare method', () => {
        expect(resolveAction('com.sap.ui.unified.frontend.actions.describeUI')).toEqual({
            module: 'sap/ui/joule/frontend/util/ActionHelpers',
            method: 'describeUI',
            ufa: true
        });
        expect(resolveAction('com.sap.ui.unified.frontend.actions.executeAction')).toEqual({
            module: 'sap/ui/joule/frontend/util/ActionHelpers',
            method: 'executeAction',
            ufa: true
        });
    });

    test('falls back to the Flex module verbatim for an unrecognized name', () => {
        expect(resolveAction('somethingUnexpected')).toEqual({
            module: 'sap/ui/rta/api/FrontendActionsAPI',
            method: 'somethingUnexpected',
            ufa: false
        });
    });
});

describe('normalizeUfaResult', () => {
    test('passes a Flex envelope through unchanged (isUfa=false)', () => {
        const envelope = { isSuccess: true, payload: { rtaStarted: true }, error: null };
        expect(normalizeUfaResult(envelope, false)).toBe(envelope);
    });

    test('wraps a raw UFA describe result as a success envelope', () => {
        const tree = { id: 'root', type: 'sap.m.Page', children: [] };
        expect(normalizeUfaResult(tree, true)).toEqual({ isSuccess: true, payload: tree, error: null });
    });

    test('collapses a bare { success: true } mutation result to a null payload', () => {
        expect(normalizeUfaResult({ success: true }, true)).toEqual({
            isSuccess: true,
            payload: null,
            error: null
        });
    });

    test('keeps real data as payload even when a success flag is present', () => {
        const raw = { success: true, hash: '#Product-manage&/Products(1)' };
        expect(normalizeUfaResult(raw, true)).toEqual({ isSuccess: true, payload: raw, error: null });
    });

    test('maps a UFA { success: false, error } result to a failure envelope preserving the reason', () => {
        expect(normalizeUfaResult({ success: false, error: "Control does not support 'press' action" }, true)).toEqual({
            isSuccess: false,
            payload: null,
            error: { code: 'UFA_ACTION_FAILED', message: "Control does not support 'press' action" }
        });
    });

    test('uses message when error is absent, and a generic fallback when neither is present', () => {
        expect(normalizeUfaResult({ success: false, message: 'boom' }, true).error).toEqual({
            code: 'UFA_ACTION_FAILED',
            message: 'boom'
        });
        expect(normalizeUfaResult({ success: false }, true).error).toEqual({
            code: 'UFA_ACTION_FAILED',
            message: 'UFA action failed'
        });
    });
});

describe('runActionInPage', () => {
    // runActionInPage runs in the browser page in production (Playwright serializes
    // its source). It reads window.sap.ui.require, so Node tests stub a `window`
    // global with a fake require. This exercises the require wiring, the
    // missing-loader / missing-method throws, and the in-page serialization path.
    type FakeRequire = (deps: string[], cb: (api: unknown) => void, errback: (err: unknown) => void) => void;

    /** Installs a `window.sap.ui.require` global (or omits `require` when `undefined`), restoring it after. */
    function withWindow(require: FakeRequire | undefined, run: () => Promise<void> | void): Promise<void> | void {
        const g = globalThis as unknown as { window?: unknown };
        const had = 'window' in g;
        const prev = g.window;
        g.window = { sap: { ui: require ? { require } : {} } };
        const restore = (): void => {
            if (had) {
                g.window = prev;
            } else {
                delete g.window;
            }
        };
        try {
            const result = run();
            if (result instanceof Promise) {
                return result.finally(restore);
            }
            restore();
            return result;
        } catch (error) {
            restore();
            throw error;
        }
    }

    /** A require that resolves module `mod` to `api`, or errbacks when `api` is absent. */
    const requireResolving =
        (registry: Record<string, Record<string, unknown>>): FakeRequire =>
        (deps, cb, errback) => {
            const api = registry[deps[0]];
            if (api) {
                cb(api);
            } else {
                errback(new Error(`module not found: ${deps[0]}`));
            }
        };

    test('requires the module, calls the method, and returns the JSON-serialized result', async () => {
        const tree = { id: 'root', type: 'sap.m.Page', children: [{ id: 'go' }] };
        const describeUI = jest.fn(async () => tree);
        await withWindow(requireResolving({ 'ui5/ActionHelpers': { describeUI } }), async () => {
            const out = await runActionInPage({
                mod: 'ui5/ActionHelpers',
                fn: 'describeUI',
                p: { includedProperties: ['id'] }
            });
            expect(JSON.parse(out)).toEqual(tree);
            expect(describeUI).toHaveBeenCalledWith({ includedProperties: ['id'] });
        });
    });

    test('serializes a result with a circular reference without throwing', async () => {
        const node: Record<string, unknown> = { id: 'a' };
        node.self = node;
        const api = { describeUI: async () => node };
        await withWindow(requireResolving({ m: api }), async () => {
            const out = await runActionInPage({ mod: 'm', fn: 'describeUI', p: {} });
            expect(JSON.parse(out)).toEqual({ id: 'a', self: '[Circular]' });
        });
    });

    test('throws when sap.ui.require is not available on the page', async () => {
        await withWindow(undefined, async () => {
            await expect(runActionInPage({ mod: 'm', fn: 'f', p: {} })).rejects.toThrow(
                'sap.ui.require is not available on the page'
            );
        });
    });

    test('throws a TypeError when the required module has no such method', async () => {
        await withWindow(requireResolving({ m: { other: () => undefined } }), async () => {
            await expect(runActionInPage({ mod: 'm', fn: 'missing', p: {} })).rejects.toThrow(
                'Frontend action "missing" is not available on m'
            );
        });
    });

    test('rejects when the loader errbacks (module cannot be resolved)', async () => {
        await withWindow(requireResolving({}), async () => {
            await expect(runActionInPage({ mod: 'nope', fn: 'f', p: {} })).rejects.toThrow('module not found: nope');
        });
    });
});
