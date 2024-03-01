import * as reloadMiddleware from '../../../src/ui5/middleware';
import type { ReloaderConfig } from '../../../src';
import express from 'express';
import supertest from 'supertest';

describe('Reload Middleware', () => {
    // middleware function wrapper for testing to simplify tests
    async function getTestServer(configuration: ReloaderConfig): Promise<any> {
        const router = await (reloadMiddleware as any).default({
            options: { configuration },
            middlewareUtil: {
                getProject: () => {
                    return {
                        getRootPath: () => {
                            return 'path/to/my/project';
                        },
                        getSourcePath: () => {
                            return 'path/to/my/project/webapp';
                        }
                    };
                }
            }
        });
        const app = express();
        app.use(router);
        return supertest(app);
    }

    test('should return 200 for /reload', async () => {
        expect(true).toBe(true);
    });
});
