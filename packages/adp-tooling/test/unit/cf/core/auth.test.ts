import { cfGetAuthToken } from '@sap/cf-tools';

import type { ToolsLogger } from '@sap-ux/logger';

import type { CfConfig } from '../../../../src/types';
import { isExternalLoginEnabled, isLoggedInCf } from '../../../../src/cf/core/auth';

jest.mock('@sap/cf-tools', () => ({
    ...jest.requireActual('@sap/cf-tools'),
    cfGetAuthToken: jest.fn()
}));

const mockCfGetAuthToken = cfGetAuthToken as jest.MockedFunction<typeof cfGetAuthToken>;

const mockCfConfig: CfConfig = {
    org: {
        GUID: 'test-org-guid',
        Name: 'test-org'
    },
    space: {
        GUID: 'test-space-guid',
        Name: 'test-space'
    },
    token: 'test-token',
    url: 'https://test.cf.com'
};

describe('CF Core Auth', () => {
    const mockLogger = {
        log: jest.fn(),
        error: jest.fn()
    } as unknown as ToolsLogger;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isExternalLoginEnabled', () => {
        test('should return true when cf.login command is available', async () => {
            const mockVscode = {
                commands: {
                    getCommands: jest.fn().mockResolvedValue(['cf.login', 'other.command'])
                }
            };

            const result = await isExternalLoginEnabled(mockVscode);

            expect(result).toBe(true);
            expect(mockVscode.commands.getCommands).toHaveBeenCalledTimes(1);
        });

        test('should return false when cf.login command is not available', async () => {
            const mockVscode = {
                commands: {
                    getCommands: jest.fn().mockResolvedValue(['other.command', 'another.command'])
                }
            };

            const result = await isExternalLoginEnabled(mockVscode);

            expect(result).toBe(false);
            expect(mockVscode.commands.getCommands).toHaveBeenCalledTimes(1);
        });
    });

    describe('isLoggedInCf', () => {
        test('should return true when user is logged in and has a valid token', async () => {
            const mockToken = 'bearer mock-auth-token';
            mockCfGetAuthToken.mockResolvedValue(mockToken);

            const result = await isLoggedInCf(mockCfConfig, mockLogger);

            expect(result).toBe(true);
            expect(mockCfGetAuthToken).toHaveBeenCalledTimes(1);
            expect(mockLogger.log).toHaveBeenCalledWith(`Retrieved CF auth token: ${mockToken}`);
        });

        test('should return false when cfGetAuthToken throws an error', async () => {
            const error = new Error('CF API error');
            mockCfGetAuthToken.mockRejectedValue(error);

            const result = await isLoggedInCf(mockCfConfig, mockLogger);

            expect(result).toBe(false);
            expect(mockCfGetAuthToken).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledWith(
                `Error occurred while trying to check if it is logged in: ${error.message}`
            );
        });

        test('should return false when cfConfig is undefined', async () => {
            const result = await isLoggedInCf(undefined as any, mockLogger);

            expect(result).toBe(false);
            expect(mockCfGetAuthToken).not.toHaveBeenCalled();
            expect(mockLogger.error).toHaveBeenCalledWith('CF config is not provided');
        });
    });
});
