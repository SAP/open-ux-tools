import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type prompts from 'prompts';

const mockPrompts = jest.fn() as unknown as typeof prompts;
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockAxiosGet = jest.fn();
const mockCreateForAbap = jest.fn();

jest.unstable_mockModule('prompts', () => ({ default: mockPrompts }));

// Mock i18n
jest.unstable_mockModule('../../../../src/i18n.js', () => ({
    text: (key: string, options?: Record<string, unknown>) => {
        const translations: Record<string, string> = {
            'systemConnection.invalidUrl': 'Invalid URL: {{url}}',
            'systemConnection.skippingCheck': 'Skipping connection check (--skip-check flag provided)',
            'systemConnection.verifying': 'Verifying connection to backend system...',
            'systemConnection.connectionSuccessful': '✓ Connection successful',
            'systemConnection.connectionFailed': 'Connection check failed: {{error}}',
            'systemConnection.unknownError': 'Unknown error',
            'systemConnection.saveAnywayPrompt': 'Connection check failed. Save system anyway?'
        };
        let result = translations[key] || key;
        if (options) {
            Object.entries(options).forEach(([k, v]) => {
                result = result.replace(`{{${k}}}`, String(v));
            });
        }
        return result;
    },
    initI18n: jest.fn().mockResolvedValue(undefined)
}));

jest.unstable_mockModule('../../../../src/tracing/index.js', () => ({
    getLogger: () => ({
        info: mockLoggerInfo,
        warn: mockLoggerWarn
    })
}));
jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    createForAbap: (...args: any[]) => mockCreateForAbap(...args)
}));

const { checkSystemConnection, checkConnectionOrPrompt } =
    await import('../../../../src/cli/utils/system-connection.js');

