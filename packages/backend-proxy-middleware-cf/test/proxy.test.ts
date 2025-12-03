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
            const options = createProxyOptions(targetUrl, logger);

            expect(options.target).toBe(targetUrl);
            expect(options.changeOrigin).toBe(true);
            expect(options.pathRewrite).toBeDefined();
            expect(options.on).toBeDefined();
            expect(options.on?.error).toBeDefined();
        });

        test('pathRewrite uses originalUrl when available', () => {
            const options = createProxyOptions(targetUrl, logger);
            const pathRewrite = options.pathRewrite as Function;

            const req = {
                originalUrl: '/sap/opu/odata/srv/EntitySet',
                url: '/srv/EntitySet'
            };

            const result = pathRewrite('/srv/EntitySet', req);
            expect(result).toBe('/sap/opu/odata/srv/EntitySet');
        });

        test('pathRewrite uses req.url when originalUrl is not available', () => {
            const options = createProxyOptions(targetUrl, logger);
            const pathRewrite = options.pathRewrite as Function;

            const req = {
                url: '/srv/EntitySet'
            };

            const result = pathRewrite('/srv/EntitySet', req);
            expect(result).toBe('/srv/EntitySet');
        });

        test('pathRewrite preserves query string', () => {
            const options = createProxyOptions(targetUrl, logger);
            const pathRewrite = options.pathRewrite as Function;

            const req = {
                originalUrl: '/sap/opu/odata/srv/EntitySet?$top=10&$skip=0',
                url: '/srv/EntitySet?$top=10&$skip=0'
            };

            const result = pathRewrite('/srv/EntitySet?$top=10&$skip=0', req);
            expect(result).toBe('/sap/opu/odata/srv/EntitySet?$top=10&$skip=0');
        });

        test('error handler logs error and calls next if available', () => {
            const options = createProxyOptions(targetUrl, logger);
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
            const options = createProxyOptions(targetUrl, logger);
            const errorHandler = options.on?.error as Function;

            const error = new Error('Proxy error');
            const req = {
                originalUrl: '/sap/opu/odata',
                url: '/sap/opu/odata'
            };
            const res = {};

            expect(() => errorHandler(error, req, res, targetUrl)).not.toThrow();
        });
    });

    describe('registerProxyRoute', () => {
        test('registers proxy route successfully', () => {
            const router = Router();
            const path = '/sap/opu/odata';
            const destinationUrl = '/backend.example';

            registerProxyRoute(path, destinationUrl, mockTokenProvider, logger, router);

            expect(mockTokenProvider.createTokenMiddleware).toHaveBeenCalled();
            expect(router.stack.length).toBeGreaterThan(0);
        });
    });

    describe('setupProxyRoutes', () => {
        test('sets up multiple proxy routes', () => {
            const paths = ['/sap/opu/odata', '/sap/bc/ui5_ui5', '/api'];
            const destinationUrl = '/backend.example';

            const router = setupProxyRoutes(paths, destinationUrl, mockTokenProvider, logger);

            expect(typeof router).toBe('function');
            expect(router.use).toBeDefined();
            expect(mockTokenProvider.createTokenMiddleware).toHaveBeenCalledTimes(paths.length);
        });

        test('throws error when route registration fails', () => {
            const paths = ['/sap/opu/odata'];
            const destinationUrl = '/backend.example';
            const failingTokenProvider = {
                createTokenMiddleware: jest.fn().mockImplementation(() => {
                    throw new Error('Token middleware creation failed');
                })
            } as unknown as OAuthTokenProvider;

            expect(() => {
                setupProxyRoutes(paths, destinationUrl, failingTokenProvider, logger);
            }).toThrow('Failed to register proxy for /sap/opu/odata');
        });

        test('handles empty paths array', () => {
            const paths: string[] = [];
            const destinationUrl = '/backend.example';

            const router = setupProxyRoutes(paths, destinationUrl, mockTokenProvider, logger);

            expect(typeof router).toBe('function');
            expect(router.use).toBeDefined();
            expect(router.stack.length).toBe(0);
        });
    });

    describe('integration tests', () => {
        const path = '/sap/opu/odata';
        const destinationUrl = 'https://backend.example';

        test('proxies request with token middleware', async () => {
            const router = setupProxyRoutes([path], destinationUrl, mockTokenProvider, logger);

            const app = express();
            app.use(router);

            nock(destinationUrl)
                .get(`${path}/EntitySet`)
                .matchHeader('authorization', 'Bearer mock-token')
                .reply(200, { value: [] });

            const server = supertest(app);
            const response = await server.get(`${path}/EntitySet`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ value: [] });
        });

        test('proxies request with query parameters', async () => {
            const router = setupProxyRoutes([path], destinationUrl, mockTokenProvider, logger);

            const app = express();
            app.use(router);

            nock(destinationUrl).get(`${path}/EntitySet`).query({ $top: '10', $skip: '0' }).reply(200, { value: [] });

            const server = supertest(app);
            const response = await server.get(`${path}/EntitySet?$top=10&$skip=0`);

            expect(response.status).toBe(200);
        });

        test('handles non-proxied paths', async () => {
            const router = setupProxyRoutes([path], destinationUrl, mockTokenProvider, logger);

            const app = express();
            app.use(router);

            const server = supertest(app);
            const response = await server.get('/not/proxied/path');

            expect(response.status).toBe(404);
        });
    });
});
