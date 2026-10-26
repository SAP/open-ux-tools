import { jest } from '@jest/globals';
import type { EditorSession } from '../../../../../src/utils/editor-session.js';

const requireEditorSessionMock = jest.fn<(site: string) => Pick<EditorSession, 'localUrl' | 'relayToken'>>();
const stopEditorSessionMock = jest.fn<(site: string) => Promise<boolean>>();
jest.unstable_mockModule('../../../../../src/utils/editor-session.js', () => ({
    requireEditorSession: requireEditorSessionMock,
    stopEditorSession: stopEditorSessionMock
}));
jest.unstable_mockModule('../../../../../src/utils/logger.js', () => ({
    logger: { debug: jest.fn() }
}));

const { httpTransport } = await import('../../../../../src/tools/run-rta-workflow-step/browser/http-bridge.js');

const SITE = 'https://editor-workspaces-test.eu10.applicationstudio.cloud.sap/test/adaptation-editor.html';
const LOCAL_SITE = 'http://127.0.0.1:49152/test/adaptation-editor.html';
const TOKEN = 'a'.repeat(64);
const CLIENT_ID = 'document-before-reload';
const START = 'com.sap.ui.flex.startRTA.v1';
const success = { isSuccess: true, payload: { rtaStarted: true }, error: null };
const permissionError = {
    isSuccess: false,
    payload: null,
    error: { code: 'GENERIC_ERROR', message: 'You do not have key user permissions.' }
};

let fetchMock: jest.SpiedFunction<typeof fetch>;

/**
 * Queues a JSON response from the editor relay.
 *
 * @param response Relay response body.
 * @param status HTTP status code.
 */
function respondWith(response: unknown, status = 200): void {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(response), { status }));
}

