import express from 'express';
import supertest from 'supertest';
import * as proxy from '../src/base/proxy';
import * as proxyMiddleware from '../src/middleware';

import { BackendMiddlewareConfig } from '../src/base/types';
import nock from 'nock';

// spy on createProxy and injectScripts to verify calls
const generateProxyOptionsSpy = jest.spyOn(proxy, 'generateProxyMiddlewareOptions');

// middleware function wrapper for testing to simplify tests
async function getTestServer(configuration: BackendMiddlewareConfig): Promise<any> {
    const router = await (proxyMiddleware as any).default({
        options: { configuration }
    });
    const app = express();
    app.use(router);
    return supertest(app);
}

describe('backend-proxy-middlewaer', () => {
    const backend = {
        path: '/my/service',
        url: 'http://backend.example'
    };
    describe('Different middleware configurations', () => {
        beforeEach(() => {
            generateProxyOptionsSpy.mockClear();
        });

        test('minimal configuration', async () => {
            await getTestServer({ backend });
            expect(generateProxyOptionsSpy).toBeCalledWith(
                expect.objectContaining(backend),
                expect.objectContaining({ secure: true, logLevel: 'silent' }),
                expect.objectContaining({})
            );
        });

        test('additional options', async () => {
            const addtionalConfig = {
                ...backend,
                client: '012',
                destination: '~destination'
            };
            await getTestServer({ backend: addtionalConfig, debug: true });
            expect(generateProxyOptionsSpy).toBeCalledWith(
                expect.objectContaining(addtionalConfig),
                expect.objectContaining({ secure: true, logLevel: 'debug' }),
                expect.objectContaining({})
            );
        });

        test('additional http-proxy-middleware options', async () => {
            const options = {
                ws: true,
                xfwd: true
            };
            await getTestServer({ backend, options });
            expect(generateProxyOptionsSpy).toBeCalledWith(
                expect.objectContaining(backend),
                expect.objectContaining({ ...options, secure: true, logLevel: 'silent' }),
                expect.objectContaining({})
            );
        });
    });

    describe('Example proxy requests', () => {
        const MANIFEST = 'manifest.json';

        test('Add client to request', async () => {
            const client = '012';
            nock(backend.url).get(`${backend.path}/${MANIFEST}?sap-client=${client}`).reply(200);
            const server = await getTestServer({ backend: { ...backend, client } });

            // request that is proxied
            expect(await server.get(`${backend.path}/${MANIFEST}`)).toMatchObject({ status: 200 });

            // request that is not handled
            expect(await server.get('/not/my/backend')).toMatchObject({ status: 404 });
        });

        test('Replace path with pathPrefix', async () => {
            const pathPrefix = '/new/path';
            nock(backend.url).get(`${pathPrefix}/${MANIFEST}`).reply(200);
            const server = await getTestServer({ backend: { ...backend, pathPrefix } });

            // request that is proxied
            expect(await server.get(`${backend.path}/${MANIFEST}`)).toMatchObject({ status: 200 });

            // request that is not handled
            expect(await server.get(`${pathPrefix}/${MANIFEST}`)).toMatchObject({ status: 404 });
        });
    });
});
