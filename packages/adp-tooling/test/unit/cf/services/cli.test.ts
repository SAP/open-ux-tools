import * as CFLocal from '@sap/cf-tools/out/src/cf-local';
import * as CFToolsCli from '@sap/cf-tools/out/src/cli';
import { eFilters } from '@sap/cf-tools/out/src/types';

import type { ToolsLogger } from '@sap-ux/logger';

import { isCfInstalled, getServiceKeys, createServiceKey, requestCfApi } from '../../../../src/cf/services/cli';
import { initI18n, t } from '../../../../src/i18n';
import type { CfCredentials } from '../../../../src/types';

jest.mock('@sap/cf-tools/out/src/cf-local', () => ({
    cfGetInstanceCredentials: jest.fn()
}));

jest.mock('@sap/cf-tools/out/src/cli', () => ({
    Cli: {
        execute: jest.fn()
    }
}));

const mockCFLocal = CFLocal as jest.Mocked<typeof CFLocal>;
const mockCFToolsCli = CFToolsCli as jest.Mocked<typeof CFToolsCli>;
const mockCFToolsCliExecute = mockCFToolsCli.Cli.execute as jest.MockedFunction<typeof mockCFToolsCli.Cli.execute>;

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
        test('should return service instance credentials', async () => {
            const serviceInstanceGuid = 'test-guid-123';
            const mockCredentials: CfCredentials[] = [
                {
                    name: 'test-service-key',
                    label: 'test-service',
                    tags: [],
                    credentials: {
                        uri: 'https://test-service.com',
                        uaa: {
                            clientid: 'test-client',
                            clientsecret: 'test-secret',
                            url: 'https://uaa.test.com'
                        }
                    },
                    uaa: {
                        clientid: 'test-client',
                        clientsecret: 'test-secret',
                        url: 'https://uaa.test.com'
                    },
                    uri: 'https://test-service.com',
                    endpoints: {
                        'html5-apps-repo': {
                            'app_host_id': 'test-app-host-id'
                        }
                    }
                }
            ];

            mockCFLocal.cfGetInstanceCredentials.mockResolvedValue(mockCredentials);

            const result = await getServiceKeys(serviceInstanceGuid);

            expect(result).toEqual(mockCredentials);
            expect(mockCFLocal.cfGetInstanceCredentials).toHaveBeenCalledWith({
                filters: [
                    {
                        value: serviceInstanceGuid,
                        key: eFilters.service_instance_guid
                    }
                ]
            });
        });

        test('should throw error when cfGetInstanceCredentials fails', async () => {
            const serviceInstanceGuid = 'test-guid-123';
            const error = new Error('Service instance not found');
            mockCFLocal.cfGetInstanceCredentials.mockRejectedValue(error);

            await expect(getServiceKeys(serviceInstanceGuid)).rejects.toThrow(
                t('error.cfGetInstanceCredentialsFailed', {
                    serviceInstanceGuid: 'test-guid-123',
                    error: error.message
                })
            );
            expect(mockCFLocal.cfGetInstanceCredentials).toHaveBeenCalledWith({
                filters: [
                    {
                        value: serviceInstanceGuid,
                        key: eFilters.service_instance_guid
                    }
                ]
            });
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
                ['create-service-key', serviceInstanceName, serviceKeyName],
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
                ['create-service-key', serviceInstanceName, serviceKeyName],
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
                ['create-service-key', serviceInstanceName, serviceKeyName],
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
});
