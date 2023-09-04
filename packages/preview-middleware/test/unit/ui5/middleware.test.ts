import express from 'express';
import supertest from 'supertest';
import * as previewMiddleware from '../../../src/ui5/middleware';
import type { Config } from '../../../src/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import nock from 'nock';
import type { EnhancedRouter } from '../../../src/base/flp';

jest.mock('@sap-ux/store', () => {
    return {
        ...jest.requireActual('@sap-ux/store'),
        getService: jest.fn().mockImplementation(() =>
            Promise.resolve({
                read: jest.fn().mockReturnValue({ username: '~user', password: '~pass' })
            })
        )
    };
});

async function getRouter(fixture?: string, configuration: Partial<Config> = {}): Promise<EnhancedRouter> {
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
async function getTestServer(fixture?: string, configuration: Partial<Config> = {}): Promise<any> {
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
        await server.get('/test/flp.html').expect(200);
        await server.get('/test/init.js').expect(200);
    });

    test('simple config', async () => {
        const path = '/my/preview/is/here.html';
        const server = await getTestServer('simple-app', { flp: { path, libs: true } });
        await server.get(path).expect(200);
        await server.get('/my/preview/is/init.js').expect(200);
        await server.get('/test/flp.html').expect(404);
    });

    test('adp config', async () => {
        const server = await getTestServer('adp', { adp: { target: { url } } });
        await server.get('/test/flp.html').expect(200);
    });

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
