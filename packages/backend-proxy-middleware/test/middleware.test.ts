import { jest } from '@jest/globals';
import * as http from 'node:http';
import * as net from 'node:net';
import type { BackendMiddlewareConfig } from '../src/base/types.js';
import type { Options } from 'http-proxy-middleware';

const mockGenerateProxyMiddlewareOptions = jest.fn<any>();

const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils
}));
const realStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    AuthenticationType: {
        Basic: 'basic',
        ReentranceTicket: 'reentranceTicket',
        OAuth2RefreshToken: 'oauth2',
        OAuth2ClientCredential: 'oauth2ClientCredential'
    },
    BackendSystemKey: class {
        constructor() {
            /* stub */
        }
    },
    getService: jest.fn().mockResolvedValue({ read: jest.fn(), write: jest.fn() })
}));

jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    AbapCloudEnvironment: { Standalone: 'Standalone', EmbeddedSteampunk: 'EmbeddedSteampunk' },
    createForAbapOnCloud: jest.fn()
}));

// Import the real proxy module (its transitive deps are mocked above, so this is lightweight)
const realProxy = await import('../src/base/proxy.js');
mockGenerateProxyMiddlewareOptions.mockImplementation(realProxy.generateProxyMiddlewareOptions);

// Now mock the proxy module, replacing generateProxyMiddlewareOptions with the spy
jest.unstable_mockModule('../src/base/proxy', () => ({
    ...realProxy,
    generateProxyMiddlewareOptions: mockGenerateProxyMiddlewareOptions
}));

const express = (await import('express')).default;
const supertest = (await import('supertest')).default;
const connect = (await import('connect')).default;
const proxyMiddleware = await import('../src/middleware.js');
const { ToolsLogger } = await import('@sap-ux/logger');

/**
 * Starts a real local HTTP server that records received requests and replies with the given status.
 * Returns the base URL and a cleanup function.
 */
async function startMockBackend(
    handler: (req: http.IncomingMessage, res: http.ServerResponse) => void
): Promise<{ url: string; close: () => Promise<void> }> {
    const server = http.createServer(handler);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as net.AddressInfo;
    return {
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
    };
}
// middleware function wrapper for testing to simplify tests
async function getTestServerForExpress(configuration: BackendMiddlewareConfig): Promise<any> {
    const router = await (proxyMiddleware as any).default({
        options: { configuration }
    });
    const app = express();
    app.use(router);
    return supertest(app);
}

async function getTestServerForConnect(configuration: BackendMiddlewareConfig): Promise<any> {
    const router = await (proxyMiddleware as any).default({
        options: { configuration }
    });
    const app = connect();
    app.use(router);
    return supertest(app);
}

describe('backend-proxy-middleware', () => {
    const backend = {
        path: '/my/service',
        url: 'http://backend.example'
    };
    describe('Different middleware configurations', () => {
        beforeEach(() => {
            mockGenerateProxyMiddlewareOptions.mockClear();
        });

        test('minimal configuration', async () => {
            await getTestServerForExpress({ backend });
            expect(mockGenerateProxyMiddlewareOptions).toHaveBeenCalledWith(
                expect.objectContaining(backend),
                expect.objectContaining({ secure: true, logger: undefined }),
                expect.any(ToolsLogger)
            );
        });

        test('debug', async () => {
            await getTestServerForExpress({ backend, debug: true });
            expect(mockGenerateProxyMiddlewareOptions).toHaveBeenCalledWith(
                expect.objectContaining(backend),
                expect.objectContaining({ secure: true, logger: expect.objectContaining({}) }),
                expect.any(ToolsLogger)
            );
        });

        test('additional options', async () => {
            const addtionalConfig = {
                ...backend,
                client: '012',
                destination: '~destination'
            };
            await getTestServerForExpress({ backend: addtionalConfig });
            expect(mockGenerateProxyMiddlewareOptions).toHaveBeenCalledWith(
                expect.objectContaining(addtionalConfig),
                expect.objectContaining({ secure: true, logger: undefined }),
                expect.any(ToolsLogger)
            );
        });

        test('additional http-proxy-middleware options', async () => {
            const options: Options = {
                ws: true,
                xfwd: true
            };
            await getTestServerForExpress({ backend, options });
            expect(mockGenerateProxyMiddlewareOptions).toHaveBeenCalledWith(
                expect.objectContaining(backend),
                expect.objectContaining({ ...options, secure: true, logger: undefined }),
                expect.any(ToolsLogger)
            );
        });
    });

    describe('Example proxy requests', () => {
        const MANIFEST = 'manifest.json';

        test('Add client to request', async () => {
            const client = '012';
            let receivedUrl: string | undefined;
            const mockBackend = await startMockBackend((req, res) => {
                receivedUrl = req.url;
                res.writeHead(200);
                res.end();
            });
            try {
                const server = await getTestServerForExpress({
                    backend: { path: '/my/service', url: mockBackend.url, client }
                });

                // request that is proxied
                expect(await server.get('/my/service/manifest.json')).toMatchObject({ status: 200 });
                expect(receivedUrl).toBe('/my/service/manifest.json?sap-client=012');

                // request that is not handled
                expect(await server.get('/not/my/backend')).toMatchObject({ status: 404 });
            } finally {
                await mockBackend.close();
            }
        });

        test('Replace path with pathReplace', async () => {
            const pathReplace = '/new/path';
            let receivedUrl: string | undefined;
            const mockBackend = await startMockBackend((req, res) => {
                receivedUrl = req.url;
                res.writeHead(200);
                res.end();
            });
            try {
                const server = await getTestServerForExpress({
                    backend: { path: '/my/service', url: mockBackend.url, pathReplace }
                });

                // request that is proxied
                expect(await server.get('/my/service/manifest.json')).toMatchObject({ status: 200 });
                expect(receivedUrl).toBe('/new/path/manifest.json');

                // request that is not handled
                expect(await server.get('/new/path/manifest.json')).toMatchObject({ status: 404 });
            } finally {
                await mockBackend.close();
            }
        });
    });
});

