import * as axiosExtension from '@sap-ux/axios-extension';
import type { AxiosRequestConfig } from '@sap-ux/axios-extension';
import { ODataService, ServiceProvider } from '@sap-ux/axios-extension';
import type { AxiosResponse } from 'axios';
import { AxiosError } from 'axios';
import { ErrorHandler } from '../../../src/error-handler/error-handler';
import { GUIDED_ANSWERS_LAUNCH_CMD_ID } from '../../../src/error-handler/help/help-topics';
import { GUIDED_ANSWERS_ICON } from '../../../src/error-handler/help/images';
import { initI18nOdataServiceInquirer, t } from '../../../src/i18n';
import { ConnectionValidator } from '../../../src/prompts/connectionValidator';

/**
 * Workaround to allow spyOn
 */
jest.mock('@sap-ux/axios-extension', () => ({
    __esModule: true,
    ...jest.requireActual('@sap-ux/axios-extension')
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
    });

    test('should handle an invalid url', async () => {
        const invalidUrl = 'https://:example.com/service';
        const validator = new ConnectionValidator();

        const result = await validator.validateUrl(invalidUrl);
        expect(result).toBe(t('errors.invalidUrl'));
        expect(validator.validity).toEqual({
            urlFormat: false
        });

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
            authRequired: false,
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
            authRequired: true
        });

        const createProviderSpy = jest.spyOn(axiosExtension, 'create');
        const serviceProviderSpy = jest.spyOn(ServiceProvider.prototype, 'service');

        jest.spyOn(ODataService.prototype, 'get').mockResolvedValueOnce({ status: 200 });

        expect(await validator.validateAuth(serviceUrl, 'user1', 'password1')).toBe(true);
        const params = (createProviderSpy.mock.calls[0][0] as AxiosRequestConfig).params;
        expect(params['sap-client']).toBe('010');
        expect(createProviderSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                baseURL: 'https://somehost:1234',
                auth: { username: 'user1', password: 'password1' }
            })
        );
        expect(serviceProviderSpy).toHaveBeenCalledWith('/some/path/to/service/');

        // Dont authenticate if the url is empty
        getODataServiceSpy.mockReset();
        getODataServiceSpy = jest.spyOn(ODataService.prototype, 'get').mockRejectedValue(newAxiosErrorWithStatus(404));
        expect(await validator.validateAuth('', 'user1', 'password1')).toBe(false);
        expect(getODataServiceSpy).not.toHaveBeenCalled();

        // Dont authenticate if the url was previously validated as unreachable
        validator = new ConnectionValidator();
        await validator.validateUrl(serviceUrl);
        getODataServiceSpy.mockClear();

        expect(validator.validity).toEqual({
            urlFormat: true,
            reachable: false
        });
        expect(await validator.validateAuth(serviceUrl, 'user1', 'password1')).toBe(false);
        expect(validator.validity).toEqual({ urlFormat: true, reachable: false });
        expect(getODataServiceSpy).not.toHaveBeenCalled();
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
        expect(validator.validity).toEqual({ canSkipCertError: true, reachable: true, urlFormat: true });
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
            reachable: true,
            authRequired: true
        });
        jest.spyOn(ODataService.prototype, 'get').mockResolvedValueOnce({ status: 200 });
        expect(await validator.validateUrl('https://example.com/serviceB')).toBe(true);
        expect(validator.validity).toEqual({
            urlFormat: true,
            reachable: true,
            authRequired: false,
            authenticated: true
        });
    });

    test('should not validate the same url if already validated', async () => {
        const getODataServiceSpy = jest.spyOn(ODataService.prototype, 'get').mockResolvedValue({ status: 200 });
        const validator = new ConnectionValidator();
        const result = await validator.validateUrl('https://example.com/service');
        expect(result).toBe(true);
        expect(validator.validity).toEqual({
            authRequired: false,
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
        expect(validator.validity).toEqual({ authRequired: true, reachable: true, urlFormat: true });
        // Change the response to 200 and force re-validation of the same url
        jest.spyOn(ODataService.prototype, 'get').mockRejectedValueOnce(newAxiosErrorWithStatus(200));
        await validator.validateUrl('https://example.com/service', { forceReValidation: true });
        expect(validator.validity).toEqual({
            authRequired: false,
            authenticated: true,
            reachable: true,
            urlFormat: true
        });
        expect(getODataServiceSpy).toHaveBeenCalledTimes(2);
    });

    test('should update axios-config with sap-client with calling validateAuth', async () => {
        // todo:...
    });
});
