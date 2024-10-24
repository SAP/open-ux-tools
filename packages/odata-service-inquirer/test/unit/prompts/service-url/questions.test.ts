import { initI18nOdataServiceInquirer, t } from '../../../../src/i18n';
import { OdataVersion, promptNames } from '../../../../src/index';
import * as serviceUrlValidators from '../../../../src/prompts/datasources/service-url/validators';
import { getServiceUrlQuestions } from '../../../../src/prompts/datasources/service-url/questions';
import { serviceUrlInternalPromptNames } from '../../../../src/prompts/datasources/service-url/types';
import LoggerHelper from '../../../../src/prompts/logger-helper';
import { hostEnvironment, getHostEnvironment } from '@sap-ux/fiori-generator-shared';
import type { ODataService, ServiceProvider } from '@sap-ux/axios-extension';

const validateUrlMockTrue = jest.fn().mockResolvedValue(true);
const validateAuthTrue = jest.fn().mockResolvedValue(true);
const odataServiceMock = {} as Partial<ODataService>;
const serviceProviderMock = {} as Partial<ServiceProvider>;

const connectionValidatorMock = {
    validity: {},
    validateUrl: validateUrlMockTrue,
    validateAuth: validateAuthTrue,
    odataService: odataServiceMock,
    serviceProvider: serviceProviderMock,
    axiosConfig: {}
};
jest.mock('../../../../src/prompts/connectionValidator', () => {
    return {
        ConnectionValidator: jest.fn().mockImplementation(() => connectionValidatorMock)
    };
});

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    getHostEnvironment: jest.fn()
}));

const mockGetHostEnvironment = getHostEnvironment as jest.Mock;

