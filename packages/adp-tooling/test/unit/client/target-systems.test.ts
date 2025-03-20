import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Endpoint } from '@sap-ux/environment-check';
import { checkEndpoints } from '@sap-ux/environment-check';
import { getCredentialsFromStore } from '@sap-ux/system-access';

import { getEndpointNames, TargetSystems } from '../../../src';

jest.mock('@sap-ux/environment-check', () => ({
    ...jest.requireActual('@sap-ux/environment-check'),
    checkEndpoints: jest.fn()
}));

jest.mock('@sap-ux/system-access', () => ({
    ...jest.requireActual('@sap-ux/system-access'),
    getCredentialsFromStore: jest.fn()
}));

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

const mockIsAppStudio = isAppStudio as jest.Mock;
const checkEndpointsMock = checkEndpoints as jest.Mock;
const getCredentialsFromStoreMock = getCredentialsFromStore as jest.Mock;

const logger: ToolsLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn()
} as unknown as ToolsLogger;

describe('getEndpointNames', () => {
    test('should return endpoint names sorted alphabetically (case-insensitive)', () => {
        const endpoints: Endpoint[] = [
            { Name: 'Zeta', Client: '001', Url: 'url1', Authentication: 'Basic' },
            { Name: 'alpha', Client: '002', Url: 'url2', Authentication: 'NoAuthentication' },
            { Name: 'Beta', Client: '003', Url: 'url3', Authentication: 'Basic' }
        ];
        const sortedNames = getEndpointNames(endpoints);
        expect(sortedNames).toEqual(['alpha', 'Beta', 'Zeta']);
    });
});

describe('TargetSystems', () => {
    let targetSystems: TargetSystems;
    const endpoints: Endpoint[] = [
        { Name: 'SystemA', Client: '010', Url: 'http://systema.com', Authentication: 'Basic' },
        { Name: 'SystemB', Client: '200', Url: 'http://systemb.com', Authentication: 'NoAuthentication' }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        targetSystems = new TargetSystems(logger);
    });

    describe('getSystems', () => {
        test('should fetch systems via checkEndpoints and cache the result', async () => {
            checkEndpointsMock.mockResolvedValue({ endpoints });
            const systemsFirstCall = await targetSystems.getSystems();
            expect(systemsFirstCall).toEqual(endpoints);

            // A second call should return the cached endpoints (checkEndpoints called only once)
            const systemsSecondCall = await targetSystems.getSystems();
            expect(checkEndpoints).toHaveBeenCalledTimes(1);
            expect(systemsSecondCall).toEqual(endpoints);
        });

        test('should throw an error if checkEndpoints fails', async () => {
            const error = new Error('Fetch failed');
            checkEndpointsMock.mockRejectedValue(error);

            await expect(targetSystems.getSystems()).rejects.toThrow('Fetch failed');

            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch systems list. Reason:'));
        });
    });

    describe('getSystemDetails', () => {
        test('should return undefined and warn if no matching system is found', async () => {
            const system = 'NonExistingSystem';
            checkEndpointsMock.mockResolvedValue({ endpoints });

            const details = await targetSystems.getSystemDetails(system);

            expect(details).toBeUndefined();
            expect(logger.warn).toHaveBeenCalledWith(`No endpoint found for system: ${system}`);
        });

        test('should return system details without credentials if getCredentialsFromStore returns null', async () => {
            checkEndpointsMock.mockResolvedValue({ endpoints });
            getCredentialsFromStoreMock.mockResolvedValue(null);

            const details = await targetSystems.getSystemDetails('SystemA');

            expect(details).toEqual({
                client: '010',
                url: 'http://systema.com'
            });
        });

        test('should return system details with credentials if getCredentialsFromStore returns credentials', async () => {
            const storedCreds = {
                authenticationType: 'Basic',
                username: 'user1',
                password: 'pass1'
            };
            checkEndpointsMock.mockResolvedValue({ endpoints });
            getCredentialsFromStoreMock.mockResolvedValue(storedCreds);

            const details = await targetSystems.getSystemDetails('SystemA');

            expect(details).toEqual({
                client: '010',
                url: 'http://systema.com',
                authenticationType: 'Basic',
                username: 'user1',
                password: 'pass1'
            });
        });

        test('should return undefined if getCredentialsFromStore throws an error', async () => {
            const error = new Error('Credential fetch error');

            checkEndpointsMock.mockResolvedValue({ endpoints });
            getCredentialsFromStoreMock.mockRejectedValue(error);

            const details = await targetSystems.getSystemDetails('SystemA');

            expect(details).toBeUndefined();
            expect(logger.error).toHaveBeenCalledWith('Error fetching credentials from store for system: SystemA');
            expect(logger.debug).toHaveBeenCalledWith(error.message);
        });
    });

    describe('getSystemRequiresAuth', () => {
        test('should throw error if system not found in BAS', async () => {
            checkEndpointsMock.mockResolvedValue({ endpoints });
            mockIsAppStudio.mockReturnValue(true);

            await expect(targetSystems.getSystemRequiresAuth('NonExisting')).rejects.toThrow(
                'System: NonExisting not found in AppStudio environment.'
            );
        });

        test('should return true if found endpoint has Authentication "NoAuthentication" in BAS', async () => {
            checkEndpointsMock.mockResolvedValue({ endpoints });
            mockIsAppStudio.mockReturnValue(true);

            const result = await targetSystems.getSystemRequiresAuth('SystemB');

            expect(result).toBe(true);
        });

        test('should return false if found endpoint has different Authentication in BAS', async () => {
            checkEndpointsMock.mockResolvedValue({ endpoints });
            mockIsAppStudio.mockReturnValue(true);

            const result = await targetSystems.getSystemRequiresAuth('SystemA');

            expect(result).toBe(false);
        });

        test('should return false if system is found in VS Code', async () => {
            checkEndpointsMock.mockResolvedValue({ endpoints });
            mockIsAppStudio.mockReturnValue(false);

            const result = await targetSystems.getSystemRequiresAuth('SystemA');

            expect(result).toBe(false);
        });

        test('should return true if system is not found in VS Code', async () => {
            checkEndpointsMock.mockResolvedValue({ endpoints });
            mockIsAppStudio.mockReturnValue(false);

            const result = await targetSystems.getSystemRequiresAuth('NonExisting');

            expect(result).toBe(true);
        });
    });
});
