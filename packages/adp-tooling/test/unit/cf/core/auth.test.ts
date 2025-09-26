import type { ToolsLogger } from '@sap-ux/logger';

import { getAuthToken } from '../../../../src/cf/services/cli';
import type { CfConfig, Organization } from '../../../../src/types';
import { isExternalLoginEnabled, isLoggedInCf } from '../../../../src/cf/core/auth';

jest.mock('@sap/cf-tools/out/src/cf-local', () => ({
    cfGetAvailableOrgs: jest.fn()
}));

jest.mock('../../../../src/cf/services/cli', () => ({
    getAuthToken: jest.fn()
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockCFLocal = require('@sap/cf-tools/out/src/cf-local');
const mockGetAuthToken = getAuthToken as jest.MockedFunction<typeof getAuthToken>;

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

const mockOrganizations: Organization[] = [
    {
        GUID: 'org-1-guid',
        Name: 'org-1'
    },
    {
        GUID: 'org-2-guid',
        Name: 'org-2'
    }
];

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
        test('should return true when user is logged in and has organizations', async () => {
            mockGetAuthToken.mockResolvedValue('test-token');
            mockCFLocal.cfGetAvailableOrgs.mockResolvedValue(mockOrganizations);

            const result = await isLoggedInCf(mockCfConfig, mockLogger);

            expect(result).toBe(true);
            expect(mockGetAuthToken).toHaveBeenCalledTimes(1);
            expect(mockCFLocal.cfGetAvailableOrgs).toHaveBeenCalledTimes(1);
            expect(mockLogger.log).toHaveBeenCalledWith(
                `Available organizations: ${JSON.stringify(mockOrganizations)}`
            );
        });

        test('should return false when user is not logged in (no organizations)', async () => {
            mockGetAuthToken.mockResolvedValue('test-token');
            mockCFLocal.cfGetAvailableOrgs.mockResolvedValue([]);

            const result = await isLoggedInCf(mockCfConfig, mockLogger);

            expect(result).toBe(false);
            expect(mockGetAuthToken).toHaveBeenCalledTimes(1);
            expect(mockCFLocal.cfGetAvailableOrgs).toHaveBeenCalledTimes(1);
            expect(mockLogger.log).toHaveBeenCalledWith('Available organizations: []');
        });

        test('should return false when cfGetAvailableOrgs throws an error', async () => {
            const error = new Error('CF API error');
            mockGetAuthToken.mockResolvedValue('test-token');
            mockCFLocal.cfGetAvailableOrgs.mockRejectedValue(error);

            const result = await isLoggedInCf(mockCfConfig, mockLogger);

            expect(result).toBe(false);
            expect(mockGetAuthToken).toHaveBeenCalledTimes(1);
            expect(mockCFLocal.cfGetAvailableOrgs).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledWith(
                `Error occurred while trying to check if it is logged in: ${error.message}`
            );
        });

        test('should return false when cfConfig is undefined', async () => {
            mockGetAuthToken.mockResolvedValue('test-token');

            const result = await isLoggedInCf(undefined as any, mockLogger);

            expect(result).toBe(false);
            expect(mockGetAuthToken).toHaveBeenCalledTimes(1);
            expect(mockCFLocal.cfGetAvailableOrgs).not.toHaveBeenCalled();
        });

        test('should handle getAuthToken errors', async () => {
            const error = new Error('Auth token error');
            mockGetAuthToken.mockRejectedValue(error);

            await expect(isLoggedInCf(mockCfConfig, mockLogger)).rejects.toThrow('Auth token error');
            expect(mockGetAuthToken).toHaveBeenCalledTimes(1);
            expect(mockCFLocal.cfGetAvailableOrgs).not.toHaveBeenCalled();
        });
    });
});
