import type { ToolsLogger } from '@sap-ux/logger';
import { readUi5Yaml, FileName } from '@sap-ux/project-access';
import { extractCfBuildTask, getOrCreateServiceKeys } from '@sap-ux/adp-tooling';

import {
    createManagerFromServiceKeys,
    createManagerFromDirectCredentials,
    createTokenProvider,
    createManagerFromCfAdpProject
} from '../../src/token/factory';
import { OAuthTokenProvider } from '../../src/token/provider';
import type { CfOAuthMiddlewareConfig } from '../../src/types';

jest.mock('@sap-ux/adp-tooling', () => ({
    ...(jest.requireActual('@sap-ux/adp-tooling') as object),
    extractCfBuildTask: jest.fn(),
    getOrCreateServiceKeys: jest.fn()
}));

jest.mock('@sap-ux/project-access', () => ({
    ...(jest.requireActual('@sap-ux/project-access') as object),
    readUi5Yaml: jest.fn()
}));

const mockExtractCfBuildTask = extractCfBuildTask as jest.Mock;
const mockGetOrCreateServiceKeys = getOrCreateServiceKeys as jest.Mock;
const mockReadUi5Yaml = readUi5Yaml as jest.Mock;

describe('token factory', () => {
    const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    } as unknown as ToolsLogger;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createManagerFromServiceKeys', () => {
        test('creates provider from valid service keys', () => {
            const serviceKeys = {
                credentials: {
                    uaa: {
                        url: '/uaa.example',
                        clientid: 'test-client-id',
                        clientsecret: 'test-client-secret'
                    }
                }
            };

            const provider = createManagerFromServiceKeys(serviceKeys as any, logger);

            expect(provider).toBeInstanceOf(OAuthTokenProvider);
        });

        test('throws error when UAA URL is missing', () => {
            const serviceKeys = {
                credentials: {
                    uaa: {
                        clientid: 'test-client-id',
                        clientsecret: 'test-client-secret'
                    }
                }
            };

            expect(() => {
                createManagerFromServiceKeys(serviceKeys as any, logger);
            }).toThrow('Invalid credentials: missing UAA URL');
        });

        test('throws error when client ID is missing', () => {
            const serviceKeys = {
                credentials: {
                    uaa: {
                        url: '/uaa.example',
                        clientsecret: 'test-client-secret'
                    }
                }
            };

            expect(() => {
                createManagerFromServiceKeys(serviceKeys as any, logger);
            }).toThrow('Invalid credentials: missing client ID');
        });

        test('throws error when client secret is missing', () => {
            const serviceKeys = {
                credentials: {
                    uaa: {
                        url: '/uaa.example',
                        clientid: 'test-client-id'
                    }
                }
            };

            expect(() => {
                createManagerFromServiceKeys(serviceKeys as any, logger);
            }).toThrow('Invalid credentials: missing client secret');
        });
    });

    describe('createManagerFromDirectCredentials', () => {
        test('creates provider from direct credentials', () => {
            const clientId = 'test-client-id';
            const clientSecret = 'test-client-secret';
            const baseUrl = '/uaa.example';

            const provider = createManagerFromDirectCredentials(clientId, clientSecret, baseUrl, logger);

            expect(provider).toBeInstanceOf(OAuthTokenProvider);
            expect(provider['tokenEndpoint']).toBe(`${baseUrl}/oauth/token`);
        });
    });

    describe('createTokenProvider', () => {
        test('creates provider from credentials in config', async () => {
            const config: CfOAuthMiddlewareConfig = {
                url: '/backend.example',
                paths: ['/sap/opu/odata'],
                credentials: {
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret',
                    url: '/uaa.example'
                }
            };

            const provider = await createTokenProvider(config, logger);

            expect(provider).toBeInstanceOf(OAuthTokenProvider);
            expect(provider['tokenEndpoint']).toBe(`${config.credentials?.url}/oauth/token`);
        });

        test('creates provider from CF ADP project when credentials not provided', async () => {
            const config: CfOAuthMiddlewareConfig = {
                url: '/backend.example',
                paths: ['/sap/opu/odata']
            };

            const mockUi5Yaml = {
                builder: {
                    customTasks: [
                        {
                            name: 'app-variant-bundler-build',
                            configuration: {
                                serviceInstanceName: 'test-service',
                                serviceInstanceGuid: 'test-guid'
                            }
                        }
                    ]
                }
            };

            const mockServiceKeys = [
                {
                    credentials: {
                        uaa: {
                            url: '/uaa.example',
                            clientid: 'test-client-id',
                            clientsecret: 'test-client-secret'
                        }
                    }
                }
            ];

            mockReadUi5Yaml.mockResolvedValueOnce(mockUi5Yaml);
            mockExtractCfBuildTask.mockReturnValueOnce({
                serviceInstanceName: 'test-service',
                serviceInstanceGuid: 'test-guid'
            });
            mockGetOrCreateServiceKeys.mockResolvedValueOnce(mockServiceKeys);

            const provider = await createTokenProvider(config, logger);

            expect(provider).toBeInstanceOf(OAuthTokenProvider);
            expect(provider['tokenEndpoint']).toBe('/uaa.example/oauth/token');
            expect(mockReadUi5Yaml).toHaveBeenCalledWith(process.cwd(), FileName.Ui5Yaml);
            expect(mockExtractCfBuildTask).toHaveBeenCalledWith(mockUi5Yaml);
            expect(mockGetOrCreateServiceKeys).toHaveBeenCalledWith(
                {
                    name: 'test-service',
                    guid: 'test-guid'
                },
                logger
            );
        });

        test('throws error when service instance name is missing', async () => {
            const config: CfOAuthMiddlewareConfig = {
                url: '/backend.example',
                paths: ['/sap/opu/odata']
            };

            const mockUi5Yaml = {
                builder: {
                    customTasks: [
                        {
                            name: 'app-variant-bundler-build',
                            configuration: {}
                        }
                    ]
                }
            };

            mockReadUi5Yaml.mockResolvedValueOnce(mockUi5Yaml);
            mockExtractCfBuildTask.mockReturnValueOnce({
                serviceInstanceName: undefined,
                serviceInstanceGuid: 'test-guid'
            });

            await expect(createTokenProvider(config, logger)).rejects.toThrow(
                'No service instance name or guid found in CF adaptation project build task'
            );
        });

        test('throws error when no service keys found', async () => {
            const config: CfOAuthMiddlewareConfig = {
                url: '/backend.example',
                paths: ['/sap/opu/odata']
            };

            const mockUi5Yaml = {
                builder: {
                    customTasks: [
                        {
                            name: 'app-variant-bundler-build',
                            configuration: {}
                        }
                    ]
                }
            };

            mockReadUi5Yaml.mockResolvedValueOnce(mockUi5Yaml);
            mockExtractCfBuildTask.mockReturnValueOnce({
                serviceInstanceName: 'test-service',
                serviceInstanceGuid: 'test-guid'
            });
            mockGetOrCreateServiceKeys.mockResolvedValueOnce([]);

            await expect(createTokenProvider(config, logger)).rejects.toThrow(
                'No service keys found for CF ADP project'
            );
        });
    });

    describe('createManagerFromCfAdpProject', () => {
        test('creates provider from CF ADP project', async () => {
            const projectPath = '/test/project';
            const mockUi5Yaml = {
                builder: {
                    customTasks: [
                        {
                            name: 'app-variant-bundler-build',
                            configuration: {
                                serviceInstanceName: 'test-service',
                                serviceInstanceGuid: 'test-guid'
                            }
                        }
                    ]
                }
            };

            const mockServiceKeys = [
                {
                    credentials: {
                        uaa: {
                            url: '/uaa.example',
                            clientid: 'test-client-id',
                            clientsecret: 'test-client-secret'
                        }
                    }
                }
            ];

            mockReadUi5Yaml.mockResolvedValueOnce(mockUi5Yaml);
            mockExtractCfBuildTask.mockReturnValueOnce({
                serviceInstanceName: 'test-service',
                serviceInstanceGuid: 'test-guid'
            });
            mockGetOrCreateServiceKeys.mockResolvedValueOnce(mockServiceKeys);

            const provider = await createManagerFromCfAdpProject(projectPath, logger);

            expect(provider).toBeInstanceOf(OAuthTokenProvider);
            expect(provider['tokenEndpoint']).toBe('/uaa.example/oauth/token');
            expect(mockReadUi5Yaml).toHaveBeenCalledWith(projectPath, FileName.Ui5Yaml);
        });
    });
});
