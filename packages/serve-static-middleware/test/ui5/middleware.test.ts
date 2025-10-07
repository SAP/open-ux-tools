import { join } from 'node:path';
import express from 'express';
import supertest from 'supertest';
import * as serveStaticMiddleware from '../../src/ui5/middleware';
import type { ServeStaticConfig } from '../../src';

const localUI5Path = join(__dirname, '..', 'fixtures', 'local');

// middleware function wrapper for testing to simplify tests
async function getTestServer(configuration: ServeStaticConfig): Promise<any> {
    const router = await (serveStaticMiddleware as any).default({
        options: { configuration },
        middlewareUtil: {
            getProject: () => {
                return {
                    getRootPath: () => {
                        return localUI5Path;
                    }
                };
            }
        }
    });
    const app = express();
    app.use(router);
    return supertest(app);
}

describe('Start server with serve-static-middleware', () => {
    const CORE = '/resources/sap-ui-core.js';
    const CACHEBUSTER_CORE = '/resources/~6D08668CD2688B304F0130340DE601EA~5/sap-ui-core.js';
    const SANDBOX = '/test-resources/sandbox.js';
    const USERAPI = '/services/userapi/currentUser';

    const config = {
        paths: [
            { path: '/resources', src: join(localUI5Path, 'resources') },
            { path: '/test-resources', src: join(localUI5Path, 'test-resources') },
            { path: USERAPI, src: 'webapp/mock/user.json', index: false, fallthrough: false, redirect: false }
        ]
    } satisfies ServeStaticConfig;

    test('serve local UI5', async () => {
        const server = await getTestServer(config as any);
        expect(await server.get(CORE)).toMatchObject({ status: 200 });
        expect(await server.get(SANDBOX)).toMatchObject({ status: 200 });
        expect(await server.get(USERAPI)).toMatchObject({ status: 200 });
        expect(await server.get(CACHEBUSTER_CORE)).toMatchObject({ status: 200 });
    });

    test('fallthrough: false', async () => {
        const server = await getTestServer({
            paths: [{ path: '/resources', src: join(localUI5Path, 'resources'), fallthrough: false }]
        } as any);
        expect(await server.get('/resources/nonexistent.js')).toMatchObject({ status: 404 });
    });

    test('throw error on missing configuration', async () => {
        await expect(getTestServer({} as any)).rejects.toThrow(
            'No configuration found for the serve-static-middleware'
        );
    });

    test('throw error on missing configuration: no paths', async () => {
        await expect(getTestServer({ configuration: {} } as any)).rejects.toThrow(
            'No configuration found for the serve-static-middleware'
        );
    });

    test('throw error on missing configuration: no paths', async () => {
        await expect(getTestServer({ configuration: { paths: undefined } } as any)).rejects.toThrow(
            'No configuration found for the serve-static-middleware'
        );
    });

    test('throw error on missing configuration: no paths', async () => {
        await expect(getTestServer({ configuration: { paths: {} } } as any)).rejects.toThrow(
            'No configuration found for the serve-static-middleware'
        );
    });

    test('throw error on missing configuration: no paths', async () => {
        await expect(getTestServer(undefined as any)).rejects.toThrow(
            'No configuration found for the serve-static-middleware'
        );
    });

    test('keepCacheBusterInUrl (cache buster URL)', async () => {
        const server = await getTestServer({
            paths: [{ path: '/resources', src: join(localUI5Path, 'resources'), fallthrough: false, keepCacheBusterInUrl: true }]
        });
        expect(await server.get(CACHEBUSTER_CORE)).toMatchObject({ status: 404 });
    });

    test('keepCacheBusterInUrl (normal URL)', async () => {
        const server = await getTestServer({
            paths: [{ path: '/resources', src: join(localUI5Path, 'resources'), fallthrough: false, keepCacheBusterInUrl: true }]
        });
        expect(await server.get(CORE)).toMatchObject({ status: 200 });
    });
});
