import * as utils from '../../src/base/utils';
import * as proxy from '../../src/base/proxy';
import * as ui5ProxyMiddleware from '../../src/ui5/middleware';

import express from 'express';
import supertest from 'supertest';
import nock from 'nock';
import type { UI5ProxyConfig } from '@sap-ux/ui5-config';

// spy on ui5Proxy and injectScripts to verify calls
const ui5ProxySpy = jest.spyOn(proxy, 'ui5Proxy');
const injectScriptsMock = jest.spyOn(utils, 'injectScripts').mockImplementation(async (req, res, _next) => {
    if (req.url.includes('error')) {
        throw Error('error with directLoad');
    } else {
        res.end();
    }
});

const rootProjectMock = {
    byGlob: jest.fn().mockResolvedValue([])
};

/**
 * Middleware function wrapper for testing to simplify tests.
 *
 * @param configuration ui5.yaml configuration for testing
 * @returns instance of a supertest server
 */
async function getTestServer(configuration: Partial<UI5ProxyConfig> | undefined): Promise<any> {
    const router = await (ui5ProxyMiddleware as any).default({
        resources: { rootProject: rootProjectMock },
        options: { configuration }
    });
    const app = express();
    app.use(router);
    return supertest(app);
}

describe('middleware', () => {
    describe('different ui5 configurations', () => {
        const CORE = '/resources/sap-ui-core.js';
        const SANDBOX = '/test-resources/sandbox.js';
        const ALTERNATIVE = '/alternative/file.js';
        const INVALID = '/invalid/file.js';

        const ui5Server = 'https://ui5.sap.com';
        const altUi5Server = 'http://alternative.example';
        const ui5Version = '1.96.0';
        const runConfigVersion = '1.101.1';
        const runConfigServer = 'https://ui5.runconfig.example';

        beforeAll(() => {
            nock.disableNetConnect();
            nock.enableNetConnect(/^127\.0\.0\.1(:[0-9]+)?\/?(\/[.\w]*)*$/);
            nock(ui5Server).get(`${CORE}`).reply(200).persist();
            nock(ui5Server).get(`${SANDBOX}`).reply(200).persist();
            nock(ui5Server).get(`/${ui5Version}${CORE}`).reply(200).persist();
            nock(ui5Server).get(`/${ui5Version}${SANDBOX}`).reply(200).persist();
            nock(altUi5Server).get(`/${ui5Version}${ALTERNATIVE}`).reply(200).persist();
            nock(runConfigServer).get(`/${runConfigVersion}${CORE}`).reply(200).persist();
            nock(runConfigServer).get(`/${runConfigVersion}${SANDBOX}`).reply(200).persist();
        });

        afterAll(() => {
            nock.enableNetConnect();
        });

        test('no configuration', async () => {
            const server = await getTestServer(undefined);
            expect(await server.get(CORE)).toMatchObject({ status: 200 });
            expect(await server.get(SANDBOX)).toMatchObject({ status: 200 });
            expect(await server.get(INVALID)).toMatchObject({ status: 404 });
        });

        test('flexible configuration', async () => {
            const server = await getTestServer({
                version: ui5Version,
                ui5: [
                    { path: '/resources', url: ui5Server },
                    { path: '/test-resources', url: ui5Server },
                    { path: '/alternative', url: altUi5Server }
                ]
            });

            expect(await server.get(CORE)).toMatchObject({ status: 200 });
            expect(await server.get(SANDBOX)).toMatchObject({ status: 200 });
            expect(await server.get(ALTERNATIVE)).toMatchObject({ status: 200 });
            expect(await server.get(INVALID)).toMatchObject({ status: 404 });
        });

        test('classic configuration', async () => {
            const server = await getTestServer({
                version: ui5Version,
                ui5: {
                    path: ['/resources', '/test-resources'],
                    url: ui5Server
                }
            });

            expect(await server.get(CORE)).toMatchObject({ status: 200 });
            expect(await server.get(SANDBOX)).toMatchObject({ status: 200 });
            expect(await server.get(INVALID)).toMatchObject({ status: 404 });
        });

        test('mixed configuration', async () => {
            const server = await getTestServer({
                version: ui5Version,
                ui5: [
                    { path: ['/resources', '/test-resources'], url: ui5Server },
                    { path: '/alternative', url: altUi5Server }
                ]
            });

            expect(await server.get(CORE)).toMatchObject({ status: 200 });
            expect(await server.get(SANDBOX)).toMatchObject({ status: 200 });
            expect(await server.get(ALTERNATIVE)).toMatchObject({ status: 200 });
            expect(await server.get(INVALID)).toMatchObject({ status: 404 });
        });

        test('run configuration', async () => {
            process.env.FIORI_TOOLS_UI5_URI = runConfigServer;
            process.env.FIORI_TOOLS_UI5_VERSION = runConfigVersion;

            const server = await getTestServer({
                version: ui5Version,
                ui5: {
                    path: ['/resources', '/test-resources'],
                    url: ui5Server
                }
            });

            expect(await server.get(CORE)).toMatchObject({ status: 200 });
            expect(await server.get(SANDBOX)).toMatchObject({ status: 200 });
            delete process.env.FIORI_TOOLS_UI5_VERSION;
            delete process.env.FIORI_TOOLS_UI5_URI;
        });
    });

    describe('set optional properties', () => {
        const config = {
            version: '',
            ui5: {
                path: '/resources',
                url: 'http://ui5.example'
            }
        };

        beforeEach(() => {
            ui5ProxySpy.mockClear();
        });

        test('none', async () => {
            await getTestServer(config);
            expect(ui5ProxySpy).toBeCalledWith(
                expect.objectContaining({}),
                expect.objectContaining({ secure: true, logLevel: 'info' })
            );
        });

        test('proxy', async () => {
            await getTestServer({
                ...config,
                proxy: 'http://proxy.example'
            });
            expect(ui5ProxySpy).toBeCalledWith(
                expect.objectContaining({ proxy: 'http://proxy.example' }),
                expect.objectContaining({})
            );
        });

        test('debug', async () => {
            await getTestServer({
                ...config,
                debug: true
            });
            expect(ui5ProxySpy).toBeCalledWith(
                expect.objectContaining({}),
                expect.objectContaining({ logLevel: 'debug' })
            );
        });

        test('secure', async () => {
            await getTestServer({
                ...config,
                secure: true
            });
            expect(ui5ProxySpy).toBeCalledWith(expect.objectContaining({}), expect.objectContaining({ secure: true }));
        });

        test('secure', async () => {
            await getTestServer({
                ...config,
                secure: false
            });
            expect(ui5ProxySpy).toBeCalledWith(expect.objectContaining({}), expect.objectContaining({ secure: false }));
        });

        test('directLoad', async () => {
            const server = await getTestServer({
                ...config,
                directLoad: true
            });

            await server.get('/index.html');
            expect(injectScriptsMock).toBeCalled();
        });

        test('directLoad:error', async () => {
            const server = await getTestServer({
                ...config,
                directLoad: true
            });
            const result = await server.get('/index.html?error');
            expect(result.status).toEqual(500);
            expect(result.text.includes('error with directLoad')).toBeTruthy();
        });
    });

    describe('manifest.json options', () => {
        const config = {
            ui5: {
                path: '/resources',
                url: 'http://ui5.example'
            }
        };
        beforeEach(() => {
            ui5ProxySpy.mockClear();
        });

        test('valid manifest.json', async () => {
            const ui5Version = '1.123.0';
            const loadManifestMock = jest
                .fn()
                .mockResolvedValue(`{ "sap.ui5": { "dependencies": { "minUI5Version": "${ui5Version}"}}}`);
            rootProjectMock.byGlob.mockResolvedValueOnce([
                {
                    getString: loadManifestMock
                }
            ]);
            await getTestServer(config);
            expect(loadManifestMock).toBeCalled();
            expect(ui5ProxySpy).toBeCalledWith(
                expect.objectContaining({ version: ui5Version }),
                expect.objectContaining({})
            );
        });

        test('invalid manifest.json', async () => {
            rootProjectMock.byGlob.mockResolvedValueOnce([
                {
                    getString: jest.fn()
                }
            ]);
            await getTestServer(config);
            expect(ui5ProxySpy).toBeCalledWith(expect.objectContaining({ version: '' }), expect.objectContaining({}));
        });

        test('no manifest.json', async () => {
            rootProjectMock.byGlob.mockResolvedValueOnce([]);
            await getTestServer(config);
            expect(ui5ProxySpy).toBeCalledWith(expect.objectContaining({ version: '' }), expect.objectContaining({}));
        });
    });
});