describe('system-connection', () => {
    beforeEach(() => {
        mockPrompts.mockReset();
        mockLoggerInfo.mockReset();
        mockLoggerWarn.mockReset();
        mockAxiosGet.mockReset();
        mockCreateForAbap.mockReset();

        // Default: successful connection for basic auth with credentials
        mockCreateForAbap.mockReturnValue({
            get: mockAxiosGet.mockResolvedValue({ status: 200 })
        });
    });

    describe('checkSystemConnection', () => {
        test('should return success for valid URL without credentials (no actual connection attempt)', async () => {
            const result = await checkSystemConnection({
                url: 'https://valid.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic'
            });

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            expect(mockCreateForAbap).not.toHaveBeenCalled(); // No connection attempt without credentials
        });

        test('should return success for valid URL with client but no credentials', async () => {
            const result = await checkSystemConnection({
                url: 'https://valid.example.com',
                client: '100',
                systemType: 'OnPrem',
                authenticationType: 'basic'
            });

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            expect(mockCreateForAbap).not.toHaveBeenCalled();
        });

        test('should attempt real connection with basic auth and credentials', async () => {
            const result = await checkSystemConnection({
                url: 'https://valid.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                username: 'testuser',
                password: 'testpass'
            });

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            expect(mockCreateForAbap).toHaveBeenCalledWith({
                baseURL: 'https://valid.example.com',
                auth: {
                    username: 'testuser',
                    password: 'testpass'
                },
                params: undefined
            });
            expect(mockAxiosGet).toHaveBeenCalledWith('/sap/bc/ping', { timeout: 5000 });
        });

        test('should pass client parameter when connecting', async () => {
            const result = await checkSystemConnection({
                url: 'https://valid.example.com',
                client: '100',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                username: 'testuser',
                password: 'testpass'
            });

            expect(result.success).toBe(true);
            expect(mockCreateForAbap).toHaveBeenCalledWith({
                baseURL: 'https://valid.example.com',
                auth: {
                    username: 'testuser',
                    password: 'testpass'
                },
                params: { 'sap-client': '100' }
            });
        });

        test('should return error for HTTP 401 Unauthorized', async () => {
            mockAxiosGet.mockRejectedValueOnce({
                response: { status: 401 }
            });

            const result = await checkSystemConnection({
                url: 'https://valid.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                username: 'wronguser',
                password: 'wrongpass'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Authentication failed (HTTP 401 Unauthorized)');
        });

        test('should return error for connection refused', async () => {
            mockAxiosGet.mockRejectedValueOnce({
                code: 'ECONNREFUSED'
            });

            const result = await checkSystemConnection({
                url: 'https://unreachable.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                username: 'testuser',
                password: 'testpass'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Connection refused - system may be unreachable');
        });

        test('should return error for connection timeout', async () => {
            mockAxiosGet.mockRejectedValueOnce({
                code: 'ETIMEDOUT',
                message: 'timeout of 5000ms exceeded'
            });

            const result = await checkSystemConnection({
                url: 'https://slow.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                username: 'testuser',
                password: 'testpass'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Connection timeout after 5000ms');
        });

        test('should return generic error for other connection failures', async () => {
            mockAxiosGet.mockRejectedValueOnce({
                message: 'Network error'
            });

            const result = await checkSystemConnection({
                url: 'https://example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                username: 'testuser',
                password: 'testpass'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
        });

        test('should return success for reentranceTicket auth (no connection attempt)', async () => {
            const result = await checkSystemConnection({
                url: 'https://example.com',
                systemType: 'OnPrem',
                authenticationType: 'reentranceTicket'
            });

            expect(result.success).toBe(true);
            expect(mockCreateForAbap).not.toHaveBeenCalled(); // No connection attempt for non-basic auth
        });

        test('should return success for oauth2 auth (no connection attempt)', async () => {
            const result = await checkSystemConnection({
                url: 'https://example.com',
                systemType: 'OnPrem',
                authenticationType: 'oauth2'
            });

            expect(result.success).toBe(true);
            expect(mockCreateForAbap).not.toHaveBeenCalled();
        });

        test('should return error for invalid URL', async () => {
            const result = await checkSystemConnection({
                url: 'not-a-valid-url',
                systemType: 'OnPrem',
                authenticationType: 'basic'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid URL');
            expect(result.error).toContain('not-a-valid-url');
        });

        test('should return error for empty URL', async () => {
            const result = await checkSystemConnection({
                url: '',
                systemType: 'OnPrem',
                authenticationType: 'basic'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid URL');
        });

        test('should return error for malformed URL', async () => {
            const result = await checkSystemConnection({
                url: '://missing-protocol.com',
                systemType: 'OnPrem',
                authenticationType: 'basic'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('should handle URL with port', async () => {
            const result = await checkSystemConnection({
                url: 'https://example.com:8080',
                systemType: 'OnPrem',
                authenticationType: 'basic'
            });

            expect(result.success).toBe(true);
        });

        test('should handle URL with path', async () => {
            const result = await checkSystemConnection({
                url: 'https://example.com/sap/opu/odata',
                systemType: 'OnPrem',
                authenticationType: 'basic'
            });

            expect(result.success).toBe(true);
        });
    });

    describe('checkConnectionOrPrompt', () => {
        test('should skip check and return true when skipCheck is true', async () => {
            const result = await checkConnectionOrPrompt(
                {
                    url: 'https://example.com',
                    systemType: 'OnPrem',
                    authenticationType: 'basic'
                },
                true
            );

            expect(result).toBe(true);
            expect(mockLoggerInfo).toHaveBeenCalledWith('Skipping connection check (--skip-check flag provided)');
            expect(mockPrompts).not.toHaveBeenCalled();
        });

        test('should return true when connection succeeds', async () => {
            const result = await checkConnectionOrPrompt(
                {
                    url: 'https://example.com',
                    systemType: 'OnPrem',
                    authenticationType: 'basic'
                },
                false
            );

            expect(result).toBe(true);
            expect(mockLoggerInfo).toHaveBeenCalledWith('Verifying connection to backend system...');
            expect(mockLoggerInfo).toHaveBeenCalledWith('✓ Connection successful');
            expect(mockPrompts).not.toHaveBeenCalled();
        });

        test('should prompt user when connection fails and return true if user confirms', async () => {
            mockPrompts.mockResolvedValueOnce({ saveAnyway: true });

            const result = await checkConnectionOrPrompt(
                {
                    url: 'invalid-url',
                    systemType: 'OnPrem',
                    authenticationType: 'basic'
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
                    authenticationType: 'basic'
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
                    authenticationType: 'basic'
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
                    username: 'user',
                    password: 'pass'
                },
                false
            );

            expect(result).toBe(true);
            expect(mockLoggerInfo).toHaveBeenCalledWith('✓ Connection successful');
        });

        test('should display error message when available', async () => {
            mockPrompts.mockResolvedValueOnce({ saveAnyway: false });

            await checkConnectionOrPrompt(
                {
                    url: '',
                    systemType: 'OnPrem',
                    authenticationType: 'basic'
                },
                false
            );

            expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining('Invalid URL'));
        });
    });
});
