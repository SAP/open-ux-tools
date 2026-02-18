import type { ToolsLogger } from '@sap-ux/logger';

import { mergeEffectiveOptions } from '../../../src/config';
import { replaceUrl, getMimeInfo, createResponseInterceptor, createProxy } from '../../../src/proxy';

type InterceptorCallback = (
    responseBuffer: Buffer,
    proxyRes: unknown,
    req: unknown,
    res: { setHeader: (name: string, value: string) => void }
) => Promise<Buffer> | Buffer;

type ProxyOnHandlers = {
    proxyReq?: (proxyReq: { setHeader: (name: string, value: string) => void }, req: unknown, res: unknown) => void;
    proxyRes?: (proxyRes: unknown, req: unknown, res: unknown) => Promise<unknown>;
};

let capturedInterceptorCallback: InterceptorCallback | null = null;
let capturedProxyOptions: {
    pathFilter?: (pathname: string) => boolean;
    target?: string;
    on?: ProxyOnHandlers;
} | null = null;

jest.mock('http-proxy-middleware', () => ({
    createProxyMiddleware: jest.fn((options: typeof capturedProxyOptions) => {
        capturedProxyOptions = options;
        return (_req: unknown, _res: unknown, next: () => void) => next();
    }),
    responseInterceptor: jest.fn((callback: InterceptorCallback) => {
        capturedInterceptorCallback = callback;
        return (_proxyRes: unknown, _req: unknown, _res: unknown) => Promise.resolve(Buffer.from(''));
    })
}));

