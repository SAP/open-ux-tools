import { jest } from '@jest/globals';
import express from 'express';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { runInNewContext } from 'node:vm';
import { addRtaRelayApis } from '../../../src/base/rta-relay.js';

const TOKEN = 'a1'.repeat(32);
const CLIENT_ID = 'result-size-client';
const API = '/adp/api/rta';
const ACTION = 'com.sap.ui.flex.getOverlaysInformation.v1';
const DEFAULT_LIMIT = 10 * 1024 * 1024;
const source = readFileSync(new URL('../../../templates/rta-relay-client.js', import.meta.url), 'utf8');
const frontendResult = (label = 'control') => ({
    isSuccess: true,
    payload: { overlays: [{ id: 'control', label }] }
});

describe('relay result size with the real browser client', () => {
    let server: Server | undefined;
    let origin: string;
    let controller: AbortController;
    const originalLimit = process.env.SAP_FIORI_MCP_ADP_RELAY_RESULT_LIMIT_BYTES;

    beforeEach(() => {
        delete process.env.SAP_FIORI_MCP_ADP_RELAY_RESULT_LIMIT_BYTES;
        controller = new AbortController();
    });

    afterEach(async () => {
        if (originalLimit === undefined) {
            delete process.env.SAP_FIORI_MCP_ADP_RELAY_RESULT_LIMIT_BYTES;
        } else {
            process.env.SAP_FIORI_MCP_ADP_RELAY_RESULT_LIMIT_BYTES = originalLimit;
        }
        controller.abort();
        if (server) {
            const closed = new Promise<void>((resolve) => server?.close(() => resolve()));
            server.closeAllConnections();
            await closed;
            server = undefined;
        }
        // Allow the client to consume the test shutdown response and clear its request timer.
        await new Promise(setImmediate);
    });

    async function startServer(): Promise<void> {
        const app = express();
        app.set('env', 'test');
        // Use the relay's parsers, without an upstream parser masking their configured limits.
        addRtaRelayApis(app, TOKEN);
        server = app.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const address = server.address();
        if (!address || typeof address === 'string') {
            throw new Error('Expected a TCP address');
        }
        origin = `http://127.0.0.1:${address.port}`;
    }

    function startClient(
        getOverlaysInformation: () => Promise<unknown>,
        proxyResponse?: (attempt: number) => Response | undefined
    ) {
        const posts: { body: string; status: number }[] = [];
        const log = jest.fn();
        const browserFetch: typeof fetch = async (url, options) => {
            try {
                const isResult = new URL(String(url)).pathname === `${API}/result`;
                const response =
                    (isResult ? proxyResponse?.(posts.length) : undefined) ??
                    (await fetch(url, {
                        ...options,
                        signal: AbortSignal.any([controller.signal, ...(options?.signal ? [options.signal] : [])])
                    }));
                if (isResult) {
                    posts.push({ body: String(options?.body), status: response.status });
                }
                return response;
            } catch (error) {
                if (controller.signal.aborted) {
                    // Stop the VM's poll loop on test teardown without scheduling reconnect timers.
                    return new Response(null, { status: 409 });
                }
                throw error;
            }
        };
        const win: Record<string, unknown> = {
            top: {},
            sap: {
                ui: {
                    require: (_modules: string[], resolve: (api: unknown) => void) =>
                        resolve({ getOverlaysInformation })
                }
            }
        };
        win.self = win;
        runInNewContext(source, {
            document: {
                currentScript: { src: `${origin}${API}/client.js`, dataset: { token: TOKEN } },
                getElementById: () => null
            },
            window: win,
            location: { origin, href: `${origin}/test/adaptation-editor.html` },
            crypto: { randomUUID: () => CLIENT_ID },
            URL,
            AbortController,
            setTimeout,
            clearTimeout,
            fetch: browserFetch,
            console: { error: log }
        });
        return { posts, log };
    }

    async function post(endpoint: string, body: unknown, token = TOKEN): Promise<Response> {
        return fetch(`${origin}${API}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Relay-Token': token },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(5000)
        });
    }

    test('accepts a result larger than 100 KiB with the default limit', async () => {
        await startServer();
        const result = frontendResult('x'.repeat(128 * 1024));
        const action = jest.fn(async () => result);
        startClient(action);
        const response = await post('action', { actionName: ACTION });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ result, clientId: CLIENT_ID });
        expect(action).toHaveBeenCalledTimes(1);
    });

    test('accepts exactly the configured UTF-8 byte limit including the envelope', async () => {
        const limit = 4096;
        process.env.SAP_FIORI_MCP_ADP_RELAY_RESULT_LIMIT_BYTES = String(limit);
        await startServer();
        const envelope = (label: string) => ({
            id: '0'.repeat(32),
            clientId: CLIENT_ID,
            result: frontendResult(label)
        });
        const remaining = limit - Buffer.byteLength(JSON.stringify(envelope('')));
        const label = '€'.repeat(Math.floor(remaining / 3)) + 'x'.repeat(remaining % 3);
        expect(Buffer.byteLength(JSON.stringify(envelope(label)))).toBe(limit);
        startClient(jest.fn(async () => frontendResult(label)));
        const response = await post('action', { actionName: ACTION });
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ result: frontendResult(label) });
    });

    test.each([undefined, '1024'])(
        'reports an oversized result and processes the next action without replay for limit=%s',
        async (configuredLimit) => {
            if (configuredLimit !== undefined) {
                process.env.SAP_FIORI_MCP_ADP_RELAY_RESULT_LIMIT_BYTES = configuredLimit;
            }
            const limit = configuredLimit === undefined ? DEFAULT_LIMIT : Number(configuredLimit);
            await startServer();
            const action = jest
                .fn<() => Promise<unknown>>()
                .mockResolvedValueOnce(frontendResult('x'.repeat(limit)))
                .mockResolvedValueOnce(frontendResult());
            const client = startClient(action);
            const first = await post('action', { actionName: ACTION });
            const message = `The editor result exceeds the configured relay limit (${limit} bytes).`;
            expect(first.status).toBe(500);
            expect(await first.json()).toEqual({ error: message });
            expect(action).toHaveBeenCalledTimes(1);

            const second = await post('action', { actionName: ACTION });
            expect(second.status).toBe(200);
            expect(await second.json()).toEqual({ result: frontendResult(), clientId: CLIENT_ID });
            expect(action).toHaveBeenCalledTimes(2);
            // Delivering the second action proves the compact error was acknowledged and released the slot.
            expect(client.posts.slice(0, 2).map(({ status }) => status)).toEqual([413, 200]);
            expect(JSON.parse(client.posts[1].body)).toMatchObject({
                clientId: CLIENT_ID,
                error: message
            });
            expect(Buffer.byteLength(client.posts[1].body)).toBeLessThan(1024);
            expect(client.log).not.toHaveBeenCalled();
        }
    );

    test.each(['invalid', '0', '1023', '1024.5', 'Infinity', '9007199254740992'])(
        'uses the default limit for invalid configuration %s',
        async (configuredLimit) => {
            process.env.SAP_FIORI_MCP_ADP_RELAY_RESULT_LIMIT_BYTES = configuredLimit;
            await startServer();
            startClient(jest.fn(async () => frontendResult('x'.repeat(128 * 1024))));
            const response = await post('action', { actionName: ACTION });
            expect(response.status).toBe(200);
            await response.arrayBuffer();
        }
    );

    test('keeps the command limit at 100 KiB and accepts a subsequent valid command', async () => {
        await startServer();
        const action = jest.fn(async () => frontendResult());
        startClient(action);
        const rejected = await post('action', { actionName: ACTION, payload: { text: 'x'.repeat(100 * 1024) } });
        expect(rejected.status).toBe(413);
        await rejected.text();
        expect(action).not.toHaveBeenCalled();
        const accepted = await post('action', { actionName: ACTION });
        expect(accepted.status).toBe(200);
        await accepted.json();
        expect(action).toHaveBeenCalledTimes(1);
    });

    test('authenticates oversized results before parsing and preserves malformed JSON errors', async () => {
        process.env.SAP_FIORI_MCP_ADP_RELAY_RESULT_LIMIT_BYTES = '1024';
        await startServer();
        const unauthorized = await post('result', { result: 'x'.repeat(2048) }, 'wrong-token');
        expect(unauthorized.status).toBe(401);
        await unauthorized.json();
        const malformed = await fetch(`${origin}${API}/result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Relay-Token': TOKEN },
            body: '{'
        });
        expect(malformed.status).toBe(400);
        await malformed.text();
    });

    test('recovers from a proxy HTML 413 using a compact error without repeating the action', async () => {
        await startServer();
        const action = jest.fn(async () => frontendResult());
        const client = startClient(action, (attempt) =>
            attempt === 0 ? new Response('<html>Too large</html>', { status: 413 }) : undefined
        );
        const first = await post('action', { actionName: ACTION });
        expect(first.status).toBe(500);
        expect(await first.json()).toEqual({
            error: 'The editor result exceeds the relay or proxy size limit (HTTP 413).'
        });
        const next = await post('action', { actionName: ACTION });
        expect(next.status).toBe(200);
        await next.json();
        expect(action).toHaveBeenCalledTimes(2);
        expect(client.posts.slice(0, 2).map(({ status }) => status)).toEqual([413, 200]);
        expect(client.log).not.toHaveBeenCalled();
    });
});
