import nock from 'nock';
import supertest from 'supertest';
import express, { type Request, type Response, type NextFunction, Router } from 'express';

import type { ToolsLogger } from '@sap-ux/logger';

import type { OAuthTokenProvider } from '../src/token';
import { createProxyOptions, registerProxyRoute, setupProxyRoutes } from '../src/proxy';

describe('proxy', () => {
    const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    } as unknown as ToolsLogger;

    const mockTokenProvider = {
        createTokenMiddleware: jest.fn().mockReturnValue((req: Request, _res: Response, next: NextFunction) => {
            req.headers.authorization = 'Bearer mock-token';
            next();
        })
    } as unknown as OAuthTokenProvider;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const targetUrl = '/backend.example';

    describe('createProxyOptions', () => {
        test('creates proxy options with correct target', () => {
            const matchedPath = '/api';
            const pathRewrite = undefined;
            const options = createProxyOptions(targetUrl, matchedPath, pathRewrite, logger);

            expect(options.target).toBe(targetUrl);
            expect(options.changeOrigin).toBe(true);
            expect(options.pathRewrite).toBeDefined();
            expect(options.on).toBeDefined();
            expect(options.on?.error).toBeDefined();
        });

        test('pathRewrite strips matched path prefix', () => {
            const matchedPath = '/resources/com/sap/apm';
            const pathRewriteValue = '/api';
            const options = createProxyOptions(targetUrl, matchedPath, pathRewriteValue, logger);
            const pathRewriteFn = options.pathRewrite as Function;

            const req = {
                originalUrl: '/resources/com/sap/apm/v1/service',
                url: '/v1/service'
            };

            const result = pathRewriteFn('/v1/service', req);
            expect(result).toBe('/api/v1/service');
        });

        test('pathRewrite uses req.url when originalUrl is not available', () => {
            const matchedPath = '/api';
            const pathRewriteValue = undefined;
            const options = createProxyOptions(targetUrl, matchedPath, pathRewriteValue, logger);
            const pathRewriteFn = options.pathRewrite as Function;

            const req = {
                url: '/api/srv/EntitySet'
            };

            const result = pathRewriteFn('/srv/EntitySet', req);
            expect(result).toBe('/srv/EntitySet');
        });

        test('pathRewrite preserves query string', () => {
            const matchedPath = '/resources/com/sap/apm';
            const pathRewriteValue = '/api';
            const options = createProxyOptions(targetUrl, matchedPath, pathRewriteValue, logger);
            const pathRewriteFn = options.pathRewrite as Function;

            const req = {
                originalUrl: '/resources/com/sap/apm/srv/EntitySet?$top=10&$skip=0',
                url: '/srv/EntitySet?$top=10&$skip=0'
            };

            const result = pathRewriteFn('/srv/EntitySet?$top=10&$skip=0', req);
            expect(result).toBe('/api/srv/EntitySet?$top=10&$skip=0');
        });

        test('error handler logs error and calls next if available', () => {
            const matchedPath = '/api';
            const pathRewriteValue = undefined;
            const options = createProxyOptions(targetUrl, matchedPath, pathRewriteValue, logger);
            const errorHandler = options.on?.error as Function;

            const error = new Error('Proxy error');
            const req = {
                originalUrl: '/sap/opu/odata',
                url: '/sap/opu/odata',
                next: jest.fn()
            };
            const res = {};
            const target = '/backend.example';

            errorHandler(error, req, res, target);
            expect(req.next).toHaveBeenCalledWith(error);
        });

        test('error handler does not throw if next is not available', () => {
            const matchedPath = '/api';
            const pathRewriteValue = undefined;
            const options = createProxyOptions(targetUrl, matchedPath, pathRewriteValue, logger);
            const errorHandler = options.on?.error as Function;

            const error = new Error('Proxy error');
            const req = {
                originalUrl: '/sap/opu/odata',
                url: '/sap/opu/odata'
            };
            const res = {};

            expect(() => errorHandler(error, req, res, targetUrl)).not.toThrow();
        });

        test('pathRewrite without pathRewrite parameter only strips matched prefix', () => {
            const matchedPath = '/resources/com/sap/apm';
            const pathRewriteValue = undefined;
            const options = createProxyOptions(targetUrl, matchedPath, pathRewriteValue, logger);
            const pathRewriteFn = options.pathRewrite as Function;

            const req = {
                originalUrl: '/resources/com/sap/apm/v1/service',
                url: '/v1/service'
            };

            const result = pathRewriteFn('/v1/service', req);
            expect(result).toBe('/v1/service');
        });

        test('pathRewrite removes trailing slash from pathRewrite parameter', () => {
            const matchedPath = '/resources/com/sap/apm';
            const pathRewriteValue = '/api/';
            const options = createProxyOptions(targetUrl, matchedPath, pathRewriteValue, logger);
            const pathRewriteFn = options.pathRewrite as Function;

            const req = {
                originalUrl: '/resources/com/sap/apm/v1/service',
                url: '/v1/service'
            };

            const result = pathRewriteFn('/v1/service', req);
            expect(result).toBe('/api/v1/service');
        });
    });

    describe('registerProxyRoute', () => {
        test('registers proxy route successfully', () => {
            const router = Router();
            const path = '/sap/opu/odata';
            const destinationUrl = '/backend.example';
            const pathRewriteValue = undefined;

            registerProxyRoute(path, destinationUrl, pathRewriteValue, mockTokenProvider, logger, router);

            expect(mockTokenProvider.createTokenMiddleware).toHaveBeenCalled();
            expect(router.stack.length).toBeGreaterThan(0);
        });
    });

    describe('setupProxyRoutes', () => {
        test('sets up multiple proxy routes', () => {
            const backends = [
                {
                    url: '/backend.example',
                    paths: ['/sap/opu/odata', '/sap/bc/ui5_ui5', '/api']
                }
            ];

            const router = setupProxyRoutes(backends, mockTokenProvider, logger);

            expect(typeof router).toBe('function');
            expect(router.use).toBeDefined();
            expect(mockTokenProvider.createTokenMiddleware).toHaveBeenCalledTimes(backends[0].paths.length);
        });

        test('throws error when route registration fails', () => {
            const backends = [
                {
                    url: '/backend.example',
                    paths: ['/sap/opu/odata']
                }
            ];
            const failingTokenProvider = {
                createTokenMiddleware: jest.fn().mockImplementation(() => {
                    throw new Error('Token middleware creation failed');
                })
            } as unknown as OAuthTokenProvider;

            expect(() => {
                setupProxyRoutes(backends, failingTokenProvider, logger);
            }).toThrow('Failed to register proxy for /sap/opu/odata');
        });

        test('handles empty paths array', () => {
            const backends = [
                {
                    url: '/backend.example',
                    paths: []
                }
            ];

            const router = setupProxyRoutes(backends, mockTokenProvider, logger);

            expect(typeof router).toBe('function');
            expect(router.use).toBeDefined();
            expect(router.stack.length).toBe(0);
        });

        test('sets up routes for multiple backends', () => {
            const backends = [
                {
                    url: '/backend1.example',
                    paths: ['/sap/opu/odata', '/sap/bc/ui5_ui5']
                },
                {
                    url: '/backend2.example',
                    paths: ['/api/v1', '/api/v2']
                }
            ];

            const router = setupProxyRoutes(backends, mockTokenProvider, logger);

            expect(typeof router).toBe('function');
            expect(router.use).toBeDefined();
            const totalPaths = backends[0].paths.length + backends[1].paths.length;
            expect(mockTokenProvider.createTokenMiddleware).toHaveBeenCalledTimes(totalPaths);
        });
    });

    describe('integration tests', () => {
        const path = '/sap/opu/odata';
        const destinationUrl = 'https://backend.example';

        test('proxies request with token middleware', async () => {
            const backends = [
                {
                    url: destinationUrl,
                    paths: [path]
                }
            ];
            const router = setupProxyRoutes(backends, mockTokenProvider, logger);

            const app = express();
            app.use(router);

            // After path stripping, backend receives /EntitySet (path prefix /sap/opu/odata is stripped)
            nock(destinationUrl)
                .get('/EntitySet')
                .matchHeader('authorization', 'Bearer mock-token')
                .reply(200, { value: [] });

            const server = supertest(app);
            const response = await server.get(`${path}/EntitySet`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ value: [] });
        });

        test('proxies request with query parameters', async () => {
            const backends = [
                {
                    url: destinationUrl,
                    paths: [path]
                }
            ];
            const router = setupProxyRoutes(backends, mockTokenProvider, logger);

            const app = express();
            app.use(router);

            // After path stripping, backend receives /EntitySet with query params
            nock(destinationUrl).get('/EntitySet').query({ $top: '10', $skip: '0' }).reply(200, { value: [] });

            const server = supertest(app);
            const response = await server.get(`${path}/EntitySet?$top=10&$skip=0`);

            expect(response.status).toBe(200);
        });

        test('handles non-proxied paths', async () => {
            const backends = [
                {
                    url: destinationUrl,
                    paths: [path]
                }
            ];
            const router = setupProxyRoutes(backends, mockTokenProvider, logger);

            const app = express();
            app.use(router);

            const server = supertest(app);
            const response = await server.get('/not/proxied/path');

            expect(response.status).toBe(404);
        });

        test('proxies request with pathRewrite', async () => {
            const backends = [
                {
                    url: destinationUrl,
                    paths: ['/resources/com/sap/apm'],
                    pathRewrite: '/api'
                }
            ];
            const router = setupProxyRoutes(backends, mockTokenProvider, logger);

            const app = express();
            app.use(router);

            // After path rewriting, /resources/com/sap/apm/v1/service becomes /api/v1/service
            nock(destinationUrl)
                .get('/api/v1/service')
                .matchHeader('authorization', 'Bearer mock-token')
                .reply(200, { success: true });

            const server = supertest(app);
            const response = await server.get('/resources/com/sap/apm/v1/service');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true });
        });
    });
});
