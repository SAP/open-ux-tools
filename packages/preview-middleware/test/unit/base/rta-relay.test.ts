import { jest } from '@jest/globals';
import express from 'express';
import supertest from 'supertest';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import type { Server } from 'node:http';
import { addRtaRelayApis } from '../../../src/base/rta-relay.js';

const TOKEN = 'a1'.repeat(32);
const API = '/adp/api/rta';
const ACTION = 'com.sap.ui.flex.getOverlays.v1';

describe('preview RTA relay', () => {
    let app: express.Express;
    let server: supertest.Agent;
    let listener: Server;

    beforeEach(() => {
        jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
        app = express();
        app.use(express.json());
        app.use((_req, res, next) => {
            res.once('close', () => app.emit('relay-close'));
            next();
            app.emit('relay-request');
        });
        addRtaRelayApis(app, TOKEN);
        listener = app.listen(0);
        server = supertest(listener);
    });

    afterEach(async () => {
        jest.clearAllTimers();
        jest.useRealTimers();
        await new Promise<void>((resolve) => listener.close(() => resolve()));
    });

    const poll = (clientId = 'first') => server.get(`${API}/poll`).query({ clientId }).set('X-Relay-Token', TOKEN);
    const action = (actionName = ACTION) =>
        server.post(`${API}/action`).set('X-Relay-Token', TOKEN).send({ actionName });
    const result = (id: string, clientId = 'first', value: unknown = { isSuccess: true }) =>
        server.post(`${API}/result`).set('X-Relay-Token', TOKEN).send({ id, clientId, result: value });

    // Synchronize on route registration rather than timing sleeps or retried mutations.
    const begin = async (request: supertest.Test) => {
        const received = once(app, 'relay-request');
        const response = request.then((res) => res);
        await received;
        return { response };
    };

    test.each([
        '',
        'abc',
        'g'.repeat(64),
        'a'.repeat(63),
        'a'.repeat(65),
        'a'.repeat(64) + '\n',
        '"><script>alert(1)</script>'
    ])('invalid token registers nothing: %s', async (token) => {
        const disabled = express();
        expect(addRtaRelayApis(disabled, token)).toBeUndefined();
        await supertest(disabled).get(`${API}/client.js`).expect(404);
        await supertest(disabled).post(`${API}/action`).send({ actionName: ACTION }).expect(404);
    });

    test('public script has no token, uses no-store, and tag escapes mount prefixes', async () => {
        const other = express();
        const relay = addRtaRelayApis(other, TOKEN.toUpperCase());
        expect(relay?.clientTag('/prefix/"<&')).toBe(
            `<script src="/prefix/&#34;&lt;&amp;${API}/client.js" data-token="${TOKEN.toUpperCase()}" defer></script>\n`
        );
        const response = await server.get(`${API}/client.js`).expect(200);
        expect(response.headers['content-type']).toContain('application/javascript');
        expect(response.headers['cache-control']).toBe('no-store');
        expect(response.text).not.toContain(TOKEN);
        expect(response.text).toContain('script.dataset.token');
    });

    test.each([
        ['get', 'poll'],
        ['post', 'action'],
        ['post', 'result']
    ] as const)('%s %s requires the exact relay token header', async (method, route) => {
        for (const header of ['', 'b'.repeat(64), `Bearer ${TOKEN}`, TOKEN.toUpperCase()]) {
            await server[method](`${API}/${route}`).set('X-Relay-Token', header).expect(401);
        }
        await server[method](`${API}/${route}`).set('Authorization', `Bearer ${TOKEN}`).expect(401);
    });

    test('delivers a queued action only once and rejects concurrent commands', async () => {
        const command = await begin(action());
        await action().expect(409, { error: 'Relay busy' });
        const delivery = await poll().expect(200);
        expect(delivery.body).toEqual({ id: expect.any(String), actionName: ACTION, payload: {} });
        await poll().expect(409);
        await poll('second').expect(409);
        await result(delivery.body.id).expect(200, { ok: true });
        expect((await command.response).body).toEqual({ result: { isSuccess: true }, clientId: 'first' });
        await result(delivery.body.id).expect(404);
    });

    test('does not evict an active poll, even for the same document', async () => {
        const waiting = await begin(poll());
        await poll().expect(409);
        await poll('second').expect(409);
        const command = await begin(action());
        const delivery = await waiting.response;
        await result(delivery.body.id).expect(200);
        expect((await command.response).status).toBe(200);
    });

    test('forwards payload and frame unchanged', async () => {
        const command = await begin(
            server
                .post(`${API}/action`)
                .set('X-Relay-Token', TOKEN)
                .send({ actionName: ACTION, payload: { controlId: 'control' }, frameId: 'preview' })
        );
        const delivery = await poll().expect(200);
        expect(delivery.body).toMatchObject({ payload: { controlId: 'control' }, frameId: 'preview' });
        await result(delivery.body.id).expect(200);
        await command.response;
    });

    test('validates the result owner without consuming the action', async () => {
        const command = await begin(action());
        const delivery = await poll().expect(200);
        await result(delivery.body.id, 'second').expect(409);
        await result('unknown').expect(404);
        await result(delivery.body.id).expect(200);
        expect((await command.response).status).toBe(200);
    });

    test('propagates client errors without releasing ownership', async () => {
        const command = await begin(action());
        const delivery = await poll().expect(200);
        await server
            .post(`${API}/result`)
            .set('X-Relay-Token', TOKEN)
            .send({ id: delivery.body.id, clientId: 'first', error: 'UI5 failure' })
            .expect(200);
        expect((await command.response).body).toEqual({ error: 'UI5 failure' });
        await poll('second').expect(409);
    });

    test.each([
        ['__reload__', { reloaded: true }],
        ['__stop__', { stopped: true }]
    ])('%s acknowledgement releases ownership and retires the old document', async (name, acknowledgement) => {
        const command = await begin(action(name as string));
        const delivery = await poll().expect(200);
        await result(delivery.body.id, 'first', acknowledgement).expect(200);
        expect((await command.response).body).toEqual({ result: acknowledgement, clientId: 'first' });
        expect(jest.getTimerCount()).toBe(0);
        await poll().expect(409);
        const ready = await begin(action('__ready__'));
        const newDelivery = await poll('new-document').expect(200);
        expect(newDelivery.body.actionName).toBe('__ready__');
        await result(newDelivery.body.id, 'new-document', { isSuccess: true, payload: { ready: true } }).expect(200);
        expect((await ready.response).body.clientId).toBe('new-document');
    });

    test('keeps the owner until the idle lease expires, with 25-second keepalives', async () => {
        const waiting = await begin(poll());
        jest.advanceTimersByTime(25000);
        expect((await waiting.response).body).toBeNull();
        await poll('second').expect(409);
        jest.advanceTimersByTime(29999);
        await poll('second').expect(409);
        jest.advanceTimersByTime(1);
        const next = await begin(poll('second'));
        jest.advanceTimersByTime(25000);
        expect((await next.response).body).toBeNull();
        expect(jest.getTimerCount()).toBe(0);
    });

    test('times out an action after 60 seconds without redelivery', async () => {
        const command = await begin(action());
        const delivery = await poll().expect(200);
        jest.advanceTimersByTime(60000);
        expect((await command.response).status).toBe(504);
        await result(delivery.body.id).expect(404);
        const next = await begin(poll('second'));
        jest.advanceTimersByTime(25000);
        expect((await next.response).body).toBeNull();
    });

    test.each(['poll', 'action'])('disconnect clears the %s timer and slot', async (route) => {
        const request = route === 'poll' ? poll() : action();
        const started = await begin(request);
        // Aborted supertest requests reject; no relay request is retried.
        const rejected = started.response.catch(() => undefined);
        const closed = once(app, 'relay-close');
        request.abort();
        await closed;
        await rejected;
        expect(jest.getTimerCount()).toBe(0);
        const command = await begin(action());
        const delivery = await poll().expect(200);
        await result(delivery.body.id).expect(200);
        expect((await command.response).status).toBe(200);
    });

    test('relay state is isolated between preview routers', async () => {
        const first = await begin(poll());
        const other = express();
        addRtaRelayApis(other, TOKEN);
        const otherServer = supertest(other);
        const second = otherServer
            .get(`${API}/poll?clientId=second`)
            .set('X-Relay-Token', TOKEN)
            .then((res) => res);
        const command = await begin(action());
        const delivery = await first.response;
        await result(delivery.body.id).expect(200);
        await command.response;
        const otherCommand = otherServer
            .post(`${API}/action`)
            .set('X-Relay-Token', TOKEN)
            .send({ actionName: ACTION })
            .then((res) => res);
        const secondDelivery = await second;
        await otherServer
            .post(`${API}/result`)
            .set('X-Relay-Token', TOKEN)
            .send({ id: secondDelivery.body.id, clientId: 'second', result: null })
            .expect(200);
        expect((await otherCommand).body.clientId).toBe('second');
    });

    test.each([
        null,
        [],
        {},
        { actionName: 12 },
        { actionName: '' },
        { actionName: '__unknown__' },
        { actionName: ACTION + '\n' },
        { actionName: 'constructor' },
        { actionName: ACTION, payload: null },
        { actionName: ACTION, payload: [] },
        { actionName: ACTION, frameId: 1 },
        { actionName: ACTION, frameId: ' ' }
    ])('rejects invalid action bodies: %j', async (body) => {
        await server
            .post(`${API}/action`)
            .set('X-Relay-Token', TOKEN)
            .set('Content-Type', 'application/json')
            .send(JSON.stringify(body))
            .expect(400);
        expect(jest.getTimerCount()).toBe(0);
    });

    test.each([
        {},
        { id: 'x' },
        { id: 'x', clientId: 'first' },
        { id: 'x', clientId: 'first', error: 1 },
        { id: 'x', clientId: 'first', error: 'failed', result: null }
    ])('rejects invalid result bodies: %j', async (body) => {
        await server.post(`${API}/result`).set('X-Relay-Token', TOKEN).send(body).expect(400);
    });

    test.each(['', 'has spaces', 'first\n', 'a'.repeat(129)])('rejects invalid poll clientId: %s', async (clientId) => {
        await poll(clientId).expect(400);
    });
});

