import axios from 'axios';
import { readFileSync } from 'node:fs';
import * as CFLocal from '@sap/cf-tools/out/src/cf-local';
import * as CFToolsCli from '@sap/cf-tools/out/src/cli';

import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';

import {
    getBusinessServiceKeys,
    getFDCApps,
    getFDCRequestArguments,
    createServiceInstance,
    getServiceNameByTags,
    createServices,
    getServiceInstanceKeys
} from '../../../../src/cf/services/api';
import { initI18n, t } from '../../../../src/i18n';
import { isLoggedInCf } from '../../../../src/cf/core/auth';
import { getProjectNameForXsSecurity } from '../../../../src/cf/project';
import type { CfConfig, ServiceKeys, MtaYaml } from '../../../../src/types';
import { getServiceKeys, createServiceKey, requestCfApi } from '../../../../src/cf/services/cli';

jest.mock('fs', () => ({
    readFileSync: jest.fn()
}));
jest.mock('axios');
jest.mock('@sap/cf-tools/out/src/cf-local', () => ({
    cfGetServiceKeys: jest.fn(),
    cfCreateServiceKey: jest.fn(),
    cfGetAvailableOrgs: jest.fn()
}));
jest.mock('@sap/cf-tools/out/src/cli', () => ({
    Cli: {
        execute: jest.fn()
    }
}));
jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));
jest.mock('../../../../src/cf/core/auth', () => ({
    isLoggedInCf: jest.fn()
}));
jest.mock('../../../../src/cf/services/cli', () => ({
    getServiceKeys: jest.fn(),
    createServiceKey: jest.fn(),
    requestCfApi: jest.fn()
}));
jest.mock('../../../../src/cf/project', () => ({
    getProjectNameForXsSecurity: jest.fn()
}));

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockCFLocal = CFLocal as jest.Mocked<typeof CFLocal>;
const mockCFToolsCli = CFToolsCli as jest.Mocked<typeof CFToolsCli>;
const mockIsAppStudio = isAppStudio as jest.MockedFunction<typeof isAppStudio>;
const mockRequestCfApi = requestCfApi as jest.MockedFunction<typeof requestCfApi>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockIsLoggedInCf = isLoggedInCf as jest.MockedFunction<typeof isLoggedInCf>;
const mockGetServiceKeys = getServiceKeys as jest.MockedFunction<typeof getServiceKeys>;
const mockCreateServiceKey = createServiceKey as jest.MockedFunction<typeof createServiceKey>;
const mockCFToolsCliExecute = mockCFToolsCli.Cli.execute as jest.MockedFunction<typeof mockCFToolsCli.Cli.execute>;
const mockCfGetAvailableOrgs = mockCFLocal.cfGetAvailableOrgs as jest.MockedFunction<
    typeof mockCFLocal.cfGetAvailableOrgs
>;
const mockGetProjectNameForXsSecurity = getProjectNameForXsSecurity as jest.MockedFunction<
    typeof getProjectNameForXsSecurity
>;

