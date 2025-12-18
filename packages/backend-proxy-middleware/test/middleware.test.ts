import express from 'express';
import supertest from 'supertest';
import * as proxy from '../src/base/proxy';
import * as proxyMiddleware from '../src/middleware';
import type { BackendMiddlewareConfig } from '../src/base/types';
import nock from 'nock';
import type { Options } from 'http-proxy-middleware';
import connect = require('connect');
import { ToolsLogger } from '@sap-ux/logger';

jest.mock('@sap-ux/btp-utils', () => ({
    ...(jest.requireActual('@sap-ux/btp-utils') as object),
    isAppStudio: jest.fn().mockReturnValue(false)
}));

// spy on createProxy and injectScripts to verify calls
const generateProxyOptionsSpy = jest.spyOn(proxy, 'generateProxyMiddlewareOptions');
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
            generateProxyOptionsSpy.mockClear();
        });

        test('minimal configuration', async () => {
            await getTestServerForExpress({ backend });
            expect(generateProxyOptionsSpy).toHaveBeenCalledWith(
                expect.objectContaining(backend),
                expect.objectContaining({ secure: true, logger: undefined }),
                expect.any(ToolsLogger)
            );
        });

        test('debug', async () => {
            await getTestServerForExpress({ backend, debug: true });
            expect(generateProxyOptionsSpy).toHaveBeenCalledWith(
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
            expect(generateProxyOptionsSpy).toHaveBeenCalledWith(
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
            expect(generateProxyOptionsSpy).toHaveBeenCalledWith(
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
        generateProxyOptionsSpy.mockClear();
    });

    test('minimal configuration', async () => {
        await getTestServerForConnect({ backend });
        expect(generateProxyOptionsSpy).toHaveBeenCalledWith(
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
        expect(generateProxyOptionsSpy).toHaveBeenCalledWith(
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
        expect(generateProxyOptionsSpy).toHaveBeenCalledWith(
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