describe('browser/http-bridge', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        fetchMock = jest.spyOn(globalThis, 'fetch').mockReset();
        requireEditorSessionMock.mockReset().mockImplementation((site) => {
            if (site !== SITE && site !== LOCAL_SITE) {
                throw new Error('Unknown editor session. Use its exact returned editor URL.');
            }
            return { localUrl: LOCAL_SITE, relayToken: TOKEN };
        });
        stopEditorSessionMock.mockReset().mockResolvedValue(true);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test('returns success immediately and uses the exact local URL and Bearer token without a browser hostname port', async () => {
        respondWith({ result: success, clientId: CLIENT_ID });
        await expect(httpTransport.callFrontendAction(SITE, START, {}, 'preview')).resolves.toEqual(success);
        expect(requireEditorSessionMock).toHaveBeenCalledWith(SITE);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const signal = fetchMock.mock.calls[0][1]?.signal;
        expect(signal).toBeInstanceOf(AbortSignal);
        expect(fetchMock).toHaveBeenCalledWith(new URL('http://127.0.0.1:49152/adp/api/rta/action'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
            body: JSON.stringify({ actionName: START, payload: {}, frameId: 'preview' }),
            signal,
            redirect: 'error'
        });
    });

    test('retries transient permission failures without reloading or changing the payload', async () => {
        respondWith({ result: permissionError, clientId: CLIENT_ID });
        respondWith({ result: success, clientId: CLIENT_ID });
        const result = httpTransport.callFrontendAction(SITE, START, { test: true }, 'preview');
        await jest.advanceTimersByTimeAsync(1999);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        await jest.advanceTimersByTimeAsync(1);
        await expect(result).resolves.toEqual(success);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        for (const [endpoint, options] of fetchMock.mock.calls) {
            expect(endpoint).toEqual(new URL('http://127.0.0.1:49152/adp/api/rta/action'));
            expect(options?.body).toBe(
                JSON.stringify({ actionName: START, payload: { test: true }, frameId: 'preview' })
            );
        }
    });

    test('returns a persistent permission error after four retries', async () => {
        for (let attempt = 0; attempt < 5; attempt++) {
            respondWith({ result: permissionError, clientId: CLIENT_ID });
        }
        const result = httpTransport.callFrontendAction(SITE, START);
        for (let retry = 1; retry <= 4; retry++) {
            await jest.advanceTimersByTimeAsync(1999);
            expect(fetchMock).toHaveBeenCalledTimes(retry);
            await jest.advanceTimersByTimeAsync(1);
            expect(fetchMock).toHaveBeenCalledTimes(retry + 1);
        }
        await expect(result).resolves.toEqual(permissionError);
        await jest.advanceTimersByTimeAsync(10000);
        expect(fetchMock).toHaveBeenCalledTimes(5);
        expect(jest.getTimerCount()).toBe(0);
    });

    test('does not retry permission errors for actions that can mutate the application', async () => {
        respondWith({ result: permissionError, clientId: CLIENT_ID });
        await expect(httpTransport.callFrontendAction(SITE, 'com.sap.ui.flex.callAction.v1')).resolves.toEqual(
            permissionError
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
    });

    test('does not retry unrelated startRTA errors', async () => {
        const error = { ...permissionError, error: { code: 'GENERIC_ERROR', message: 'Application not found' } };
        respondWith({ result: error, clientId: CLIENT_ID });
        await expect(httpTransport.callFrontendAction(SITE, START)).resolves.toEqual(error);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
    });

    test('does not retry relay errors', async () => {
        respondWith({ error: 'Browser client disconnected' });
        await expect(httpTransport.callFrontendAction(SITE, START)).resolves.toEqual({
            isSuccess: false,
            payload: null,
            error: { code: 'RELAY_ERROR', message: 'Browser client disconnected' }
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
    });

    test('accepts the registered local URL alias without rewriting it', async () => {
        respondWith({ result: success, clientId: CLIENT_ID });
        await expect(httpTransport.callFrontendAction(LOCAL_SITE, START)).resolves.toEqual(success);
        expect(requireEditorSessionMock).toHaveBeenCalledWith(LOCAL_SITE);
        expect(fetchMock.mock.calls[0][1]?.body).toBe(JSON.stringify({ actionName: START, payload: {} }));
    });

    test('rejects an unknown session before any fetch', async () => {
        const site = `${SITE}?unregistered=true`;
        await expect(httpTransport.callFrontendAction(site, START)).rejects.toThrow('Unknown editor session');
        expect(requireEditorSessionMock).toHaveBeenCalledWith(site);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('rejects a session without a relay token before any fetch', async () => {
        requireEditorSessionMock.mockReturnValue({ localUrl: LOCAL_SITE });
        await expect(httpTransport.callFrontendAction(SITE, START)).rejects.toThrow('This editor has no HTTP relay');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('surfaces malformed JSON without retries', async () => {
        fetchMock.mockResolvedValueOnce(new Response('not JSON'));
        await expect(httpTransport.callFrontendAction(SITE, START)).rejects.toMatchObject({ name: 'SyntaxError' });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
    });

    test.each([null, [], 'not an object', 42])(
        'rejects a non-object relay response %p without retries',
        async (body) => {
            respondWith(body);
            await expect(httpTransport.callFrontendAction(SITE, START)).rejects.toThrow(
                'Invalid editor relay response'
            );
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(jest.getTimerCount()).toBe(0);
        }
    );

    test.each([{}, { result: success }, { clientId: CLIENT_ID }, { result: success, clientId: 42 }])(
        'rejects an invalid relay envelope %p without retries',
        async (body) => {
            respondWith(body);
            await expect(httpTransport.callFrontendAction(SITE, START)).rejects.toThrow(
                'Invalid editor relay response'
            );
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(jest.getTimerCount()).toBe(0);
        }
    );

    test.each([null, {}, { isSuccess: 'true', payload: {} }, { isSuccess: true }])(
        'rejects an invalid frontend result %p without retries',
        async (result) => {
            respondWith({ result, clientId: CLIENT_ID });
            await expect(httpTransport.callFrontendAction(SITE, START)).rejects.toThrow('invalid frontend result');
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(jest.getTimerCount()).toBe(0);
        }
    );

    test.each([401, 503])('surfaces HTTP %i without retries', async (status) => {
        respondWith({ result: permissionError, clientId: CLIENT_ID }, status);
        await expect(httpTransport.callFrontendAction(SITE, START)).rejects.toThrow(`Editor relay HTTP ${status}`);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
    });

    test('preserves a relay error supplied with a failed HTTP status without retries', async () => {
        respondWith({ error: 'Unauthorized relay request' }, 401);
        await expect(httpTransport.callFrontendAction(SITE, START)).resolves.toEqual({
            isSuccess: false,
            payload: null,
            error: { code: 'RELAY_ERROR', message: 'Unauthorized relay request' }
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
    });

    test('surfaces network failure without retries', async () => {
        const error = new TypeError('fetch failed');
        fetchMock.mockRejectedValueOnce(error);
        await expect(httpTransport.callFrontendAction(SITE, START)).rejects.toBe(error);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
    });

    test.each([null, { code: 'GENERIC_ERROR', message: null }])(
        'does not retry a frontend failure without a permission message: %p',
        async (error) => {
            const result = { isSuccess: false, payload: null, error };
            respondWith({ result, clientId: CLIENT_ID });
            await expect(httpTransport.callFrontendAction(SITE, START)).resolves.toEqual(result);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(jest.getTimerCount()).toBe(0);
        }
    );

    describe('reloadPage', () => {
        test('reloads once then waits for a fresh ready client', async () => {
            respondWith({ result: { acknowledged: true }, clientId: CLIENT_ID });
            respondWith({ result: success, clientId: 'document-after-reload' });
            await expect(httpTransport.reloadPage?.(SITE)).resolves.toBeUndefined();
            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(fetchMock.mock.calls.map(([, options]) => options?.body)).toEqual([
                JSON.stringify({ actionName: '__reload__', payload: {} }),
                JSON.stringify({ actionName: '__ready__', payload: {} })
            ]);
            expect(requireEditorSessionMock.mock.calls).toEqual([[SITE], [SITE]]);
        });

        test('requires a different clientId even when the old client reports readiness', async () => {
            respondWith({ result: {}, clientId: CLIENT_ID });
            respondWith({ result: success, clientId: CLIENT_ID });
            await expect(httpTransport.reloadPage?.(SITE)).rejects.toThrow(
                'Reloaded editor did not become ready: no fresh ready document'
            );
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        test('does not ask for readiness after a failed reload acknowledgement', async () => {
            respondWith({ error: 'Reload acknowledgement failed' });
            await expect(httpTransport.reloadPage?.(SITE)).rejects.toThrow(
                'Editor reload failed: Reload acknowledgement failed'
            );
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock.mock.calls[0][1]?.body).toBe(JSON.stringify({ actionName: '__reload__', payload: {} }));
        });

        test('does not ask for readiness without a document acknowledgement', async () => {
            respondWith({ result: {}, clientId: '' });
            await expect(httpTransport.reloadPage?.(SITE)).rejects.toThrow(
                'Editor reload failed: missing document acknowledgement'
            );
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        test('surfaces readiness relay errors', async () => {
            respondWith({ result: {}, clientId: CLIENT_ID });
            respondWith({ error: 'UI5 initialization failed' });
            await expect(httpTransport.reloadPage?.(SITE)).rejects.toThrow(
                'Reloaded editor did not become ready: UI5 initialization failed'
            );
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        test.each([permissionError, { ready: true }])('surfaces failed or invalid readiness %p', async (result) => {
            respondWith({ result: {}, clientId: CLIENT_ID });
            respondWith({ result, clientId: 'document-after-reload' });
            await expect(httpTransport.reloadPage?.(SITE)).rejects.toThrow('Reloaded editor did not become ready');
            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(jest.getTimerCount()).toBe(0);
        });

        test('surfaces readiness network failures without replaying reload', async () => {
            const error = new TypeError('Ready request failed');
            respondWith({ result: {}, clientId: CLIENT_ID });
            fetchMock.mockRejectedValueOnce(error);
            await expect(httpTransport.reloadPage?.(SITE)).rejects.toBe(error);
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });
    });

    test.each([true, false])(
        'stopEditor delegates to the owned session and returns %s without browser network wait',
        async (stopped) => {
            stopEditorSessionMock.mockResolvedValueOnce(stopped);
            expect(httpTransport.stopEditor).toBe(stopEditorSessionMock);
            await expect(httpTransport.stopEditor?.(SITE)).resolves.toBe(stopped);
            expect(stopEditorSessionMock).toHaveBeenCalledTimes(1);
            expect(stopEditorSessionMock).toHaveBeenCalledWith(SITE);
            expect(requireEditorSessionMock).not.toHaveBeenCalled();
            expect(fetchMock).not.toHaveBeenCalled();
            expect(jest.getTimerCount()).toBe(0);
        }
    );

    test('disconnectSite and stopBrowser are no-ops', async () => {
        await expect(httpTransport.disconnectSite(SITE)).resolves.toBeUndefined();
        await expect(httpTransport.stopBrowser()).resolves.toBeUndefined();
        expect(requireEditorSessionMock).not.toHaveBeenCalled();
        expect(stopEditorSessionMock).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(jest.getTimerCount()).toBe(0);
    });
});
