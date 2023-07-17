import express from 'express';
import supertest from 'supertest';
import * as previewMiddleware from '../../../src/ui5/middleware';
import type { Config } from '../../../src/types';
import type { Resource } from '@ui5/fs';
import { readFileSync } from 'fs';
import { join } from 'path';

// middleware function wrapper for testing to simplify tests
async function getTestServer(fixture?: string, configuration: Partial<Config> = {}): Promise<any> {
    const router = await (previewMiddleware as any).default({
        options: { configuration },
        resources: {
            rootProject: {
                byGlob: (glob: string) => {
                    const files: Partial<Resource>[] = [];
                    if (glob.includes('manifest.json') && fixture) {
                        files.push({
                            getString: () =>
                                Promise.resolve(
                                    readFileSync(
                                        join(__dirname, `../../fixtures/${fixture}/webapp/manifest.json`),
                                        'utf-8'
                                    )
                                )
                        });
                    }
                    return files;
                }
            }
        },
        middlewareUtil: {}
    });
    const app = express();
    app.use(router);
    return supertest(app);
}

describe('ui5/middleware', () => {
    test('no config', async () => {
        const server = await getTestServer('simple-app');
        await server.get('/test/flp.html').expect(200);
    });

    test('simple config', async () => {
        const path = '/my/preview/is/here.html';
        const server = await getTestServer('simple-app', { flp: { path } });
        await server.get(path).expect(200);
        await server.get('/test/flp.html').expect(404);
    });

    test('exception thrown on error', async () => {
        try {
            await getTestServer();
            fail('Should have thrown an exception.');
        } catch (error) {
            expect(error).toBeDefined();
        }
    });
});
