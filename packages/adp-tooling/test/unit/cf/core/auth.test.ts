import { cfGetAvailableOrgs, type Organization } from '@sap/cf-tools';

import type { ToolsLogger } from '@sap-ux/logger';

import type { CfConfig } from '../../../../src/types';
import { isExternalLoginEnabled, isLoggedInCf } from '../../../../src/cf/core/auth';

jest.mock('@sap/cf-tools', () => ({
    ...jest.requireActual('@sap/cf-tools'),
    cfGetAvailableOrgs: jest.fn()
}));

const mockCfGetAvailableOrgs = cfGetAvailableOrgs as jest.MockedFunction<typeof cfGetAvailableOrgs>;

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
        guid: 'org-1-guid',
        label: 'org-1'
    },
    {
        guid: 'org-2-guid',
        label: 'org-2'
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
            mockCfGetAvailableOrgs.mockResolvedValue(mockOrganizations);

            const result = await isLoggedInCf(mockCfConfig, mockLogger);

            expect(result).toBe(true);
            expect(mockCfGetAvailableOrgs).toHaveBeenCalledTimes(1);
            expect(mockLogger.log).toHaveBeenCalledWith(
                `Available organizations: ${JSON.stringify(mockOrganizations)}`
            );
        });

        test('should return false when cfGetAvailableOrgs throws an error', async () => {
            const error = new Error('CF API error');
            mockCfGetAvailableOrgs.mockRejectedValue(error);

            const result = await isLoggedInCf(mockCfConfig, mockLogger);

            expect(result).toBe(false);
            expect(mockCfGetAvailableOrgs).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledWith(
                `Error occurred while trying to check if it is logged in: ${error.message}`
            );
        });

        test('should return false when cfConfig is undefined', async () => {
            const result = await isLoggedInCf(undefined as any, mockLogger);

            expect(result).toBe(false);
            expect(mockCfGetAvailableOrgs).not.toHaveBeenCalled();
            expect(mockLogger.error).toHaveBeenCalledWith('CF config is not provided');
        });
    });
});
