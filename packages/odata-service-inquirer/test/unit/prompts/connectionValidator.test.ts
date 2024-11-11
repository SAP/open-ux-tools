import * as axiosExtension from '@sap-ux/axios-extension';
import type { AbapServiceProvider, ODataServiceInfo } from '@sap-ux/axios-extension';
import { ODataService, ODataVersion, ServiceProvider, type AxiosRequestConfig } from '@sap-ux/axios-extension';
import type { ServiceInfo } from '@sap-ux/btp-utils';
import {
    GUIDED_ANSWERS_ICON,
    GUIDED_ANSWERS_LAUNCH_CMD_ID,
    HELP_NODES,
    HELP_TREE
} from '@sap-ux/guided-answers-helper';
import { AxiosError, type AxiosResponse } from 'axios';
import { ERROR_TYPE, ErrorHandler } from '../../../src/error-handler/error-handler';
import { initI18nOdataServiceInquirer, t } from '../../../src/i18n';
import { ConnectionValidator } from '../../../src/prompts/connectionValidator';

const odataServicesMock: ODataServiceInfo[] = [];
const catalogServiceMock = jest.fn().mockImplementation(() => ({
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    listServices: jest.fn().mockImplementation(() => odataServicesMock)
}));

jest.mock('@sap-ux/axios-extension', () => ({
    __esModule: true,
    ...jest.requireActual('@sap-ux/axios-extension'),
    AbapServiceProvider: jest.fn().mockImplementation(() => ({
        catalog: catalogServiceMock
    })),
    createForAbapOnCloud: jest.fn().mockImplementation(({ refreshTokenChangedCb }) => ({
        interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
        catalog: catalogServiceMock,
        user: jest.fn().mockReturnValue('user1@acme.com'),
        refreshTokenChangedCb // Test only, usually handled by attachUaaAuthInterceptor but here for testing purposes
    }))
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

        expect(result).toMatch(t('errors.connectionError'));
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
        expect(await validator.validateAuth(serviceUrl, 'user1', 'password1')).toEqual({ valResult: 'URL not found' });
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
                message: expect.stringContaining(
                    t('errors.urlCertValidationError', {
                        certErrorReason: t('texts.aSelfSignedCert')
                    })
                ),
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
            }
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
        const connectValidator = new ConnectionValidator();
        expect(await connectValidator.validateServiceInfo(serviceInfoMock as ServiceInfo)).toBe(true);
        expect(createAbapOnCloudProviderSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                environment: 'Standalone',
                refreshTokenChangedCb: expect.any(Function),
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

        // Ensure the refresh token is updated when it changes
        (connectValidator.serviceProvider as any).refreshTokenChangedCb('newToken1234');
        expect(connectValidator.refreshToken).toEqual('newToken1234');
    });

    test('should attempt to validate auth using v4 catalog where v2 is not available or user is not authorized', async () => {
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
                        text: t('guidedAnswers.validationErrorHelpText'),
                        url: `https://ga.support.sap.com/dtp/viewer/index.html#/tree/${HELP_TREE.FIORI_TOOLS}/actions/${HELP_NODES.DESTINATION_MISCONFIGURED}`
                    },
                    message: t('errors.destination.misconfigured', { destinationProperty: 'HTML5.DynamicDestination' })
                }
            })
        );
    });

    test('should validate destination service (full and partial url) connection', async () => {
        jest.spyOn(ODataService.prototype, 'get').mockResolvedValueOnce({ status: 200 });
        const connectValidator = new ConnectionValidator();
        expect(
            await connectValidator.validateDestination({
                Name: 'dest1',
                Host: 'https://system1:12345/path/to/service',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'desc',
                WebIDEUsage: 'odata_gen',
                WebIDEAdditionalData: 'full_url'
            })
        ).toEqual({ valResult: true });

        expect(connectValidator.validatedUrl).toEqual('https://dest1.dest');
        expect(connectValidator.destinationUrl).toEqual('https://system1:12345/path/to/service');
        expect(connectValidator.validity).toEqual({
            authenticated: true,
            reachable: true
        });

        jest.spyOn(ODataService.prototype, 'get').mockResolvedValueOnce({ status: 200 });
        expect(
            await connectValidator.validateDestination(
                {
                    Name: 'dest2',
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
                valResult: {
                    link: {
                        icon: GUIDED_ANSWERS_ICON,
                        text: t('guidedAnswers.validationErrorHelpText'),
                        url: `https://ga.support.sap.com/dtp/viewer/index.html#/tree/${HELP_TREE.FIORI_TOOLS}/actions/${HELP_NODES.DESTINATION_NOT_FOUND}`
                    },
                    message: t('errors.urlNotFound')
                }
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
                        text: t('guidedAnswers.validationErrorHelpText'),
                        url: `https://ga.support.sap.com/dtp/viewer/index.html#/tree/${HELP_TREE.FIORI_TOOLS}/actions/${HELP_NODES.BAD_GATEWAY}`
                    },
                    message: 'The server returned an error. Bad gateway: 502'
                }
            })
        );
    });
});
