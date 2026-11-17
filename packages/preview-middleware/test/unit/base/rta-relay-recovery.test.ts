import { jest } from '@jest/globals';
import express from 'express';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { runInNewContext } from 'node:vm';
import { addRtaRelayApis } from '../../../src/base/rta-relay.js';

const TOKEN = 'a1'.repeat(32);
const API = '/adp/api/rta';
const ACTION = 'com.sap.ui.flex.getOverlays.v1';
const source = readFileSync(new URL('../../../templates/rta-relay-client.js', import.meta.url), 'utf8');
const realNow = Date.now.bind(Date);
type Intercept = (send: () => Promise<Response>, attempt: number) => Promise<Response>;
interface TestClient {
    posts: string[];
    polls: number[];
    effects: jest.Mock<() => Promise<unknown>>;
    log: jest.Mock;
    reload: jest.Mock;
    close: jest.Mock;
    stop: () => void;
}

describe('relay recovery with the real server and browser client', () => {
    let server: Server;
    let origin: string;
    let now: number;
    const clients: TestClient[] = [];

    beforeEach(async () => {
        now = realNow();
        jest.spyOn(Date, 'now').mockImplementation(() => now);
        const app = express();
        addRtaRelayApis(app, TOKEN);
        server = app.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const address = server.address();
        if (!address || typeof address === 'string') {
            throw new Error('Expected a TCP address');
        }
        origin = `http://127.0.0.1:${address.port}`;
    });

    afterEach(async () => {
        for (const client of clients) {
            client.stop();
        }
        clients.length = 0;
        const closed = new Promise<void>((resolve) => server.close(() => resolve()));
        server.closeAllConnections();
        await closed;
        await new Promise(setImmediate);
        jest.restoreAllMocks();
    });

    function startClient(id: string, resultIntercept?: Intercept, pollIntercept?: Intercept): TestClient {
        const controller = new AbortController();
        const timers = new Set<ReturnType<typeof setTimeout>>();
        const posts: string[] = [];
        const polls: number[] = [];
        const effects = jest.fn<() => Promise<unknown>>(async () => ({ isSuccess: true, payload: { id } }));
        const log = jest.fn();
        const reload = jest.fn();
        const close = jest.fn();
        let pollAttempts = 0;
        const browserFetch: typeof fetch = async (url, options) => {
            const result = new URL(String(url)).pathname.endsWith('/result');
            if (result) {
                posts.push(String(options?.body));
            }
            const send = () =>
                fetch(url, {
                    ...options,
                    signal: AbortSignal.any([controller.signal, ...(options?.signal ? [options.signal] : [])])
                });
            try {
                if (controller.signal.aborted) {
                    throw new Error('Test document closed');
                }
                const response = result
                    ? await (resultIntercept ? resultIntercept(send, posts.length) : send())
                    : await (pollIntercept ? pollIntercept(send, ++pollAttempts) : send());
                if (!result) {
                    polls.push(response.status);
                }
                return response;
            } catch (error) {
                if (controller.signal.aborted) {
                    return new Response(null, { status: 401 });
                }
                throw error;
            }
        };
        const win: Record<string, unknown> = {
            sap: {
                ui: {
                    require: (_modules: string[], resolve: (api: unknown) => void) => resolve({ getOverlays: effects })
                }
            },
            close,
            location: { origin }
        };
        win.self = win;
        // In-frame execution skips the app-loaded gate; the top-level tab is safe to close.
        win.top = { location: { origin }, close };
        runInNewContext(source, {
            document: {
                currentScript: { src: `${origin}${API}/client.js`, dataset: { token: TOKEN } },
                getElementById: () => null
            },
            window: win,
            location: { origin, href: `${origin}/test/adaptation-editor.html`, reload },
            crypto: { randomUUID: () => id },
            URL,
            AbortController,
            Date,
            // Accelerate short retry delays and advance the shared lease/recovery clock with them.
            setTimeout: (callback: () => void, ms: number) => {
                const timer = setTimeout(
                    () => {
                        timers.delete(timer);
                        if (ms <= 5000) {
                            now += ms;
                        }
                        callback();
                    },
                    ms <= 5000 ? 10 : ms
                );
                timers.add(timer);
                return timer;
            },
            clearTimeout: (timer: ReturnType<typeof setTimeout>) => {
                timers.delete(timer);
                clearTimeout(timer);
            },
            fetch: browserFetch,
            console: { error: log }
        });
        const client = {
            posts,
            polls,
            effects,
            log,
            reload,
            close,
            stop: () => {
                controller.abort();
                timers.forEach(clearTimeout);
                timers.clear();
            }
        };
        clients.push(client);
        return client;
    }

    async function command(actionName = ACTION): Promise<Response> {
        return fetch(`${origin}${API}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Relay-Token': TOKEN },
            body: JSON.stringify({ actionName, payload: { closeWindow: true } }),
            signal: AbortSignal.timeout(3000)
        });
    }

    async function until(predicate: () => boolean): Promise<void> {
        const deadline = realNow() + 2000;
        while (!predicate() && realNow() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 5));
        }
        expect(predicate()).toBe(true);
    }

    test('a refreshed document reconnects after the old owner lease expires', async () => {
        const old = startClient('old');
        expect((await command()).status).toBe(200);
        await until(() => old.posts.length === 1);
        old.stop();
        const fresh = startClient('fresh');
        const next = await command();
        expect(next.status).toBe(200);
        expect(await next.json()).toHaveProperty('clientId', 'fresh');
        expect(fresh.polls).toContain(409);
        expect(old.effects).toHaveBeenCalledTimes(1);
        expect(fresh.effects).toHaveBeenCalledTimes(1);
    });

    test.each(['request', 'acknowledgement'])(
        'recovers a lost result %s without repeating the action',
        async (lost) => {
            const client = startClient('owner', async (send, attempt) => {
                if (attempt === 1) {
                    if (lost === 'acknowledgement') {
                        await (await send()).text();
                    }
                    throw new TypeError('Connection lost');
                }
                return send();
            });
            expect((await command()).status).toBe(200);
            // For a lost acknowledgement, the second command can arrive before the first result retry.
            expect((await command()).status).toBe(200);
            expect(client.effects).toHaveBeenCalledTimes(2);
            expect(client.posts).toHaveLength(3);
            expect(client.posts[0]).toBe(client.posts[1]);
            expect(JSON.parse(client.posts[2]).id).not.toBe(JSON.parse(client.posts[0]).id);
        }
    );

    test('recovers a compact oversized-result error when its acknowledgement is lost', async () => {
        const client = startClient('owner', async (send, attempt) => {
            if (attempt === 1) {
                return new Response('<html>Too large</html>', { status: 413 });
            }
            if (attempt === 2) {
                await (await send()).text();
                throw new TypeError('Acknowledgement lost');
            }
            return send();
        });
        const first = await command();
        expect(first.status).toBe(500);
        expect(await first.json()).toHaveProperty('error', expect.stringContaining('HTTP 413'));
        expect((await command()).status).toBe(200);
        expect(client.effects).toHaveBeenCalledTimes(2);
        expect(client.posts[1]).toBe(client.posts[2]);
        expect(client.posts).toHaveLength(4);
    });

    test('a duplicate tab stops after bounded recovery without displacing the active owner', async () => {
        const owner = startClient('owner');
        expect((await command()).status).toBe(200);
        const duplicate = startClient('duplicate');
        await until(() => duplicate.log.mock.calls.some(([message]) => String(message).includes('recovery timed out')));
        const next = await command();
        expect(next.status).toBe(200);
        expect(await next.json()).toHaveProperty('clientId', 'owner');
        expect(owner.effects).toHaveBeenCalledTimes(2);
        expect(duplicate.effects).not.toHaveBeenCalled();
        const attempts = duplicate.polls.length;
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(duplicate.polls).toHaveLength(attempts);
    });

    test('retries an invalid acknowledgement without changing the serialized result', async () => {
        const payload = { label: 'original' };
        const client = startClient('owner', async (send, attempt) => {
            const response = await send();
            if (attempt === 1) {
                await response.text();
                payload.label = 'changed while retrying';
                return new Response('{}');
            }
            return response;
        });
        client.effects.mockResolvedValue({ isSuccess: true, payload });
        const first = await command();
        expect(await first.json()).toHaveProperty('result.payload.label', 'original');
        expect((await command()).status).toBe(200);
        expect(client.posts[0]).toBe(client.posts[1]);
        expect(client.effects).toHaveBeenCalledTimes(2);
    });

    test.each(['__reload__', '__stop__'])(
        '%s retries a lost acknowledgement and performs the lifecycle action once',
        async (actionName) => {
            const client = startClient('owner', async (send, attempt) => {
                const response = await send();
                if (attempt === 1) {
                    await response.text();
                    throw new TypeError('Acknowledgement lost');
                }
                return response;
            });
            expect((await command(actionName)).status).toBe(200);
            await until(() =>
                actionName === '__reload__'
                    ? client.reload.mock.calls.length === 1
                    : client.close.mock.calls.length === 1
            );
            expect(client.posts).toHaveLength(2);
            expect(client.posts[0]).toBe(client.posts[1]);
            expect(client.effects).not.toHaveBeenCalled();
            expect(client.polls).toHaveLength(1);
            const fresh = startClient('fresh');
            expect((await command()).status).toBe(200);
            expect(fresh.effects).toHaveBeenCalledTimes(1);
            const retired = startClient('owner');
            await until(() => retired.log.mock.calls.length > 0);
            expect(retired.polls).toEqual([409]);
            expect(retired.effects).not.toHaveBeenCalled();
        }
    );

    test('recovers a transient poll failure and resets the recovery budget after success', async () => {
        const client = startClient('owner', undefined, async (send, attempt) => {
            if (attempt === 1 || attempt === 3) {
                if (attempt === 3) {
                    now += 100000;
                }
                return new Response('Gateway unavailable', { status: 503 });
            }
            return send();
        });
        expect((await command()).status).toBe(200);
        expect((await command()).status).toBe(200);
        expect(client.effects).toHaveBeenCalledTimes(2);
        expect(client.polls.filter((status) => status === 503)).toHaveLength(2);
    });

    test.each([401, 404, 409])('stops polling on terminal or unrecognized HTTP %s', async (status) => {
        const client = startClient('owner', undefined, async () => new Response('Rejected', { status }));
        await until(() => client.log.mock.calls.length > 0);
        expect(client.polls).toEqual([status]);
        expect(client.effects).not.toHaveBeenCalled();
    });
});
