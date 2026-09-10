import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type prompts from 'prompts';

const mockPrompts = jest.fn() as unknown as typeof prompts;
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerDebug = jest.fn();
const mockAxiosGet = jest.fn();
const mockCatalogListServices = jest.fn();
const mockCatalog = jest.fn();
const mockCreateAbapServiceProvider = jest.fn();
const mockLogErrorMsgs = jest.fn();
const mockGetErrorType = jest.fn();

jest.unstable_mockModule('prompts', () => ({ default: mockPrompts }));

jest.unstable_mockModule('../../../../src/i18n.js', () => ({
    t: (key: string, params?: any) => {
        const translations: Record<string, string> = {
            'systemConnection.invalidUrl': `Invalid URL: ${params?.url}`,
            'systemConnection.unknownError': 'Unknown error',
            'systemConnection.skippingCheck': 'Skipping connection check (--skip-connection-validation flag provided)',
            'systemConnection.verifying': 'Verifying connection to the back-end system...',
            'systemConnection.connectionSuccessful': '✓ Connection achieved',
            'systemConnection.connectionFailed': `Connection check failed. ${params?.error}`,
            'systemConnection.saveAnywayPrompt': 'Connection check failed. Save system anyway?',
            'systemConnection.catalogServicesFound':
                params?.count === 1
                    ? `Found ${params?.count} catalog service`
                    : `Found ${params?.count} catalog services`,
            'systemConnection.metadataRequestSuccessful': '✓ Metadata request successful'
        };
        return translations[key] || key;
    }
}));

jest.unstable_mockModule('../../../../src/tracing/index.js', () => ({
    getLogger: () => ({
        info: mockLoggerInfo,
        warn: mockLoggerWarn,
        debug: mockLoggerDebug
    })
}));
jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: (...args: any[]) => mockCreateAbapServiceProvider(...args)
}));

jest.unstable_mockModule('@sap-ux/inquirer-common', () => ({
    ErrorHandler: class MockErrorHandler {
        static getErrorType = (...args: any[]) => mockGetErrorType(...args);
        logErrorMsgs = (...args: any[]) => mockLogErrorMsgs(...args);
    },
    ERROR_TYPE: {
        AUTH: 'AUTH',
        CONNECTION: 'CONNECTION',
        TIMEOUT: 'TIMEOUT',
        UNKNOWN: 'UNKNOWN'
    }
}));

const { checkSystemConnection, checkConnectionOrPrompt } =
    await import('../../../../src/cli/utils/system-connection.js');

