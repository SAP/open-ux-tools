import { getService } from '@sap-ux/store';
import type { ToolsLogger } from '@sap-ux/logger';
import type { BackendSystem } from '@sap-ux/store';
import { getCredentialsFromStore } from '@sap-ux/system-access';
import { type Destination, isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import type { AbapServiceProvider, LayeredRepositoryService } from '@sap-ux/axios-extension';
import { AdaptationProjectType } from '@sap-ux/axios-extension';

import {
    type Endpoint,
    getEndpointNames,
    getSupportedProject,
    SupportedProject,
    SystemLookup,
    transformBackendSystem
} from '../../../src';
import { type AxiosResponseHeaders, AxiosError } from 'axios';
import { t } from '../../../src/i18n';

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
    },
    {
        client: '100',
        name: undefined as any,
        password: 'some-pw',
        url: 'undefined-name-url',
        userDisplayName: 'No Name User',
        username: 'no-name-user',
        connectionType: 'abap_catalog',
        systemType: 'AbapCloud'
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

// Helper functions

function getAxiosError(status: number, message?: string): AxiosError {
    return new AxiosError(message, status.toString(10), undefined, undefined, {
        status,
        statusText: message ?? 'error',
        headers: {},
        config: { headers: {} as unknown as AxiosResponseHeaders },
        data: {}
    });
}

describe('getSupportedProject', () => {
    let mockProvider: AbapServiceProvider;
    let mockLrepService: LayeredRepositoryService;
    let getSystemInfoSpy: jest.Mock;

    beforeEach(() => {
        getSystemInfoSpy = jest.fn();
        mockLrepService = {
            getSystemInfo: getSystemInfoSpy
        } as unknown as LayeredRepositoryService;

        mockProvider = {
            getLayeredRepository: jest.fn().mockReturnValue(mockLrepService)
        } as unknown as AbapServiceProvider;
    });

    it('should return CLOUD_READY_AND_ON_PREM when both types are supported', async () => {
        getSystemInfoSpy.mockResolvedValue({
            adaptationProjectTypes: [AdaptationProjectType.CLOUD_READY, AdaptationProjectType.ON_PREMISE]
        });

        const result = await getSupportedProject(mockProvider);

        expect(result).toBe(SupportedProject.CLOUD_READY_AND_ON_PREM);
        expect(mockProvider.getLayeredRepository).toHaveBeenCalled();
        expect(getSystemInfoSpy).toHaveBeenCalled();
    });

    it('should return CLOUD_READY when only cloud ready is supported', async () => {
        getSystemInfoSpy.mockResolvedValue({
            adaptationProjectTypes: [AdaptationProjectType.CLOUD_READY]
        });

        const result = await getSupportedProject(mockProvider);

        expect(result).toBe(SupportedProject.CLOUD_READY);
    });

    it('should return ON_PREM when only on-premise is supported', async () => {
        getSystemInfoSpy.mockResolvedValue({
            adaptationProjectTypes: [AdaptationProjectType.ON_PREMISE]
        });

        const result = await getSupportedProject(mockProvider);

        expect(result).toBe(SupportedProject.ON_PREM);
    });

    it('should return ON_PREM when API returns 404 error', async () => {
        const error = getAxiosError(404);
        getSystemInfoSpy.mockRejectedValue(error);

        const result = await getSupportedProject(mockProvider);

        expect(result).toBe(SupportedProject.ON_PREM);
    });

    it('should return ON_PREM when API returns 405 error', async () => {
        const error = getAxiosError(405);
        getSystemInfoSpy.mockRejectedValue(error);

        const result = await getSupportedProject(mockProvider);

        expect(result).toBe(SupportedProject.ON_PREM);
    });

    it('should throw error when API returns other errors', async () => {
        const error = getAxiosError(500, 'Internal Server Error');
        getSystemInfoSpy.mockRejectedValue(error);

        await expect(getSupportedProject(mockProvider)).rejects.toThrow(error);
    });

    it('should throw error when adaptationProjectTypes is empty', async () => {
        getSystemInfoSpy.mockResolvedValue({
            adaptationProjectTypes: []
        });

        await expect(getSupportedProject(mockProvider)).rejects.toThrow(t('error.projectTypeNotProvided'));
    });

    it('should throw error when adaptationProjectTypes is undefined', async () => {
        getSystemInfoSpy.mockResolvedValue({});

        await expect(getSupportedProject(mockProvider)).rejects.toThrow(t('error.projectTypeNotProvided'));
    });

    it('should throw error for non-axios errors', async () => {
        const error = new Error('Generic error');
        getSystemInfoSpy.mockRejectedValue(error);

        await expect(getSupportedProject(mockProvider)).rejects.toThrow(error);
    });
});

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

        test('should filter out systems with undefined names in VS Code', async () => {
            mockIsAppStudio.mockReturnValue(false);
            getServiceMock.mockResolvedValue({
                getAll: jest.fn().mockResolvedValue(backendSystems)
            });

            const systems = await sourceSystems.getSystems();

            expect(systems).toHaveLength(1);
            expect(systems[0].Name).toBe('SYS_010');
            expect(systems.every((s) => s.Name !== undefined)).toBe(true);
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

        test('should return false if system is found with credentials in VS Code', async () => {
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

        test('should return true if system is found but credentials are missing in VS Code', async () => {
            mockIsAppStudio.mockReturnValue(false);
            const systemWithoutCredentials: BackendSystem = {
                client: '010',
                name: 'SYS_NO_CREDS',
                password: undefined as any,
                url: 'some-url',
                userDisplayName: 'some-name',
                username: undefined as any,
                connectionType: 'abap_catalog',
                systemType: 'OnPrem'
            };
            getServiceMock.mockResolvedValue({
                getAll: jest.fn().mockResolvedValue([...backendSystems, systemWithoutCredentials])
            });

            const result = await sourceSystems.getSystemRequiresAuth('SYS_NO_CREDS');

            expect(result).toBe(true);
        });

        test('should return false for AbapCloud system even without credentials in VS Code', async () => {
            mockIsAppStudio.mockReturnValue(false);
            const cloudSystem: BackendSystem = {
                client: '100',
                name: 'CLOUD_SYS',
                password: undefined as any,
                url: 'cloud-url',
                userDisplayName: 'Cloud User',
                username: undefined as any,
                connectionType: 'abap_catalog',
                systemType: 'AbapCloud'
            };
            getServiceMock.mockResolvedValue({
                getAll: jest.fn().mockResolvedValue([cloudSystem])
            });

            const result = await sourceSystems.getSystemRequiresAuth('CLOUD_SYS');

            expect(result).toBe(false);
        });

        test('should return false for OnPrem system with both username and password', async () => {
            mockIsAppStudio.mockReturnValue(false);
            const systemWithCreds: BackendSystem = {
                client: '010',
                name: 'FULL_CREDS',
                password: 'testpass',
                url: 'full-creds-url',
                userDisplayName: 'Full Creds User',
                username: 'testuser',
                connectionType: 'abap_catalog',
                systemType: 'OnPrem'
            };
            getServiceMock.mockResolvedValue({
                getAll: jest.fn().mockResolvedValue([systemWithCreds])
            });

            const result = await sourceSystems.getSystemRequiresAuth('FULL_CREDS');

            expect(result).toBe(false);
        });

        test('should return false for system with undefined SystemType but has credentials', async () => {
            mockIsAppStudio.mockReturnValue(false);
            const systemUndefinedType: BackendSystem = {
                client: '010',
                name: 'UNDEFINED_TYPE',
                password: 'testpass',
                url: 'undefined-type-url',
                userDisplayName: 'Undefined Type User',
                username: 'testuser',
                connectionType: 'abap_catalog',
                systemType: undefined as any
            };
            getServiceMock.mockResolvedValue({
                getAll: jest.fn().mockResolvedValue([systemUndefinedType])
            });

            const result = await sourceSystems.getSystemRequiresAuth('UNDEFINED_TYPE');

            expect(result).toBe(false);
        });

        test('should return false for system with non-OnPrem SystemType and missing credentials', async () => {
            mockIsAppStudio.mockReturnValue(false);
            const nonOnPremSystem: BackendSystem = {
                client: '010',
                name: 'NON_ONPREM',
                password: undefined as any,
                url: 'non-onprem-url',
                userDisplayName: 'Non OnPrem User',
                username: undefined as any,
                connectionType: 'abap_catalog',
                systemType: 'SomeOtherType' as any
            };
            getServiceMock.mockResolvedValue({
                getAll: jest.fn().mockResolvedValue([nonOnPremSystem])
            });

            const result = await sourceSystems.getSystemRequiresAuth('NON_ONPREM');

            expect(result).toBe(false);
        });
    });
});
