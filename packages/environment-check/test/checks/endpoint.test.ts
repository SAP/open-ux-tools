import { jest } from '@jest/globals';
import type { CatalogServiceResult, Endpoint } from '../../src/types';
import { Severity, UrlServiceType } from '../../src/types';
import type { ServiceProvider } from '@sap-ux/axios-extension';

const mockIsAppStudio = jest.fn();
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: mockIsAppStudio,
    getAppStudioProxyURL: jest.fn(),
    listDestinations: jest.fn()
}));

const mockCreateForDestination = jest.fn();
const mockCreateForAbap = jest.fn();
const mockCreateForAbapOnCloud = jest.fn();
jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    createForDestination: mockCreateForDestination,
    createForAbap: mockCreateForAbap,
    createForAbapOnCloud: mockCreateForAbapOnCloud,
    AtoService: {},
    TransportChecksService: {},
    ODataVersion: { v2: 'v2', v4: 'v4' },
    AbapCloudEnvironment: {
        Standalone: 'Standalone',
        EmbeddedSteampunk: 'EmbeddedSteampunk'
    }
}));

const mockCheckBASDestinations = jest.fn();
const mockCheckBASDestination = jest.fn();
jest.unstable_mockModule('../../src/checks/destination', () => ({
    checkBASDestinations: mockCheckBASDestinations,
    checkBASDestination: mockCheckBASDestination,
    needsUsernamePassword: jest.fn()
}));

const mockCheckStoredSystems = jest.fn();
const mockCheckStoredSystem = jest.fn();
jest.unstable_mockModule('../../src/checks/stored-system', () => ({
    checkStoredSystems: mockCheckStoredSystems,
    checkStoredSystem: mockCheckStoredSystem
}));

const { checkEndpoints, checkEndpoint } = await import('../../src/checks/endpoint');

const mockServiceProvider = {
    log: jest.fn(),
    cookies: {},
    services: {}
} as any as ServiceProvider;

const mockCatalogServiceResult = {
    v2: { results: [] },
    v4: { results: [] }
} as CatalogServiceResult;

const sapSystemOnPrem = {
    Name: 'abap-on-prem',
    Url: 'http://url-on-prem.sap:000/',
    Client: '',
    UserDisplayName: 'user1',
    Credentials: {
        serviceKeysContents: undefined,
        username: 'user1',
        password: 'pass',
        refreshToken: undefined
    },
    Scp: false
};

const sapSystemScp = {
    Name: 'abap-cloud',
    Url: 'https://abap-cloud-url.com',
    Client: undefined,
    UserDisplayName: 'user@sap.com',
    Credentials: {
        serviceKeysContents: {
            binding: {},
            catalogs: {
                abap: {
                    path: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2',
                    type: 'sap_abap_catalog_v1'
                }
            },
            endpoints: {
                abap: undefined
            },
            uaa: {}
        },
        username: undefined,
        password: undefined,
        refreshToken: 'mock-refresh-token'
    },
    Scp: true
} as any as Endpoint;

describe('Endpoint tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('checkEndpoints - destinations returned (BAS)', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);

        const basDestinationResult = {
            messages: [
                {
                    severity: Severity.Info,
                    text: '2 destinations found'
                }
            ],
            destinations: [
                {
                    Name: 'ONE',
                    Type: 'HTTP',
                    Authentication: 'NoAuthentication',
                    ProxyType: 'Internet',
                    Description: 'ONE_DESC',
                    'HTML5.DynamicDestination': 'true',
                    WebIDEUsage: 'odata_abap',
                    UrlServiceType: UrlServiceType.CatalogServiceUrl,
                    Host: 'https://one.dest:123'
                },
                {
                    Name: 'TWO',
                    Type: 'HTTP',
                    Authentication: 'NoAuthentication',
                    ProxyType: 'OnPremise',
                    Description: 'TWO_DESC',
                    'sap-client': '111',
                    WebIDEUsage: 'odata_abap,dev_abap',
                    UrlServiceType: UrlServiceType.CatalogServiceUrl,
                    Host: 'http://two.dest:234'
                }
            ]
        };
        mockCheckBASDestinations.mockResolvedValueOnce(basDestinationResult);

        const checkEndpointResult = await checkEndpoints();

        expect(checkEndpointResult.endpoints.length).toBe(2);
        expect(checkEndpointResult.messages.length).toBe(1);
    });

    test('checkEndpoints - saved sap systems returned (VSCode)', async () => {
        mockIsAppStudio.mockReturnValueOnce(false);

        const storedSystemResult = {
            messages: [
                {
                    severity: Severity.Info,
                    text: '2 sap systems found'
                }
            ],
            storedSystems: [sapSystemOnPrem, sapSystemScp] as any
        };

        mockCheckStoredSystems.mockResolvedValueOnce(storedSystemResult);

        const checkEndpointResult = await checkEndpoints();

        expect(checkEndpointResult.endpoints.length).toBe(2);
        expect(checkEndpointResult.messages.length).toBe(1);
    });

    test('checkEndpoint - get destination details (BAS)', async () => {
        mockIsAppStudio.mockReturnValue(true);

        const checkBASDestinationResult = {
            messages: [],
            destinationResults: {
                catalogService: mockCatalogServiceResult,
                HTML5DynamicDestination: true
            }
        } as any;

        mockCreateForDestination.mockReturnValueOnce(mockServiceProvider);
        mockCheckBASDestination.mockResolvedValueOnce(checkBASDestinationResult);

        const checkEndpointResult = await checkEndpoint(sapSystemOnPrem);

        expect(checkEndpointResult.endpointResults).toEqual({
            catalogService: mockCatalogServiceResult,
            HTML5DynamicDestination: true
        });
    });

    test('checkEndpoint - get on prem sap system details (VSCode)', async () => {
        mockIsAppStudio.mockReturnValue(false);

        const checkStoredSystemResult = {
            messages: [],
            storedSystemResults: {
                catalogService: mockCatalogServiceResult,
                isAtoCatalog: true,
                isSapUi5Repo: true,
                isTransportRequests: true
            }
        } as any;

        mockCreateForAbap.mockReturnValueOnce(mockServiceProvider);
        mockCheckStoredSystem.mockResolvedValueOnce(checkStoredSystemResult);

        const checkEndpointResult = await checkEndpoint(sapSystemOnPrem);

        expect(checkEndpointResult.endpointResults).toEqual({
            catalogService: mockCatalogServiceResult,
            isAtoCatalog: true,
            isSapUi5Repo: true,
            isTransportRequests: true
        });
    });

    test('checkEndpoint - get scp sap system details (VSCode)', async () => {
        mockIsAppStudio.mockReturnValue(false);

        const checkStoredSystemResult = {
            messages: [],
            storedSystemResults: {
                catalogService: mockCatalogServiceResult,
                isAtoCatalog: true,
                isSapUi5Repo: false,
                isTransportRequests: false
            }
        } as any;

        mockCreateForAbapOnCloud.mockReturnValueOnce(mockServiceProvider);
        mockCheckStoredSystem.mockResolvedValueOnce(checkStoredSystemResult);

        const checkEndpointResult = await checkEndpoint(sapSystemScp);

        expect(checkEndpointResult.endpointResults).toEqual({
            catalogService: mockCatalogServiceResult,
            isAtoCatalog: true,
            isSapUi5Repo: false,
            isTransportRequests: false
        });
    });
});
