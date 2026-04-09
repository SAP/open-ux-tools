import { jest } from '@jest/globals';
import type { BackendMiddlewareConfig } from '../src/base/types';
import type { Options } from 'http-proxy-middleware';

const mockGenerateProxyMiddlewareOptions = jest.fn<any>();

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn().mockReturnValue(false),
    BAS_DEST_INSTANCE_CRED_HEADER: 'bas-destination-instance-cred',
    getDestinationUrlForAppStudio: jest.fn(),
    getCredentialsForDestinationService: jest.fn(),
    isFullUrlDestination: jest.fn(),
    listDestinations: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/store', () => ({
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
const realProxy = await import('../src/base/proxy');
mockGenerateProxyMiddlewareOptions.mockImplementation(realProxy.generateProxyMiddlewareOptions);

// Now mock the proxy module, replacing generateProxyMiddlewareOptions with the spy
jest.unstable_mockModule('../src/base/proxy', () => ({
    ...realProxy,
    generateProxyMiddlewareOptions: mockGenerateProxyMiddlewareOptions
}));

const express = (await import('express')).default;
const supertest = (await import('supertest')).default;
const nock = (await import('nock')).default;
const connect = (await import('connect')).default;
const proxyMiddleware = await import('../src/middleware');
const { ToolsLogger } = await import('@sap-ux/logger');
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
            nock(backend.url).get(`${backend.path}/${MANIFEST}?sap-client=${client}`).reply(200);
            const server = await getTestServerForExpress({ backend: { ...backend, client } });

            // request that is proxied
            expect(await server.get(`${backend.path}/${MANIFEST}`)).toMatchObject({ status: 200 });

            // request that is not handled
            expect(await server.get('/not/my/backend')).toMatchObject({ status: 404 });
        });

        test('Replace path with pathReplace', async () => {
            const pathReplace = '/new/path';
            nock(backend.url).get(`${pathReplace}/${MANIFEST}`).reply(200);
            const server = await getTestServerForExpress({ backend: { ...backend, pathReplace } });

            // request that is proxied
            expect(await server.get(`${backend.path}/${MANIFEST}`)).toMatchObject({ status: 200 });

            // request that is not handled
            expect(await server.get(`${pathReplace}/${MANIFEST}`)).toMatchObject({ status: 404 });
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
            nock(backend.url).get(`${backend.path}/${MANIFEST}?sap-client=${client}`).reply(200);
            const server = await getTestServerForConnect({ backend: { ...backend, client } });

            // request that is proxied
            expect(await server.get(`${backend.path}/${MANIFEST}`)).toMatchObject({ status: 200 });

            // request that is not handled
            expect(await server.get('/not/my/backend')).toMatchObject({ status: 404 });
        });

        test('Replace path with pathReplace', async () => {
            const pathReplace = '/new/path';
            nock(backend.url).get(`${pathReplace}/${MANIFEST}`).reply(200);
            const server = await getTestServerForConnect({ backend: { ...backend, pathReplace } });

            // request that is proxied
            expect(await server.get(`${backend.path}/${MANIFEST}`)).toMatchObject({ status: 200 });

            // request that is not handled
            expect(await server.get(`${pathReplace}/${MANIFEST}`)).toMatchObject({ status: 404 });
        });
    });
});
