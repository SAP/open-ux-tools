import type { ToolsLogger } from '@sap-ux/logger';
import { isLoggedInCf, loadCfConfig } from '@sap-ux/adp-tooling';

import { validateConfig } from '../src/validation';
import type { CfOAuthMiddlewareConfig } from '../src/types';

jest.mock('@sap-ux/adp-tooling', () => ({
    ...(jest.requireActual('@sap-ux/adp-tooling') as object),
    isLoggedInCf: jest.fn(),
    loadCfConfig: jest.fn()
}));

const mockIsLoggedInCf = isLoggedInCf as jest.Mock;
const mockLoadCfConfig = loadCfConfig as jest.Mock;

describe('validation', () => {
    const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    } as unknown as ToolsLogger;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLoadCfConfig.mockReturnValue({});
        mockIsLoggedInCf.mockResolvedValue(true);
    });

    describe('validateConfig', () => {
        test('validates successfully with valid config', async () => {
            const config: CfOAuthMiddlewareConfig = {
                backends: [
                    {
                        url: '/backend.example',
                        paths: ['/sap/opu/odata']
                    }
                ]
            };

            await expect(validateConfig(config, logger)).resolves.not.toThrow();
            expect(mockLoadCfConfig).toHaveBeenCalledWith(logger);
            expect(mockIsLoggedInCf).toHaveBeenCalledWith({}, logger);
        });

        test('throws error when url is empty string', async () => {
            const config: CfOAuthMiddlewareConfig = {
                backends: [
                    {
                        url: '',
                        paths: ['/sap/opu/odata']
                    }
                ]
            };

            await expect(validateConfig(config, logger)).rejects.toThrow(
                'Backend proxy middleware (CF) requires url for each backend.'
            );
        });

        test('throws error when backends array is missing', async () => {
            const config = {} as CfOAuthMiddlewareConfig;

            await expect(validateConfig(config, logger)).rejects.toThrow(
                'Backend proxy middleware (CF) requires "backends" array configuration.'
            );
        });

        test('throws error when backends is not an array', async () => {
            const config = {
                backends: 'not-an-array'
            } as unknown as CfOAuthMiddlewareConfig;

            await expect(validateConfig(config, logger)).rejects.toThrow(
                'Backend proxy middleware (CF) requires "backends" array configuration.'
            );
        });

        test('throws error when backends array is empty', async () => {
            const config: CfOAuthMiddlewareConfig = {
                backends: []
            };

            await expect(validateConfig(config, logger)).rejects.toThrow(
                'Backend proxy middleware (CF) requires "backends" array configuration.'
            );
        });

        test('throws error when backend missing url property', async () => {
            const config = {
                backends: [
                    {
                        paths: ['/sap/opu/odata']
                    }
                ]
            } as unknown as CfOAuthMiddlewareConfig;

            await expect(validateConfig(config, logger)).rejects.toThrow(
                'Backend proxy middleware (CF) requires url for each backend.'
            );
        });

        test('throws error when backend missing paths property', async () => {
            const config = {
                backends: [
                    {
                        url: '/backend.example'
                    }
                ]
            } as unknown as CfOAuthMiddlewareConfig;

            await expect(validateConfig(config, logger)).rejects.toThrow(
                'Backend proxy middleware (CF) has no paths configured for URL: /backend.example'
            );
        });

        test('throws error when paths is empty array', async () => {
            const config: CfOAuthMiddlewareConfig = {
                backends: [
                    {
                        url: '/backend.example',
                        paths: []
                    }
                ]
            };

            await expect(validateConfig(config, logger)).rejects.toThrow(
                'Backend proxy middleware (CF) has no paths configured for URL: /backend.example'
            );
        });

        test('throws error when paths is not an array', async () => {
            const config = {
                backends: [
                    {
                        url: '/backend.example',
                        paths: 'not-an-array'
                    }
                ]
            } as unknown as CfOAuthMiddlewareConfig;

            await expect(validateConfig(config, logger)).rejects.toThrow(
                'Backend proxy middleware (CF) has no paths configured for URL: /backend.example'
            );
        });

        test('throws error when user is not logged in to CF', async () => {
            const config: CfOAuthMiddlewareConfig = {
                backends: [
                    {
                        url: '/backend.example',
                        paths: ['/sap/opu/odata']
                    }
                ]
            };
            mockIsLoggedInCf.mockResolvedValue(false);

            await expect(validateConfig(config, logger)).rejects.toThrow('User is not logged in to Cloud Foundry.');
        });

        test('validates successfully with multiple paths', async () => {
            const config: CfOAuthMiddlewareConfig = {
                backends: [
                    {
                        url: '/backend.example',
                        paths: ['/sap/opu/odata', '/sap/bc/ui5_ui5', '/api']
                    }
                ]
            };

            await expect(validateConfig(config, logger)).resolves.not.toThrow();
        });

        test('validates successfully with multiple backends', async () => {
            const config: CfOAuthMiddlewareConfig = {
                backends: [
                    {
                        url: '/backend1.example',
                        paths: ['/sap/opu/odata']
                    },
                    {
                        url: '/backend2.example',
                        paths: ['/api/v1', '/api/v2']
                    }
                ]
            };

            await expect(validateConfig(config, logger)).resolves.not.toThrow();
        });

        test('throws error when one of multiple backends is invalid', async () => {
            const config: CfOAuthMiddlewareConfig = {
                backends: [
                    {
                        url: '/backend1.example',
                        paths: ['/sap/opu/odata']
                    },
                    {
                        url: '/backend2.example',
                        paths: []
                    }
                ]
            };

            await expect(validateConfig(config, logger)).rejects.toThrow(
                'Backend proxy middleware (CF) has no paths configured for URL: /backend2.example'
            );
        });
    });
});
