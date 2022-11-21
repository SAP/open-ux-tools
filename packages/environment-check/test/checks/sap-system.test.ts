import { isAppStudio } from '@sap-ux/btp-utils';
import type { CatalogServiceResult, SapSystem } from '../../src/types';
import { Severity, UrlServiceType } from '../../src/types';
import { checkSapSystems, checkSapSystem } from '../../src/checks/sap-system';
import * as basDestination from '../../src/checks/destination';
import * as storedSystem from '../../src/checks/stored-system';
import { createForDestination, createForAbap, createForAbapOnCloud } from '@sap-ux/axios-extension';
import type { ServiceProvider } from '@sap-ux/axios-extension';
import * as catalogService from '../../src/checks/catalog-service';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));
const mockIsAppStudio = isAppStudio as jest.Mock;

jest.mock('@sap-ux/axios-extension', () => ({
    createForDestination: jest.fn(),
    createForAbap: jest.fn(),
    createForAbapOnCloud: jest.fn(),
    AbapCloudEnvironment: {
        Standalone: 'Standalone',
        EmbeddedSteampunk: 'EmbeddedSteampunk'
    }
}));

const mockCreateForDestination = createForDestination as jest.Mock;
const mockCreateForAbap = createForAbap as jest.Mock;
const mockCreateForAbapOnCloud = createForAbapOnCloud as jest.Mock;

const mockServiceProvider = {
    log: jest.fn(),
    cookies: {},
    services: {}
} as any as ServiceProvider;

const mockCatalogServiceResult = {
    v2: { results: [] },
    v4: {}
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
} as any as SapSystem;

describe('Sap system tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('checkSapSystems - destinations returned (BAS)', async () => {
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
        jest.spyOn(basDestination, 'checkBASDestinations').mockResolvedValueOnce(basDestinationResult);

        const checkSapSysResult = await checkSapSystems();

        expect(checkSapSysResult.sapSystems.length).toBe(2);
        expect(checkSapSysResult.messages.length).toBe(1);
    });

    test('checkSapSystems - saved sap systems returned (VSCode)', async () => {
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

        jest.spyOn(storedSystem, 'checkStoredSystems').mockResolvedValueOnce(storedSystemResult);

        const checkSapSysResult = await checkSapSystems();

        expect(checkSapSysResult.sapSystems.length).toBe(2);
        expect(checkSapSysResult.messages.length).toBe(1);
    });

    test('checkSapSystem - get destination details (BAS)', async () => {
        mockIsAppStudio.mockReturnValue(true);

        const checkCatalogServicesResult = {
            messages: [],
            result: mockCatalogServiceResult
        };

        const checkBASDestinationResult = {
            messages: [],
            destinationResults: {
                HTML5DynamicDestination: true
            }
        };

        mockCreateForDestination.mockReturnValueOnce(mockServiceProvider);
        jest.spyOn(catalogService, 'checkCatalogServices').mockResolvedValueOnce(checkCatalogServicesResult);
        jest.spyOn(basDestination, 'checkBASDestination').mockResolvedValueOnce(checkBASDestinationResult);

        const checkSapSysResult = await checkSapSystem(sapSystemOnPrem);

        expect(checkSapSysResult.sapSystemResults).toEqual({
            catalogService: mockCatalogServiceResult,
            HTML5DynamicDestination: true
        });
    });

    test('checkSapSystem - get on prem sap system details (VSCode)', async () => {
        mockIsAppStudio.mockReturnValue(false);

        const checkCatalogServicesResult = {
            messages: [],
            result: mockCatalogServiceResult
        };

        const checkStoredSystemResult = {
            messages: [],
            storedSystemResults: {
                isAtoCatalog: true,
                isSapUi5Repo: true,
                isTransportRequests: true
            }
        };

        mockCreateForAbap.mockReturnValueOnce(mockServiceProvider);
        jest.spyOn(catalogService, 'checkCatalogServices').mockResolvedValueOnce(checkCatalogServicesResult);
        jest.spyOn(storedSystem, 'checkStoredSystem').mockResolvedValueOnce(checkStoredSystemResult);

        const checkSapSysResult = await checkSapSystem(sapSystemOnPrem);

        expect(checkSapSysResult.sapSystemResults).toEqual({
            catalogService: mockCatalogServiceResult,
            isAtoCatalog: true,
            isSapUi5Repo: true,
            isTransportRequests: true
        });
    });

    test('checkSapSystem - get scp sap system details (VSCode)', async () => {
        mockIsAppStudio.mockReturnValue(false);

        const checkCatalogServicesResult = {
            messages: [],
            result: mockCatalogServiceResult
        };

        const checkStoredSystemResult = {
            messages: [],
            storedSystemResults: {
                isAtoCatalog: true,
                isSapUi5Repo: false,
                isTransportRequests: false
            }
        };

        mockCreateForAbapOnCloud.mockReturnValueOnce(mockServiceProvider);
        jest.spyOn(catalogService, 'checkCatalogServices').mockResolvedValueOnce(checkCatalogServicesResult);
        jest.spyOn(storedSystem, 'checkStoredSystem').mockResolvedValueOnce(checkStoredSystemResult);

        const checkSapSysResult = await checkSapSystem(sapSystemScp);

        expect(checkSapSysResult.sapSystemResults).toEqual({
            catalogService: mockCatalogServiceResult,
            isAtoCatalog: true,
            isSapUi5Repo: false,
            isTransportRequests: false
        });
    });
});
