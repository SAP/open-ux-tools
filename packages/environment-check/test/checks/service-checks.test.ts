import {
    checkAtoCatalog,
    checkUi5AbapRepository,
    checkTransportRequests,
    checkCatalogServices
} from '../../src/checks/service-checks';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { Severity } from '../../src/types';
import type { AxiosError } from 'axios';

describe('Catalog service tests, function checkCatalogServices()', () => {
    test('Returns v2 and v4 services succesfully', async () => {
        const v2catalogResponse = ['V2_S1', 'V2_S2', 'V2_S3'];
        const v4catalogResponse = ['V4_S1', 'V4_S2', 'V4_S3'];

        const catalog = jest.fn();
        const listServices = jest.fn();

        listServices.mockImplementationOnce(() => v2catalogResponse).mockImplementationOnce(() => v4catalogResponse);

        catalog.mockImplementation(() => {
            return {
                listServices: listServices
            };
        });

        const abapServiceProvider = {
            catalog: catalog
        } as unknown as AbapServiceProvider;

        // Test execution
        const catalogService = await checkCatalogServices(abapServiceProvider, 'system1');

        // Result check
        expect(catalogService.result.v2.results).toEqual(['V2_S1', 'V2_S2', 'V2_S3']);
        expect(catalogService.result.v4.results).toEqual(['V4_S1', 'V4_S2', 'V4_S3']);
        expect(catalogService.messages.length).toBe(2);
        expect(catalogService.messages[0].severity).toBe(Severity.Info);
        expect(catalogService.messages[1].severity).toBe(Severity.Info);
    });

    test('Fails with error (empty abapServiceProvider)', async () => {
        const abapServiceProvider = {} as unknown as AbapServiceProvider;

        // Test execution
        const catalogService = await checkCatalogServices(abapServiceProvider, 'system1');

        // Result check
        expect(catalogService.result.v2.results).toEqual(undefined);
        expect(catalogService.result.v4.results).toEqual(undefined);
        expect(catalogService.messages.length).toBe(4);
    });

    test('Returns v2 services only (v4 throws 401 error)', async () => {
        const v2catalogResponse = ['V2_S1', 'V2_S2', 'V2_S3'];

        const catalog = jest.fn();
        const listServices = jest.fn();

        listServices
            .mockImplementationOnce(() => v2catalogResponse)
            .mockImplementationOnce(() => {
                throw {
                    response: {
                        status: 401
                    },
                    config: {},
                    toJSON() {
                        return { config: this.config };
                    }
                } as AxiosError;
            });

        catalog.mockImplementation(() => {
            return {
                listServices: listServices
            };
        });

        const abapServiceProvider = {
            catalog: catalog
        } as unknown as AbapServiceProvider;

        // Test execution
        const catalogService = await checkCatalogServices(abapServiceProvider, 'system1');

        // Result check
        expect(catalogService.result.v2.results).toEqual(['V2_S1', 'V2_S2', 'V2_S3']);
        expect(catalogService.result.v4.results).toEqual(undefined);
        expect(catalogService.messages.length).toBe(3);
        expect(catalogService.messages[0].severity).toBe(Severity.Info);
        expect(catalogService.messages[1].severity).toBe(Severity.Error);
    });

    test('Test removing password from logged error (throws 403 error)', async () => {
        const catalog = jest.fn();
        const listServices = jest.fn();

        listServices
            .mockImplementationOnce(() => {
                throw {
                    response: {},
                    cause: {
                        status: 403
                    },
                    config: {
                        auth: {
                            password: 'mockPassword'
                        }
                    },
                    toJSON() {
                        return { config: this.config };
                    }
                };
            })
            .mockImplementationOnce(() => {
                throw {
                    cause: {},
                    config: { auth: {} },
                    toJSON() {
                        return { config: this.config };
                    }
                };
            });

        catalog.mockImplementation(() => {
            return {
                listServices: listServices
            };
        });

        const abapServiceProvider = {
            catalog: catalog
        } as unknown as AbapServiceProvider;

        // Test execution
        const catalogService = await checkCatalogServices(abapServiceProvider, 'system1');

        // Result check
        expect(catalogService.result.v2.results).toEqual(undefined);
        expect(catalogService.result.v4.results).toEqual(undefined);
        expect(catalogService.messages.length).toBe(4);
        // v2 response
        expect(catalogService.messages[0].severity).toBe(Severity.Error);
        expect(catalogService.messages[1].severity).toBe(Severity.Debug);
        expect(catalogService.messages[1].severity).toBe(Severity.Debug);
        expect(catalogService.messages[1].text).not.toContain('mockPassword');
    });
});

