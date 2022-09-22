import http from 'http';
import type { SetupRedirectOptions } from '../../../src/auth/reentrance-ticket/redirect';
import { setupRedirectHandling } from '../../../src/auth/reentrance-ticket/redirect';
import { ABAPSystem } from '../../../src/auth/reentrance-ticket/abap-system';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { ConnectionError, TimeoutError } from '../../../src/auth';
import request from 'supertest';

describe('setupRedirectHandling()', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.resetAllMocks();
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    // Convenience function to call setupRedirectHandling with defaults
    const setup = (options: Partial<SetupRedirectOptions> = {}) =>
        setupRedirectHandling({
            resolve: jest.fn(),
            reject: jest.fn(),
            timeout: 1,
            backend: new ABAPSystem('http://backend'),
            logger: new ToolsLogger({
                transports: [new NullTransport()]
            }),
            ...options
        });

    it('calls reject with a timeout error if no response within configured time', () => {
        const TIMEOUT = 42;
        const rejectCallback = jest.fn();
        const resolveCallback = jest.fn();

        setup({
            timeout: TIMEOUT,
            reject: rejectCallback,
            resolve: rejectCallback
        });

        jest.advanceTimersByTime(TIMEOUT);
        expect(resolveCallback).not.toBeCalled();
        expect(rejectCallback).toBeCalledTimes(1);
        expect(rejectCallback).toBeCalledWith(expect.any(TimeoutError));
    });

    // Convenience function to extract the redirect path from the full redirect url
    const redirectPath = (redirectUrlGenerator: (port: number) => string): string => {
        return new URL(redirectUrlGenerator(42)).pathname;
    };

    it('returns an HTML page on successful redirection', async () => {
        const { server, redirectUrl } = setup();
        const response = await request(server).get(redirectPath(redirectUrl));
        expect(response.headers['content-type']).toContain('text/html');
    });

    it('calls resolve() with the reentrance ticket', async () => {
        const rejectCallback = jest.fn();
        const resolveCallback = jest.fn();
        const REENTRANCE_TICKET = 'reentrance_ticket';

        const { server, redirectUrl } = setup({ resolve: resolveCallback, reject: rejectCallback });
        await request(server).get(`${redirectPath(redirectUrl)}?reentrance-ticket=${REENTRANCE_TICKET}`);
        expect(rejectCallback).not.toBeCalled();
        expect(resolveCallback).toBeCalledTimes(1);
        expect(resolveCallback).toBeCalledWith(expect.objectContaining({ reentranceTicket: REENTRANCE_TICKET }));
    });

    it('calls resolve() with the with API URL', async () => {
        const rejectCallback = jest.fn();
        const resolveCallback = jest.fn();
        const backedUrl = 'https://backend';
        const REENTRANCE_TICKET = 'reentrance_ticket';

        const { server, redirectUrl } = setup({
            resolve: resolveCallback,
            reject: rejectCallback,
            backend: new ABAPSystem(backedUrl)
        });
        await request(server).get(`${redirectPath(redirectUrl)}?reentrance-ticket=${REENTRANCE_TICKET}`);

        expect(rejectCallback).not.toBeCalled();
        expect(resolveCallback).toBeCalledTimes(1);
        expect(resolveCallback).toBeCalledWith(expect.objectContaining({ apiUrl: backedUrl + '-api' }));
    });

    it('calls reject() when reentrance ticket is missing', async () => {
        const rejectCallback = jest.fn();
        const resolveCallback = jest.fn();
        const backedUrl = 'https://backend';

        const { server, redirectUrl } = setup({
            resolve: resolveCallback,
            reject: rejectCallback,
            backend: new ABAPSystem(backedUrl)
        });
        await request(server).get(redirectPath(redirectUrl));

        expect(resolveCallback).not.toBeCalled();
        expect(rejectCallback).toBeCalledTimes(1);
        expect(rejectCallback).toBeCalledWith(expect.any(ConnectionError));
    });

    it('returns an HTTP Server', () => {
        const { server } = setup();

        expect(server).toBeInstanceOf(http.Server);
    });

    it('redirectUrl() returns a valid URL', () => {
        const isValidUrl = (url: string): boolean => {
            try {
                const result = new URL(url);
                expect(result).toBeDefined();
            } catch (e) {
                if (e?.code === 'ERR_INVALID_URL') {
                    return false;
                }
            }
            return true;
        };

        const { redirectUrl } = setup();
        expect(isValidUrl(redirectUrl(42))).toBeTruthy();
    });
});
