import type { ToolsLogger } from '@sap-ux/logger';

import {
    getApprouterType,
    getModuleNames,
    getServicesForFile,
    hasApprouter,
    getMtaServices,
    getResources,
    readMta
} from '../../../../src/cf/project/mta';
import { initI18n, t } from '../../../../src/i18n';
import { requestCfApi } from '../../../../src/cf/services/cli';
import { getRouterType } from '../../../../src/cf/project/yaml';
import { getYamlContent } from '../../../../src/cf/project/yaml-loader';

jest.mock('../../../../src/cf/project/yaml', () => ({
    getRouterType: jest.fn()
}));

jest.mock('../../../../src/cf/project/yaml-loader', () => ({
    getYamlContent: jest.fn()
}));

jest.mock('../../../../src/cf/services/cli', () => ({
    requestCfApi: jest.fn()
}));

const mockRequestCfApi = requestCfApi as jest.MockedFunction<typeof requestCfApi>;
const mockGetRouterType = getRouterType as jest.MockedFunction<typeof getRouterType>;
const mockGetYamlContent = getYamlContent as jest.MockedFunction<typeof getYamlContent>;

const mtaProjectPath = '/test/project';
const mtaFilePath = '/test/mta.yaml';

describe('MTA Project Functions', () => {
    const mockLogger = {
        log: jest.fn()
    } as unknown as ToolsLogger;

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getApprouterType', () => {
        test('should return approuter type from yaml content', () => {
            const expectedType = 'Standalone HTML5 Application Runtime';
            const mockYamlContent = { modules: [] };

            mockGetYamlContent.mockReturnValue(mockYamlContent);
            mockGetRouterType.mockReturnValue(expectedType);

            const result = getApprouterType(mtaProjectPath);

            expect(mockGetRouterType).toHaveBeenCalledWith(mockYamlContent);
            expect(result).toBe(expectedType);
        });
    });

    describe('getModuleNames', () => {
        test('should return module names from yaml content', () => {
            const mockYamlContent = {
                modules: [{ name: 'module1' }, { name: 'module2' }]
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);

            const result = getModuleNames(mtaProjectPath);

            expect(result).toEqual(['module1', 'module2']);
        });

        test('should return empty array when no modules exist', () => {
            const mockYamlContent = {};

            mockGetYamlContent.mockReturnValue(mockYamlContent);

            const result = getModuleNames(mtaProjectPath);

            expect(result).toEqual([]);
        });
    });

    describe('getServicesForFile', () => {
        test('should extract services from mta file', () => {
            const mockYamlContent = {
                resources: [
                    {
                        name: 'service1',
                        parameters: {
                            'service-name': 'custom-service-name',
                            service: 'business-service'
                        }
                    },
                    {
                        name: 'service2',
                        parameters: {
                            service: 'another-service'
                        }
                    }
                ]
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);

            const result = getServicesForFile(mtaFilePath, mockLogger);

            expect(mockGetYamlContent).toHaveBeenCalledWith(mtaFilePath);
            expect(result).toEqual([
                { name: 'custom-service-name', label: 'business-service' },
                { name: 'service2', label: 'another-service' }
            ]);
        });

        test('should log warning for service without label', () => {
            const mockYamlContent = {
                resources: [
                    {
                        name: 'service1',
                        parameters: {
                            'service-name': 'service-name'
                            // No 'service' parameter
                        }
                    }
                ]
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);

            const result = getServicesForFile(mtaFilePath, mockLogger);

            expect(mockLogger.log).toHaveBeenCalledWith(
                "Service 'service-name' will be ignored without 'service' parameter"
            );
            expect(result).toEqual([{ name: 'service-name', label: undefined }]);
        });

        test('should return empty array when no resources exist', () => {
            const mockYamlContent = {};

            mockGetYamlContent.mockReturnValue(mockYamlContent);

            const result = getServicesForFile(mtaFilePath, mockLogger);

            expect(result).toEqual([]);
        });

        test('should return empty array when resources is not an array', () => {
            const mockYamlContent = {
                resources: 'not-an-array'
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);

            const result = getServicesForFile(mtaFilePath, mockLogger);

            expect(result).toEqual([]);
        });
    });

    describe('hasApprouter', () => {
        const projectName = 'MyProject';

        test('should return true when approuter module exists', () => {
            const moduleNames = ['myproject-approuter', 'other-module'];

            const result = hasApprouter(projectName, moduleNames);

            expect(result).toBe(true);
        });

        test('should return true when destination-content module exists', () => {
            const moduleNames = ['myproject-destination-content', 'other-module'];

            const result = hasApprouter(projectName, moduleNames);

            expect(result).toBe(true);
        });

        test('should return false when no approuter modules exist', () => {
            const moduleNames = ['other-module', 'another-module'];

            const result = hasApprouter(projectName, moduleNames);

            expect(result).toBe(false);
        });

        test('should return false when module names array is empty', () => {
            const moduleNames: string[] = [];

            const result = hasApprouter(projectName, moduleNames);

            expect(result).toBe(false);
        });
    });

    describe('getMtaServices', () => {
        test('should return services from readMta', async () => {
            const projectPath = '/test/project';
            const expectedServices = ['service1', 'service2'];

            mockGetYamlContent.mockReturnValue({
                resources: [
                    {
                        name: 'service1',
                        parameters: { service: 'business-service1' }
                    },
                    {
                        name: 'service2',
                        parameters: { service: 'business-service2' }
                    }
                ]
            });
            mockRequestCfApi.mockResolvedValue({
                resources: [
                    {
                        name: 'business-service1',
                        broker_catalog: {
                            metadata: {
                                sapservice: { odataversion: 'v2' }
                            }
                        }
                    },
                    {
                        name: 'business-service2',
                        broker_catalog: {
                            metadata: {
                                sapservice: { odataversion: 'v4' }
                            }
                        }
                    }
                ]
            });

            const result = await getMtaServices(projectPath, mockLogger);

            expect(mockLogger.log).toHaveBeenCalledWith(
                expect.stringContaining('Available services defined in mta.yaml:')
            );
            expect(result).toEqual(expectedServices);
        });
    });

    describe('getResources', () => {
        test('should filter and return OData services', async () => {
            const mockYamlContent = {
                resources: [
                    {
                        name: 'service1',
                        parameters: { service: 'business-service1' }
                    },
                    {
                        name: 'service2',
                        parameters: { service: 'business-service2' }
                    }
                ]
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);
            mockRequestCfApi.mockResolvedValue({
                resources: [
                    {
                        name: 'business-service1',
                        broker_catalog: {
                            metadata: {
                                sapservice: { odataversion: 'v2' }
                            }
                        }
                    },
                    {
                        name: 'business-service2',
                        broker_catalog: {
                            metadata: {
                                sapservice: { odataversion: 'v4' }
                            }
                        }
                    }
                ]
            });

            const result = await getResources(mtaFilePath, mockLogger);

            expect(mockRequestCfApi).toHaveBeenCalledWith(
                '/v3/service_offerings?names=business-service1,business-service2'
            );
            expect(result).toEqual(['service1', 'service2']);
        });

        test('should throw error when no business services found', async () => {
            const mockYamlContent = {
                resources: [
                    {
                        name: 'service1',
                        parameters: { 'service-name': 'service1' }
                        // No 'service' parameter
                    }
                ]
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);

            await expect(getResources(mtaFilePath, mockLogger)).rejects.toThrow(t('error.noBusinessServicesFound'));
        });

        test('should log and ignore services without OData support', async () => {
            const mockYamlContent = {
                resources: [
                    {
                        name: 'service1',
                        parameters: { service: 'business-service1' }
                    }
                ]
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);
            mockRequestCfApi.mockResolvedValue({
                resources: [
                    {
                        name: 'business-service1',
                        broker_catalog: {
                            metadata: {
                                sapservice: { odataversion: 'unknown' } // Not v2/v4
                            }
                        }
                    }
                ]
            });

            await expect(getResources(mtaFilePath, mockLogger)).rejects.toThrow(t('error.noBusinessServicesFound'));
            expect(mockLogger.log).toHaveBeenCalledWith(
                "Service 'business-service1' doesn't support V2/V4 Odata and will be ignored"
            );
        });
    });

    describe('readMta', () => {
        test('should throw error when project path is empty', async () => {
            await expect(readMta('', mockLogger)).rejects.toThrow(t('error.mtaProjectPathMissing'));
        });

        test('should successfully read MTA and return resources', async () => {
            const projectPath = '/test/project';
            const mockYamlContent = {
                resources: [
                    {
                        name: 'service1',
                        parameters: { service: 'business-service1' }
                    }
                ]
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);
            mockRequestCfApi.mockResolvedValue({
                resources: [
                    {
                        name: 'business-service1',
                        broker_catalog: {
                            metadata: {
                                sapservice: { odataversion: 'v2' }
                            }
                        }
                    }
                ]
            });

            const result = await readMta(projectPath, mockLogger);

            expect(result).toEqual(['service1']);
        });
    });
});
