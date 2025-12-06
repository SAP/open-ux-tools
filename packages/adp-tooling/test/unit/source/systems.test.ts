import { getService } from '@sap-ux/store';
import type { ToolsLogger } from '@sap-ux/logger';
import type { BackendSystem } from '@sap-ux/store';
import { getCredentialsFromStore } from '@sap-ux/system-access';
import { type Destination, isAppStudio, listDestinations } from '@sap-ux/btp-utils';

import { type Endpoint, getEndpointNames, SystemLookup, transformBackendSystem } from '../../../src';

jest.mock('@sap-ux/system-access', () => ({
    ...jest.requireActual('@sap-ux/system-access'),
    getCredentialsFromStore: jest.fn()
}));

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn(),
    listDestinations: jest.fn()
}));

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn()
}));

const getServiceMock = getService as jest.Mock;
const mockIsAppStudio = isAppStudio as jest.Mock;
const listDestinationsMock = listDestinations as jest.Mock;
const getCredentialsFromStoreMock = getCredentialsFromStore as jest.Mock;

const logger: ToolsLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn()
} as unknown as ToolsLogger;

const backendSystems: BackendSystem[] = [
    {
        client: '010',
        name: 'SYS_010',
        password: 'some-pw',
        url: 'some-url',
        userDisplayName: 'some-name',
        username: 'some-user',
        connectionType: 'abap_catalog',
        systemType: 'OnPrem'
    }
];

const mappedBackendSystems: Endpoint[] = [transformBackendSystem(backendSystems[0])];

const destinations: { [name: string]: Destination } = {
    SystemA: {
        Name: 'SystemA',
        'sap-client': '010',
        Host: 'urlA',
        Authentication: 'Basic',
        WebIDEUsage: 'dev_abap'
    } as Destination,
    SystemB: {
        Name: 'SystemB',
        'sap-client': '200',
        Host: 'urlB',
        Authentication: 'NoAuthentication',
        WebIDEUsage: 'dev_abap'
    } as Destination
};

const endpoints = Object.values(destinations);

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

describe('SystemLookup', () => {
    let sourceSystems: SystemLookup;

    beforeEach(() => {
        jest.clearAllMocks();
        sourceSystems = new SystemLookup(logger);
    });

    describe('getSystems', () => {
        test('should fetch systems via loadSystems and cache the result in BAS', async () => {
            mockIsAppStudio.mockReturnValue(true);
            listDestinationsMock.mockResolvedValue(destinations);
            const systemsFirstCall = await sourceSystems.getSystems();
            expect(systemsFirstCall).toEqual(endpoints);

            // A second call should return the cached endpoints (checkEndpoints called only once)
            const systemsSecondCall = await sourceSystems.getSystems();
            expect(listDestinationsMock).toHaveBeenCalledTimes(1);
            expect(systemsSecondCall).toEqual(endpoints);
        });

        test('should fetch systems via loadSystems and cache the result in VS Code', async () => {
            mockIsAppStudio.mockReturnValue(false);
            getServiceMock.mockResolvedValue({
                getAll: jest.fn().mockResolvedValue(backendSystems)
            });
            const systemsFirstCall = await sourceSystems.getSystems();
            expect(systemsFirstCall).toEqual(mappedBackendSystems);
        });

        test('should throw an error if loadSystems fails', async () => {
            const error = new Error('Fetch failed');
            mockIsAppStudio.mockReturnValue(true);
            listDestinationsMock.mockRejectedValue(error);

            await expect(sourceSystems.getSystems()).rejects.toThrow('Fetch failed');

            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch systems list. Reason:'));
        });
    });

    describe('getSystemByName', () => {
        beforeEach(() => {
            mockIsAppStudio.mockReturnValue(true);
            listDestinationsMock.mockResolvedValue(destinations);
        });

        test('should return undefined and warn if no matching system is found', async () => {
            const nonExistingSystem = 'NonExistingSystem';

            const system = await sourceSystems.getSystemByName(nonExistingSystem);

            expect(system).toBeUndefined();
            expect(logger.warn).toHaveBeenCalledWith(`No endpoint found for system: ${nonExistingSystem}`);
        });

        test('should return system details', async () => {
            getCredentialsFromStoreMock.mockResolvedValue(null);

            const system = await sourceSystems.getSystemByName('SystemA');

            expect(system).toEqual({
                Authentication: 'Basic',
                Host: 'urlA',
                Name: 'SystemA',
                WebIDEUsage: 'dev_abap',
                'sap-client': '010'
            });
        });
    });

    describe('getSystemRequiresAuth', () => {
        test('should return true if found endpoint has Authentication "NoAuthentication" in BAS', async () => {
            mockIsAppStudio.mockReturnValue(true);
            listDestinationsMock.mockResolvedValue(destinations);

            const result = await sourceSystems.getSystemRequiresAuth('SystemB');

            expect(result).toBe(true);
        });

        test('should return false if found endpoint has different Authentication in BAS', async () => {
            mockIsAppStudio.mockReturnValue(true);
            listDestinationsMock.mockResolvedValue(destinations);

            const result = await sourceSystems.getSystemRequiresAuth('SystemA');

            expect(result).toBe(false);
        });

        test('should return false if system is found in VS Code', async () => {
            mockIsAppStudio.mockReturnValue(false);
            getServiceMock.mockResolvedValue({
                getAll: jest.fn().mockResolvedValue(backendSystems)
            });

            const result = await sourceSystems.getSystemRequiresAuth('SYS_010');

            expect(result).toBe(false);
        });

        test('should return true if system is not found in VS Code', async () => {
            mockIsAppStudio.mockReturnValue(false);
            getServiceMock.mockResolvedValue({
                getAll: jest.fn().mockResolvedValue(backendSystems)
            });

            const result = await sourceSystems.getSystemRequiresAuth('NonExisting');

            expect(result).toBe(true);
        });
    });
});
