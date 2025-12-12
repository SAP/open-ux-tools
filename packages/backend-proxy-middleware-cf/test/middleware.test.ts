import express from 'express';
import supertest from 'supertest';
import type { ToolsLogger } from '@sap-ux/logger';

import * as proxy from '../src/proxy';
import * as middleware from '../src/middleware';
import * as validation from '../src/validation';
import * as tokenFactory from '../src/token/factory';
import type { CfOAuthMiddlewareConfig } from '../src/types';

jest.mock('../src/proxy');
jest.mock('../src/validation');
jest.mock('../src/token/factory');
jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    isLoggedInCf: jest.fn().mockResolvedValue(true),
    loadCfConfig: jest.fn().mockReturnValue({})
}));

jest.mock('@sap-ux/logger', () => ({
    ...jest.requireActual('@sap-ux/logger'),
    ToolsLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    } as unknown as ToolsLogger)
}));

const mockSetupProxyRoutes = proxy.setupProxyRoutes as jest.Mock;
const mockValidateConfig = validation.validateConfig as jest.Mock;
const mockCreateTokenProvider = tokenFactory.createTokenProvider as jest.Mock;

async function getTestServer(configuration: CfOAuthMiddlewareConfig): Promise<supertest.SuperTest<supertest.Test>> {
    const router = await (middleware as any).default({
        options: { configuration }
    });
    const app = express();
    app.use(router);
    return supertest(app);
}

describe('backend-proxy-middleware-cf', () => {
    const mockTokenProvider = {
        createTokenMiddleware: jest.fn().mockReturnValue((req: any, res: any, next: any) => next())
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockValidateConfig.mockResolvedValue(undefined);
        mockCreateTokenProvider.mockResolvedValue(mockTokenProvider);
        mockSetupProxyRoutes.mockReturnValue(express.Router());
    });

    describe('Middleware initialization', () => {
        const baseConfig: CfOAuthMiddlewareConfig = {
            url: '/backend.example',
            paths: ['/sap/opu/odata']
        };

        test('minimal configuration', async () => {
            await getTestServer(baseConfig);

            expect(mockValidateConfig).toHaveBeenCalledWith(baseConfig, expect.any(Object));
            expect(mockCreateTokenProvider).toHaveBeenCalledWith(baseConfig, expect.any(Object));
            expect(mockSetupProxyRoutes).toHaveBeenCalledWith(
                baseConfig.paths,
                baseConfig.url,
                mockTokenProvider,
                expect.any(Object)
            );
        });

        test('with debug enabled', async () => {
            const configWithDebug = { ...baseConfig, debug: true };
            await getTestServer(configWithDebug);

            expect(mockValidateConfig).toHaveBeenCalledWith(configWithDebug, expect.any(Object));
        });

        test('with credentials', async () => {
            const configWithCredentials: CfOAuthMiddlewareConfig = {
                ...baseConfig,
                credentials: {
                    clientId: 'test-client',
                    clientSecret: 'test-secret',
                    url: '/uaa.example'
                }
            };
            await getTestServer(configWithCredentials);

            expect(mockCreateTokenProvider).toHaveBeenCalledWith(configWithCredentials, expect.any(Object));
        });

        test('with multiple paths', async () => {
            const configWithMultiplePaths: CfOAuthMiddlewareConfig = {
                ...baseConfig,
                paths: ['/sap/opu/odata', '/sap/bc/ui5_ui5', '/api']
            };
            await getTestServer(configWithMultiplePaths);

            expect(mockSetupProxyRoutes).toHaveBeenCalledWith(
                configWithMultiplePaths.paths,
                configWithMultiplePaths.url,
                mockTokenProvider,
                expect.any(Object)
            );
        });

        test('throws error when validation fails', async () => {
            const config: CfOAuthMiddlewareConfig = {
                url: '/backend.example',
                paths: ['/sap/opu/odata']
            };
            const validationError = new Error('Validation failed');
            mockValidateConfig.mockRejectedValueOnce(validationError);

            await expect(getTestServer(config)).rejects.toThrow('Validation failed');
        });
    });
});