describe('system-connection', () => {
    beforeEach(() => {
        mockPrompts.mockReset();
        mockLoggerInfo.mockReset();
        mockLoggerWarn.mockReset();
        mockLoggerDebug.mockReset();
        mockAxiosGet.mockReset();
        mockCatalogListServices.mockReset();
        mockCatalog.mockReset();
        mockCreateAbapServiceProvider.mockReset();
        mockLogErrorMsgs.mockReset();
        mockGetErrorType.mockReset();

        // Default: successful catalog request
        mockCatalogListServices.mockResolvedValue([{ name: 'Service1' }, { name: 'Service2' }]);
        mockCatalog.mockReturnValue({
            listServices: mockCatalogListServices
        });
        mockAxiosGet.mockResolvedValue({ status: 200 });
        mockCreateAbapServiceProvider.mockResolvedValue({
            get: mockAxiosGet,
            catalog: mockCatalog
        });

        // Default: ErrorHandler returns generic error message
        mockLogErrorMsgs.mockReturnValue('Connection error');
        mockGetErrorType.mockReturnValue('UNKNOWN');
    });

    describe('checkSystemConnection', () => {
        test('should validate abap_catalog connection by listing catalog services', async () => {
            mockCatalogListServices.mockResolvedValueOnce([
                { name: 'Service1' },
                { name: 'Service2' },
                { name: 'Service3' }
            ]);

            const result = await checkSystemConnection({
                url: 'https://valid.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            expect(mockCreateAbapServiceProvider).toHaveBeenCalled();
            expect(mockCatalog).toHaveBeenCalledWith('2'); // ODataVersion.v2 = '2'
            expect(mockCatalogListServices).toHaveBeenCalled();
            expect(mockLoggerInfo).toHaveBeenCalledWith('Found 3 catalog services');
        });

        test('should validate abap_catalog connection with client parameter', async () => {
            mockCatalogListServices.mockResolvedValueOnce([{ name: 'Service1' }]);

            const result = await checkSystemConnection({
                url: 'https://valid.example.com',
                client: '100',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            expect(mockCreateAbapServiceProvider).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://valid.example.com',
                    client: '100',
                    authenticationType: 'basic'
                }),
                undefined,
                false,
                expect.anything()
            );
        });

        test('should validate abap_catalog with basic auth credentials', async () => {
            const result = await checkSystemConnection({
                url: 'https://valid.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog',
                username: 'testuser',
                password: 'testpass'
            });

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            expect(mockCreateAbapServiceProvider).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://valid.example.com',
                    authenticationType: 'basic'
                }),
                expect.objectContaining({
                    auth: {
                        username: 'testuser',
                        password: 'testpass'
                    }
                }),
                false,
                expect.anything()
            );
        });

        test('should validate odata_service connection with metadata request', async () => {
            mockAxiosGet.mockResolvedValueOnce({ status: 200, data: '<metadata>' });

            const result = await checkSystemConnection({
                url: 'https://example.com/sap/opu/odata/sap/SERVICE',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'odata_service',
                username: 'testuser',
                password: 'testpass'
            });

            expect(result.success).toBe(true);
            expect(mockAxiosGet).toHaveBeenCalledWith('/$metadata', { timeout: 5000 });
            expect(mockLoggerInfo).toHaveBeenCalledWith('✓ Metadata request successful');
        });

        test('should validate generic_host connection with basic connectivity check', async () => {
            mockAxiosGet.mockResolvedValueOnce({ status: 200 });

            const result = await checkSystemConnection({
                url: 'https://generic.example.com',
                systemType: 'Generic',
                authenticationType: 'basic',
                connectionType: 'generic_host'
            });

            expect(result.success).toBe(true);
            expect(mockAxiosGet).toHaveBeenCalledWith('/', { timeout: 5000 });
        });

        test('should validate reentranceTicket auth without credentials', async () => {
            mockCatalogListServices.mockResolvedValueOnce([{ name: 'Service1' }]);

            const result = await checkSystemConnection({
                url: 'https://example.com',
                systemType: 'AbapCloud',
                authenticationType: 'reentranceTicket',
                connectionType: 'abap_catalog'
            });

            expect(result.success).toBe(true);
            expect(mockCreateAbapServiceProvider).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://example.com',
                    authenticationType: 'reentranceTicket'
                }),
                undefined, // No auth for reentranceTicket
                false,
                expect.anything()
            );
        });

        test('should validate oauth2 auth without credentials', async () => {
            mockCatalogListServices.mockResolvedValueOnce([{ name: 'Service1' }]);

            const result = await checkSystemConnection({
                url: 'https://example.com',
                systemType: 'AbapCloud',
                authenticationType: 'oauth2',
                connectionType: 'abap_catalog'
            });

            expect(result.success).toBe(true);
            expect(mockCreateAbapServiceProvider).toHaveBeenCalled();
        });

        test('should pass client parameter when connecting', async () => {
            const result = await checkSystemConnection({
                url: 'https://valid.example.com',
                client: '100',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog',
                username: 'testuser',
                password: 'testpass'
            });

            expect(result.success).toBe(true);
            expect(mockCreateAbapServiceProvider).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://valid.example.com',
                    client: '100',
                    authenticationType: 'basic'
                }),
                expect.objectContaining({
                    auth: {
                        username: 'testuser',
                        password: 'testpass'
                    }
                }),
                false,
                expect.anything()
            );
        });

        test('should treat HTTP 401 as success (system is reachable)', async () => {
            mockCatalogListServices.mockRejectedValueOnce({
                response: { status: 401 }
            });

            const result = await checkSystemConnection({
                url: 'https://valid.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog',
                username: 'wronguser',
                password: 'wrongpass'
            });

            expect(result.success).toBe(true); // 401 means system is reachable
        });

        test('should return error for connection refused', async () => {
            mockCatalogListServices.mockRejectedValueOnce({
                code: 'ECONNREFUSED'
            });
            mockLogErrorMsgs.mockReturnValueOnce('Connection refused - system may be unreachable');

            const result = await checkSystemConnection({
                url: 'https://unreachable.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog',
                username: 'testuser',
                password: 'testpass'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Connection refused - system may be unreachable');
        });

        test('should return error for connection timeout', async () => {
            mockCatalogListServices.mockRejectedValueOnce({
                code: 'ETIMEDOUT',
                message: 'timeout of 5000ms exceeded'
            });
            mockLogErrorMsgs.mockReturnValueOnce('Connection timeout after 5000ms');

            const result = await checkSystemConnection({
                url: 'https://slow.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog',
                username: 'testuser',
                password: 'testpass'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Connection timeout after 5000ms');
        });

        test('should return generic error for other connection failures', async () => {
            mockCatalogListServices.mockRejectedValueOnce({
                message: 'Network error'
            });
            mockLogErrorMsgs.mockReturnValueOnce('Network error');

            const result = await checkSystemConnection({
                url: 'https://example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog',
                username: 'testuser',
                password: 'testpass'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
        });

        test('should validate connection for reentranceTicket auth (reachability check)', async () => {
            mockCatalogListServices.mockResolvedValueOnce([{ name: 'Service1' }]);

            const result = await checkSystemConnection({
                url: 'https://example.com',
                systemType: 'OnPrem',
                authenticationType: 'reentranceTicket',
                connectionType: 'abap_catalog'
            });

            expect(result.success).toBe(true);
            expect(mockCreateAbapServiceProvider).toHaveBeenCalled();
        });

        test('should validate connection for oauth2 auth (reachability check)', async () => {
            mockCatalogListServices.mockResolvedValueOnce([{ name: 'Service1' }]);

            const result = await checkSystemConnection({
                url: 'https://example.com',
                systemType: 'OnPrem',
                authenticationType: 'oauth2',
                connectionType: 'abap_catalog'
            });

            expect(result.success).toBe(true);
            expect(mockCreateAbapServiceProvider).toHaveBeenCalled();
        });

        test('should return error for invalid URL', async () => {
            const result = await checkSystemConnection({
                url: 'not-a-valid-url',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid URL');
            expect(result.error).toContain('not-a-valid-url');
        });

        test('should return error for empty URL', async () => {
            const result = await checkSystemConnection({
                url: '',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid URL');
        });

        test('should return error for malformed URL', async () => {
            const result = await checkSystemConnection({
                url: '://missing-protocol.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('should handle URL with port', async () => {
            const result = await checkSystemConnection({
                url: 'https://example.com:8080',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.success).toBe(true);
        });

        test('should handle URL with path', async () => {
            const result = await checkSystemConnection({
                url: 'https://example.com/sap/opu/odata',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                connectionType: 'abap_catalog'
            });

            expect(result.success).toBe(true);
        });
    });

    describe('checkConnectionOrPrompt', () => {
        test('should skip check and return true when skipConnectionValidation is true', async () => {
            const result = await checkConnectionOrPrompt(
                {
                    url: 'https://example.com',
                    systemType: 'OnPrem',
                    authenticationType: 'basic',
                    connectionType: 'abap_catalog'
                },
                true
            );

            expect(result).toBe(true);
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'Skipping connection check (--skip-connection-validation flag provided)'
            );
            expect(mockPrompts).not.toHaveBeenCalled();
        });

        test('should return true when connection succeeds', async () => {
            const result = await checkConnectionOrPrompt(
                {
                    url: 'https://example.com',
                    systemType: 'OnPrem',
                    authenticationType: 'basic',
                    connectionType: 'abap_catalog'
                },
                false
            );

            expect(result).toBe(true);
            expect(mockLoggerInfo).toHaveBeenCalledWith('Verifying connection to the back-end system...');
            expect(mockLoggerInfo).toHaveBeenCalledWith('✓ Connection achieved');
            expect(mockPrompts).not.toHaveBeenCalled();
        });

        test('should prompt user when connection fails and return true if user confirms', async () => {
            mockPrompts.mockResolvedValueOnce({ saveAnyway: true });

            const result = await checkConnectionOrPrompt(
                {
                    url: 'invalid-url',
                    systemType: 'OnPrem',
                    authenticationType: 'basic',
                    connectionType: 'abap_catalog'
                },
                false
            );

            expect(result).toBe(true);
            expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining('Connection check failed'));
            expect(mockPrompts).toHaveBeenCalledWith({
                type: 'confirm',
                name: 'saveAnyway',
                message: 'Connection check failed. Save system anyway?',
                initial: false
            });
        });

        test('should prompt user when connection fails and return false if user declines', async () => {
            mockPrompts.mockResolvedValueOnce({ saveAnyway: false });

            const result = await checkConnectionOrPrompt(
                {
                    url: 'invalid-url',
                    systemType: 'OnPrem',
                    authenticationType: 'basic',
                    connectionType: 'abap_catalog'
                },
                false
            );

            expect(result).toBe(false);
            expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining('Connection check failed'));
            expect(mockPrompts).toHaveBeenCalled();
        });

        test('should handle user cancelling prompt', async () => {
            mockPrompts.mockResolvedValueOnce({});

            const result = await checkConnectionOrPrompt(
                {
                    url: 'invalid-url',
                    systemType: 'OnPrem',
                    authenticationType: 'basic',
                    connectionType: 'abap_catalog'
                },
                false
            );

            expect(result).toBe(false);
        });

        test('should pass credentials to connection check', async () => {
            const result = await checkConnectionOrPrompt(
                {
                    url: 'https://example.com',
                    client: '100',
                    systemType: 'OnPrem',
                    authenticationType: 'basic',
                    connectionType: 'abap_catalog',
                    username: 'user',
                    password: 'pass'
                },
                false
            );

            expect(result).toBe(true);
            expect(mockLoggerInfo).toHaveBeenCalledWith('✓ Connection achieved');
        });

        test('should display error message when available', async () => {
            mockPrompts.mockResolvedValueOnce({ saveAnyway: false });

            await checkConnectionOrPrompt(
                {
                    url: '',
                    systemType: 'OnPrem',
                    authenticationType: 'basic',
                    connectionType: 'abap_catalog'
                },
                false
            );

            expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining('Invalid URL'));
        });
    });
});
