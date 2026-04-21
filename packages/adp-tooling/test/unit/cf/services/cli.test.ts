import * as CFLocal from '@sap/cf-tools/out/src/cf-local';
import * as CFToolsCli from '@sap/cf-tools/out/src/cli';
import { eFilters } from '@sap/cf-tools/out/src/types';
import type { CFResource } from '@sap/cf-tools/out/src/types';

import type { ToolsLogger } from '@sap-ux/logger';

import {
    isCfInstalled,
    getServiceKeys,
    createServiceKey,
    requestCfApi,
    updateServiceInstance
} from '../../../../src/cf/services/cli';
import { initI18n, t } from '../../../../src/i18n';
import type { ServiceKeys } from '../../../../src/types';

jest.mock('@sap/cf-tools/out/src/cf-local', () => ({
    cfGetServiceKeys: jest.fn()
}));

jest.mock('@sap/cf-tools/out/src/cli', () => ({
    Cli: {
        execute: jest.fn()
    }
}));

const mockCFLocal = CFLocal as jest.Mocked<typeof CFLocal>;
const mockCFToolsCli = CFToolsCli as jest.Mocked<typeof CFToolsCli>;
const mockCFToolsCliExecute = mockCFToolsCli.Cli.execute as jest.MockedFunction<typeof mockCFToolsCli.Cli.execute>;

function createMockResource(overrides: Record<string, unknown>): CFResource {
    return {
        guid: '',
        name: '',
        description: '',
        schemas: {},
        relationships: {},
        metadata: {},
        links: {},
        ...overrides
    } as CFResource;
}