describe('Service URL prompts', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    beforeEach(() => {
        // Restore default mock implementations
        jest.restoreAllMocks();
        connectionValidatorMock.validity = {};
        connectionValidatorMock.validateUrl = validateUrlMockTrue;
        connectionValidatorMock.validateAuth = validateAuthTrue;
    });
    test('getQuestions', async () => {
        mockGetHostEnvironment.mockReturnValueOnce(hostEnvironment.cli);
        let questions = getServiceUrlQuestions();
        expect(questions).toMatchInlineSnapshot(`
            [
              {
                "guiOptions": {
                  "breadcrumb": true,
                  "hint": "https://<hostname>:<port>/path/to/odata/service/",
                  "mandatory": true,
                },
                "message": "OData service URL",
                "name": "serviceUrl",
                "type": "input",
                "validate": [Function],
              },
              {
                "default": false,
                "message": "Do you want to continue generation with the untrusted certificate?",
                "name": "ignoreCertError",
                "type": "confirm",
                "validate": [Function],
                "when": [Function],
              },
              {
                "name": "cliIgnoreCertValidate",
                "when": [Function],
              },
              {
                "guiOptions": {
                  "mandatory": true,
                },
                "message": "Service username",
                "name": "username",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              {
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "mandatory": true,
                },
                "guiType": "login",
                "mask": "*",
                "message": "Service password",
                "name": "serviceUrlPassword",
                "type": "password",
                "validate": [Function],
                "when": [Function],
              },
            ]
        `);

        questions = getServiceUrlQuestions({ serviceUrl: { requiredOdataVersion: OdataVersion.v4 } });
        let serviceUrlQuestion = questions.find((q) => q.name === 'serviceUrl');
        expect(serviceUrlQuestion).toMatchObject({
            guiOptions: {
                breadcrumb: true,
                hint: 'https://<hostname>:<port>/path/to/odata/service/',
                mandatory: true
            },
            message: 'OData V4 service URL',
            name: 'serviceUrl',
            type: 'input',
            validate: expect.any(Function)
        });

        questions = getServiceUrlQuestions({ serviceUrl: { requiredOdataVersion: OdataVersion.v2 } });
        serviceUrlQuestion = questions.find((q) => q.name === 'serviceUrl');
        expect(serviceUrlQuestion).toMatchObject({
            guiOptions: {
                breadcrumb: true,
                hint: 'https://<hostname>:<port>/path/to/odata/service/',
                mandatory: true
            },
            message: 'OData V2 service URL',
            name: 'serviceUrl',
            type: 'input',
            validate: expect.any(Function)
        });
    });

    test('Test prompt: serviceUrl', async () => {
        const serviceValidatorSpy = jest.spyOn(serviceUrlValidators, 'validateService').mockResolvedValue(true);
        connectionValidatorMock.validity = {
            urlFormat: true,
            reachable: true,
            authRequired: false,
            authenticated: false
        };
        connectionValidatorMock.axiosConfig = {};

        // Should validate service and return true if valid
        const serviceUrl = 'https://some.host:1234/service/path';
        let questions = getServiceUrlQuestions();
        let serviceUrlQuestion = questions.find((q) => q.name === promptNames.serviceUrl);
        expect(await (serviceUrlQuestion?.validate as Function)(serviceUrl)).toBe(true);

        expect(connectionValidatorMock.validateUrl).toHaveBeenCalledWith(serviceUrl);

        expect(serviceValidatorSpy).toHaveBeenCalledWith(
            serviceUrl,
            expect.objectContaining({ 'axiosConfig': {}, 'odataService': {} }),
            undefined
        );
        expect(validateUrlMockTrue).toHaveBeenCalledWith(serviceUrl);

        // Should call validate service with required odata version
        serviceValidatorSpy.mockClear();
        connectionValidatorMock.validateUrl.mockClear();
        questions = getServiceUrlQuestions({ serviceUrl: { requiredOdataVersion: OdataVersion.v4 } });
        serviceUrlQuestion = questions.find((q) => q.name === promptNames.serviceUrl);

        expect(await (serviceUrlQuestion?.validate as Function)(serviceUrl)).toBe(true);
        expect(connectionValidatorMock.validateUrl).toHaveBeenCalledWith(serviceUrl);
        expect(serviceValidatorSpy).toHaveBeenCalledWith(
            serviceUrl,
            expect.objectContaining({ 'axiosConfig': {}, 'odataService': {} }),
            OdataVersion.v4
        );

        // Should return true if can skip cert error
        serviceValidatorSpy.mockClear();
        connectionValidatorMock.validateUrl.mockClear();
        connectionValidatorMock.validity = {
            urlFormat: true,
            reachable: true,
            canSkipCertError: true
        };
        questions = getServiceUrlQuestions();
        serviceUrlQuestion = questions.find((q) => q.name === promptNames.serviceUrl);
        expect(await (serviceUrlQuestion?.validate as Function)(serviceUrl)).toBe(true);
        expect(connectionValidatorMock.validateUrl).toHaveBeenCalledWith(serviceUrl);
        // Should not validate service if can skip cert error as it requires furthur user input
        expect(serviceValidatorSpy).not.toHaveBeenCalled();

        // Should return true requires authentication
        serviceValidatorSpy.mockClear();
        connectionValidatorMock.validateUrl.mockClear();
        connectionValidatorMock.validity = {
            urlFormat: true,
            reachable: true,
            authRequired: true,
            authenticated: false
        };
        questions = getServiceUrlQuestions();
        serviceUrlQuestion = questions.find((q) => q.name === promptNames.serviceUrl);
        expect(await (serviceUrlQuestion?.validate as Function)(serviceUrl)).toBe(true);
        expect(connectionValidatorMock.validateUrl).toHaveBeenCalledWith(serviceUrl);
        // Should not validate service if authenticaion is required
        expect(serviceValidatorSpy).not.toHaveBeenCalled();

        // Should return a validation message if there is a message returned by the ConnectionValidator
        serviceValidatorSpy.mockClear();
        connectionValidatorMock.validateUrl.mockClear();
        connectionValidatorMock.validateUrl = jest.fn().mockResolvedValue('A connection error message');
        connectionValidatorMock.validity = {
            urlFormat: true,
            reachable: false
        };
        questions = getServiceUrlQuestions();
        serviceUrlQuestion = questions.find((q) => q.name === promptNames.serviceUrl);
        expect(await (serviceUrlQuestion?.validate as Function)(serviceUrl)).toBe('A connection error message');
        expect(connectionValidatorMock.validateUrl).toHaveBeenCalledWith(serviceUrl);
        // Should not validate service if authenticaion is required
        expect(serviceValidatorSpy).not.toHaveBeenCalled();
    });

    test('Test prompt: ignoreCertError', async () => {
        const serviceUrl = 'https://some.host:1234/service/path';
        const questions = getServiceUrlQuestions();
        const ignorableCertErrorsPrompt = questions.find(
            (q) => q.name === serviceUrlInternalPromptNames.ignoreCertError
        );
        expect(await (ignorableCertErrorsPrompt?.when as Function)({})).toBe(false);

        connectionValidatorMock.validity = {
            canSkipCertError: true
        };
        expect(await (ignorableCertErrorsPrompt?.when as Function)({ [promptNames.serviceUrl]: serviceUrl })).toBe(
            true
        );

        // Validation
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'warn');
        expect(await (ignorableCertErrorsPrompt?.validate as Function)(true, {})).toBe(false);

        const serviceValidatorSpy = jest.spyOn(serviceUrlValidators, 'validateService').mockResolvedValue(true);
        connectionValidatorMock.validateUrl.mockClear();
        connectionValidatorMock.validity = {
            urlFormat: true,
            reachable: true,
            authRequired: false,
            authenticated: false,
            canSkipCertError: true
        };
        expect(
            await (ignorableCertErrorsPrompt?.validate as Function)(true, { [promptNames.serviceUrl]: serviceUrl })
        ).toBe(true);
        expect(connectionValidatorMock.validateUrl).toHaveBeenCalledWith(serviceUrl, {
            forceReValidation: true,
            ignoreCertError: true
        });
        expect(serviceValidatorSpy).toHaveBeenCalledWith(
            serviceUrl,
            expect.objectContaining({ 'axiosConfig': {}, 'odataService': {} }),
            undefined,
            true
        );
        expect(loggerSpy).toHaveBeenCalledWith(t('prompts.validationMessages.warningCertificateValidationDisabled'));

        // Should return a validation message if there is a message returned by the ConnectionValidator
        serviceValidatorSpy.mockClear();
        connectionValidatorMock.validateUrl = jest.fn().mockResolvedValue('A connection error message');
        connectionValidatorMock.validity = {
            urlFormat: true,
            reachable: false
        };
        expect(
            await (ignorableCertErrorsPrompt?.validate as Function)(true, { [promptNames.serviceUrl]: serviceUrl })
        ).toBe('A connection error message');
        expect(connectionValidatorMock.validateUrl).toHaveBeenCalledWith(serviceUrl, {
            forceReValidation: true,
            ignoreCertError: true
        });
        // Should not validate service
        expect(serviceValidatorSpy).not.toHaveBeenCalled();

        // If authentication required should return true (subsequent prompts will handle the authentication)
        connectionValidatorMock.validateUrl = validateUrlMockTrue;
        connectionValidatorMock.validity = {
            urlFormat: true,
            reachable: true,
            authRequired: true,
            authenticated: false,
            canSkipCertError: true
        };
        expect(
            await (ignorableCertErrorsPrompt?.validate as Function)(true, { [promptNames.serviceUrl]: serviceUrl })
        ).toBe(true);
    });

    test('Test prompt: cliIgnoreCertValidate', async () => {
        mockGetHostEnvironment.mockReturnValueOnce(hostEnvironment.cli);
        connectionValidatorMock.validity = {
            urlFormat: true,
            reachable: true,
            authRequired: false,
            authenticated: false,
            canSkipCertError: true
        };
        const serviceUrl = 'https://some.host:1234/service/path';
        const questions = getServiceUrlQuestions();
        const ignorableCertErrorsPrompt = questions.find(
            (q) => q.name === serviceUrlInternalPromptNames.cliIgnoreCertValidate
        );

        // If ignoreCertError is false, should exit generation with error
        await expect(
            (ignorableCertErrorsPrompt?.when as Function)({
                [promptNames.serviceUrl]: serviceUrl,
                [serviceUrlInternalPromptNames.ignoreCertError]: false
            })
        ).rejects.toThrowError(t('errors.exitingGeneration', { exitReason: t('errors.certValidationRequired') }));

        let serviceValidatorSpy = jest.spyOn(serviceUrlValidators, 'validateService').mockResolvedValue(true);
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'warn');

        // Should validate the service using the when condition on CLI but never return true, errors will be thrown and the generator will exit
        expect(
            await (ignorableCertErrorsPrompt?.when as Function)({
                [promptNames.serviceUrl]: serviceUrl,
                [serviceUrlInternalPromptNames.ignoreCertError]: true
            })
        ).toBe(false);

        expect(loggerSpy).toHaveBeenCalledWith(t('prompts.validationMessages.warningCertificateValidationDisabled'));
        expect(connectionValidatorMock.validateUrl).toHaveBeenCalledWith(serviceUrl, {
            forceReValidation: true,
            ignoreCertError: true
        });
        expect(serviceValidatorSpy).toHaveBeenCalledWith(
            serviceUrl,
            expect.objectContaining({ 'axiosConfig': {}, 'odataService': {} }),
            undefined,
            true
        );

        // Should return true if authentication needed (subsequent prompts will handle the authentication)
        connectionValidatorMock.validateUrl.mockClear();
        connectionValidatorMock.validity = {
            urlFormat: true,
            reachable: true,
            authRequired: true,
            authenticated: false,
            canSkipCertError: true
        };
        expect(
            await (ignorableCertErrorsPrompt?.when as Function)({
                [promptNames.serviceUrl]: serviceUrl,
                [serviceUrlInternalPromptNames.ignoreCertError]: true
            })
        ).toBe(false);
        expect(connectionValidatorMock.validateUrl).toHaveBeenCalledWith(serviceUrl, {
            forceReValidation: true,
            ignoreCertError: true
        });

        connectionValidatorMock.validity = {
            urlFormat: true,
            reachable: true,
            authRequired: false,
            authenticated: false,
            canSkipCertError: true
        };
        // Should throw an error if the service is not a valid odata service
        serviceValidatorSpy = jest.spyOn(serviceUrlValidators, 'validateService').mockResolvedValue('Invalid service');
        await expect(
            (ignorableCertErrorsPrompt?.when as Function)({
                [promptNames.serviceUrl]: serviceUrl,
                [serviceUrlInternalPromptNames.ignoreCertError]: true
            })
        ).rejects.toThrowError(t('errors.exitingGeneration', { exitReason: 'Invalid service' }));
    });

    test('Test prompt: username', async () => {
        const questions = getServiceUrlQuestions();
        const username = questions.find((q) => q.name === serviceUrlInternalPromptNames.username);
        expect((username?.when as Function)()).toBe(false);
        connectionValidatorMock.validity = {
            urlFormat: true,
            reachable: true,
            authRequired: true
        };
        expect((username?.when as Function)()).toBe(true);
        expect(await (username?.validate as Function)()).toBe(false);
        expect(await (username?.validate as Function)('user1')).toBe(true);
    });

    test('Test prompt: password', async () => {
        const serviceUrl = 'https://some.host:1234/service/path';
        const username = 'username1';
        const password = 'password1';
        const questions = getServiceUrlQuestions();
        const passwordPrompt = questions.find((q) => q.name === promptNames.serviceUrlPassword);
        expect((passwordPrompt?.when as Function)()).toBe(false);
        connectionValidatorMock.validity = {
            urlFormat: true,
            reachable: true,
            authRequired: true
        };
        expect((passwordPrompt?.when as Function)()).toBe(true);
        expect(await (passwordPrompt?.validate as Function)('', {})).toBe(false);
        expect(await (passwordPrompt?.validate as Function)(password, { serviceUrl: undefined })).toBe(false);

        let serviceValidatorSpy = jest.spyOn(serviceUrlValidators, 'validateService').mockResolvedValue(true);
        expect(await (passwordPrompt?.validate as Function)(password, { serviceUrl, username })).toBe(true);
        expect(connectionValidatorMock.validateAuth).toHaveBeenCalledWith(serviceUrl, username, password, {
            ignoreCertError: undefined
        });
        expect(serviceValidatorSpy).toHaveBeenCalledWith(
            serviceUrl,
            expect.objectContaining({ 'axiosConfig': {}, 'odataService': {} }),
            undefined,
            undefined
        );

        // should return a validation message if authentication fails
        connectionValidatorMock.validateAuth = jest.fn().mockResolvedValue('A connection error message');
        expect(await (passwordPrompt?.validate as Function)(password, { serviceUrl, username })).toBe(
            'A connection error message'
        );
        // should return a validation message if the service is not valid
        connectionValidatorMock.validateAuth = validateAuthTrue;
        serviceValidatorSpy = jest.spyOn(serviceUrlValidators, 'validateService').mockResolvedValue('Invalid service');
        expect(await (passwordPrompt?.validate as Function)(password, { serviceUrl, username })).toBe(
            'Invalid service'
        );
    });
});
