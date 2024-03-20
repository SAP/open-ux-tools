import * as reloadMiddleware from '../../../src/ui5/middleware';
import type { ReloaderConfig } from '../../../src';
import express from 'express';
import supertest from 'supertest';
import axios from 'axios';

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

    test('start server with default configuration', async () => {
        await getTestServer(undefined as any);
        return axios
            .get('http://localhost:35729/livereload.js?snipver=1')
            .then((body) => {
                expect(typeof body.data).toBe('string');
                expect(body.data.length).toBeGreaterThan(0);
            })
            .catch((_error) => {
                expect(true).toBe(false);
            });
    });

    test('start server with custom configuration', async () => {
        await getTestServer({ port: 12345, path: 'webapp' });
        return axios
            .get('http://localhost:12345/livereload.js?snipver=1')
            .then((body) => {
                expect(typeof body.data).toBe('string');
                expect(body.data.length).toBeGreaterThan(0);
            })
            .catch((_error) => {
                expect(true).toBe(false);
            });
    });

    test('start server with custom configuration, but default path', async () => {
        await getTestServer({ port: 54321 } as any);
        return axios
            .get('http://localhost:54321/livereload.js?snipver=1')
            .then((body) => {
                expect(typeof body.data).toBe('string');
                expect(body.data.length).toBeGreaterThan(0);
            })
            .catch((_error) => {
                expect(true).toBe(false);
            });
    });

    test('start server with custom configuration, multiple paths', async () => {
        await getTestServer({ port: 13579, path: ['webapp', 'path/to/reuse/libs'] });
        return axios
            .get('http://localhost:13579/livereload.js?snipver=1')
            .then((body) => {
                expect(typeof body.data).toBe('string');
                expect(body.data.length).toBeGreaterThan(0);
            })
            .catch((_error) => {
                expect(true).toBe(false);
            });
    });
});