describe('CF Services API', () => {
    const mockLogger = {
        log: jest.fn(),
        error: jest.fn()
    } as unknown as ToolsLogger;

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getBusinessServiceKeys', () => {
        test('should return service keys when service instance is found', async () => {
            const businessService = 'test-service';
            const config: CfConfig = {
                org: { GUID: 'test-org-guid', Name: 'test-org' },
                space: { GUID: 'test-space-guid', Name: 'test-space' },
                url: 'test.cf.com',
                token: 'test-token'
            };

            const mockServiceKeys: ServiceKeys = {
                credentials: [
                    {
                        clientid: 'test-client-id',
                        clientsecret: 'test-client-secret',
                        url: 'test-url',
                        uaa: {
                            clientid: 'test-uaa-clientid',
                            clientsecret: 'test-uaa-clientsecret',
                            url: 'test-uaa-url'
                        },
                        uri: 'test-uri',
                        endpoints: {}
                    }
                ],
                serviceInstance: {
                    name: 'test-service',
                    guid: 'test-guid'
                }
            };

            mockRequestCfApi.mockResolvedValue({
                resources: [
                    {
                        name: 'test-service',
                        guid: 'test-guid'
                    }
                ]
            });
            mockGetServiceKeys.mockResolvedValue(mockServiceKeys.credentials);

            const result = await getBusinessServiceKeys(businessService, config, mockLogger);

            expect(result).toEqual(mockServiceKeys);
            expect(mockLogger.log).toHaveBeenCalledWith(
                `Available service key instance : ${JSON.stringify(mockServiceKeys.serviceInstance)}`
            );
        });

        test('should return null when no service instance is found', async () => {
            const businessService = 'test-service';
            const config: CfConfig = {
                org: { GUID: 'test-org-guid', Name: 'test-org' },
                space: { GUID: 'test-space-guid', Name: 'test-space' },
                url: 'test.cf.com',
                token: 'test-token'
            };

            mockRequestCfApi.mockResolvedValue({ resources: [] });

            const result = await getBusinessServiceKeys(businessService, config, mockLogger);

            expect(result).toBeNull();
        });
    });

    describe('getFDCApps', () => {
        test('should return FDC apps successfully', async () => {
            const config: CfConfig = {
                org: { GUID: 'test-org-guid', Name: 'test-org' },
                space: { GUID: 'test-space-guid', Name: 'test-space' },
                url: 'test.cf.com',
                token: 'test-token'
            };
            const mockApps = [
                { name: 'app1', guid: 'guid1' },
                { name: 'app2', guid: 'guid2' }
            ];

            mockIsAppStudio.mockReturnValue(false);
            mockIsLoggedInCf.mockResolvedValue(true);
            mockCfGetAvailableOrgs.mockResolvedValue([{ name: 'test-org', guid: 'test-org-guid' }]);
            mockAxios.get.mockResolvedValue({
                data: { results: mockApps },
                status: 200
            });

            const result = await getFDCApps(['test-app-host-id'], config, mockLogger);

            expect(result).toEqual(mockApps);
            expect(mockAxios.get).toHaveBeenCalledWith(
                'https://ui5-flexibility-design-and-configuration.sapui5flex.cfapps.test.cf.com/api/business-service/discovery?appHostId=test-app-host-id',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token'
                    } as Record<string, string>)
                } as Record<string, unknown>)
            );
        });

        test('should handle non-200 response status', async () => {
            const config: CfConfig = {
                org: { GUID: 'test-org-guid', Name: 'test-org' },
                space: { GUID: 'test-space-guid', Name: 'test-space' },
                url: 'test.cf.com',
                token: 'test-token'
            };

            mockIsAppStudio.mockReturnValue(false);
            mockIsLoggedInCf.mockResolvedValue(true);
            mockCfGetAvailableOrgs.mockResolvedValue([{ name: 'test-org', guid: 'test-org-guid' }]);
            mockAxios.get.mockResolvedValue({
                data: { results: [] },
                status: 404
            });

            await expect(getFDCApps(['test-app-host-id'], config, mockLogger)).rejects.toThrow(
                t('error.failedToGetFDCApps', {
                    error: t('error.failedToConnectToFDCService', { status: 404 })
                })
            );
        });

        test('should handle axios error', async () => {
            const errorMsg = 'Network error';
            const config: CfConfig = {
                org: { GUID: 'test-org-guid', Name: 'test-org' },
                space: { GUID: 'test-space-guid', Name: 'test-space' },
                url: 'test.cf.com',
                token: 'test-token'
            };

            mockIsAppStudio.mockReturnValue(false);
            mockIsLoggedInCf.mockResolvedValue(true);
            mockCfGetAvailableOrgs.mockResolvedValue([{ name: 'test-org', guid: 'test-org-guid' }]);
            mockAxios.get.mockRejectedValue(new Error(errorMsg));

            await expect(getFDCApps(['test-app-host-id'], config, mockLogger)).rejects.toThrow(
                t('error.failedToGetFDCApps', {
                    error: errorMsg
                })
            );
        });
    });

    describe('getFDCRequestArguments', () => {
        test('should return correct arguments for public cloud in BAS environment', () => {
            const config: CfConfig = {
                org: { GUID: 'test-org-guid', Name: 'test-org' },
                space: { GUID: 'test-space-guid', Name: 'test-space' },
                url: 'us10.hana.ondemand.com',
                token: 'test-token'
            };

            mockIsAppStudio.mockReturnValue(true);

            const result = getFDCRequestArguments(config);

            expect(result.url).toBe(
                'https://ui5-flexibility-design-and-configuration.cert.cfapps.us10.hana.ondemand.com'
            );
            expect(result.options.withCredentials).toBe(true);
            expect(result.options.headers!['Content-Type']).toBe('application/json');
            expect(result.options.headers!['Authorization']).toBeUndefined();
        });

        test('should return correct arguments for public cloud in non-BAS environment', () => {
            const config: CfConfig = {
                org: { GUID: 'test-org-guid', Name: 'test-org' },
                space: { GUID: 'test-space-guid', Name: 'test-space' },
                url: 'eu10.hana.ondemand.com',
                token: 'test-token'
            };

            mockIsAppStudio.mockReturnValue(false);

            const result = getFDCRequestArguments(config);

            expect(result.url).toBe(
                'https://ui5-flexibility-design-and-configuration.cert.cfapps.eu10.hana.ondemand.com'
            );
            expect(result.options.withCredentials).toBe(true);
            expect(result.options.headers!['Content-Type']).toBe('application/json');
            expect(result.options.headers!['Authorization']).toBe('Bearer test-token');
        });

        test('should return correct arguments for private cloud', () => {
            const config: CfConfig = {
                org: { GUID: 'test-org-guid', Name: 'test-org' },
                space: { GUID: 'test-space-guid', Name: 'test-space' },
                url: 'private.cf.example.com',
                token: 'test-token'
            };

            mockIsAppStudio.mockReturnValue(false);

            const result = getFDCRequestArguments(config);

            expect(result.url).toBe(
                'https://ui5-flexibility-design-and-configuration.sapui5flex.cfapps.private.cf.example.com'
            );
            expect(result.options.withCredentials).toBe(true);
            expect(result.options.headers!['Content-Type']).toBe('application/json');
            expect(result.options.headers!['Authorization']).toBe('Bearer test-token');
        });

        test('should return correct arguments for China region', () => {
            const config: CfConfig = {
                org: { GUID: 'test-org-guid', Name: 'test-org' },
                space: { GUID: 'test-space-guid', Name: 'test-space' },
                url: 'cf.example.cn',
                token: 'test-token'
            };

            mockIsAppStudio.mockReturnValue(false);

            const result = getFDCRequestArguments(config);

            expect(result.url).toBe('https://ui5-flexibility-design-and-configuration.sapui5flex.cf.apps.example.cn');
            expect(result.options.withCredentials).toBe(true);
            expect(result.options.headers!['Content-Type']).toBe('application/json');
            expect(result.options.headers!['Authorization']).toBe('Bearer test-token');
        });
    });

    describe('createServiceInstance', () => {
        const plan = 'test-plan';
        const serviceInstanceName = 'test-service';
        const serviceName = 'test-offering';

        test('should create service with service name provided', async () => {
            mockCFToolsCliExecute.mockResolvedValue({
                exitCode: 0,
                stdout: 'Service created successfully',
                stderr: ''
            });

            await createServiceInstance(plan, serviceInstanceName, serviceName, { logger: mockLogger });

            expect(mockCFToolsCliExecute).toHaveBeenCalledWith([
                'create-service',
                serviceName,
                plan,
                serviceInstanceName
            ]);
        });

        test('should create service with XS security configuration', async () => {
            const xsSecurityContent = '{"xsappname": "test-app"}';
            mockReadFileSync.mockReturnValue(xsSecurityContent);
            mockCFToolsCliExecute.mockResolvedValue({
                exitCode: 0,
                stdout: 'Service created successfully',
                stderr: ''
            });

            await createServiceInstance(plan, serviceInstanceName, 'xsuaa', {
                xsSecurityProjectName: 'test-project',
                logger: mockLogger
            });

            expect(mockCFToolsCliExecute).toHaveBeenCalledWith([
                'create-service',
                'xsuaa',
                plan,
                serviceInstanceName,
                '-c',
                JSON.stringify({ xsappname: 'test-project' })
            ]);
        });

        test('should handle service creation failure', async () => {
            mockCFToolsCliExecute.mockRejectedValue(new Error('Service creation failed'));

            await expect(
                createServiceInstance(plan, serviceInstanceName, serviceName, { logger: mockLogger })
            ).rejects.toThrow(
                t('error.failedToCreateServiceInstance', {
                    serviceInstanceName: serviceInstanceName,
                    error: 'Service creation failed'
                })
            );
        });

        test('should handle xs-security.json parsing failure', async () => {
            mockReadFileSync.mockReturnValue('invalid json content');

            await expect(
                createServiceInstance(plan, serviceInstanceName, 'xsuaa', {
                    xsSecurityProjectName: 'test-project',
                    logger: mockLogger
                })
            ).rejects.toThrow(t('error.xsSecurityJsonCouldNotBeParsed'));

            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to parse xs-security.json file:')
            );
        });
    });

    describe('getServiceNameByTags', () => {
        const spaceGuid = 'test-space-guid';
        const tags = ['test-tag'];

        test('should get service name using tags', async () => {
            const mockServiceOfferings = {
                resources: [
                    {
                        name: 'test-service-offering',
                        tags: ['test-tag']
                    }
                ]
            };

            mockRequestCfApi.mockResolvedValue(mockServiceOfferings);

            const serviceName = await getServiceNameByTags(spaceGuid, tags);

            expect(mockRequestCfApi).toHaveBeenCalledWith(
                `/v3/service_offerings?per_page=1000&space_guids=${spaceGuid}`
            );
            expect(serviceName).toBe('test-service-offering');
        });

        test('should return empty string when no service found', async () => {
            const mockServiceOfferings = {
                resources: []
            };

            mockRequestCfApi.mockResolvedValue(mockServiceOfferings);

            const serviceName = await getServiceNameByTags(spaceGuid, tags);
            expect(serviceName).toBe('');
        });

        test('should handle API request failure', async () => {
            mockRequestCfApi.mockRejectedValue(new Error('API request failed'));

            await expect(getServiceNameByTags(spaceGuid, tags)).rejects.toThrow('API request failed');
        });
    });

    describe('createServices', () => {
        test('should create all required services', async () => {
            const yamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: [],
                resources: [
                    {
                        name: 'xsuaa',
                        type: 'org.cloudfoundry.managed-service',
                        parameters: {
                            service: 'xsuaa',
                            'service-plan': 'application',
                            'service-name': 'test-xsuaa-service'
                        }
                    }
                ]
            };
            const initialServices = ['portal'];

            mockGetProjectNameForXsSecurity.mockReturnValue('test-project-1234567890');
            mockReadFileSync.mockReturnValue('{"xsappname": "test-app"}');
            mockCFToolsCliExecute.mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: ''
            });

            await createServices(yamlContent, initialServices, '1234567890', 'test-space-guid', mockLogger);

            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(
                expect.arrayContaining([
                    'create-service',
                    'xsuaa',
                    'application',
                    'test-xsuaa-service',
                    '-c',
                    expect.any(String)
                ])
            );
        });

        test('should create non-xsuaa service without security file path', async () => {
            const projectPath = '/test/project';
            const yamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: [],
                resources: [
                    {
                        name: 'destination',
                        type: 'org.cloudfoundry.managed-service',
                        parameters: {
                            service: 'destination',
                            'service-plan': 'lite',
                            'service-name': 'test-destination-service'
                        }
                    }
                ]
            };
            const initialServices = ['portal'];
            const spaceGuid = 'test-space-guid';

            mockGetProjectNameForXsSecurity.mockReturnValue('test-project-1234567890');
            mockCFToolsCliExecute.mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: ''
            });

            await createServices(yamlContent, initialServices, '1234567890', undefined, mockLogger);

            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(
                expect.arrayContaining(['create-service', 'destination', 'lite', 'test-destination-service'])
            );

            // Verify that the call does NOT include the -c flag (no security file path)
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(expect.not.arrayContaining(['-c']));
        });
    });

    describe('getServiceInstanceKeys', () => {
        test('should return service keys when service instance is found', async () => {
            const serviceInstanceQuery = {
                spaceGuids: ['test-space-guid'],
                names: ['test-service']
            };
            const mockServiceKeys: ServiceKeys = {
                credentials: [
                    {
                        clientid: 'test-client-id',
                        clientsecret: 'test-client-secret',
                        url: 'test-url',
                        uaa: {
                            clientid: 'test-uaa-clientid',
                            clientsecret: 'test-uaa-clientsecret',
                            url: 'test-uaa-url'
                        },
                        uri: 'test-uri',
                        endpoints: {}
                    }
                ],
                serviceInstance: {
                    name: 'test-service',
                    guid: 'test-guid'
                }
            };

            mockRequestCfApi.mockResolvedValue({
                resources: [
                    {
                        name: 'test-service',
                        guid: 'test-guid'
                    }
                ]
            });
            mockGetServiceKeys.mockResolvedValue(mockServiceKeys.credentials);

            const result = await getServiceInstanceKeys(serviceInstanceQuery, mockLogger);

            expect(result).toEqual(mockServiceKeys);
            expect(mockLogger.log).toHaveBeenCalledWith("Use 'test-service' HTML5 Repo instance");
        });

        test('should return null when no service instances are found', async () => {
            const serviceInstanceQuery = {
                spaceGuids: ['test-space-guid'],
                names: ['test-service']
            };

            mockRequestCfApi.mockResolvedValue({ resources: [] });

            const result = await getServiceInstanceKeys(serviceInstanceQuery, mockLogger);

            expect(result).toBeNull();
        });

        test('should handle service instance query failure', async () => {
            const serviceInstanceQuery = {
                spaceGuids: ['test-space-guid'],
                names: ['test-service']
            };

            mockRequestCfApi.mockRejectedValue(new Error('Service query failed'));

            await expect(getServiceInstanceKeys(serviceInstanceQuery, mockLogger)).rejects.toThrow(
                t('error.failedToGetServiceInstanceKeys', {
                    error: t('error.failedToGetServiceInstance', {
                        error: 'Service query failed',
                        uriParameters: '?space_guids=test-space-guid&names=test-service'
                    })
                })
            );
        });

        test('should throw error when resources is not an array', async () => {
            const serviceInstanceQuery = {
                spaceGuids: ['test-space-guid'],
                names: ['test-service']
            };

            mockRequestCfApi.mockResolvedValue({
                resources: 'not-an-array'
            });

            await expect(getServiceInstanceKeys(serviceInstanceQuery, mockLogger)).rejects.toThrow(
                t('error.failedToGetServiceInstanceKeys', {
                    error: t('error.failedToGetServiceInstance', {
                        error: t('error.noValidJsonForServiceInstance'),
                        uriParameters: '?space_guids=test-space-guid&names=test-service'
                    })
                })
            );
        });

        test('should create service key when no existing keys found', async () => {
            const serviceInstanceQuery = {
                spaceGuids: ['test-space-guid'],
                names: ['test-service']
            };

            mockRequestCfApi.mockResolvedValue({
                resources: [
                    {
                        name: 'test-service',
                        guid: 'test-guid'
                    }
                ]
            });

            mockGetServiceKeys.mockResolvedValueOnce([]).mockResolvedValueOnce([
                {
                    clientid: 'test-client-id',
                    clientsecret: 'test-client-secret',
                    url: 'test-url',
                    uaa: {
                        clientid: 'test-uaa-clientid',
                        clientsecret: 'test-uaa-clientsecret',
                        url: 'test-uaa-url'
                    },
                    uri: 'test-uri',
                    endpoints: {}
                }
            ]);

            const result = await getServiceInstanceKeys(serviceInstanceQuery, mockLogger);

            expect(result).toEqual({
                credentials: [
                    {
                        clientid: 'test-client-id',
                        clientsecret: 'test-client-secret',
                        url: 'test-url',
                        uaa: {
                            clientid: 'test-uaa-clientid',
                            clientsecret: 'test-uaa-clientsecret',
                            url: 'test-uaa-url'
                        },
                        uri: 'test-uri',
                        endpoints: {}
                    }
                ],
                serviceInstance: {
                    name: 'test-service',
                    guid: 'test-guid'
                }
            });

            expect(mockCreateServiceKey).toHaveBeenCalledWith('test-service', 'test-service_key');
            expect(mockLogger.log).toHaveBeenCalledWith(
                "Creating service key 'test-service_key' for service instance 'test-service'"
            );
        });

        test('should handle error when creating service key fails', async () => {
            const serviceInstanceQuery = {
                spaceGuids: ['test-space-guid'],
                names: ['test-service']
            };

            mockRequestCfApi.mockResolvedValue({
                resources: [
                    {
                        name: 'test-service',
                        guid: 'test-guid'
                    }
                ]
            });

            mockGetServiceKeys.mockResolvedValue([]);

            mockCreateServiceKey.mockRejectedValue(new Error('Failed to create service key'));

            await expect(getServiceInstanceKeys(serviceInstanceQuery, mockLogger)).rejects.toThrow(
                t('error.failedToGetServiceInstanceKeys', {
                    error: t('error.failedToGetOrCreateServiceKeys', {
                        serviceInstanceName: 'test-service',
                        error: 'Failed to create service key'
                    })
                })
            );
        });
    });
});