describe('Test service check functions', () => {
    test('checkAtoCatalog (succesful)', async () => {
        const getAtoInfo = jest.fn();
        const getAdtService = jest.fn();

        getAtoInfo.mockImplementation(() => {
            return {
                developmentPackage: 'PACKAGE',
                developmentPrefix: 'YY_1',
                operationsType: 'C',
                isExtensibilityDevelopmentSystem: true,
                tenantType: '',
                isTransportRequestRequired: true
            };
        });

        getAdtService.mockImplementation(() => {
            return {
                getAtoInfo: getAtoInfo
            };
        });

        const abapServiceProvider = {
            getAdtService: getAdtService
        } as unknown as AbapServiceProvider;

        // Test execution
        const atoCatalogResult = await checkAtoCatalog(abapServiceProvider);

        // Result check
        expect(atoCatalogResult.isAtoCatalog).toBe(true);
        expect(atoCatalogResult.messages.length).toBe(2);
        expect(atoCatalogResult.messages[0].severity).toBe(Severity.Info);
    });

    test('checkAtoCatalog (unavailable)', async () => {
        const getAtoInfo = jest.fn();
        const getAdtService = jest.fn();

        getAtoInfo.mockImplementation(() => {
            return {};
        });

        getAdtService.mockImplementation(() => {
            return {
                getAtoInfo: getAtoInfo
            };
        });

        const abapServiceProvider = {
            getAdtService: getAdtService
        } as unknown as AbapServiceProvider;

        // Test execution
        const atoCatalogResult = await checkAtoCatalog(abapServiceProvider);

        // Result check
        expect(atoCatalogResult.isAtoCatalog).toBe(false);
        expect(atoCatalogResult.messages.length).toBe(1);
        expect(atoCatalogResult.messages[0].severity).toBe(Severity.Warning);
    });

    test('checkAtoCatalog (error)', async () => {
        const getAdtService = jest.fn();

        getAdtService.mockImplementation(() => {
            throw new Error();
        });

        const abapServiceProvider = {
            getAdtService: getAdtService
        } as unknown as AbapServiceProvider;

        // Test execution
        const atoCatalogResult = await checkAtoCatalog(abapServiceProvider);

        // Result check
        expect(atoCatalogResult.isAtoCatalog).toBe(false);
        expect(atoCatalogResult.messages.length).toBe(2);
        expect(atoCatalogResult.messages[0].severity).toBe(Severity.Error);
        expect(atoCatalogResult.messages[1].severity).toBe(Severity.Debug);
    });

    test('checkUi5AbapRepository (succesful)', async () => {
        const sapUI5RepoGet = jest.fn();
        const getUi5AbapRepository = jest.fn();

        sapUI5RepoGet.mockImplementation(() => {
            return {
                status: 200,
                response: {}
            };
        });

        getUi5AbapRepository.mockImplementation(() => {
            return {
                baseURL: 'https://mockurl/sap/opu/odata/UI5/ABAP_REPOSITORY_SRV',
                httpsAgent: {},
                withCredentials: true,
                get: sapUI5RepoGet
            };
        });

        const abapServiceProvider = {
            getUi5AbapRepository: getUi5AbapRepository
        } as unknown as AbapServiceProvider;

        // Test execution
        const sapUi5Result = await checkUi5AbapRepository(abapServiceProvider);

        // Result check
        expect(sapUi5Result.isSapUi5Repo).toBe(true);
        expect(sapUi5Result.messages.length).toBe(3);
        expect(sapUi5Result.messages[0].severity).toBe(Severity.Info);
    });

    test('checkUi5AbapRepository (unavailable)', async () => {
        const sapUI5RepoGet = jest.fn();
        const getUi5AbapRepository = jest.fn();

        sapUI5RepoGet.mockImplementation(() => {
            return {
                status: 404,
                response: {}
            };
        });

        getUi5AbapRepository.mockImplementation(() => {
            return {
                baseURL: 'https://mockurl/sap/opu/odata/UI5/ABAP_REPOSITORY_SRV',
                httpsAgent: {},
                withCredentials: true,
                get: sapUI5RepoGet
            };
        });

        const abapServiceProvider = {
            getUi5AbapRepository: getUi5AbapRepository
        } as unknown as AbapServiceProvider;

        // Test execution
        const sapUi5Result = await checkUi5AbapRepository(abapServiceProvider);

        // Result check
        expect(sapUi5Result.isSapUi5Repo).toBe(false);
        expect(sapUi5Result.messages.length).toBe(3);
        expect(sapUi5Result.messages[0].severity).toBe(Severity.Warning);
    });

    test('checkUi5AbapRepository (error)', async () => {
        const getUi5AbapRepository = jest.fn();

        getUi5AbapRepository.mockImplementation(() => {
            throw new Error();
        });

        const abapServiceProvider = {
            getUi5AbapRepository: getUi5AbapRepository
        } as unknown as AbapServiceProvider;

        // Test execution
        const sapUi5Result = await checkUi5AbapRepository(abapServiceProvider);

        // Result check
        expect(sapUi5Result.isSapUi5Repo).toBe(false);
        expect(sapUi5Result.messages.length).toBe(2);
        expect(sapUi5Result.messages[0].severity).toBe(Severity.Error);
        expect(sapUi5Result.messages[1].severity).toBe(Severity.Debug);
    });

    test('checkTransportRequests (succesful)', async () => {
        const getAdtService = jest.fn();
        const getTransportRequests = jest.fn();

        getAdtService.mockImplementation(() => {
            return {
                getTransportRequests: getTransportRequests
            };
        });

        const abapServiceProvider = {
            getAdtService: getAdtService
        } as unknown as AbapServiceProvider;

        // Test execution
        const transportRequestResult = await checkTransportRequests(abapServiceProvider);

        // Result check
        expect(transportRequestResult.isTransportRequests).toBe(true);
        expect(transportRequestResult.messages.length).toBe(1);
        expect(transportRequestResult.messages[0].severity).toBe(Severity.Info);
    });

    test('checkTransportRequests (unavailable)', async () => {
        const getAdtService = jest.fn();

        getAdtService.mockImplementation(() => {
            return {};
        });

        const abapServiceProvider = {
            getAdtService: getAdtService
        } as unknown as AbapServiceProvider;

        // Test execution
        const transportRequestResult = await checkTransportRequests(abapServiceProvider);

        // Result check
        expect(transportRequestResult.isTransportRequests).toBe(false);
        expect(transportRequestResult.messages.length).toBe(1);
        expect(transportRequestResult.messages[0].severity).toBe(Severity.Warning);
    });

    test('checkTransportRequests (getTransportRequests is undefined)', async () => {
        const getAdtService = jest.fn();

        getAdtService.mockImplementation(() => {
            return { getTransportRequests: undefined };
        });

        const abapServiceProvider = {
            getAdtService: getAdtService
        } as unknown as AbapServiceProvider;

        // Test execution
        const transportRequestResult = await checkTransportRequests(abapServiceProvider);

        // Result check
        expect(transportRequestResult.isTransportRequests).toBe(false);
        expect(transportRequestResult.messages.length).toBe(1);
        expect(transportRequestResult.messages[0].severity).toBe(Severity.Warning);
    });

    test('checkTransportRequests (getAdtService returns undefined)', async () => {
        const getAdtService = jest.fn();

        getAdtService.mockImplementation(() => {
            return undefined;
        });

        const abapServiceProvider = {
            getAdtService: getAdtService
        } as unknown as AbapServiceProvider;

        // Test execution
        const transportRequestResult = await checkTransportRequests(abapServiceProvider);

        // Result check
        expect(transportRequestResult.isTransportRequests).toBe(false);
        expect(transportRequestResult.messages.length).toBe(1);
        expect(transportRequestResult.messages[0].severity).toBe(Severity.Warning);
    });

    test('checkTransportRequests (error)', async () => {
        const getAdtService = jest.fn();

        getAdtService.mockImplementation(() => {
            throw new Error();
        });

        const abapServiceProvider = {
            getAdtService: getAdtService
        } as unknown as AbapServiceProvider;

        // Test execution
        const transportRequestResult = await checkTransportRequests(abapServiceProvider);

        // Result check
        expect(transportRequestResult.isTransportRequests).toBe(false);
        expect(transportRequestResult.messages.length).toBe(2);
        expect(transportRequestResult.messages[0].severity).toBe(Severity.Error);
        expect(transportRequestResult.messages[1].severity).toBe(Severity.Debug);
    });
});
