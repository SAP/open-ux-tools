import { checkAtoCatalog, checkUi5AbapRepository, checkTransportRequests } from '../../src/checks/service-checks';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { Severity } from '../../src/types';

describe('Test service check functions', () => {
    test('checkAtoCatalog (succesful)', async () => {
        const getAtoInfo = jest.fn();

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

        const abapServiceProvider = {
            getAtoInfo: getAtoInfo
        } as unknown as AbapServiceProvider;

        // Test execution
        const atoCatalogResult = await checkAtoCatalog(abapServiceProvider);

        // Result check
        expect(atoCatalogResult.isAtoCatalog).toBe(true);
        expect(atoCatalogResult.messages.length).toBe(1);
        expect(atoCatalogResult.messages[0].severity).toBe(Severity.Info);
    });

    test('checkAtoCatalog (unavailable)', async () => {
        const getAtoInfo = jest.fn();

        getAtoInfo.mockImplementation(() => {
            return {};
        });

        const abapServiceProvider = {
            getAtoInfo: getAtoInfo
        } as unknown as AbapServiceProvider;

        // Test execution
        const atoCatalogResult = await checkAtoCatalog(abapServiceProvider);

        // Result check
        expect(atoCatalogResult.isAtoCatalog).toBe(false);
        expect(atoCatalogResult.messages.length).toBe(1);
        expect(atoCatalogResult.messages[0].severity).toBe(Severity.Warning);
    });

    test('checkAtoCatalog (error)', async () => {
        const getAtoInfo = jest.fn();

        getAtoInfo.mockImplementation(() => {
            throw new Error();
        });

        const abapServiceProvider = {
            getAtoInfo: getAtoInfo
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
        const getUi5AbapRepository = jest.fn();

        getUi5AbapRepository.mockImplementation(() => {
            return {
                baseURL: 'https://mockurl/sap/opu/odata/UI5/ABAP_REPOSITORY_SRV',
                httpsAgent: {},
                withCredentials: true,
                headers: {}
            };
        });

        const abapServiceProvider = {
            getUi5AbapRepository: getUi5AbapRepository
        } as unknown as AbapServiceProvider;

        // Test execution
        const sapUi5Result = await checkUi5AbapRepository(abapServiceProvider);

        // Result check
        expect(sapUi5Result.isSapUi5Repo).toBe(true);
        expect(sapUi5Result.messages.length).toBe(1);
        expect(sapUi5Result.messages[0].severity).toBe(Severity.Info);
    });

    test('checkUi5AbapRepository (unavailable)', async () => {
        const getUi5AbapRepository = jest.fn();

        getUi5AbapRepository.mockImplementation(() => {
            return {};
        });

        const abapServiceProvider = {
            getUi5AbapRepository: getUi5AbapRepository
        } as unknown as AbapServiceProvider;

        // Test execution
        const sapUi5Result = await checkUi5AbapRepository(abapServiceProvider);

        // Result check
        expect(sapUi5Result.isSapUi5Repo).toBe(false);
        expect(sapUi5Result.messages.length).toBe(1);
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