describe('relay browser client', () => {
    const source = readFileSync(new URL('../../../templates/rta-relay-client.js', import.meta.url), 'utf8');

    const editorRta = (instance: unknown = {}) => ({ getCurrentInstance: jest.fn(() => instance) });
    const requireWith =
        (api: unknown, rta: unknown = editorRta()) =>
        (modules: string[], resolve: (module: unknown) => void) =>
            resolve(modules[0] === 'sap/ui/rta/RuntimeAuthoring' ? rta : api);

    const runClient = async (
        actions: Record<string, unknown>[],
        api: Record<string, unknown> = {},
        frameWindow?: unknown,
        failResult = false,
        { rta = editorRta(), fastClock = false }: { rta?: unknown; fastClock?: boolean } = {}
    ) => {
        const ui5Require = jest.fn(requireWith(api, rta));
        // A virtual clock lets deadline paths run without real waiting.
        let now = 0;
        const clock = fastClock
            ? {
                  Date: { now: () => now },
                  setTimeout: (callback: () => void, ms = 0) =>
                      setImmediate(() => {
                          now += ms;
                          callback();
                      }),
                  clearTimeout: clearImmediate
              }
            : { setTimeout, clearTimeout };
        const reload = jest.fn();
        const log = jest.fn();
        const fetch = jest.fn(async (url: URL, options: { body?: string }) => {
            if (options.body) {
                if (failResult) {
                    throw new Error('Result network failure');
                }
                return { ok: true, json: async () => ({ ok: true }) };
            }
            if (!actions.length) {
                return { ok: false, status: 409 };
            }
            return { ok: true, json: async () => actions.shift() };
        });
        runInNewContext(source, {
            document: {
                currentScript: { src: `https://preview.test/prefix${API}/client.js`, dataset: { token: TOKEN } },
                getElementById: () => (frameWindow ? { contentWindow: frameWindow } : null)
            },
            window: { sap: { ui: { require: ui5Require } } },
            crypto: { randomUUID: () => 'document-id' },
            location: { reload },
            console: { error: log },
            URL,
            AbortController,
            ...clock,
            fetch
        });
        await new Promise(setImmediate);
        return { fetch, reload, log, ui5Require };
    };

    const waitForResult = async (client: { fetch: jest.Mock }) => {
        for (let i = 0; i < 2000 && client.fetch.mock.calls.length < 2; i++) {
            await new Promise(setImmediate);
        }
        return JSON.parse(client.fetch.mock.calls[1][1].body ?? '');
    };

    test('uses authenticated prefixed endpoints and the inner-frame fallback', async () => {
        const getOverlays = jest.fn().mockResolvedValue({ overlays: [] });
        const client = await runClient([{ id: '1', actionName: ACTION, payload: { test: true }, frameId: 'preview' }], {
            getOverlays
        });
        expect(getOverlays).toHaveBeenCalledWith({ test: true });
        const [url, options] = client.fetch.mock.calls[0];
        expect(url.toString()).toBe(`https://preview.test/prefix${API}/poll?clientId=document-id`);
        expect(options).toMatchObject({ headers: { 'X-Relay-Token': TOKEN }, cache: 'no-store' });
        expect(JSON.parse(client.fetch.mock.calls[1][1].body ?? '')).toEqual({
            id: '1',
            clientId: 'document-id',
            result: { overlays: [] }
        });
    });

    test('descends into an existing frame and handles readiness without invoking a UI5 mutation', async () => {
        const frameRequire = jest.fn(requireWith({}));
        const client = await runClient(
            [{ id: '1', actionName: '__ready__', frameId: 'preview' }],
            {},
            {
                sap: { ui: { require: frameRequire } }
            }
        );
        expect(frameRequire).toHaveBeenCalled();
        expect(client.ui5Require).not.toHaveBeenCalled();
        expect((await waitForResult(client)).result).toEqual({
            isSuccess: true,
            payload: { ready: true }
        });
    });

    test.each(['__ready__', 'com.sap.ui.flex.startRTA.v1'])(
        '%s waits for the editor RTA instance, so startRTA adopts it instead of a key-user session',
        async (actionName) => {
            const editor: { instance?: unknown } = {};
            const rta = { getCurrentInstance: jest.fn(() => editor.instance) };
            const startRTA = jest.fn().mockResolvedValue({ isSuccess: true, payload: { rtaStarted: true } });
            const client = await runClient([{ id: '1', actionName }], { startRTA }, undefined, false, {
                rta,
                fastClock: true
            });
            await new Promise(setImmediate);
            expect(client.fetch).toHaveBeenCalledTimes(1);
            expect(startRTA).not.toHaveBeenCalled();
            editor.instance = {};
            const body = await waitForResult(client);
            expect(body.result.isSuccess).toBe(true);
            expect(startRTA).toHaveBeenCalledTimes(actionName === '__ready__' ? 0 : 1);
            expect(rta.getCurrentInstance.mock.calls.length).toBeGreaterThan(1);
        }
    );

    test.each(['__ready__', 'com.sap.ui.flex.startRTA.v1'])(
        '%s reports when the editor never starts RTA, without starting a key-user session',
        async (actionName) => {
            const startRTA = jest.fn();
            const client = await runClient([{ id: '1', actionName }], { startRTA }, undefined, false, {
                rta: { getCurrentInstance: () => undefined },
                fastClock: true
            });
            expect((await waitForResult(client)).result).toEqual({
                isSuccess: false,
                payload: null,
                error: { code: 'EDITOR_RTA_NOT_STARTED', message: 'The adaptation editor did not start UI adaptation' }
            });
            expect(startRTA).not.toHaveBeenCalled();
        }
    );

    test('treats a missing RuntimeAuthoring module as not started', async () => {
        const ui5Require = jest.fn(
            (modules: string[], resolve: (module: unknown) => void, reject: (error: Error) => void) =>
                modules[0] === 'sap/ui/rta/RuntimeAuthoring' ? reject(new Error('missing')) : resolve({})
        );
        const client = await runClient(
            [{ id: '1', actionName: '__ready__', frameId: 'preview' }],
            {},
            { sap: { ui: { require: ui5Require } } },
            false,
            { fastClock: true }
        );
        expect((await waitForResult(client)).result.error.code).toBe('EDITOR_RTA_NOT_STARTED');
    });

    test.each(['__reload__', '__stop__'])(
        '%s acknowledges and ends polling without loading UI5',
        async (actionName) => {
            const client = await runClient([{ id: '1', actionName }]);
            expect(client.fetch).toHaveBeenCalledTimes(2);
            expect(client.ui5Require).not.toHaveBeenCalled();
            expect(client.reload).toHaveBeenCalledTimes(actionName === '__reload__' ? 1 : 0);
            expect(JSON.parse(client.fetch.mock.calls[1][1].body ?? '').result).toEqual(
                actionName === '__reload__' ? { reloaded: true } : { stopped: true }
            );
        }
    );

    test('reports an unavailable action without replaying it', async () => {
        const client = await runClient([{ id: '1', actionName: ACTION }]);
        expect(JSON.parse(client.fetch.mock.calls[1][1].body ?? '').error).toContain('Frontend action not available');
        expect(client.ui5Require).toHaveBeenCalledTimes(1);
    });

    test('does not retry result submission or its mutation after a network failure', async () => {
        const getOverlays = jest.fn().mockResolvedValue({ overlays: [] });
        const client = await runClient([{ id: '1', actionName: ACTION }], { getOverlays }, undefined, true);
        expect(getOverlays).toHaveBeenCalledTimes(1);
        expect(client.fetch).toHaveBeenCalledTimes(2);
        expect(client.log).toHaveBeenCalled();
    });
});
