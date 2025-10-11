import type { AbapServiceProvider, ODataServiceInfo } from '@sap-ux/axios-extension';
import { createForAbap } from '@sap-ux/axios-extension';
import * as axiosExtension from '@sap-ux/axios-extension';
import { ODataService, ODataVersion, ServiceProvider, type AxiosRequestConfig } from '@sap-ux/axios-extension';
import type { ServiceInfo } from '@sap-ux/btp-utils';
import {
    GUIDED_ANSWERS_ICON,
    GUIDED_ANSWERS_LAUNCH_CMD_ID,
    HELP_NODES,
    HELP_TREE
} from '@sap-ux/guided-answers-helper';
import { ERROR_TYPE, ErrorHandler } from '@sap-ux/inquirer-common';
import { AxiosError, type AxiosResponse } from 'axios';
import { initI18nOdataServiceInquirer, t } from '../../../src/i18n';
import { ConnectionValidator } from '../../../src/prompts/connectionValidator';
import LoggerHelper from '../../../src/prompts/logger-helper';
import type { ConnectedSystem } from '../../../src/types';
import * as nodejsUtils from '@sap-ux/nodejs-utils';
import { ToolsLogger } from '@sap-ux/logger';

const odataServicesMock: ODataServiceInfo[] = [];
const catalogServiceMock = jest.fn().mockImplementation(() => ({
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    listServices: jest.fn().mockImplementation(() => odataServicesMock)
}));

jest.mock('@sap-ux/nodejs-utils', () => ({
    __esModule: true,
    ...jest.requireActual('@sap-ux/nodejs-utils')
}));

const mockAbapServiceProvider = {
    catalog: catalogServiceMock,
    getSystemInfo: jest.fn().mockResolvedValue({
        systemID: 'ABC123',
        userName: 'user1@acme.com',
        userFullName: 'userFirstName1 userLastName1',
        client: '000',
        language: 'DE'
    }),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    user: jest.fn().mockReturnValue('user1@acme.com')
};

jest.mock('@sap-ux/axios-extension', () => ({
    __esModule: true,
    ...jest.requireActual('@sap-ux/axios-extension'),
    AbapServiceProvider: jest.fn().mockImplementation(() => mockAbapServiceProvider),
    createForAbapOnCloud: jest.fn().mockImplementation(() => mockAbapServiceProvider),
    createForAbap: jest.fn().mockImplementation((...args: Parameters<typeof createForAbap>): AbapServiceProvider => {
        const { createForAbap } = jest.requireActual('@sap-ux/axios-extension');
        const asp = createForAbap(args);
        asp.getSystemInfo = mockAbapServiceProvider.getSystemInfo;
        return asp;
    })
}));

let mockIsAppStudio = false;
jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn().mockImplementation(() => mockIsAppStudio)
}));

