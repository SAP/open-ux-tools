import axios from 'axios';
import type { Request, Response } from 'express';

import type { ToolsLogger } from '@sap-ux/logger';

import { OAuthTokenProvider } from '../../src/token/provider';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OAuthTokenProvider', () => {
    const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    } as unknown as ToolsLogger;

    const clientId = 'test-client-id';
    const clientSecret = 'test-client-secret';
    const tokenEndpoint = '/uaa.example/oauth/token';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('constructor', () => {
        test('creates instance with correct parameters', () => {
            const provider = new OAuthTokenProvider(clientId, clientSecret, tokenEndpoint, logger);
            expect(provider).toBeInstanceOf(OAuthTokenProvider);
        });
    });

    describe('token fetching through middleware', () => {
        test('fetches new token on first call', async () => {
            const mockResponse = {
                data: {
                    access_token: 'new-access-token',
                    expires_in: 3600
                }
            };
            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            const provider = new OAuthTokenProvider(clientId, clientSecret, tokenEndpoint, logger);
            const middleware = provider.createTokenMiddleware();

            const req = {
                url: '/test',
                headers: {}
            } as Request;
            const res = {} as Response;
            const next = jest.fn();

            await middleware(req, res, next);

            expect(req.headers.authorization).toBe('Bearer new-access-token');
            expect(mockedAxios.post).toHaveBeenCalledWith(
                tokenEndpoint,
                expect.stringContaining('grant_type=client_credentials'),
                expect.objectContaining({
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                })
            );
        });

        test('returns cached token if not expired', async () => {
            const mockResponse = {
                data: {
                    access_token: 'cached-token',
                    expires_in: 3600
                }
            };
            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            const provider = new OAuthTokenProvider(clientId, clientSecret, tokenEndpoint, logger);
            const middleware = provider.createTokenMiddleware();

            const req1 = { url: '/test1', headers: {} } as Request;
            const req2 = { url: '/test2', headers: {} } as Request;
            const res = {} as Response;
            const next = jest.fn();

            await middleware(req1, res, next);
            await middleware(req2, res, next);

            expect(req1.headers.authorization).toBe('Bearer cached-token');
            expect(req2.headers.authorization).toBe('Bearer cached-token');
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        test('refreshes token when expired', async () => {
            const mockResponse1 = {
                data: {
                    access_token: 'first-token',
                    expires_in: 60 // 60 seconds
                }
            };
            const mockResponse2 = {
                data: {
                    access_token: 'second-token',
                    expires_in: 3600
                }
            };
            mockedAxios.post.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

            const provider = new OAuthTokenProvider(clientId, clientSecret, tokenEndpoint, logger);
            const middleware = provider.createTokenMiddleware();

            const req1 = { url: '/test1', headers: {} } as Request;
            const req2 = { url: '/test2', headers: {} } as Request;
            const res = {} as Response;
            const next = jest.fn();

            await middleware(req1, res, next);

            // Advance time past expiry (with buffer)
            jest.advanceTimersByTime(2000 * 1000); // 2000 seconds

            await middleware(req2, res, next);

            expect(req1.headers.authorization).toBe('Bearer first-token');
            expect(req2.headers.authorization).toBe('Bearer second-token');
            expect(mockedAxios.post).toHaveBeenCalledTimes(2);
        });

        test('throws error when token fetch fails', async () => {
            const error = new Error('Network error');
            mockedAxios.post.mockRejectedValueOnce(error);

            const provider = new OAuthTokenProvider(clientId, clientSecret, tokenEndpoint, logger);
            const middleware = provider.createTokenMiddleware();

            const req = { url: '/test', headers: {} } as Request;
            const res = {} as Response;
            const next = jest.fn();

            await middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.headers.authorization).toBeUndefined();
        });

        test('sends correct form data', async () => {
            const mockResponse = {
                data: {
                    access_token: 'test-token',
                    expires_in: 3600
                }
            };
            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            const provider = new OAuthTokenProvider(clientId, clientSecret, tokenEndpoint, logger);
            const middleware = provider.createTokenMiddleware();

            const req = { url: '/test', headers: {} } as Request;
            const res = {} as Response;
            const next = jest.fn();

            await middleware(req, res, next);

            const callArgs = mockedAxios.post.mock.calls[0];
            const formData = callArgs[1] as string;
            const params = new URLSearchParams(formData);

            expect(params.get('grant_type')).toBe('client_credentials');
            expect(params.get('client_id')).toBe(clientId);
            expect(params.get('client_secret')).toBe(clientSecret);
        });

        test('prevents concurrent token fetches - multiple requests wait for same in-flight fetch', async () => {
            const mockResponse = {
                data: {
                    access_token: 'shared-token',
                    expires_in: 3600
                }
            };

            // Create a delayed promise to simulate network latency
            let resolveTokenFetch: ((value: typeof mockResponse) => void) | undefined;
            const delayedTokenFetch = new Promise<typeof mockResponse>((resolve) => {
                resolveTokenFetch = resolve;
            });

            mockedAxios.post.mockImplementation(() => delayedTokenFetch);

            const provider = new OAuthTokenProvider(clientId, clientSecret, tokenEndpoint, logger);
            const middleware = provider.createTokenMiddleware();

            const req1 = { url: '/test1', headers: {} } as Request;
            const req2 = { url: '/test2', headers: {} } as Request;
            const req3 = { url: '/test3', headers: {} } as Request;
            const res = {} as Response;
            const next = jest.fn();

            // Start all three requests simultaneously (before token is cached)
            const promise1 = middleware(req1, res, next);
            const promise2 = middleware(req2, res, next);
            const promise3 = middleware(req3, res, next);

            expect(mockedAxios.post).toHaveBeenCalledTimes(1);

            if (!resolveTokenFetch) {
                throw new Error('resolveTokenFetch was not initialized');
            }
            resolveTokenFetch(mockResponse);

            await Promise.all([promise1, promise2, promise3]);

            expect(req1.headers.authorization).toBe('Bearer shared-token');
            expect(req2.headers.authorization).toBe('Bearer shared-token');
            expect(req3.headers.authorization).toBe('Bearer shared-token');

            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });
    });
});