describe('backend-proxy-middleware with connect', () => {
    const backend = {
        path: '/my/service',
        url: 'http://backend.example'
    };

    beforeEach(() => {
        mockGenerateProxyMiddlewareOptions.mockClear();
    });

    test('minimal configuration', async () => {
        await getTestServerForConnect({ backend });
        expect(mockGenerateProxyMiddlewareOptions).toHaveBeenCalledWith(
            expect.objectContaining(backend),
            expect.objectContaining({ secure: true, logger: undefined }),
            expect.any(ToolsLogger)
        );
    });

    test('additional options', async () => {
        const addtionalConfig = {
            ...backend,
            client: '012',
            destination: '~destination'
        };
        await getTestServerForConnect({ backend: addtionalConfig });
        expect(mockGenerateProxyMiddlewareOptions).toHaveBeenCalledWith(
            expect.objectContaining(addtionalConfig),
            expect.objectContaining({ secure: true, logger: undefined }),
            expect.any(ToolsLogger)
        );
    });

    test('additional http-proxy-middleware options', async () => {
        const options: Options = {
            ws: true,
            xfwd: true
        };
        await getTestServerForConnect({ backend, options });
        expect(mockGenerateProxyMiddlewareOptions).toHaveBeenCalledWith(
            expect.objectContaining(backend),
            expect.objectContaining({ ...options, secure: true, logger: undefined }),
            expect.any(ToolsLogger)
        );
    });

    describe('Example proxy requests', () => {
        const MANIFEST = 'manifest.json';

        test('Add client to request', async () => {
            const client = '012';
            let receivedUrl: string | undefined;
            const mockBackend = await startMockBackend((req, res) => {
                receivedUrl = req.url;
                res.writeHead(200);
                res.end();
            });
            try {
                const server = await getTestServerForConnect({
                    backend: { path: '/my/service', url: mockBackend.url, client }
                });

                // request that is proxied
                expect(await server.get('/my/service/manifest.json')).toMatchObject({ status: 200 });
                expect(receivedUrl).toBe('/my/service/manifest.json?sap-client=012');

                // request that is not handled
                expect(await server.get('/not/my/backend')).toMatchObject({ status: 404 });
            } finally {
                await mockBackend.close();
            }
        });

        test('Replace path with pathReplace', async () => {
            const pathReplace = '/new/path';
            let receivedUrl: string | undefined;
            const mockBackend = await startMockBackend((req, res) => {
                receivedUrl = req.url;
                res.writeHead(200);
                res.end();
            });
            try {
                const server = await getTestServerForConnect({
                    backend: { path: '/my/service', url: mockBackend.url, pathReplace }
                });

                // request that is proxied
                expect(await server.get('/my/service/manifest.json')).toMatchObject({ status: 200 });
                expect(receivedUrl).toBe('/new/path/manifest.json');

                // request that is not handled
                expect(await server.get('/new/path/manifest.json')).toMatchObject({ status: 404 });
            } finally {
                await mockBackend.close();
            }
        });
    });
});