describe('ConnectionValidator', () => {
    const newAxiosErrorWithStatus = (status: number | string): AxiosError => {
        const e = new Error() as AxiosError;
        e.response = { status } as AxiosResponse;
        e.isAxiosError = true;
        return e;
    };

    beforeAll(async () => {
        // Pre-load i18 texts
        await initI18nOdataServiceInquirer();
    });

    beforeEach(() => {
        jest.restoreAllMocks();
        mockIsAppStudio = false;
        ErrorHandler.guidedAnswersEnabled = false;
        // Since having this environment variable set to '0' affects behaviour
        // we need to delete it before running the tests. There are specific tests for
        // testing the behaviour with this variable set to '0'
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    });

    test('should handle an invalid url', async () => {
        const invalidUrl = 'https://:example.com/service';
        const validator = new ConnectionValidator();

        const result = await validator.validateUrl(invalidUrl);
        expect(result).toBe(t('errors.invalidUrl', { input: invalidUrl }));
        expect(validator.validity).toEqual({});

        expect(await validator.validateUrl('')).toBe(false);
        expect(validator.validity).toEqual({
            urlFormat: false
        });
    });

    test('should validate an accessible service URL', async () => {
        jest.spyOn(ODataService.prototype, 'get').mockResolvedValueOnce({ status: 200 });
        const serviceUrl = 'https://example.com/service';
        const validator = new ConnectionValidator();

        const result = await validator.validateUrl(serviceUrl);
        expect(result).toBe(true);
        expect(validator.validity).toEqual({
            authenticated: true,
            reachable: true,
            urlFormat: true
        });
    });

    test('should handle url not found error', async () => {
        const axiosError = new AxiosError('', 'ENOTFOUND');
        jest.spyOn(ODataService.prototype, 'get').mockRejectedValueOnce(axiosError);
        const validator = new ConnectionValidator();
        const result = await validator.validateUrl('https://example.com/service');

        expect(result).toMatch(
            'A connection error occurred. Please ensure the target host is available on the network: HTTP Status ENOTFOUND'
        );
        expect(validator.validity).toEqual({
            urlFormat: true,
            reachable: false
        });
    });

    test('should handle 404 error', async () => {
        jest.spyOn(ODataService.prototype, 'get').mockRejectedValueOnce(newAxiosErrorWithStatus(404));
        const validator = new ConnectionValidator();
        const result = await validator.validateUrl('https://example.com/service');

        expect(result).toMatch(t('errors.urlNotFound'));
        expect(validator.validity).toEqual({
            urlFormat: true,
            reachable: false
        });
    });

    test('should handle 401 and basic authentication credentials', async () => {
        const serviceUrl = 'https://somehost:1234/some/path/to/service?sap-client=010';
        let getODataServiceSpy = jest
            .spyOn(ODataService.prototype, 'get')
            .mockRejectedValue(newAxiosErrorWithStatus(401));
        let validator = new ConnectionValidator();
        expect(await validator.validateUrl(serviceUrl)).toBe(true);
        expect(validator.validity).toEqual({
            urlFormat: true,
            reachable: true,
            authRequired: true,
            authenticated: false
        });

        const createProviderSpy = jest.spyOn(axiosExtension, 'create');
        const serviceProviderSpy = jest.spyOn(ServiceProvider.prototype, 'service');

        jest.spyOn(ODataService.prototype, 'get').mockResolvedValueOnce({ status: 200 });

        expect(await validator.validateAuth(serviceUrl, 'user1', 'password1')).toEqual({ valResult: true });
        const params = (createProviderSpy.mock.calls[0][0] as AxiosRequestConfig).params;
        expect(params['sap-client']).toBe('010');
        expect(createProviderSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                baseURL: 'https://somehost:1234',
                auth: { username: 'user1', password: 'password1' }
            })
        );
        expect(serviceProviderSpy).toHaveBeenCalledWith('/some/path/to/service/');

        // Username/pword are invalid
        jest.spyOn(ODataService.prototype, 'get').mockRejectedValue(newAxiosErrorWithStatus(403));
        expect(await validator.validateAuth(serviceUrl, 'user1', 'password1')).toEqual({
            valResult: t('errors.authenticationFailed'),
            errorType: 'AUTH'
        });

        // Dont authenticate if the url is empty
        getODataServiceSpy.mockReset();
        getODataServiceSpy = jest.spyOn(ODataService.prototype, 'get').mockRejectedValue(newAxiosErrorWithStatus(404));
        expect(await validator.validateAuth('', 'user1', 'password1')).toEqual({ valResult: false });
        expect(getODataServiceSpy).not.toHaveBeenCalled();

        // Dont authenticate if the url was previously validated as unreachable
        validator = new ConnectionValidator();
        await validator.validateUrl(serviceUrl);
        getODataServiceSpy.mockClear();

        getODataServiceSpy = jest.spyOn(ODataService.prototype, 'get').mockRejectedValue(newAxiosErrorWithStatus(404));
        expect(await validator.validateAuth(serviceUrl, 'user1', 'password1')).toEqual({ valResult: 'URL not found.' });
        expect(validator.validity).toEqual({ urlFormat: true, reachable: false });
        expect(getODataServiceSpy).toHaveBeenCalled();
    });

    test('should handle redirect errors', async () => {
        const serviceUrl = 'https://somehost:1234/some/path/to/service';
        jest.spyOn(ODataService.prototype, 'get').mockRejectedValue(newAxiosErrorWithStatus(301));
        const validator = new ConnectionValidator();
        expect(await validator.validateUrl(serviceUrl)).toBe(t('errors.urlRedirect'));
    });

    test('should handle cert errors with help links', async () => {
        ErrorHandler.guidedAnswersEnabled = true;
        const serviceUrl = 'https://localhost:8080';

        jest.spyOn(ODataService.prototype, 'get').mockRejectedValueOnce(
            newAxiosErrorWithStatus('DEPTH_ZERO_SELF_SIGNED_CERT')
        );
        const validator = new ConnectionValidator();

        expect(await validator.validateUrl(serviceUrl)).toEqual(
            expect.objectContaining({
                link: {
                    command: expect.objectContaining({
                        id: GUIDED_ANSWERS_LAUNCH_CMD_ID
                    }),
                    icon: GUIDED_ANSWERS_ICON,
                    text: expect.any(String),
                    url: expect.any(String)
                },
                message: expect.stringContaining('The system URL is using a self-signed security certificate.'),
                toString: expect.any(Function)
            })
        );
        expect(validator.validity).toEqual({
            authenticated: false,
            canSkipCertError: true,
            reachable: true,
            urlFormat: true
        });
    });

    test('should ignore cert errors if specified', async () => {
        const serviceUrl = 'https://localhost:8080';
        const createProviderSpy = jest.spyOn(axiosExtension, 'create');
        jest.spyOn(ODataService.prototype, 'get').mockResolvedValueOnce({ status: 200 });
        const validator = new ConnectionValidator();
        expect(await validator.validateUrl(serviceUrl, { ignoreCertError: true })).toBe(true);
        expect(createProviderSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                baseURL: 'https://localhost:8080',
                ignoreCertErrors: true
            })
        );
    });

    test('should report and ignore cert errors with warning, when connecting to an odata service url, if `NODE_TLS_REJECT_UNAUTHORIZED=0` is set', async () => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const serviceUrl = 'https://localhost:8080/some/path';
        // Mock first request to get the specific cert errors
        jest.spyOn(axiosExtension.V2CatalogService.prototype, 'listServices').mockRejectedValue(
            newAxiosErrorWithStatus('DEPTH_ZERO_SELF_SIGNED_CERT')
        );
        // Mock second request to get the metadata for odata service urls
        const createProviderSpy = jest.spyOn(axiosExtension, 'create');
        jest.spyOn(ODataService.prototype, 'get').mockResolvedValueOnce({ status: 200 });
        const warnLogSpy = jest.spyOn(LoggerHelper.logger, 'warn');

        const setGlobalRejectUnauthSpy = jest.spyOn(nodejsUtils, 'setGlobalRejectUnauthorized');

        const validator = new ConnectionValidator();
        expect(await validator.validateUrl(serviceUrl)).toBe(true);
        expect(warnLogSpy).toHaveBeenNthCalledWith(
            1,
            t('warnings.certificateErrors', {
                url: 'https://localhost:8080',
                error: ERROR_TYPE.CERT_SELF_SIGNED
            })
        );

        expect(warnLogSpy).toHaveBeenNthCalledWith(2, t('warnings.allowingUnauthorizedCertsNode'));
        expect(createProviderSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                baseURL: 'https://localhost:8080',
                ignoreCertErrors: true
            })
        );
        expect(validator.axiosConfig.ignoreCertErrors).toEqual(true);
        expect(setGlobalRejectUnauthSpy).toHaveBeenCalledWith(false);
        expect(validator.ignoreCertError).toEqual(true);
    });

    test('should report and any ignore cert errors with warning, when connecting to an Abap on prem system, if `NODE_TLS_REJECT_UNAUTHORIZED=0` is set', async () => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const systemUrl = 'https://localhost:8080';
        // Mock first request to get the specific cert errors
        jest.spyOn(axiosExtension, 'createForAbap');
        jest.spyOn(axiosExtension.V2CatalogService.prototype, 'listServices')
            .mockRejectedValueOnce(newAxiosErrorWithStatus('UNABLE_TO_GET_ISSUER_CERT'))
            .mockResolvedValue([]);

        const createForAbapProviderSpy = jest.spyOn(axiosExtension, 'createForAbap');
        const warnLogSpy = jest.spyOn(LoggerHelper.logger, 'warn');
        const setGlobalRejectUnauthSpy = jest.spyOn(nodejsUtils, 'setGlobalRejectUnauthorized');

        const validator = new ConnectionValidator();
        expect(await validator.validateUrl(systemUrl, { isSystem: true })).toBe(true);
        expect(warnLogSpy).toHaveBeenNthCalledWith(
            1,
            t('warnings.certificateErrors', {
                url: 'https://localhost:8080',
                error: ERROR_TYPE.CERT_UKNOWN_OR_INVALID
            })
        );

        expect(warnLogSpy).toHaveBeenNthCalledWith(2, t('warnings.allowingUnauthorizedCertsNode'));
        expect(createForAbapProviderSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                baseURL: 'https://localhost:8080',
                ignoreCertErrors: true
            })
        );
        expect(validator.axiosConfig.ignoreCertErrors).toEqual(true);
        expect(setGlobalRejectUnauthSpy).toHaveBeenCalledWith(false);
    });

    test('should pass additional params to axios-extension', async () => {
        mockIsAppStudio = true;
        const serviceUrl = 'https://somehost:1234/some/path?sap-client=010';
        const createProviderSpy = jest.spyOn(axiosExtension, 'create');
        const serviceProviderSpy = jest
            .spyOn(ServiceProvider.prototype, 'service')
            .mockReturnValueOnce({} as ODataService);
        jest.spyOn(ODataService.prototype, 'get').mockResolvedValueOnce('');

        const validator = new ConnectionValidator();
        await validator.validateUrl(serviceUrl);

        const params = (createProviderSpy.mock.calls[0][0] as AxiosRequestConfig).params;
        expect(params['sap-client']).toBe('010');
        expect(params['saml2']).toBe('disabled');

        expect(createProviderSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                baseURL: 'https://somehost:1234',
                ignoreCertErrors: false,
                cookies: ''
            })
        );
        expect(serviceProviderSpy).toHaveBeenCalledWith('/some/path/');
    });

    test('should reset connection validity if url changed', async () => {
        jest.spyOn(ODataService.prototype, 'get').mockRejectedValueOnce(newAxiosErrorWithStatus(401));
        const validator = new ConnectionValidator();
        await validator.validateUrl('https://example.com/serviceA');

        expect(validator.validity).toEqual({
            urlFormat: true,
            authenticated: false,
            reachable: true,
            authRequired: true
        });
        jest.spyOn(ODataService.prototype, 'get').mockResolvedValueOnce({ status: 200 });
        expect(await validator.validateUrl('https://example.com/serviceB')).toBe(true);
        expect(validator.validity).toEqual({
            urlFormat: true,
            reachable: true,
            authenticated: true
        });
    });

    test('should not validate the same url if already validated', async () => {
        const getODataServiceSpy = jest.spyOn(ODataService.prototype, 'get').mockResolvedValue({ status: 200 });
        const validator = new ConnectionValidator();
        const result = await validator.validateUrl('https://example.com/service');
        expect(result).toBe(true);
        expect(validator.validity).toEqual({
            authenticated: true,
            reachable: true,
            urlFormat: true
        });

        await validator.validateUrl('https://example.com/service', undefined);

        expect(getODataServiceSpy).toHaveBeenCalledTimes(1);
    });

    test('should re-validate the same url if `forceValidation` is true', async () => {
        const getODataServiceSpy = jest
            .spyOn(ODataService.prototype, 'get')
            .mockRejectedValueOnce(newAxiosErrorWithStatus(401));
        const validator = new ConnectionValidator();
        const result = await validator.validateUrl('https://example.com/service');
        expect(result).toBe(true);
        expect(validator.validity).toEqual({
            authenticated: false,
            authRequired: true,
            reachable: true,
            urlFormat: true
        });
        // Change the response to 200 and force re-validation of the same url
        jest.spyOn(ODataService.prototype, 'get').mockRejectedValueOnce(newAxiosErrorWithStatus(200));
        await validator.validateUrl('https://example.com/service', { forceReValidation: true });
        expect(validator.validity).toEqual({
            authenticated: true,
            reachable: true,
            urlFormat: true
        });
        expect(getODataServiceSpy).toHaveBeenCalledTimes(2);
    });

    test('should update axios-config with sap-client with calling validateAuth when connecting to sap system', async () => {
        const createProviderSpy = jest.spyOn(axiosExtension, 'createForAbap');
        jest.spyOn(axiosExtension.V2CatalogService.prototype, 'listServices').mockResolvedValueOnce([]);

        const connectValidator = new ConnectionValidator();
        await connectValidator.validateAuth('https://example.com:1234', 'user1', 'pword1', {
            isSystem: true,
            sapClient: '999'
        });
        expect(createProviderSpy).toHaveBeenCalledWith({
            auth: {
                password: 'pword1',
                username: 'user1'
            },
            baseURL: 'https://example.com:1234',
            url: '/',
            cookies: '',
            ignoreCertErrors: false,
            params: {
                'sap-client': '999'
            },
            logger: expect.any(ToolsLogger)
        });
        expect(connectValidator.validity).toEqual({
            authenticated: true,
            reachable: true,
            urlFormat: true
        });
    });

    test('should validate connectivity with `listServices` when connecting to sap systems', async () => {
        let listServicesV2Mock = jest
            .spyOn(axiosExtension.V2CatalogService.prototype, 'listServices')
            .mockResolvedValueOnce([]);
        const listServicesV4Mock = jest
            .spyOn(axiosExtension.V4CatalogService.prototype, 'listServices')
            .mockResolvedValueOnce([]);
        const connectValidator = new ConnectionValidator();
        await connectValidator.validateUrl('https://example.com:1234', { isSystem: true });

        expect(connectValidator.catalogs[axiosExtension.ODataVersion.v2]).toBeInstanceOf(
            axiosExtension.V2CatalogService
        );
        expect(connectValidator.catalogs[axiosExtension.ODataVersion.v4]).toBeInstanceOf(
            axiosExtension.V4CatalogService
        );

        expect(listServicesV2Mock).toHaveBeenCalled();
        expect(listServicesV4Mock).not.toHaveBeenCalled();

        // If the V2 catalog service fails, the V4 catalog service should be called
        listServicesV2Mock = jest
            .spyOn(axiosExtension.V2CatalogService.prototype, 'listServices')
            .mockRejectedValue(newAxiosErrorWithStatus(404));
        await connectValidator.validateUrl('https://example1.com:1234', { isSystem: true });

        expect(connectValidator.catalogs[axiosExtension.ODataVersion.v2]).toBeInstanceOf(
            axiosExtension.V2CatalogService
        );
        expect(connectValidator.catalogs[axiosExtension.ODataVersion.v4]).toBeInstanceOf(
            axiosExtension.V4CatalogService
        );

        expect(listServicesV2Mock).toHaveBeenCalled();
        expect(listServicesV4Mock).toHaveBeenCalled();
    });

    test('should determine if authentication is required', async () => {
        const connectValidator = new ConnectionValidator();
        expect(await connectValidator.isAuthRequired()).toBe(false);

        // Dont re-request if already validated
        let getOdataServiceSpy = jest
            .spyOn(ODataService.prototype, 'get')
            .mockRejectedValue(newAxiosErrorWithStatus(401));
        await connectValidator.validateUrl('https://example.com/serviceA');
        expect(connectValidator.validity).toEqual({
            authenticated: false,
            authRequired: true,
            reachable: true,
            urlFormat: true
        });
        getOdataServiceSpy.mockClear();
        expect(await connectValidator.isAuthRequired()).toBe(true);
        expect(getOdataServiceSpy).not.toHaveBeenCalled(); // Should not re-request since url and client have not changed

        // If the url changes, re-request
        getOdataServiceSpy.mockClear();
        expect(await connectValidator.isAuthRequired('https://example.com/serviceB')).toBe(true);
        expect(getOdataServiceSpy).toHaveBeenCalled();

        // If the client changes, re-request
        getOdataServiceSpy.mockClear();
        getOdataServiceSpy = jest.spyOn(ODataService.prototype, 'get').mockResolvedValue(200);
        await connectValidator.validateAuth('https://example.com/serviceA', 'user1', 'password1', { sapClient: '999' });
        expect(connectValidator.validity).toEqual({
            authenticated: true,
            authRequired: true,
            reachable: true,
            urlFormat: true
        });
        expect(getOdataServiceSpy).toHaveBeenCalled();

        getOdataServiceSpy.mockClear();
        // Auth is not required since the connection has been authenticated
        expect(await connectValidator.isAuthRequired('https://example.com/serviceA', '999')).toBe(false);
        // Should not recheck with the same url and client
        expect(getOdataServiceSpy).not.toHaveBeenCalled();

        getOdataServiceSpy.mockClear();
        getOdataServiceSpy = jest.spyOn(ODataService.prototype, 'get').mockRejectedValue(newAxiosErrorWithStatus(401));
        expect(await connectValidator.isAuthRequired('https://example.com/serviceA', '111')).toBe(true);
        expect(getOdataServiceSpy).toHaveBeenCalled();
        // bad url
        expect(await connectValidator.isAuthRequired('bad url', '111')).toBe(false);
    });

    test('should validate service key info can be used to authenticate', async () => {
        const createAbapOnCloudProviderSpy = jest.spyOn(axiosExtension, 'createForAbapOnCloud');
        const serviceInfoMock: Partial<ServiceInfo> = {
            uaa: {
                clientid: 'clientid',
                clientsecret: 'client',
                url: 'https://example.com/uaa'
            },
            url: 'https://example.com/uaa',
            catalogs: {
                abap: {
                    path: 'path',
                    type: 'type'
                }
            },
            systemid: 'abap_btp_001'
        };
        let connectValidator = new ConnectionValidator();
        expect(await connectValidator.validateServiceInfo(serviceInfoMock as ServiceInfo)).toBe(true);
        expect(createAbapOnCloudProviderSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                environment: 'Standalone',
                service: serviceInfoMock
            })
        );
        expect(connectValidator.validity).toEqual({
            authenticated: true,
            reachable: true
        });
        expect(connectValidator.connectedUserName).toBe('user1@acme.com');
        expect(connectValidator.serviceInfo).toEqual(serviceInfoMock);
        expect(connectValidator.validatedUrl).toBe(serviceInfoMock.url);
        expect(connectValidator.connectedSystemName).toBe('abap_btp_001');

        connectValidator = new ConnectionValidator();
        createAbapOnCloudProviderSpy.mockClear();
        // Ensure refresh token is used to create a connection if presented
        expect(await connectValidator.validateServiceInfo(serviceInfoMock as ServiceInfo)).toBe(true);
        expect(createAbapOnCloudProviderSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                environment: 'Standalone',
                service: serviceInfoMock
            })
        );

        createAbapOnCloudProviderSpy.mockClear();
        // Should not create a new connection if the service url is the same as current valdidate url
        expect(await connectValidator.validateServiceInfo(serviceInfoMock as ServiceInfo)).toBe(true);
        expect(createAbapOnCloudProviderSpy).not.toHaveBeenCalled();
    });

    test('should attempt to validate auth using v4 catalog (fallback) where v2 is not available or user is not authorized', async () => {
        const listServicesV2Mock = jest
            .spyOn(axiosExtension.V2CatalogService.prototype, 'listServices')
            .mockRejectedValue(newAxiosErrorWithStatus(401));
        const listServicesV4Mock = jest
            .spyOn(axiosExtension.V4CatalogService.prototype, 'listServices')
            .mockResolvedValue([]);
        const connectValidator = new ConnectionValidator();
        await connectValidator.validateUrl('https://example.com:1234', { isSystem: true });

        // If the V2 catalog service fails, the V4 catalog service should be called
        expect(connectValidator.catalogs[axiosExtension.ODataVersion.v2]).toBeInstanceOf(
            axiosExtension.V2CatalogService
        );
        expect(connectValidator.catalogs[axiosExtension.ODataVersion.v4]).toBeInstanceOf(
            axiosExtension.V4CatalogService
        );

        expect(listServicesV2Mock).toHaveBeenCalled();
        expect(listServicesV4Mock).toHaveBeenCalled();

        // If the only v4 catalog is required (perhaps due to a template limitation), it should be only used
        listServicesV2Mock.mockClear();
        listServicesV4Mock.mockClear();
        // Uses a different URL to ensure the previous validation does not affect this test as we cache
        await connectValidator.validateUrl('https://example.com:1235', {
            isSystem: true,
            odataVersion: ODataVersion.v4
        });
        expect(listServicesV2Mock).not.toHaveBeenCalled();
        expect(listServicesV4Mock).toHaveBeenCalled();
    });

    test('should report and ignore cert errors with warning if `NODE_TLS_REJECT_UNAUTHORIZED=0` is set when using v4 catalog as fallback', async () => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const listServicesV2Mock = jest
            .spyOn(axiosExtension.V2CatalogService.prototype, 'listServices')
            .mockRejectedValue(newAxiosErrorWithStatus(404));
        // V4 catalog is returning cert error which should be bypassed by the NODE_TLS_REJECT_UNAUTHORIZED=0 setting
        const listServicesV4Mock = jest
            .spyOn(axiosExtension.V4CatalogService.prototype, 'listServices')
            .mockRejectedValueOnce(newAxiosErrorWithStatus('CERT_HAS_EXPIRED'))
            .mockResolvedValue([]);

        const createForAbapProviderSpy = jest.spyOn(axiosExtension, 'createForAbap');
        const warnLogSpy = jest.spyOn(LoggerHelper.logger, 'warn');
        const setGlobalRejectUnauthSpy = jest.spyOn(nodejsUtils, 'setGlobalRejectUnauthorized');

        const connectValidator = new ConnectionValidator();
        await connectValidator.validateUrl('https://example.com:1234', { isSystem: true });

        expect(warnLogSpy).toHaveBeenNthCalledWith(
            1,
            t('warnings.certificateErrors', {
                url: 'https://example.com:1234',
                error: ERROR_TYPE.CERT_EXPIRED
            })
        );

        expect(warnLogSpy).toHaveBeenNthCalledWith(2, t('warnings.allowingUnauthorizedCertsNode'));
        expect(createForAbap as jest.Mock).toHaveBeenCalledWith(
            expect.objectContaining({
                baseURL: 'https://example.com:1234',
                ignoreCertErrors: true
            })
        );
        expect(connectValidator.axiosConfig.ignoreCertErrors).toEqual(true);
        expect(setGlobalRejectUnauthSpy).toHaveBeenCalledWith(false);

        // If the V2 catalog service fails, the V4 catalog service should be called
        expect(connectValidator.catalogs[axiosExtension.ODataVersion.v2]).toBeInstanceOf(
            axiosExtension.V2CatalogService
        );
        expect(connectValidator.catalogs[axiosExtension.ODataVersion.v4]).toBeInstanceOf(
            axiosExtension.V4CatalogService
        );
        // Called twice, once for the cert error and once for the listServices. 404 returned on both calls.
        expect(listServicesV2Mock).toHaveBeenCalledTimes(2);
        // V4 catalog called once for the cert error (CERT_EXPIRED) and once for the listServices (200)
        expect(listServicesV4Mock).toHaveBeenCalledTimes(2);

        // If the only v4 catalog is required (perhaps due to a template limitation), it should be only used
        listServicesV2Mock.mockClear();
        listServicesV4Mock.mockClear();
    });

    test('should validate destination system connection', async () => {
        const listServicesV2Mock = jest
            .spyOn(axiosExtension.V2CatalogService.prototype, 'listServices')
            .mockResolvedValueOnce([
                { id: 'service1', path: '/service1', odataVersion: ODataVersion.v2 } as ODataServiceInfo
            ]);
        const listServicesV4Mock = jest
            .spyOn(axiosExtension.V4CatalogService.prototype, 'listServices')
            .mockResolvedValueOnce([
                { id: 'service2', path: '/service2', odataVersion: ODataVersion.v4 } as ODataServiceInfo
            ]);
        const connectValidator = new ConnectionValidator();
        expect(
            await connectValidator.validateDestination({
                Name: 'dest1',
                Host: 'https://system:12345',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'desc',
                WebIDEUsage: 'odata_abap'
            })
        ).toEqual({ valResult: true });
        // Connection validation uses v2 first
        expect(listServicesV2Mock).toHaveBeenCalled();
        expect(listServicesV4Mock).not.toHaveBeenCalled();
        expect(connectValidator.validatedUrl).toEqual('https://dest1.dest');
        expect(connectValidator.destinationUrl).toEqual('https://system:12345');
        expect(connectValidator.validity).toEqual({
            authenticated: true,
            reachable: true
        });

        // If any error occurs and HTML5.DynamicDestination property is missing, return a destination misconfiguration message and specific GA link
        jest.spyOn(axiosExtension.V2CatalogService.prototype, 'listServices').mockRejectedValueOnce(
            newAxiosErrorWithStatus(500)
        );
        expect(
            await connectValidator.validateDestination({
                Name: 'dest1',
                Host: 'https://system:12345',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'desc',
                WebIDEUsage: 'odata_abap'
            })
        ).toEqual(
            expect.objectContaining({
                errorType: ERROR_TYPE.INTERNAL_SERVER_ERROR,
                valResult: {
                    link: {
                        icon: GUIDED_ANSWERS_ICON,
                        text: 'Need help with this error?',
                        url: `https://ga.support.sap.com/dtp/viewer/index.html#/tree/${HELP_TREE.FIORI_TOOLS}/actions/${HELP_NODES.DESTINATION_MISCONFIGURED}`
                    },
                    message: 'The destination is misconfigured. The property: `HTML5.DynamicDestination` is missing.'
                }
            })
        );
    });

    test('should validate destination system connection and show basic auth prompts when v2 returns 401 (even if v4 returns 404)', async () => {
        jest.spyOn(axiosExtension.V2CatalogService.prototype, 'listServices').mockRejectedValueOnce(
            newAxiosErrorWithStatus(401)
        );
        jest.spyOn(axiosExtension.V4CatalogService.prototype, 'listServices').mockRejectedValueOnce(
            newAxiosErrorWithStatus(404)
        );

        const connectValidator = new ConnectionValidator();
        expect(
            await connectValidator.validateDestination({
                Name: 'dest1',
                Host: 'https://system:12345',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'desc',
                WebIDEUsage: 'odata_abap',
                'HTML5.DynamicDestination': 'true'
            })
        ).toEqual({ valResult: 'Authentication incorrect. 401', errorType: 'AUTH' });

        expect(connectValidator.validity.reachable).toBe(true);
        expect(connectValidator.validity.authRequired).toBe(true);
        expect(connectValidator.validity.authenticated).toBe(false);
    });

    test('should validate destination service (full and partial url) connection', async () => {
        jest.spyOn(ODataService.prototype, 'get').mockResolvedValueOnce({ status: 200 });
        const connectValidator = new ConnectionValidator();
        expect(
            await connectValidator.validateDestination({
                Name: 'DEST1',
                Host: 'https://system1:12345/path/to/Service',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'desc',
                WebIDEUsage: 'odata_gen',
                WebIDEAdditionalData: 'full_url'
            })
        ).toEqual({ valResult: true });

        expect(connectValidator.validatedUrl).toEqual('https://dest1.dest');
        expect(connectValidator.destinationUrl).toEqual('https://system1:12345/path/to/Service');
        expect(connectValidator.validity).toEqual({
            authenticated: true,
            reachable: true
        });

        jest.spyOn(ODataService.prototype, 'get').mockResolvedValueOnce({ status: 200 });
        expect(
            await connectValidator.validateDestination(
                {
                    Name: 'DEST2',
                    Host: 'https://system2:12345/',
                    Type: 'HTTP',
                    Authentication: 'NoAuthentication',
                    ProxyType: 'Internet',
                    Description: 'desc',
                    WebIDEUsage: 'odata_gen'
                },
                undefined,
                'path/to/service'
            )
        ).toEqual({ valResult: true });

        expect(connectValidator.validatedUrl).toEqual('https://dest2.dest/path/to/service');
        expect(connectValidator.destinationUrl).toEqual('https://system2:12345/path/to/service');
        expect(connectValidator.validity).toEqual({
            authenticated: true,
            reachable: true
        });

        // If any error occurs return a GA link
        jest.spyOn(ODataService.prototype, 'get').mockRejectedValueOnce(newAxiosErrorWithStatus(404));
        expect(
            await connectValidator.validateDestination({
                Name: 'dest1',
                Host: 'https://system1:12345/path/to/service',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'desc',
                WebIDEUsage: 'odata_gen',
                WebIDEAdditionalData: 'full_url',
                'HTML5.DynamicDestination': 'true'
            })
        ).toEqual(
            expect.objectContaining({
                errorType: ERROR_TYPE.NOT_FOUND,
                valResult: expect.objectContaining({
                    link: {
                        icon: GUIDED_ANSWERS_ICON,
                        text: 'Need help with this error?',
                        url: `https://ga.support.sap.com/dtp/viewer/index.html#/tree/${HELP_TREE.FIORI_TOOLS}/actions/${HELP_NODES.DESTINATION_NOT_FOUND}`
                    },
                    message:
                        'The destination target URL cannot be found. The request failed with status code 404. Please check the destination target URL connectivity in your SAP BTP cockpit.'
                })
            })
        );

        // 500s should return a destination misconfiguration message and specific GA link in BAS
        mockIsAppStudio = true;
        jest.spyOn(ODataService.prototype, 'get').mockRejectedValueOnce(newAxiosErrorWithStatus(502));
        expect(
            await connectValidator.validateDestination({
                Name: 'dest1',
                Host: 'https://system1:12345/path/to/service',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'desc',
                WebIDEUsage: 'odata_gen',
                WebIDEAdditionalData: 'full_url',
                'HTML5.DynamicDestination': 'true'
            })
        ).toEqual(
            expect.objectContaining({
                errorType: ERROR_TYPE.BAD_GATEWAY,
                valResult: {
                    link: {
                        icon: GUIDED_ANSWERS_ICON,
                        text: 'Need help with this error?',
                        url: `https://ga.support.sap.com/dtp/viewer/index.html#/tree/${HELP_TREE.FIORI_TOOLS}/actions/${HELP_NODES.BAD_GATEWAY}`
                    },
                    message: 'The server returned an error. Bad gateway: 502'
                }
            })
        );

        // Authentication errors should return an authentication error message if the destination has authentication configured as 'NoAuthentication'
        jest.spyOn(ODataService.prototype, 'get').mockRejectedValueOnce(newAxiosErrorWithStatus(403));
        expect(
            await connectValidator.validateDestination({
                Name: 'dest1',
                Host: 'https://system1:12345/path/to/service',
                Type: 'HTTP',
                Authentication: 'OAuth2ClientCredentials',
                ProxyType: 'Internet',
                Description: 'desc',
                WebIDEUsage: 'odata_gen',
                WebIDEAdditionalData: 'full_url',
                'HTML5.DynamicDestination': 'true'
            })
        ).toEqual({
            errorType: ERROR_TYPE.AUTH,
            valResult: 'Authentication incorrect. Please check the SAP BTP destination authentication configuration.'
        });
    });

    test('should re-use `connectedSystem` when provided rather than re-authentication', async () => {
        let connectValidator = new ConnectionValidator();
        (connectValidator as any)._validatedUrl = 'https://system1:12345/';
        const checkUrlSpy = jest.spyOn(connectValidator as any, 'checkUrl');
        // Reentrance ticket, prevent re-authentication
        let cachedConnectedSystem: ConnectedSystem = {
            serviceProvider: {
                catalog: catalogServiceMock
            } as unknown as AbapServiceProvider,
            backendSystem: {
                name: 'system1',
                url: 'https://system1:12345/',
                authenticationType: 'reentranceTicket',
                userDisplayName: 'user1',
                client: '001'
            }
        };
        connectValidator.setConnectedSystem(cachedConnectedSystem);
        // Validate the connection has updated the connectionValidator properties correctly
        expect(connectValidator.serviceProvider).toEqual(cachedConnectedSystem.serviceProvider);
        expect(connectValidator.catalogs[ODataVersion.v2]).toBeDefined();
        expect(connectValidator.catalogs[ODataVersion.v4]).toBeDefined();
        expect(connectValidator.validatedUrl).toEqual(cachedConnectedSystem.backendSystem!.url);
        expect(connectValidator.connectedUserName).toEqual(cachedConnectedSystem.backendSystem!.userDisplayName);
        expect(connectValidator.validatedClient).toEqual(cachedConnectedSystem.backendSystem!.client);
        expect(connectValidator.refreshToken).toEqual(undefined);
        expect(connectValidator.validity).toEqual({
            authenticated: true,
            reachable: true,
            urlFormat: true,
            authRequired: true
        });
        expect(connectValidator.systemAuthType).toEqual('reentranceTicket');

        let connectValResult = await connectValidator.validateUrl(cachedConnectedSystem.backendSystem!.url, {
            isSystem: true,
            systemAuthType: 'reentranceTicket'
        });

        expect(connectValResult).toEqual(true);
        expect(checkUrlSpy).not.toHaveBeenCalled();

        // Service Keys, prevent re-authentication
        cachedConnectedSystem = {
            serviceProvider: {
                catalog: catalogServiceMock
            } as unknown as AbapServiceProvider,
            backendSystem: {
                name: 'system2',
                url: 'https://system2:1234554321/',
                authenticationType: '',
                serviceKeys: {
                    url: 'https://system2:54321/'
                }
            }
        };

        connectValidator = new ConnectionValidator();
        const createSystemConnectionSpy = jest.spyOn(connectValidator as any, 'checkUrl');
        connectValidator.setConnectedSystem(cachedConnectedSystem);

        connectValResult = await connectValidator.validateServiceInfo(
            cachedConnectedSystem.backendSystem!.serviceKeys as ServiceInfo
        );

        expect(connectValResult).toEqual(true);
        expect(createSystemConnectionSpy).not.toHaveBeenCalled();
    });

    test('Should only support cached connection re-use for Abap Service Providers', async () => {
        const debugLogSpy = jest.spyOn(LoggerHelper.logger, 'debug');
        const serviceProvider = {}; // Not an AbapServiceProvider since no catalog method
        const connectValidator = new ConnectionValidator();
        connectValidator.setConnectedSystem({ serviceProvider } as ConnectedSystem);
        expect(debugLogSpy).toHaveBeenCalledWith(
            'ConnectionValidator.setConnectedSystem(): Use of a cached connected system is only supported for AbapServiceProviders. Re-authorization will be required.'
        );
    });
});
