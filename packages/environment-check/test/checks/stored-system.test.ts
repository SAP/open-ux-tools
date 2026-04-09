import { jest } from '@jest/globals';
import type { CatalogServiceResult } from '../../src/types';
import { Severity } from '../../src/types';

const mockGetService = jest.fn();
jest.unstable_mockModule('@sap-ux/store', () => ({
    getService: mockGetService,
    BackendSystemKey: class BackendSystemKey {
        url: string;
        client: string;
        constructor(opts: any) {
            this.url = opts.url;
            this.client = opts.client;
        }
    }
}));

const mockCheckCatalogServices = jest.fn();
const mockCheckAtoCatalog = jest.fn();
const mockCheckUi5AbapRepository = jest.fn();
const mockCheckTransportRequests = jest.fn();
jest.unstable_mockModule('../../src/checks/service-checks', () => ({
    checkCatalogServices: mockCheckCatalogServices,
    checkAtoCatalog: mockCheckAtoCatalog,
    checkUi5AbapRepository: mockCheckUi5AbapRepository,
    checkTransportRequests: mockCheckTransportRequests,
    getServiceProvider: jest.fn()
}));

const { checkStoredSystem, checkStoredSystems } = await import('../../src/checks/stored-system');

describe('Stored system tests ', () => {
    const checkCatalogServicesResult = {
        messages: [],
        result: {
            v2: {},
            v4: {}
        } as CatalogServiceResult
    };

    test('checkStoredSystem() - service checks returned (on-prem)', async () => {
        const read = jest.fn();
        read.mockImplementationOnce(() => {
            return {
                name: 'abap-on-prem',
                url: 'http://url-on-prem.sap:5000/sap/bc/gui/sap/its/webgui?sap-client=100&sap-language=EN',
                client: '000',
                userDisplayName: 'user1',
                username: 'user1',
                password: 'pass'
            };
        });

        mockGetService.mockImplementationOnce(() => {
            return {
                logger: jest.fn(),
                dataProvider: {},
                read: jest.fn()
            } as any;
        });

        const atoResult = {
            messages: [
                {
                    severity: Severity.Info,
                    text: 'ato available'
                }
            ],
            isAtoCatalog: true
        };

        const ui5AbapRepoResult = {
            messages: [
                {
                    severity: Severity.Info,
                    text: 'sap ui5 repo available'
                }
            ],
            isSapUi5Repo: true
        };

        const transportRequestResult = {
            messages: [
                {
                    severity: Severity.Info,
                    text: 'transport requests available'
                }
            ],
            isTransportRequests: true
        };
        mockCheckCatalogServices.mockResolvedValueOnce(checkCatalogServicesResult);
        mockCheckAtoCatalog.mockResolvedValueOnce(atoResult);
        mockCheckUi5AbapRepository.mockResolvedValueOnce(ui5AbapRepoResult);
        mockCheckTransportRequests.mockResolvedValueOnce(transportRequestResult);

        const storeSystemResult = await checkStoredSystem({
            Name: 'sys1',
            Url: 'http://url-on-prem.sap:5000/sap/bc/gui/sap/its/webgui?sap-client=100&sap-language=EN',
            Client: '000'
        });

        expect(storeSystemResult.messages.length).toBe(3);
        expect(storeSystemResult.storedSystemResults.isAtoCatalog).toBe(true);
        expect(storeSystemResult.storedSystemResults.isTransportRequests).toBe(true);
        expect(storeSystemResult.storedSystemResults.isSapUi5Repo).toBe(true);
        expect(storeSystemResult.storedSystemResults.HTML5DynamicDestination).toBe(undefined);
    });

    test('checkStoredSystem() - service checks returned (btp)', async () => {
        const read = jest.fn();
        read.mockImplementationOnce(() => {
            return {
                name: 'abap-cloud',
                url: 'https://abap-cloud-url.com',
                userDisplayName: 'user@sap.com',
                serviceKeys: {
                    binding: {},
                    catalogs: {
                        abap: {
                            path: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2',
                            type: 'sap_abap_catalog_v1'
                        }
                    },
                    endpoints: {
                        abap: 'mock-endpoint'
                    }
                },
                refreshToken: 'mock-refresh-token'
            };
        });

        mockGetService.mockImplementationOnce(() => {
            return {
                logger: jest.fn(),
                dataProvider: {},
                read: jest.fn()
            } as any;
        });

        const atoResult = {
            messages: [
                {
                    severity: Severity.Info,
                    text: 'ato available'
                }
            ],
            isAtoCatalog: true
        };

        const ui5AbapRepoResult = {
            messages: [
                {
                    severity: Severity.Info,
                    text: 'sap ui5 repo available'
                }
            ],
            isSapUi5Repo: true
        };

        const transportRequestResult = {
            messages: [
                {
                    severity: Severity.Info,
                    text: 'transport requests available'
                }
            ],
            isTransportRequests: true
        };
        mockCheckCatalogServices.mockResolvedValueOnce(checkCatalogServicesResult);
        mockCheckAtoCatalog.mockResolvedValueOnce(atoResult);
        mockCheckUi5AbapRepository.mockResolvedValueOnce(ui5AbapRepoResult);
        mockCheckTransportRequests.mockResolvedValueOnce(transportRequestResult);

        const storeSystemResult = await checkStoredSystem({
            Name: 'sys1',
            Url: 'http://url-on-prem.sap:5000/sap/bc/gui/sap/its/webgui?sap-client=100&sap-language=EN',
            Client: '000'
        });

        expect(storeSystemResult.messages.length).toBe(3);
        expect(storeSystemResult.storedSystemResults.isAtoCatalog).toBe(true);
        expect(storeSystemResult.storedSystemResults.isTransportRequests).toBe(true);
        expect(storeSystemResult.storedSystemResults.isSapUi5Repo).toBe(true);
        expect(storeSystemResult.storedSystemResults.HTML5DynamicDestination).toBe(undefined);
    });

    test('checkStoredSystems - systems returned from store', async () => {
        const getAll = jest.fn();

        getAll.mockImplementationOnce(() => {
            return [
                {
                    name: 'abap-on-prem',
                    url: 'http://url-on-prem.sap:5000/sap/bc/gui/sap/its/webgui?sap-client=100&sap-language=EN',
                    client: '',
                    userDisplayName: 'user1',
                    username: 'user1',
                    password: 'pass'
                },
                {
                    name: 'abap-on-prem2',
                    url: 'http://url-on-prem2.sap/',
                    client: '',
                    userDisplayName: 'user2',
                    password: 'pass'
                },
                {
                    name: 'abap-on-prem3',
                    url: 'http://url-on-prem3.sap/',
                    client: '',
                    userDisplayName: 'user3'
                },
                {
                    name: 'abap-cloud',
                    url: 'https://abap-cloud-url.com',
                    userDisplayName: 'user@sap.com',
                    serviceKeys: {
                        binding: {},
                        catalogs: {
                            abap: {
                                path: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2',
                                type: 'sap_abap_catalog_v1'
                            }
                        },
                        endpoints: {
                            abap: 'mock-endpoint'
                        }
                    },
                    refreshToken: 'mock-refresh-token'
                }
            ];
        });

        mockGetService.mockImplementationOnce(() => {
            return {
                logger: jest.fn(),
                dataProvider: {},
                getAll: getAll
            } as any;
        });

        const expectedData = [
            {
                Name: 'abap-on-prem',
                Url: 'http://url-on-prem.sap:5000/sap/bc/gui/sap/its/webgui?sap-client=100&sap-language=EN',
                Client: '',
                UserDisplayName: 'user1',
                Scp: false
            },
            {
                Name: 'abap-on-prem2',
                Url: 'http://url-on-prem2.sap/',
                Client: '',
                UserDisplayName: 'user2',
                Scp: false
            },
            {
                Name: 'abap-on-prem3',
                Url: 'http://url-on-prem3.sap/',
                Client: '',
                UserDisplayName: 'user3',
                Scp: false
            },
            {
                Name: 'abap-cloud',
                Url: 'https://abap-cloud-url.com',
                Client: undefined,
                UserDisplayName: 'user@sap.com',
                Scp: true
            }
        ];

        const storeSystemsResult = await checkStoredSystems();
        expect(storeSystemsResult.storedSystems).toEqual(expectedData);
        expect(storeSystemsResult.messages.length).toBe(1);
        expect(storeSystemsResult.messages[0].severity).toBe(Severity.Info);
    });

    test('checkStoredSystems - no systems returned from store', async () => {
        const getAll = jest.fn();

        getAll.mockImplementationOnce(() => {
            return [];
        });

        mockGetService.mockImplementationOnce(() => {
            return {
                logger: jest.fn(),
                dataProvider: {},
                getAll: getAll
            } as any;
        });

        const storeSystemsResult = await checkStoredSystems();
        expect(storeSystemsResult.storedSystems).toEqual([]);
        expect(storeSystemsResult.messages.length).toBe(1);
        expect(storeSystemsResult.messages[0].severity).toBe(Severity.Warning);
    });

    test('checkStoredSystems - error thrown', async () => {
        const getAll = jest.fn();

        getAll.mockImplementationOnce(() => {
            throw new Error();
        });

        mockGetService.mockImplementationOnce(() => {
            return {
                logger: jest.fn(),
                dataProvider: {},
                getAll: getAll
            } as any;
        });

        const storeSystemsResult = await checkStoredSystems();
        expect(storeSystemsResult.storedSystems).toEqual([]);
        expect(storeSystemsResult.messages.length).toBe(1);
        expect(storeSystemsResult.messages[0].severity).toBe(Severity.Error);
    });
});
