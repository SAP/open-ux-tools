import { jest } from '@jest/globals';
import { runInNewContext } from 'node:vm';
import type { Request, Response } from 'express';

const ID = 'ab'.repeat(32);
const readFileSync = jest.fn<() => string>();
const writeFileSync = jest.fn();
jest.unstable_mockModule('node:fs', () => ({ readFileSync, writeFileSync }));
jest.unstable_mockModule('node:os', () => ({ tmpdir: () => '/tmp' }));
const { handleAdpLogin } = await import('../../../src/base/adp-login.js');

function request(query: Record<string, unknown>) {
    // The handler reads only Express's query object.
    return { query } as Request;
}

function response() {
    const stub = {
        set: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        type: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
    };
    // Only these Express response methods are used by the handler.
    return { stub, res: stub as unknown as Response };
}

beforeEach(() => {
    jest.clearAllMocks();
    readFileSync.mockReset().mockReturnValue(JSON.stringify({ id: ID, status: 'pending' }));
});

test('leaves ordinary editor requests unchanged', () => {
    const { res, stub } = response();
    expect(handleAdpLogin(request({}), res, true)).toBe(false);
    expect(stub.send).not.toHaveBeenCalled();
    expect(readFileSync).not.toHaveBeenCalled();
});

test.each([undefined, '', '../file', 'a'.repeat(65), [ID], { id: ID }])(
    'rejects malformed login identifiers without serving the editor: %s',
    (id) => {
        const { res, stub } = response();
        expect(handleAdpLogin(request({ 'sap-ux-adp-login': id }), res, true)).toBe(true);
        expect(stub.status).toHaveBeenCalledWith(400);
        expect(readFileSync).not.toHaveBeenCalled();
    }
);

test('login-only mode fails closed when the relay is disabled', () => {
    const { res, stub } = response();
    expect(handleAdpLogin(request({ 'sap-ux-adp-login': ID }), res, false)).toBe(true);
    expect(stub.status).toHaveBeenCalledWith(400);
    expect(writeFileSync).not.toHaveBeenCalled();
});

test.each([
    '{',
    'null',
    '{}',
    JSON.stringify({ id: 'other', status: 'pending' }),
    JSON.stringify({ id: ID, status: 'cancelled' })
])('rejects stale or malformed handshake contents: %s', (contents) => {
    readFileSync.mockReturnValue(contents);
    const { res, stub } = response();
    handleAdpLogin(request({ 'sap-ux-adp-login': ID }), res, true);
    expect(stub.status).toHaveBeenCalledWith(410);
    expect(writeFileSync).not.toHaveBeenCalled();
});

test('rejects missing handshake files', () => {
    readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
    });
    const { res, stub } = response();
    handleAdpLogin(request({ 'sap-ux-adp-login': ID }), res, true);
    expect(stub.status).toHaveBeenCalledWith(410);
});

test('serves only the completion page and waits for its browser acknowledgement', async () => {
    const { res, stub } = response();
    handleAdpLogin(request({ 'sap-ux-adp-login': ID }), res, true);
    const html = String(stub.send.mock.calls[0][0]);
    expect(html).not.toMatch(/<iframe|sap-ui-core|rta[/]client[.]js|data-token/);
    expect(stub.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(stub.set).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer');
    expect(writeFileSync).not.toHaveBeenCalled();
    const status = { textContent: '' };
    const fetch = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({ ok: true, json: () => ({ ok: true }) });
    const href = `https://bas.example/prefix/test/editor.html?sap-ux-adp-login=${ID}`;
    const script = html.split('<script>')[1]?.split('</script>')[0];
    expect(script).toBeDefined();
    await runInNewContext(script ?? '', { URL, location: { href }, document: { getElementById: () => status }, fetch });
    expect(String(fetch.mock.calls[0][0])).toBe(`${href}&sap-ux-adp-login-complete=true`);
    expect(fetch.mock.calls[0][1]).toEqual({ cache: 'no-store', credentials: 'same-origin' });
    expect(status.textContent).toContain('Login complete');
});

test('writes the matching completion without touching the MCP command mailbox', () => {
    const { res, stub } = response();
    handleAdpLogin(request({ 'sap-ux-adp-login': ID, 'sap-ux-adp-login-complete': 'true' }), res, true);
    expect(writeFileSync).toHaveBeenCalledTimes(1);
    expect(writeFileSync).toHaveBeenCalledWith(
        '/tmp/sap-ux-adp-login.json',
        JSON.stringify({ id: ID, status: 'complete' }),
        { mode: 0o600 }
    );
    expect(stub.json).toHaveBeenCalledWith({ ok: true });
});

test('does not repeat the mailbox write when the browser retries completion', () => {
    readFileSync.mockReturnValue(JSON.stringify({ id: ID, status: 'complete' }));
    const { res, stub } = response();
    handleAdpLogin(request({ 'sap-ux-adp-login': ID, 'sap-ux-adp-login-complete': 'true' }), res, true);
    expect(writeFileSync).not.toHaveBeenCalled();
    expect(stub.json).toHaveBeenCalledWith({ ok: true });
});
