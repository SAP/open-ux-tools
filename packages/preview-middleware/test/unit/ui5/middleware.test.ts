import { jest } from '@jest/globals';
import express from 'express';
import supertest from 'supertest';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import nock from 'nock';
import type { EnhancedRouter } from '../../../src/base/flp';
import type { MiddlewareConfig } from '../../../src/types';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock node:module to intercept createRequire so that require.resolve works for
// @sap-ux/control-property-editor-sources (its dist/app.js is not built in test env)
const actualNodeModule = await import('node:module');
jest.unstable_mockModule('node:module', () => ({
    ...actualNodeModule,
    createRequire: (url: string | URL) => {
        const originalRequire = actualNodeModule.createRequire(url);
        const wrappedRequire = Object.assign((id: string) => originalRequire(id), originalRequire);
        const originalResolve = originalRequire.resolve.bind(originalRequire);
        wrappedRequire.resolve = Object.assign(
            (id: string, options?: { paths?: string[] }) => {
                if (id === '@sap-ux/control-property-editor-sources') {
                    // Return a dummy path; dirname() of this gives a usable directory for serveStatic
                    return join(__dirname, '..', '..', 'fixtures', 'dummy-cpe', 'index.js');
                }
                return originalResolve(id, options);
            },
            { paths: originalRequire.resolve.paths }
        ) as NodeJS.RequireResolve;
        return wrappedRequire;
    }
}));

// Pre-import actual modules before mocking
const actualProjectAccess = await import('@sap-ux/project-access');
const actualStore = await import('@sap-ux/store');

// Mock @sap-ux/store
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...actualStore,
    getService: jest.fn().mockImplementation(() =>
        Promise.resolve({
            read: jest.fn().mockReturnValue({ username: '~user', password: '~pass' })
        })
    )
}));

// Mock @sap-ux/project-access
const mockFindProjectRoot = jest.fn<() => Promise<string>>().mockResolvedValue('');
const mockGetProjectType = jest.fn<() => Promise<string>>().mockResolvedValue('EDMXBackend');

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    findProjectRoot: mockFindProjectRoot,
    getProjectType: mockGetProjectType
}));

// Import after mocking
const previewMiddleware = await import('../../../src/ui5/middleware');
const { ToolsLogger } = await import('@sap-ux/logger');

async function getRouter(fixture?: string, configuration: Partial<MiddlewareConfig> = {}): Promise<EnhancedRouter> {
    return await (previewMiddleware as any).default({
        options: { configuration },
        resources: {
            rootProject: {
                byPath: (path: string) => {
                    if (path === (fixture === 'adp' ? '/manifest.appdescr_variant' : '/manifest.json') && fixture) {
                        return {
                            getString: () =>
                                Promise.resolve(
                                    readFileSync(
                                        join(
                                            __dirname,
                                            `../../fixtures/${fixture}/webapp/manifest.${
                                                fixture === 'adp' ? 'appdescr_variant' : 'json'
                                            }`
                                        ),
                                        'utf-8'
                                    )
                                )
                        };
                    } else {
                        return undefined;
                    }
                },
                byGlob: (_glob: string) => {
                    return [];
                }
            }
        },
        middlewareUtil: {}
    });
}

// middleware function wrapper for testing to simplify tests
async function getTestServer(fixture?: string, configuration: Partial<MiddlewareConfig> = {}): Promise<any> {
    const router = await getRouter(fixture, configuration);
    const app = express();
    app.use(router);
    return supertest(app);
}

describe('ui5/middleware', () => {
    const url = 'http://sap.example';
    beforeAll(() => {
        nock(url)
            .get(() => true)
            .reply(200)
            .persist();
        nock(url)
            .put(() => true)
            .reply(200, {
                'my.f1873': {
                    name: 'cus.sd.salesorders.manage',
                    manifest: {
                        'sap.app': {
                            id: 'my.f1873'
                        }
                    },
                    asyncHints: { libs: [] },
                    url: '/my/f1873'
                }
            })
            .persist();
    });

    test('no config', async () => {
        const server = await getTestServer('simple-app');
        await server.get('/test/flp.html?sap-ui-xx-viewCache=false').expect(200);
        await server.get('/preview/client/flp/init.js').expect(200);
    }, 10000);

    test('simple config', async () => {
        const path = '/my/preview/is/here.html';
        const server = await getTestServer('simple-app', { flp: { path, libs: true } });
        await server.get(path).expect(302);
        await server.get('/preview/client/flp/init.js').expect(200);
        await server.get('/test/flp.html').expect(404);
    }, 10000);

    test('unsupported editor config', async () => {
        const consoleSpyError = jest.spyOn(ToolsLogger.prototype, 'error').mockImplementation((() => {}) as any);
        const consoleSpyWarning = jest.spyOn(ToolsLogger.prototype, 'warn').mockImplementation((() => {}) as any);
        const path = '/test/editor.html';
        const server = await getTestServer('simple-app', {
            rta: {
                layer: 'CUSTOMER_BASE',
                editors: [
                    {
                        path,
                        developerMode: true
                    }
                ]
            }
        });
        await server.get(path).expect(302);
        expect(consoleSpyError).toHaveBeenCalledWith(
            'developerMode is ONLY supported for SAP UI5 adaptation projects.'
        );
        expect(consoleSpyWarning).toHaveBeenCalledWith('developerMode for /test/editor.html disabled');
        consoleSpyError.mockRestore();
        consoleSpyWarning.mockRestore();
    });

    test('adp config', async () => {
        const server = await getTestServer('adp', {
            adp: { target: { url } },
            rta: {
                layer: 'CUSTOMER_BASE',
                editors: [{ path: '/adp/editor.html', developerMode: true }]
            }
        });
        await server.get('/test/flp.html?sap-ui-xx-viewCache=false').expect(200);
        await server.get('/adp/editor.html').expect(200);
    }, 10000);

    test('invalid adp config', async () => {
        const url = 'http://sap.example';
        try {
            await getTestServer('simple-app', { adp: { target: { url } } });
            fail('Should have thrown an error.');
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    test('exception thrown on error', async () => {
        try {
            await getTestServer();
            fail('Should have thrown an exception.');
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    test('exposed endpoints (for cds-plugin-ui5)', async () => {
        const router = await getRouter('simple-app');
        expect(router.getAppPages).toBeDefined();
        expect(router.getAppPages?.()).toEqual(['/test/flp.html#app-preview']);
    });
});
