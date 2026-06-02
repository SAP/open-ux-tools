import { jest } from '@jest/globals';
import type { UI5ProxyConfig } from '@sap-ux/ui5-config';
import http from 'node:http';
import https from 'node:https';

// Define mock functions
const mockUi5Proxy = jest.fn<any>();
const mockDirectLoadProxy = jest.fn<any>();
const mockGetCorporateProxyServer = jest.fn<any>().mockReturnValue(undefined);
const mockHideProxyCredentials = jest.fn<any>().mockReturnValue(undefined);
const mockResolveUI5Version = jest.fn<any>().mockImplementation(async (version: string) => {
    // Mimic the real resolveUI5Version: CLI env overrides config
    if (process.env.FIORI_TOOLS_UI5_VERSION || process.env.FIORI_TOOLS_UI5_VERSION === '') {
        return process.env.FIORI_TOOLS_UI5_VERSION;
    }
    return version || '';
});

// Mock the base barrel module that middleware.ts imports from
jest.unstable_mockModule('../../src/base', () => ({
    ui5Proxy: mockUi5Proxy,
    directLoadProxy: mockDirectLoadProxy,
    getCorporateProxyServer: mockGetCorporateProxyServer,
    hideProxyCredentials: mockHideProxyCredentials,
    resolveUI5Version: mockResolveUI5Version
}));

// Mock dotenv
jest.unstable_mockModule('dotenv', () => ({
    default: { config: jest.fn() },
    config: jest.fn()
}));

// Import after mocking
const { default: express } = await import('express');
const { default: supertest } = await import('supertest');
const { default: nock } = await import('nock');
const { ToolsLogger } = await import('@sap-ux/logger');
const ui5ProxyMiddleware = await import('../../src/ui5/middleware');

const rootProjectMock = {
    byGlob: jest.fn<any>().mockResolvedValue([])
};

/**
 * Middleware function wrapper for testing to simplify tests.
 *
 * @param configuration ui5.yaml configuration for testing
 * @returns instance of a supertest server
 */
async function getTestServer(configuration: Partial<UI5ProxyConfig> | undefined): Promise<any> {
    const router = await ui5ProxyMiddleware.default({
        resources: { rootProject: rootProjectMock },
        options: { configuration }
    } as any);
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
            // Make ui5Proxy return a handler that proxies through nock
            mockUi5Proxy.mockImplementation((config: any) => {
                return (req: any, res: any, _next: any) => {
                    const url = new URL(config.url);
                    const version = config.version ? `/${config.version}` : '';
                    const targetUrl = `${url.origin}${version}${req.path}`;
                    const client = targetUrl.startsWith('https') ? https : http;
                    client
                        .get(targetUrl, (proxyRes) => {
                            res.status(proxyRes.statusCode || 404);
                            res.end();
                        })
                        .on('error', () => {
                            res.status(502).end();
                        });
                };
            });

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
            mockUi5Proxy.mockClear();
            mockDirectLoadProxy.mockClear();
            mockUi5Proxy.mockReturnValue((_req: any, _res: any, next: any) => next());
        });

        test('none', async () => {
            await getTestServer(config);
            expect(mockUi5Proxy).toHaveBeenCalledWith(
                expect.objectContaining({}),
                expect.objectContaining({ secure: true, logger: undefined }),
                undefined,
                expect.any(ToolsLogger)
            );
        });

        test('proxy', async () => {
            await getTestServer({
                ...config,
                proxy: 'http://proxy.example'
            });
            expect(mockUi5Proxy).toHaveBeenCalledWith(
                expect.objectContaining({ proxy: 'http://proxy.example' }),
                expect.objectContaining({}),
                undefined,
                expect.any(ToolsLogger)
            );
        });

        test('debug', async () => {
            await getTestServer({
                ...config,
                debug: true
            });
            expect(mockUi5Proxy).toHaveBeenCalledWith(
                expect.objectContaining({}),
                expect.objectContaining({ logger: expect.objectContaining({}) }),
                undefined,
                expect.any(ToolsLogger)
            );
        });

        test('pathReplace', async () => {
            await getTestServer({
                ...config,
                ui5: {
                    path: '/resources',
                    url: 'http://ui5.example',
                    pathReplace: '/new-resources'
                }
            });
            expect(mockUi5Proxy).toHaveBeenCalledWith(
                expect.objectContaining({ pathReplace: '/new-resources' }),
                expect.objectContaining({}),
                undefined,
                expect.any(ToolsLogger)
            );
        });

        test('secure', async () => {
            await getTestServer({
                ...config,
                secure: true
            });
            expect(mockUi5Proxy).toHaveBeenCalledWith(
                expect.objectContaining({}),
                expect.objectContaining({ secure: true, logger: undefined }),
                undefined,
                expect.any(ToolsLogger)
            );
        });

        test('secure', async () => {
            await getTestServer({
                ...config,
                secure: false
            });
            expect(mockUi5Proxy).toHaveBeenCalledWith(
                expect.objectContaining({}),
                expect.objectContaining({ secure: false, logger: undefined }),
                undefined,
                expect.any(ToolsLogger)
            );
        });

        test('directLoad', async () => {
            mockDirectLoadProxy.mockReturnValue(async (req: any, res: any, _next: any) => {
                res.end();
            });
            const server = await getTestServer({
                ...config,
                directLoad: true
            });

            await server.get('/index.html');
            expect(mockDirectLoadProxy).toHaveBeenCalled();
        });

        test('directLoad:error', async () => {
            mockDirectLoadProxy.mockReturnValue(async (req: any, res: any, next: any) => {
                const error = new Error('error with directLoad');
                next(error);
            });
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
            mockUi5Proxy.mockClear();
            mockUi5Proxy.mockReturnValue((_req: any, _res: any, next: any) => next());
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
            mockResolveUI5Version.mockResolvedValueOnce(ui5Version);
            await getTestServer(config);
            expect(loadManifestMock).toHaveBeenCalled();
            expect(mockUi5Proxy).toHaveBeenCalledWith(
                expect.objectContaining({ version: ui5Version }),
                expect.objectContaining({}),
                undefined,
                expect.any(ToolsLogger)
            );
        });

        test('invalid manifest.json', async () => {
            rootProjectMock.byGlob.mockResolvedValueOnce([
                {
                    getString: jest.fn()
                }
            ]);
            await getTestServer(config);
            expect(mockUi5Proxy).toHaveBeenCalledWith(
                expect.objectContaining({ version: '' }),
                expect.objectContaining({}),
                undefined,
                expect.any(ToolsLogger)
            );
        });

        test('no manifest.json', async () => {
            rootProjectMock.byGlob.mockResolvedValueOnce([]);
            await getTestServer(config);
            expect(mockUi5Proxy).toHaveBeenCalledWith(
                expect.objectContaining({ version: '' }),
                expect.objectContaining({}),
                undefined,
                expect.any(ToolsLogger)
            );
        });
    });
});