describe('proxy', () => {
    describe('replaceUrl', () => {
        test('replaces oldUrl with newUrl in text', () => {
            expect(replaceUrl('base is https://host/path', 'https://host/path', 'http://local')).toBe(
                'base is http://local'
            );
        });

        test('returns text unchanged when oldUrl does not appear in text', () => {
            expect(replaceUrl('hello', 'https://other.example', 'x')).toBe('hello');
        });
    });

    describe('getMimeInfo', () => {
        test('uses Content-Type header when provided', () => {
            const result = getMimeInfo('/x', 'text/html; charset=utf-8');
            expect(result.type).toBe('text/html');
            expect(result.charset).toBe('utf-8');
            expect(result.contentType).toContain('text/html');
        });

        test('uses pathname when ctValue is undefined', () => {
            const result = getMimeInfo('/index.html', undefined);
            expect(result.type).toBe('text/html');
            expect(result.contentType).toContain('charset=');
        });
    });

    describe('createResponseInterceptor', () => {
        const logger = { info: jest.fn() } as unknown as ToolsLogger;

        beforeEach(() => {
            capturedInterceptorCallback = null;
        });

        test('invoked callback sets content-type and returns a Buffer', async () => {
            const route = {
                re: /^\/api\//,
                path: 'api/',
                url: 'http://backend:8080',
                source: '^/api/',
                destination: 'backend'
            };
            createResponseInterceptor(
                [route],
                mergeEffectiveOptions({ xsappJsonPath: './xs-app.json', rewriteContent: true }),
                'http://localhost:5000',
                logger
            );
            expect(capturedInterceptorCallback).not.toBeNull();

            const setHeader = jest.fn();
            const responseBuffer = Buffer.from('<html><body>content</body></html>', 'utf8');
            const proxyRes = { statusCode: 200, headers: { 'content-type': 'text/html; charset=utf-8' } };
            const req = {
                url: '/api/foo',
                method: 'GET',
                headers: { referer: 'http://localhost:5000/' },
                baseUrl: ''
            };
            const res = { setHeader };

            const result = await capturedInterceptorCallback!(
                responseBuffer,
                proxyRes,
                req,
                res as { setHeader: (name: string, value: string) => void }
            );

            expect(setHeader).toHaveBeenCalledWith('content-type', expect.stringContaining('text/html'));
            expect(Buffer.isBuffer(result)).toBe(true);
        });

        test('returns response buffer unchanged when content-type is not in rewriteContentTypes', async () => {
            const route = {
                re: /^\/api\//,
                path: 'api/',
                url: 'http://backend:8080',
                source: '^/api/',
                destination: 'backend'
            };
            createResponseInterceptor(
                [route],
                mergeEffectiveOptions({
                    xsappJsonPath: './xs-app.json',
                    rewriteContent: true,
                    rewriteContentTypes: ['text/html']
                }),
                'http://localhost:5000',
                logger
            );

            const setHeader = jest.fn();
            const responseBuffer = Buffer.from('{"key":"value"}', 'utf8');
            const proxyRes = { statusCode: 200, headers: { 'content-type': 'application/json' } };
            const req = { url: '/api/foo', method: 'GET', headers: {}, baseUrl: '' };
            const res = { setHeader };

            const result = await capturedInterceptorCallback!(
                responseBuffer,
                proxyRes,
                req,
                res as { setHeader: (name: string, value: string) => void }
            );

            expect(setHeader).toHaveBeenCalledWith('content-type', expect.stringContaining('application/json'));
            expect(result).toEqual(responseBuffer);
        });
    });

    describe('createProxy', () => {
        const logger = { info: jest.fn() } as unknown as ToolsLogger;

        beforeEach(() => {
            capturedProxyOptions = null;
        });

        test('returns a request handler and passes pathFilter and target to middleware', () => {
            const route = {
                re: /^\/api\//,
                path: 'api/',
                url: 'http://backend:8080',
                source: '^/api/',
                destination: 'backend'
            };
            const handler = createProxy({
                customRoutes: ['/', '/login/callback'],
                routes: [route],
                baseUri: 'http://localhost:5000',
                effectiveOptions: mergeEffectiveOptions({ xsappJsonPath: './xs-app.json' }),
                logger
            });
            expect(typeof handler).toBe('function');
            expect(capturedProxyOptions).not.toBeNull();
            expect(capturedProxyOptions!.target).toBe('http://localhost:5000');

            const pathFilter = capturedProxyOptions!.pathFilter!;
            expect(pathFilter('/')).toBe(true);
            expect(pathFilter('/login/callback')).toBe(true);
            expect(pathFilter('/api/foo')).toBe(true);
            expect(pathFilter('/other')).toBe(false);
        });

        test('proxyReq normalizes x-forwarded-proto when it contains a comma', () => {
            createProxy({
                customRoutes: [],
                routes: [],
                baseUri: 'http://localhost:5000',
                effectiveOptions: mergeEffectiveOptions({ xsappJsonPath: './xs-app.json' }),
                logger
            });
            const setHeader = jest.fn();
            const proxyReq = { setHeader };
            const req = { headers: { 'x-forwarded-proto': 'https,http' as string } };
            const res = {};

            capturedProxyOptions!.on!.proxyReq!(proxyReq, req, res);

            expect(req.headers['x-forwarded-proto']).toBe('https');
            expect(setHeader).toHaveBeenCalledWith('x-forwarded-proto', 'https');
        });

        test('proxyReq sets redirected and calls res.redirect when ui5-middleware-index url is /', () => {
            createProxy({
                customRoutes: [],
                routes: [],
                baseUri: 'http://localhost:5000',
                effectiveOptions: mergeEffectiveOptions({ xsappJsonPath: './xs-app.json' }),
                logger
            });
            const proxyReq = { setHeader: jest.fn() };
            const req = {
                headers: {},
                url: '/index.html',
                'ui5-middleware-index': { url: '/' as string },
                'ui5-patched-router': { baseUrl: '/webapp' as string }
            };
            const redirect = jest.fn();
            const res = { redirect };

            capturedProxyOptions!.on!.proxyReq!(proxyReq, req, res);

            expect((res as Record<string, unknown>)['backend-proxy-middleware-cf']).toEqual({ redirected: true });
            expect(redirect).toHaveBeenCalledWith('/webapp/index.html');
        });

        test('proxyReq sets x-forwarded-path when ui5-patched-router originalUrl is set', () => {
            createProxy({
                customRoutes: [],
                routes: [],
                baseUri: 'http://localhost:5000',
                effectiveOptions: mergeEffectiveOptions({ xsappJsonPath: './xs-app.json' }),
                logger
            });
            const setHeader = jest.fn();
            const proxyReq = { setHeader };
            const req = {
                headers: {},
                'ui5-middleware-index': { url: '/other' as string },
                'ui5-patched-router': { originalUrl: '/webapp/index.html' as string }
            };
            const res = {};

            capturedProxyOptions!.on!.proxyReq!(proxyReq, req, res);

            expect(setHeader).toHaveBeenCalledWith('x-forwarded-path', '/webapp/index.html');
        });

        test('proxyRes invokes interceptor and returns buffer when response is not redirected', async () => {
            createProxy({
                customRoutes: [],
                routes: [],
                baseUri: 'http://localhost:5000',
                effectiveOptions: mergeEffectiveOptions({ xsappJsonPath: './xs-app.json' }),
                logger
            });
            const proxyRes = { statusCode: 200, headers: {} };
            const req = { url: '/api/foo', headers: {}, baseUrl: '' };
            const res = {};

            const result = await capturedProxyOptions!.on!.proxyRes!(proxyRes, req, res);

            expect(Buffer.isBuffer(result)).toBe(true);
        });

        test('proxyRes returns undefined when response was redirected', async () => {
            createProxy({
                customRoutes: [],
                routes: [],
                baseUri: 'http://localhost:5000',
                effectiveOptions: mergeEffectiveOptions({ xsappJsonPath: './xs-app.json' }),
                logger
            });
            const proxyRes = {};
            const req = {};
            const res = { 'backend-proxy-middleware-cf': { redirected: true } };

            const result = await capturedProxyOptions!.on!.proxyRes!(proxyRes, req, res);

            expect(result).toBeUndefined();
        });
    });
});
