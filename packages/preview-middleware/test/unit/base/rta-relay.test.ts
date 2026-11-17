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
        await result(delivery.body.id).expect(200, { ok: true });
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

    test('distinguishes temporary poll conflicts and fences out an expired owner after takeover', async () => {
        const waiting = await begin(poll());
        const activePoll = await poll('second').expect(409);
        jest.advanceTimersByTime(25000);
        await waiting.response;
        const ownerActive = await poll('second').expect(409);
        const command = await begin(action());
        const delivery = await poll().expect(200);
        const resultPending = await poll('second').expect(409);
        await result(delivery.body.id).expect(200);
        await command.response;
        jest.advanceTimersByTime(30000);
        const newOwner = await begin(poll('second'));
        const retired = await poll().expect(409);
        jest.advanceTimersByTime(25000);
        await newOwner.response;
        expect(activePoll.body).toHaveProperty('code', 'RELAY_POLL_PENDING');
        expect(ownerActive.body).toHaveProperty('code', 'RELAY_OWNER_ACTIVE');
        expect(resultPending.body).toHaveProperty('code', 'RELAY_RESULT_PENDING');
        expect(retired.body).toHaveProperty('code', 'RELAY_CLIENT_RETIRED');
    });

    test('duplicate acknowledgements do not consume a newer action or extend the owner lease', async () => {
        const first = await begin(action());
        const delivered = await poll().expect(200);
        await result(delivered.body.id).expect(200);
        await first.response;
        jest.advanceTimersByTime(29000);
        const second = await begin(action());
        await result(delivered.body.id).expect(200, { ok: true });
        await result(delivered.body.id, 'wrong-owner').expect(409);
        await result(delivered.body.id, 'first', { changed: true }).expect(409);
        jest.advanceTimersByTime(1000);
        const nextDelivery = await poll('second').expect(200);
        expect(nextDelivery.body.id).not.toBe(delivered.body.id);
        await result(nextDelivery.body.id, 'second').expect(200);
        expect((await second.response).body).toHaveProperty('clientId', 'second');
        expect(jest.getTimerCount()).toBe(0);
    });

    test('acknowledges duplicate error results without changing the completed outcome', async () => {
        const command = await begin(action());
        const delivery = await poll().expect(200);
        const body = { id: String(delivery.body.id), clientId: 'first', error: 'UI5 failure' };
        await server.post(`${API}/result`).set('X-Relay-Token', TOKEN).send(body).expect(200);
        expect((await command.response).body).toEqual({ error: 'UI5 failure' });
        await server.post(`${API}/result`).set('X-Relay-Token', TOKEN).send(body).expect(200, { ok: true });
    });

    test('expires result acknowledgements without retaining timers', async () => {
        const command = await begin(action());
        const delivery = await poll().expect(200);
        await result(delivery.body.id).expect(200);
        await command.response;
        jest.advanceTimersByTime(119999);
        await result(delivery.body.id).expect(200);
        jest.advanceTimersByTime(1);
        const expired = await result(delivery.body.id).expect(404);
        expect(expired.body).toHaveProperty('code', 'RELAY_ACTION_UNKNOWN');
        expect(jest.getTimerCount()).toBe(0);
    });

    test('bounds the acknowledgement cache while retaining recent results', async () => {
        const ids: string[] = [];
        for (let i = 0; i < 65; i++) {
            const command = await begin(action());
            const delivery = await poll().expect(200);
            ids.push(delivery.body.id);
            await result(delivery.body.id).expect(200);
            await command.response;
        }
        await result(ids[0]).expect(404);
        await result(ids[1]).expect(200);
        await result(ids[64]).expect(200);
    });

    test('keeps every lifecycle document retired and accepts repeated acknowledgements', async () => {
        for (const clientId of ['first', 'second']) {
            const command = await begin(action('__reload__'));
            const delivery = await poll(clientId).expect(200);
            await result(delivery.body.id, clientId, { reloaded: true }).expect(200);
            await command.response;
            await result(delivery.body.id, clientId, { reloaded: true }).expect(200);
        }
        jest.advanceTimersByTime(120000);
        for (const clientId of ['first', 'second']) {
            const rejected = await poll(clientId).expect(409);
            expect(rejected.body).toHaveProperty('code', 'RELAY_CLIENT_RETIRED');
        }
    });

    test('reload retires waiting duplicate tabs so they cannot claim the fresh document handshake', async () => {
        const command = await begin(action('__reload__'));
        const delivery = await poll('owner').expect(200);
        await poll('duplicate').expect(409);
        await result(delivery.body.id, 'owner', { reloaded: true }).expect(200);
        await command.response;
        const duplicate = await poll('duplicate').expect(409);
        expect(duplicate.body).toHaveProperty('code', 'RELAY_CLIENT_RETIRED');
        const ready = await begin(action('__ready__'));
        const fresh = await poll('fresh').expect(200);
        await result(fresh.body.id, 'fresh').expect(200);
        expect((await ready.response).body).toHaveProperty('clientId', 'fresh');
    });

    test('preserves the login timeout for an action that was never delivered', async () => {
        const command = await begin(action('com.sap.ui.flex.startRTA.v1'));
        jest.advanceTimersByTime(60000);
        expect((await command.response).status).toBe(504);
    });

    test('keeps an owner that is actively recovering while a delivered action expires', async () => {
        const command = await begin(action());
        await poll().expect(200);
        jest.advanceTimersByTime(29000);
        await poll().expect(409);
        jest.advanceTimersByTime(29000);
        await poll().expect(409);
        jest.advanceTimersByTime(2000);
        expect((await command.response).status).toBe(500);
        const duplicate = await poll('duplicate').expect(409);
        expect(duplicate.body).toHaveProperty('code', 'RELAY_OWNER_ACTIVE');
        const next = await begin(action());
        const delivery = await poll().expect(200);
        await result(delivery.body.id).expect(200);
        expect((await next.response).body).toHaveProperty('clientId', 'first');
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

    test('accepts and delivers a Unified Frontend Action name', async () => {
        const ufa = 'com.sap.ui.unified.frontend.actions.describeUI';
        const command = await begin(action(ufa));
        const delivery = await poll().expect(200);
        expect(delivery.body).toMatchObject({ actionName: ufa });
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
        const response = await command.response;
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('code', 'RELAY_ACTION_OUTCOME_UNKNOWN');
        await result(delivery.body.id).expect(404);
        const next = await begin(poll('second'));
        jest.advanceTimersByTime(25000);
        expect((await next.response).body).toBeNull();
    });

    test.each([5000, 60000])('rejects undelivered metadata and clears both deadlines after %s ms', async (elapsed) => {
        const command = await begin(action('__fetch__'));
        jest.advanceTimersByTime(elapsed);
        const response = await command.response;
        expect(response.status).toBe(504);
        expect(response.body).toHaveProperty('code', 'RELAY_CLIENT_UNAVAILABLE');
        expect(response.body).toHaveProperty(
            'error',
            expect.stringContaining('No editor tab picked up the metadata request')
        );
        expect(jest.getTimerCount()).toBe(0);
        const next = await begin(action('__fetch__'));
        const delivery = await poll().expect(200);
        await result(delivery.body.id).expect(200);
        expect((await next.response).status).toBe(200);
        expect(jest.getTimerCount()).toBe(0);
    });

    test.each([false, true])(
        'cancels the metadata delivery deadline when picked up (poll first: %s)',
        async (pollFirst) => {
            const waiting = pollFirst ? await begin(poll()) : undefined;
            const command = await begin(action('__fetch__'));
            jest.advanceTimersByTime(4000);
            const delivery = waiting ? await waiting.response : await poll().expect(200);
            jest.advanceTimersByTime(2000);
            await result(delivery.body.id).expect(200);
            expect((await command.response).status).toBe(200);
            expect(jest.getTimerCount()).toBe(0);
        }
    );

    test('distinguishes delivered metadata without a result from an absent client', async () => {
        const command = await begin(action('__fetch__'));
        const delivery = await poll().expect(200);
        jest.advanceTimersByTime(60000);
        const response = await command.response;
        expect(response.status).toBe(504);
        expect(response.body).toHaveProperty('code', 'RELAY_FETCH_RESULT_TIMEOUT');
        expect(response.body).toHaveProperty(
            'error',
            expect.stringContaining('picked up the metadata request but did not return a result')
        );
        await result(delivery.body.id).expect(404);
        expect(jest.getTimerCount()).toBe(0);
    });

    test('keeps the existing start login wait when no browser has connected', async () => {
        const command = await begin(action('com.sap.ui.flex.startRTA.v1'));
        jest.advanceTimersByTime(5000);
        expect(jest.getTimerCount()).toBe(1);
        const delivery = await poll().expect(200);
        await result(delivery.body.id).expect(200);
        expect((await command.response).status).toBe(200);
    });

    test.each(['poll', 'action', '__fetch__'])('disconnect clears the %s timer and slot', async (route) => {
        const request = route === 'poll' ? poll() : action(route === '__fetch__' ? route : ACTION);
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
        { id: 'x', clientId: '', result: null },
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

    const readyRtaInstance = () => ({
        getService: jest.fn().mockResolvedValue({ get: jest.fn().mockResolvedValue([]) })
    });
    const editorRta = (instance: unknown = readyRtaInstance()) => ({ getCurrentInstance: jest.fn(() => instance) });
    const requireWith =
        (api: unknown, rta: unknown = editorRta()) =>
        (modules: string[], resolve: (module: unknown) => void) =>
            resolve(modules[0] === 'sap/ui/rta/RuntimeAuthoring' ? rta : api);

    const runClient = async (
        actions: Record<string, unknown>[],
        api: Record<string, unknown> = {},
        frameWindow?: unknown,
        failResult = false,
        {
            rta = editorRta(),
            fastClock = false,
            topLevel = false,
            topWindow
        }: { rta?: unknown; fastClock?: boolean; topLevel?: boolean; topWindow?: Record<string, unknown> } = {}
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
        const close = jest.fn();
        const parentPostMessage = jest.fn();
        const log = jest.fn();
        const fetch = jest.fn(async (url: URL | string, options: { body?: string } = {}) => {
            const href = url.toString();
            if (!href.includes(`${API}/`)) {
                // Browser-context fetch issued by the __fetch__ command (not a relay endpoint).
                return { status: 200, headers: { get: () => 'application/xml' }, text: async () => '<edmx/>' };
            }
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
        const win: Record<string, unknown> = {
            sap: { ui: { require: ui5Require } },
            close,
            location: { origin: 'https://preview.test' }
        };
        win.self = win;
        win.top = topWindow ?? (topLevel ? win : {});
        win.parent = topLevel ? win : { postMessage: parentPostMessage };
        const messageHandlers: Array<(event: { origin: string; data: unknown }) => void> = [];
        win.addEventListener = (type: string, handler: (event: { origin: string; data: unknown }) => void) => {
            if (type === 'message') {
                messageHandlers.push(handler);
            }
        };
        runInNewContext(source, {
            document: {
                currentScript: { src: `https://preview.test/prefix${API}/client.js`, dataset: { token: TOKEN } },
                getElementById: () => (frameWindow ? { contentWindow: frameWindow } : null)
            },
            window: win,
            crypto: { randomUUID: () => 'document-id' },
            location: {
                reload,
                href: 'https://preview.test/prefix/test/adaptation-editor.html',
                origin: 'https://preview.test'
            },
            console: { error: log },
            URL,
            AbortController,
            ...clock,
            fetch
        });
        await new Promise(setImmediate);
        const dispatchMessage = (event: { origin: string; data: unknown }) => {
            for (const handler of messageHandlers) {
                handler(event);
            }
        };
        return { fetch, reload, close, parentPostMessage, log, ui5Require, dispatchMessage };
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
            editor.instance = readyRtaInstance();
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

    test('waits for a same-origin app-loaded signal before adopting RTA, ignoring cross-origin senders', async () => {
        const startRTA = jest.fn().mockResolvedValue({ isSuccess: true, payload: { rtaStarted: true } });
        const frameRequire = jest.fn(requireWith({ startRTA }));
        const client = await runClient(
            [{ id: '1', actionName: 'com.sap.ui.flex.startRTA.v1', frameId: 'preview' }],
            {},
            { sap: { ui: { require: frameRequire } } },
            false,
            { topLevel: true, fastClock: true }
        );
        const appLoaded = { type: 'post-message-action', action: { type: '[ext] app-loaded' } };
        client.dispatchMessage({ origin: 'https://evil.example', data: appLoaded });
        client.dispatchMessage({ origin: 'https://preview.test', data: appLoaded });
        const body = await waitForResult(client);
        expect(body.result.isSuccess).toBe(true);
        expect(startRTA).toHaveBeenCalledTimes(1);
    });

    test.each(['__ready__', 'com.sap.ui.flex.startRTA.v1'])(
        '%s waits for RTA startup and outline synchronization before the first overlay request',
        async (actionName) => {
            let finishStart!: (outline: unknown) => void;
            let finishSync!: (nodes: unknown[]) => void;
            const started = new Promise((resolve) => {
                finishStart = resolve;
            });
            const synced = new Promise<unknown[]>((resolve) => {
                finishSync = resolve;
            });
            const get = jest.fn(() => synced);
            const getService = jest.fn(() => started);
            let overlays: unknown[] = [];
            const startRTA = jest.fn().mockResolvedValue({ isSuccess: true, payload: { rtaStarted: true } });
            const getOverlaysInformation = jest.fn(async () => ({ isSuccess: true, payload: { overlays } }));
            const client = await runClient(
                [
                    { id: '1', actionName },
                    { id: '2', actionName: 'com.sap.ui.flex.getOverlaysInformation.v1' }
                ],
                { startRTA, getOverlaysInformation },
                undefined,
                false,
                { rta: editorRta({ getService }) }
            );
            expect(client.fetch).toHaveBeenCalledTimes(1);
            expect(startRTA).not.toHaveBeenCalled();
            expect(getOverlaysInformation).not.toHaveBeenCalled();
            expect(getService).toHaveBeenCalledWith('outline');

            finishStart({ get });
            await new Promise(setImmediate);
            expect(get).toHaveBeenCalledTimes(1);
            expect(client.fetch).toHaveBeenCalledTimes(1);
            expect(startRTA).not.toHaveBeenCalled();
            expect(getOverlaysInformation).not.toHaveBeenCalled();

            overlays = [{ id: 'app-control' }];
            finishSync([]);
            await new Promise(setImmediate);
            expect(startRTA).toHaveBeenCalledTimes(actionName === '__ready__' ? 0 : 1);
            expect(getOverlaysInformation).toHaveBeenCalledTimes(1);
            const results = client.fetch.mock.calls
                .filter(([, options]) => options?.body)
                .map(([, options]) => JSON.parse(options.body ?? ''));
            expect(results).toEqual([
                {
                    id: '1',
                    clientId: 'document-id',
                    result: {
                        isSuccess: true,
                        payload: actionName === '__ready__' ? { ready: true } : { rtaStarted: true }
                    }
                },
                { id: '2', clientId: 'document-id', result: { isSuccess: true, payload: { overlays } } }
            ]);
        }
    );

    test.each(['startup', 'outline synchronization'])(
        'reports a %s failure instead of adopting an unfinished RTA instance',
        async (stage) => {
            const failure = jest.fn().mockRejectedValue(new Error('RTA initialization failed'));
            const getService = stage === 'startup' ? failure : jest.fn().mockResolvedValue({ get: failure });
            const startRTA = jest.fn();
            const client = await runClient(
                [{ id: '1', actionName: 'com.sap.ui.flex.startRTA.v1' }],
                { startRTA },
                undefined,
                false,
                { rta: editorRta({ getService }) }
            );
            expect((await waitForResult(client)).result.error.code).toBe('EDITOR_RTA_NOT_STARTED');
            expect(startRTA).not.toHaveBeenCalled();
        }
    );

    test.each(['startup', 'outline synchronization'])(
        'bounds the wait for %s and ignores late completion',
        async (stage) => {
            let finish!: (value: unknown) => void;
            const pending = new Promise((resolve) => {
                finish = resolve;
            });
            const getService = jest.fn(() => (stage === 'startup' ? pending : Promise.resolve({ get: () => pending })));
            const startRTA = jest.fn();
            const client = await runClient(
                [{ id: '1', actionName: 'com.sap.ui.flex.startRTA.v1' }],
                { startRTA },
                undefined,
                false,
                { rta: editorRta({ getService }), fastClock: true }
            );
            expect((await waitForResult(client)).result.error.code).toBe('EDITOR_RTA_NOT_STARTED');
            finish(stage === 'startup' ? { get: async () => [] } : []);
            await new Promise(setImmediate);
            expect(startRTA).not.toHaveBeenCalled();
            expect(client.fetch).toHaveBeenCalledTimes(3);
        }
    );

    test('returns genuinely empty overlays once RTA is ready, without retrying', async () => {
        const startRTA = jest.fn().mockResolvedValue({ isSuccess: true, payload: { rtaStarted: true } });
        const getOverlaysInformation = jest.fn().mockResolvedValue({ isSuccess: true, payload: { overlays: [] } });
        const client = await runClient(
            [
                { id: '1', actionName: 'com.sap.ui.flex.startRTA.v1' },
                { id: '2', actionName: 'com.sap.ui.flex.getOverlaysInformation.v1' }
            ],
            { startRTA, getOverlaysInformation }
        );
        expect(startRTA).toHaveBeenCalledTimes(1);
        expect(getOverlaysInformation).toHaveBeenCalledTimes(1);
        expect(JSON.parse(client.fetch.mock.calls[3][1].body ?? '').result).toEqual({
            isSuccess: true,
            payload: { overlays: [] }
        });
    });

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
            expect(client.reload).not.toHaveBeenCalled();
            expect(JSON.parse(client.fetch.mock.calls[1][1].body ?? '').result).toEqual(
                actionName === '__reload__' ? { reloaded: true } : { stopped: true }
            );
        }
    );

    test('__stop__ acknowledges before attempting to close an external tab and ends polling', async () => {
        const client = await runClient(
            [{ id: '1', actionName: '__stop__', payload: { closeWindow: true } }],
            {},
            undefined,
            false,
            { topLevel: true }
        );
        expect(client.close).toHaveBeenCalledTimes(1);
        expect(client.fetch).toHaveBeenCalledTimes(2);
        expect(client.fetch.mock.invocationCallOrder[1]).toBeLessThan(client.close.mock.invocationCallOrder[0]);
        expect((await waitForResult(client)).result).toEqual({ stopped: true, closeRequested: true });
        expect(client.ui5Require).not.toHaveBeenCalled();
    });

    test('__stop__ closes the same-origin editor shell when the relay is inside its preview frame', async () => {
        const close = jest.fn();
        const client = await runClient(
            [{ id: '1', actionName: '__stop__', payload: { closeWindow: true } }],
            {},
            undefined,
            false,
            { topWindow: { close, location: { origin: 'https://preview.test' } } }
        );
        expect(close).toHaveBeenCalledTimes(1);
        expect(client.close).not.toHaveBeenCalled();
    });

    test('__stop__ never closes a cross-origin BAS host', async () => {
        const close = jest.fn();
        const topWindow = Object.defineProperty({ close }, 'location', {
            get() {
                throw new Error('Cross-origin access denied');
            }
        });
        const client = await runClient(
            [{ id: '1', actionName: '__stop__', payload: { closeWindow: true } }],
            {},
            undefined,
            false,
            { topWindow }
        );
        expect(close).not.toHaveBeenCalled();
        expect((await waitForResult(client)).result).toEqual({ stopped: true, closeRequested: false });
    });

    test('__stop__ still attempts closure if the acknowledgement response is lost', async () => {
        const client = await runClient(
            [{ id: '1', actionName: '__stop__', payload: { closeWindow: true } }],
            {},
            undefined,
            true,
            { topLevel: true, fastClock: true }
        );
        for (let i = 0; i < 2000 && client.close.mock.calls.length === 0; i++) {
            await new Promise(setImmediate);
        }
        expect(client.close).toHaveBeenCalledTimes(1);
        expect(client.fetch).toHaveBeenCalledTimes(3);
    });

    test('__stop__ without a close request leaves the window open', async () => {
        const client = await runClient([{ id: '1', actionName: '__stop__' }], {}, undefined, false, { topLevel: true });
        expect(client.close).not.toHaveBeenCalled();
    });

    test('__reload__ reloads via CPE reloadApplication posted to the editor shell', async () => {
        const client = await runClient([{ id: '1', actionName: '__reload__' }]);
        expect(client.parentPostMessage).toHaveBeenCalledWith(
            {
                type: 'post-message-action',
                action: { type: '[ext] reload-application', payload: { save: false } }
            },
            'https://preview.test'
        );
        expect(client.reload).not.toHaveBeenCalled();
    });

    test('reports an unavailable action without replaying it', async () => {
        const client = await runClient([{ id: '1', actionName: ACTION }]);
        expect(JSON.parse(client.fetch.mock.calls[1][1].body ?? '').error).toContain('Frontend action not available');
        expect(client.ui5Require).toHaveBeenCalledTimes(1);
    });

    test('runs a UFA describe action via ActionHelpers and keeps its raw result as the payload', async () => {
        const forest = [{ id: 'root', type: 'sap.m.Page' }];
        const describeUI = jest.fn().mockResolvedValue(forest);
        const client = await runClient(
            [
                {
                    id: '1',
                    actionName: 'com.sap.ui.unified.frontend.actions.describeUI',
                    payload: { includedProperties: ['id'] }
                }
            ],
            { describeUI }
        );
        expect(describeUI).toHaveBeenCalledWith({ includedProperties: ['id'] });
        expect((await waitForResult(client)).result).toEqual({ isSuccess: true, payload: forest, error: null });
    });

    test('normalizes a bare UFA success into a null payload', async () => {
        const executeAction = jest.fn().mockResolvedValue({ success: true });
        const client = await runClient(
            [{ id: '1', actionName: 'com.sap.ui.unified.frontend.actions.executeAction', payload: {} }],
            { executeAction }
        );
        expect((await waitForResult(client)).result).toEqual({ isSuccess: true, payload: null, error: null });
    });

    test('surfaces a failed UFA action as a failure envelope with its reason', async () => {
        const executeAction = jest.fn().mockResolvedValue({ success: false, error: 'element not found' });
        const client = await runClient(
            [{ id: '1', actionName: 'com.sap.ui.unified.frontend.actions.executeAction', payload: {} }],
            { executeAction }
        );
        expect((await waitForResult(client)).result).toEqual({
            isSuccess: false,
            payload: null,
            error: { code: 'UFA_ACTION_FAILED', message: 'element not found' }
        });
    });

    test('reloads even when the __reload__ result POST fails', async () => {
        const client = await runClient([{ id: '1', actionName: '__reload__' }], {}, undefined, true, {
            fastClock: true
        });
        for (let i = 0; i < 2000 && client.parentPostMessage.mock.calls.length === 0; i++) {
            await new Promise(setImmediate);
        }
        expect(client.parentPostMessage).toHaveBeenCalledTimes(1);
        expect(client.log).toHaveBeenCalled();
    });

    test('bounds result retries without repeating the action, then resumes polling', async () => {
        const getOverlays = jest.fn().mockResolvedValue({ overlays: [] });
        const client = await runClient([{ id: '1', actionName: ACTION }], { getOverlays }, undefined, true, {
            fastClock: true
        });
        for (let i = 0; i < 2000 && client.log.mock.calls.length === 0; i++) {
            await new Promise(setImmediate);
        }
        expect(getOverlays).toHaveBeenCalledTimes(1);
        const posts = client.fetch.mock.calls.filter(([, options]) => options.body).map(([, options]) => options.body);
        expect(posts.length).toBeGreaterThan(1);
        expect(new Set(posts).size).toBe(1);
        expect(client.fetch.mock.calls.at(-1)?.[1].body).toBeUndefined();
        expect(client.log).toHaveBeenCalled();
    });

    test('__fetch__ does a same-origin authenticated fetch and returns status, content-type and body', async () => {
        const client = await runClient([
            { id: '1', actionName: '__fetch__', payload: { url: 'https://preview.test/svc/$metadata' } }
        ]);
        for (let i = 0; i < 2000 && client.fetch.mock.calls.length < 3; i++) {
            await new Promise(setImmediate);
        }
        // calls: [0] poll, [1] the browser metadata fetch, [2] result POST
        expect(client.fetch.mock.calls[1][0].toString()).toBe('https://preview.test/svc/$metadata');
        expect(JSON.parse(client.fetch.mock.calls[2][1].body ?? '').result).toEqual({
            isSuccess: true,
            payload: { status: 200, contentType: 'application/xml', body: '<edmx/>' }
        });
    });

    test('__fetch__ refuses a cross-origin url without issuing the fetch', async () => {
        const client = await runClient([
            { id: '1', actionName: '__fetch__', payload: { url: 'https://evil.example/$metadata' } }
        ]);
        for (let i = 0; i < 2000 && client.fetch.mock.calls.length < 2; i++) {
            await new Promise(setImmediate);
        }
        // calls: [0] poll, [1] result POST — no browser fetch, rejected before it
        const posted = JSON.parse(client.fetch.mock.calls[1][1].body ?? '');
        expect(posted.result.isSuccess).toBe(false);
        expect(posted.result.error.code).toBe('FETCH_CROSS_ORIGIN');
    });

    test('throws a clear error when the editor frame is missing in the top document', async () => {
        const client = await runClient([{ id: '1', actionName: ACTION, frameId: 'preview' }], {}, undefined, false, {
            topLevel: true
        });
        const posted = await waitForResult(client);
        expect(posted.error).toContain("editor frame 'preview' not found");
    });
});
