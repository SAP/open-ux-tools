import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type prompts from 'prompts';

const mockPrompts = jest.fn() as unknown as typeof prompts;
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();

jest.unstable_mockModule('prompts', () => ({ default: mockPrompts }));
jest.unstable_mockModule('../../../../src/tracing/index.js', () => ({
    getLogger: () => ({
        info: mockLoggerInfo,
        warn: mockLoggerWarn
    })
}));

const { checkSystemConnection, checkConnectionOrPrompt } = await import(
    '../../../../src/cli/utils/system-connection.js'
);

describe('system-connection', () => {
    beforeEach(() => {
        mockPrompts.mockReset();
        mockLoggerInfo.mockReset();
        mockLoggerWarn.mockReset();
    });

    describe('checkSystemConnection', () => {
        test('should return success for valid URL', async () => {
            const result = await checkSystemConnection({
                url: 'https://valid.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic'
            });

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });

        test('should return success for valid URL with client', async () => {
            const result = await checkSystemConnection({
                url: 'https://valid.example.com',
                client: '100',
                systemType: 'OnPrem',
                authenticationType: 'basic'
            });

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });

        test('should return success for valid URL with credentials', async () => {
            const result = await checkSystemConnection({
                url: 'https://valid.example.com',
                systemType: 'OnPrem',
                authenticationType: 'basic',
                username: 'testuser',
                password: 'testpass'
            });

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
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