describe('CF Services CLI', () => {
    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isCfInstalled', () => {
        const mockLogger = {
            error: jest.fn()
        } as unknown as ToolsLogger;

        test('should return true when CF is installed', async () => {
            const mockResponse = {
                exitCode: 0,
                stdout: 'cf version 8.0.0',
                stderr: ''
            };
            mockCFToolsCliExecute.mockResolvedValue(mockResponse);

            const result = await isCfInstalled(mockLogger);

            expect(result).toBe(true);
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(['version'], { env: { 'CF_COLOR': 'false' } });
            expect(mockLogger.error).not.toHaveBeenCalled();
        });

        test('should return false and log error when CF version command fails', async () => {
            const mockResponse = {
                exitCode: 1,
                stdout: '',
                stderr: 'cf: command not found'
            };
            mockCFToolsCliExecute.mockResolvedValue(mockResponse);

            const result = await isCfInstalled(mockLogger);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(t('error.cfNotInstalled', { error: mockResponse.stderr }));
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(['version'], { env: { 'CF_COLOR': 'false' } });
        });

        test('should return false and log error when CF version command throws exception', async () => {
            const error = new Error('Network error');
            mockCFToolsCliExecute.mockRejectedValue(error);

            const result = await isCfInstalled(mockLogger);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(t('error.cfNotInstalled', { error: error.message }));
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(['version'], { env: { 'CF_COLOR': 'false' } });
        });
    });

    describe('getServiceKeys', () => {
        const serviceInstanceGuid = 'test-guid-123';

        const mockCredentials: ServiceKeys = {
            credentials: {
                name: 'test-service-key',
                label: 'test-service',
                tags: [],
                credentials: {
                    uri: '/test-service',
                    uaa: {
                        clientid: 'test-client',
                        clientsecret: 'test-secret',
                        url: '/uaa.test'
                    }
                },
                uaa: {
                    clientid: 'test-client',
                    clientsecret: 'test-secret',
                    url: '/uaa.test'
                },
                uri: '/test-service',
                endpoints: {
                    'html5-apps-repo': {
                        'app_host_id': 'test-app-host-id'
                    }
                }
            }
        };

        const expectedFilter = {
            filters: [
                {
                    value: serviceInstanceGuid,
                    key: eFilters.service_instance_guids
                }
            ]
        };

        test('should return credentials sorted by updated_at descending by default', async () => {
            const mockLogger = {
                info: jest.fn(),
                debug: jest.fn(),
                warn: jest.fn()
            } as unknown as ToolsLogger;

            const mockResources = [
                createMockResource({ guid: 'key-1', name: 'key-old', updated_at: '2026-01-01T00:00:00Z' }),
                createMockResource({ guid: 'key-2', name: 'key-newest', updated_at: '2026-06-01T00:00:00Z' }),
                createMockResource({ guid: 'key-3', name: 'key-middle', updated_at: '2026-03-01T00:00:00Z' })
            ];

            mockCFLocal.cfGetServiceKeys.mockResolvedValue(mockResources);
            mockCFToolsCliExecute.mockResolvedValue({
                exitCode: 0,
                stdout: JSON.stringify(mockCredentials),
                stderr: ''
            });

            const result = await getServiceKeys(serviceInstanceGuid, 'updated_at', mockLogger);

            expect(result).toHaveLength(3);
            expect(mockCFLocal.cfGetServiceKeys).toHaveBeenCalledWith(expectedFilter);
            expect(mockLogger.info).toHaveBeenCalledWith(
                `Found 3 service key(s) for instance '${serviceInstanceGuid}'`
            );
            expect(mockLogger.debug).toHaveBeenCalledWith(
                "Service keys sorted by 'updated_at', using key 'key-newest' as primary"
            );
            expect(mockLogger.debug).toHaveBeenCalledWith('Retrieved credentials for 3 of 3 service key(s)');
            // Verify the order of curl calls matches sorted order (newest first)
            expect(mockCFToolsCliExecute).toHaveBeenNthCalledWith(
                1,
                ['curl', '/v3/service_credential_bindings/key-2/details'],
                { env: { 'CF_COLOR': 'false' } }
            );
            expect(mockCFToolsCliExecute).toHaveBeenNthCalledWith(
                2,
                ['curl', '/v3/service_credential_bindings/key-3/details'],
                { env: { 'CF_COLOR': 'false' } }
            );
            expect(mockCFToolsCliExecute).toHaveBeenNthCalledWith(
                3,
                ['curl', '/v3/service_credential_bindings/key-1/details'],
                { env: { 'CF_COLOR': 'false' } }
            );
        });

        test('should sort by created_at when specified', async () => {
            const mockLogger = {
                info: jest.fn(),
                debug: jest.fn(),
                warn: jest.fn()
            } as unknown as ToolsLogger;

            const mockResources = [
                createMockResource({
                    guid: 'key-1',
                    name: 'key-a',
                    created_at: '2026-05-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z'
                }),
                createMockResource({
                    guid: 'key-2',
                    name: 'key-b',
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-06-01T00:00:00Z'
                })
            ];

            mockCFLocal.cfGetServiceKeys.mockResolvedValue(mockResources);
            mockCFToolsCliExecute.mockResolvedValue({
                exitCode: 0,
                stdout: JSON.stringify(mockCredentials),
                stderr: ''
            });

            const result = await getServiceKeys(serviceInstanceGuid, 'created_at', mockLogger);

            expect(result).toHaveLength(2);
            expect(mockLogger.info).toHaveBeenCalledWith(
                `Found 2 service key(s) for instance '${serviceInstanceGuid}'`
            );
            expect(mockLogger.debug).toHaveBeenCalledWith(
                "Service keys sorted by 'created_at', using key 'key-a' as primary"
            );
            // key-1 has newer created_at, so it should be first
            expect(mockCFToolsCliExecute).toHaveBeenNthCalledWith(
                1,
                ['curl', '/v3/service_credential_bindings/key-1/details'],
                { env: { 'CF_COLOR': 'false' } }
            );
            expect(mockCFToolsCliExecute).toHaveBeenNthCalledWith(
                2,
                ['curl', '/v3/service_credential_bindings/key-2/details'],
                { env: { 'CF_COLOR': 'false' } }
            );
        });

        test('should handle resources without timestamp fields', async () => {
            const mockResources = [
                createMockResource({ guid: 'key-1', name: 'key-no-date' }),
                createMockResource({ guid: 'key-2', name: 'key-with-date', updated_at: '2026-06-01T00:00:00Z' }),
                createMockResource({ guid: 'key-3', name: 'key-no-date-2' })
            ];

            mockCFLocal.cfGetServiceKeys.mockResolvedValue(mockResources);
            mockCFToolsCliExecute.mockResolvedValue({
                exitCode: 0,
                stdout: JSON.stringify(mockCredentials),
                stderr: ''
            });

            const result = await getServiceKeys(serviceInstanceGuid);

            expect(result).toHaveLength(3);
            // key-2 has a date so it sorts first, others without dates come after
            expect(mockCFToolsCliExecute).toHaveBeenNthCalledWith(
                1,
                ['curl', '/v3/service_credential_bindings/key-2/details'],
                { env: { 'CF_COLOR': 'false' } }
            );
        });

        test('should filter out resources whose credential fetch fails', async () => {
            const mockLogger = {
                info: jest.fn(),
                debug: jest.fn(),
                warn: jest.fn()
            } as unknown as ToolsLogger;

            const mockResources = [
                createMockResource({ guid: 'key-1', name: 'key-good', updated_at: '2026-06-01T00:00:00Z' }),
                createMockResource({ guid: 'key-2', name: 'key-bad', updated_at: '2026-01-01T00:00:00Z' })
            ];

            mockCFLocal.cfGetServiceKeys.mockResolvedValue(mockResources);
            mockCFToolsCliExecute
                .mockResolvedValueOnce({
                    exitCode: 0,
                    stdout: JSON.stringify(mockCredentials),
                    stderr: ''
                })
                .mockResolvedValueOnce({
                    exitCode: 1,
                    stdout: '',
                    stderr: 'Not found'
                });

            const result = await getServiceKeys(serviceInstanceGuid, 'updated_at', mockLogger);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(mockCredentials);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining("Failed to fetch credentials for service key 'key-bad'")
            );
            expect(mockLogger.debug).toHaveBeenCalledWith('Retrieved credentials for 1 of 2 service key(s)');
        });

        test('should return single credential for single resource', async () => {
            const mockResources = [
                createMockResource({ guid: 'key-1', name: 'only-key', updated_at: '2026-06-01T00:00:00Z' })
            ];

            mockCFLocal.cfGetServiceKeys.mockResolvedValue(mockResources);
            mockCFToolsCliExecute.mockResolvedValue({
                exitCode: 0,
                stdout: JSON.stringify(mockCredentials),
                stderr: ''
            });

            const result = await getServiceKeys(serviceInstanceGuid);

            expect(result).toEqual([mockCredentials]);
            expect(mockCFLocal.cfGetServiceKeys).toHaveBeenCalledWith(expectedFilter);
        });

        test('should return empty array when no resources exist', async () => {
            mockCFLocal.cfGetServiceKeys.mockResolvedValue([]);

            const result = await getServiceKeys(serviceInstanceGuid);

            expect(result).toEqual([]);
            expect(mockCFToolsCliExecute).not.toHaveBeenCalled();
        });

        test('should throw error when cfGetServiceKeys fails', async () => {
            const error = new Error('Service instance not found');
            mockCFLocal.cfGetServiceKeys.mockRejectedValue(error);

            await expect(getServiceKeys(serviceInstanceGuid)).rejects.toThrow(
                t('error.cfGetInstanceCredentialsFailed', {
                    serviceInstanceGuid: 'test-guid-123',
                    error: error.message
                })
            );
            expect(mockCFLocal.cfGetServiceKeys).toHaveBeenCalledWith(expectedFilter);
        });
    });

    describe('createServiceKey', () => {
        const serviceKeyName = 'test-key';
        const serviceInstanceName = 'test-service';

        test('should create service key successfully', async () => {
            const mockResponse = {
                exitCode: 0,
                stdout: 'Service key created successfully',
                stderr: ''
            };
            mockCFToolsCliExecute.mockResolvedValue(mockResponse);

            await createServiceKey(serviceInstanceName, serviceKeyName);

            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(
                ['create-service-key', serviceInstanceName, serviceKeyName, '--wait'],
                { env: { 'CF_COLOR': 'false' } }
            );
        });

        test('should throw error when create-service-key command fails', async () => {
            const mockResponse = {
                exitCode: 1,
                stdout: '',
                stderr: 'Service instance not found'
            };
            mockCFToolsCliExecute.mockResolvedValue(mockResponse);

            await expect(createServiceKey(serviceInstanceName, serviceKeyName)).rejects.toThrow(
                t('error.createServiceKeyFailed', {
                    serviceInstanceName,
                    error: mockResponse.stderr
                })
            );
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(
                ['create-service-key', serviceInstanceName, serviceKeyName, '--wait'],
                { env: { 'CF_COLOR': 'false' } }
            );
        });

        test('should throw error when create-service-key command throws exception', async () => {
            const error = new Error('Network error');
            mockCFToolsCliExecute.mockRejectedValue(error);

            await expect(createServiceKey(serviceInstanceName, serviceKeyName)).rejects.toThrow(
                t('error.createServiceKeyFailed', { serviceInstanceName, error: error.message })
            );
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(
                ['create-service-key', serviceInstanceName, serviceKeyName, '--wait'],
                { env: { 'CF_COLOR': 'false' } }
            );
        });
    });

    describe('requestCfApi', () => {
        const url = '/v3/apps';

        test('should return parsed JSON response when curl command succeeds', async () => {
            const mockJsonResponse = {
                resources: [
                    { name: 'app1', guid: 'guid1' },
                    { name: 'app2', guid: 'guid2' }
                ]
            };
            const mockResponse = {
                exitCode: 0,
                stdout: JSON.stringify(mockJsonResponse),
                stderr: ''
            };
            mockCFToolsCliExecute.mockResolvedValue(mockResponse);

            const result = await requestCfApi(url);

            expect(result).toEqual(mockJsonResponse);
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(['curl', url], { env: { 'CF_COLOR': 'false' } });
        });

        test('should throw error when response is empty', async () => {
            const mockResponse = {
                exitCode: 0,
                stdout: '',
                stderr: ''
            };
            mockCFToolsCliExecute.mockResolvedValue(mockResponse);

            await expect(requestCfApi(url)).rejects.toThrow(
                t('error.failedToRequestCFAPI', { error: t('error.emptyCFAPIResponse') })
            );
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(['curl', url], { env: { 'CF_COLOR': 'false' } });
        });

        test('should throw error when curl command fails', async () => {
            const mockResponse = {
                exitCode: 1,
                stdout: '',
                stderr: 'Unauthorized'
            };
            mockCFToolsCliExecute.mockResolvedValue(mockResponse);

            await expect(requestCfApi(url)).rejects.toThrow(
                t('error.failedToRequestCFAPI', { error: mockResponse.stderr })
            );
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(['curl', url], { env: { 'CF_COLOR': 'false' } });
        });

        test('should throw error when JSON parsing fails', async () => {
            const mockResponse = {
                exitCode: 0,
                stdout: 'invalid json',
                stderr: ''
            };
            mockCFToolsCliExecute.mockResolvedValue(mockResponse);

            await expect(requestCfApi(url)).rejects.toThrow(
                t('error.failedToRequestCFAPI', {
                    error: t('error.failedToParseCFAPIResponse', {
                        error: 'Unexpected token \'i\', "invalid json" is not valid JSON'
                    })
                })
            );
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(['curl', url], { env: { 'CF_COLOR': 'false' } });
        });

        test('should throw error when curl command throws exception', async () => {
            const error = new Error('Network error');
            mockCFToolsCliExecute.mockRejectedValue(error);

            await expect(requestCfApi(url)).rejects.toThrow(t('error.failedToRequestCFAPI', { error: error.message }));
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(['curl', url], { env: { 'CF_COLOR': 'false' } });
        });

        test('should handle generic type parameter', async () => {
            const url = '/v3/service_offerings';
            const mockJsonResponse = {
                resources: [
                    { name: 'xsuaa', description: 'XSUAA service' },
                    { name: 'destination', description: 'Destination service' }
                ]
            };
            const mockResponse = {
                exitCode: 0,
                stdout: JSON.stringify(mockJsonResponse),
                stderr: ''
            };
            mockCFToolsCliExecute.mockResolvedValue(mockResponse);

            const result = await requestCfApi<{ resources: Array<{ name: string; description: string }> }>(url);

            expect(result).toEqual(mockJsonResponse);
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(['curl', url], { env: { 'CF_COLOR': 'false' } });
        });
    });

    describe('updateServiceInstance', () => {
        const serviceInstanceName = 'test-xsuaa-service';
        const parameters = {
            xsappname: 'test-app',
            'tenant-mode': 'dedicated',
            'oauth2-configuration': { 'redirect-uris': ['https://**.applicationstudio.cloud.sap/**'] }
        };

        test('should update service instance successfully', async () => {
            const mockResponse = {
                exitCode: 0,
                stdout: 'OK',
                stderr: ''
            };
            mockCFToolsCliExecute.mockResolvedValue(mockResponse);

            await updateServiceInstance(serviceInstanceName, parameters);

            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(
                ['update-service', serviceInstanceName, '-c', JSON.stringify(parameters), '--wait'],
                { env: { 'CF_COLOR': 'false' } }
            );
        });

        test('should throw error when update-service command fails', async () => {
            const mockResponse = {
                exitCode: 1,
                stdout: '',
                stderr: 'Service instance not found'
            };
            mockCFToolsCliExecute.mockResolvedValue(mockResponse);

            await expect(updateServiceInstance(serviceInstanceName, parameters)).rejects.toThrow(
                t('error.failedToUpdateServiceInstance', {
                    serviceInstanceName,
                    error: mockResponse.stderr
                })
            );
        });

        test('should throw error when update-service command throws exception', async () => {
            const error = new Error('Network error');
            mockCFToolsCliExecute.mockRejectedValue(error);

            await expect(updateServiceInstance(serviceInstanceName, parameters)).rejects.toThrow(
                t('error.failedToUpdateServiceInstance', { serviceInstanceName, error: error.message })
            );
        });
    });
});
