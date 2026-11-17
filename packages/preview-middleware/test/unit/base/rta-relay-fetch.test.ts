import { jest } from '@jest/globals';
import express from 'express';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { runInNewContext } from 'node:vm';
import { addRtaRelayApis } from '../../../src/base/rta-relay.js';

const TOKEN = 'a1'.repeat(32);
const API = '/adp/api/rta';
const source = readFileSync(new URL('../../../templates/rta-relay-client.js', import.meta.url), 'utf8');
const EDMX = '<edmx:Edmx><edmx:DataServices/></edmx:Edmx>';

describe('metadata fetch with the real relay and browser client', () => {
    let server: Server;
    let origin: string;
    let shutdown: AbortController;
    let backendClosed: Promise<unknown[]>;
    const backendRequests: string[] = [];
    const browserSignals: AbortSignal[] = [];

    beforeEach(async () => {
        shutdown = new AbortController();
        backendRequests.length = 0;
        browserSignals.length = 0;
        const app = express();
        addRtaRelayApis(app, TOKEN);
        app.get('/metadata/:mode', (req, res) => {
            backendRequests.push(req.params.mode);
            backendClosed = once(res, 'close');
            if (req.params.mode === 'body') {
                res.type('application/xml').write('<edmx:Edmx>');
            } else if (req.params.mode === 'success') {
                res.type('application/xml').send(EDMX);
            } else if (req.params.mode === 'reset') {
                res.destroy();
            }
            // Other modes deliberately withhold headers, or leave the body unfinished.
        });
        server = app.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const address = server.address();
        if (!address || typeof address === 'string') {
            throw new Error('Expected a TCP address');
        }
        origin = `http://127.0.0.1:${address.port}`;
    });

    afterEach(async () => {
        shutdown.abort();
        const closed = new Promise<void>((resolve) => server.close(() => resolve()));
        server.closeAllConnections();
        await closed;
        await new Promise(setImmediate);
    });

    function startClient(): void {
        const browserFetch: typeof fetch = async (url, options) => {
            const metadata = new URL(String(url)).pathname.startsWith('/metadata/');
            if (metadata && options?.signal) {
                browserSignals.push(options.signal);
            }
            try {
                return await fetch(url, {
                    ...options,
                    signal: AbortSignal.any([shutdown.signal, ...(options?.signal ? [options.signal] : [])])
                });
            } catch (error) {
                if (shutdown.signal.aborted) {
                    // End polling during teardown without creating a reconnect timer.
                    return new Response(null, { status: 409 });
                }
                throw error;
            }
        };
        const win: Record<string, unknown> = { top: {} };
        win.self = win;
        runInNewContext(source, {
            document: { currentScript: { src: `${origin}${API}/client.js`, dataset: { token: TOKEN } } },
            window: win,
            location: { origin, href: `${origin}/test/adaptation-editor.html` },
            crypto: { randomUUID: () => 'metadata-client' },
            URL,
            AbortController,
            // Accelerate only the browser's 30-second timers; keep the real relay deadlines.
            setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms === 30000 ? 500 : ms),
            clearTimeout,
            fetch: browserFetch,
            console: { error: jest.fn() }
        });
    }

    async function fetchMetadata(mode: string): Promise<Response> {
        return fetch(`${origin}${API}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Relay-Token': TOKEN },
            body: JSON.stringify({ actionName: '__fetch__', payload: { url: `${origin}/metadata/${mode}` } }),
            signal: AbortSignal.timeout(2500)
        });
    }

    test.each(['headers', 'body'])('aborts stalled %s and processes the next service without replay', async (mode) => {
        startClient();
        const response = await fetchMetadata(mode);
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
            result: {
                isSuccess: false,
                payload: null,
                error: { code: 'FETCH_TIMEOUT', message: 'The metadata fetch timed out after 30 seconds.' }
            }
        });
        expect(browserSignals).toHaveLength(1);
        expect(browserSignals[0].aborted).toBe(true);
        // The underlying HTTP connection must close, not just a wrapper promise time out.
        await backendClosed;
        const next = await fetchMetadata('success');
        expect(next.status).toBe(200);
        expect(await next.json()).toMatchObject({
            result: { isSuccess: true, payload: { status: 200, body: EDMX } }
        });
        expect(backendRequests).toEqual([mode, 'success']);
    });

    test('clears the fetch timer after success', async () => {
        startClient();
        const response = await fetchMetadata('success');
        expect(response.status).toBe(200);
        await response.json();
        expect(browserSignals).toHaveLength(1);
        await new Promise((resolve) => setTimeout(resolve, 600));
        expect(browserSignals[0].aborted).toBe(false);
    });

    test('reports a network error, clears its timer, and processes the next service', async () => {
        startClient();
        const response = await fetchMetadata('reset');
        expect(response.status).toBe(500);
        expect(await response.json()).toHaveProperty('error', expect.any(String));
        const next = await fetchMetadata('success');
        expect(next.status).toBe(200);
        await next.json();
        expect(backendRequests).toEqual(['reset', 'success']);
        expect(browserSignals).toHaveLength(2);
        await new Promise((resolve) => setTimeout(resolve, 600));
        expect(browserSignals.every((signal) => !signal.aborted)).toBe(true);
    });
});
