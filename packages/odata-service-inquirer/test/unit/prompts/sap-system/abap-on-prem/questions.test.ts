import type { ServiceProvider, V2CatalogService, V4CatalogService } from '@sap-ux/axios-extension';
import { ODataVersion } from '@sap-ux/axios-extension';
import { initI18nOdataServiceInquirer } from '../../../../../src/i18n';
import type { ConnectionValidator } from '../../../../../src/prompts/connectionValidator';
import { getAbapOnPremQuestions } from '../../../../../src/prompts/datasources/sap-system/abap-on-prem/questions';
import { newSystemPromptNames } from '../../../../../src/prompts/datasources/sap-system/new-system/types';
import { promptNames } from '../../../../../src/types';
import { PromptState } from '../../../../../src/utils';

const validateUrlMock = jest.fn().mockResolvedValue(true);
const validateAuthMock = jest.fn().mockResolvedValue({ valResult: true });
const isAuthRequiredMock = jest.fn().mockResolvedValue(false);
const serviceProviderMock = {} as Partial<ServiceProvider>;

const catalogs = {
    [ODataVersion.v2]: {
        listServices: jest.fn().mockResolvedValue([])
    } as Partial<V2CatalogService>,
    [ODataVersion.v4]: {
        listServices: jest.fn().mockResolvedValue([])
    } as Partial<V4CatalogService>
};
const connectionValidatorMock = {
    validity: {} as ConnectionValidator['validity'],
    validatedUrl: '',
    validateUrl: validateUrlMock,
    validateAuth: validateAuthMock,
    isAuthRequired: isAuthRequiredMock,
    serviceProvider: serviceProviderMock,
    catalogs,
    systemAuthType: 'basic'
};
jest.mock('../../../../../src/prompts/connectionValidator', () => {
    return {
        ConnectionValidator: jest.fn().mockImplementation(() => connectionValidatorMock)
    };
});

describe('questions', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    beforeEach(() => {
        // Restore default mock implementations
        jest.restoreAllMocks();
        connectionValidatorMock.validity = {};
        connectionValidatorMock.validateUrl = validateUrlMock;
        connectionValidatorMock.validateAuth = validateAuthMock;
        connectionValidatorMock.catalogs = catalogs;
        connectionValidatorMock.serviceProvider = serviceProviderMock;
    });

    test('should return expected questions', () => {
        const newSystemQuestions = getAbapOnPremQuestions();
        expect(newSystemQuestions).toMatchInlineSnapshot(`
            [
              {
                "guiOptions": {
                  "breadcrumb": true,
                  "hint": "Enter the URL of the SAP System",
                  "mandatory": true,
                },
                "message": "System URL",
                "name": "abapOnPrem:newSystemUrl",
                "type": "input",
                "validate": [Function],
              },
              {
                "guiOptions": {
                  "breadcrumb": "SAP Client",
                },
                "message": "SAP client (leave empty for default)",
                "name": "sapClient",
                "type": "input",
                "validate": [Function],
              },
              {
                "default": "",
                "guiOptions": {
                  "mandatory": true,
                },
                "message": "Username",
                "name": "abapOnPrem:systemUsername",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              {
                "default": "",
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "mandatory": true,
                },
                "guiType": "login",
                "mask": "*",
                "message": "Password",
                "name": "abapOnPrem:systemPassword",
                "type": "password",
                "validate": [Function],
                "when": [Function],
              },
              {
                "default": [Function],
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "breadcrumb": true,
                  "hint": "Entering a system name will save the connection for re-use.",
                  "mandatory": true,
                },
                "message": "System name",
                "name": "abapOnPrem:userSystemName",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              {
                "additionalMessages": [Function],
                "choices": [Function],
                "default": [Function],
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "breadcrumb": "Service",
                  "mandatory": true,
                },
                "message": [Function],
                "name": "abapOnPrem:serviceSelection",
                "source": [Function],
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
              {
                "name": "abapOnPrem:cliServiceSelection",
                "when": [Function],
              },
            ]
        `);
    });

    test('Should exclude specific system prompts based on prompt options', () => {
        const newSystemQuestions = getAbapOnPremQuestions({
            userSystemName: { hide: true }
        });
        expect(newSystemQuestions.find((question) => question.name === 'userSystemName')).toBeFalsy();
    });

    test('Should connect to abap-on-prem system url using ConnectionValidator', async () => {
        const newSystemQuestions = getAbapOnPremQuestions();
        const systemUrlQuestion = newSystemQuestions.find(
            (question) => question.name === `abapOnPrem:${newSystemPromptNames.newSystemUrl}`
        );
        const systemUrl = 'https://example.com';
        expect(await (systemUrlQuestion?.validate as Function)(systemUrl)).toBe(true);
        expect(connectionValidatorMock.validateUrl).toHaveBeenCalledWith('https://example.com', {
            isSystem: true,
            odataVersion: undefined
        });
        // Prompt state should be updated with the connected system
        expect(PromptState.odataService.connectedSystem?.serviceProvider).toEqual(serviceProviderMock);
        // Prompt state should not be updated with the connected system if the system url validation fails
        connectionValidatorMock.validateUrl = jest.fn().mockResolvedValue('Authentication needed');
        connectionValidatorMock.validity = {
            authenticated: false,
            authRequired: true,
            reachable: true
        };
        expect(await (systemUrlQuestion?.validate as Function)(systemUrl)).toBe('Authentication needed');
    });

    test('should show username/password prompts when authentication required', async () => {
        connectionValidatorMock.validity = {
            authenticated: false,
            authRequired: true,
            reachable: true
        };
        connectionValidatorMock.systemAuthType = 'basic';
        connectionValidatorMock.isAuthRequired = jest.fn().mockResolvedValue(true);
        const newSystemQuestions = getAbapOnPremQuestions();
        const userNamePrompt = newSystemQuestions.find((question) => question.name === 'abapOnPrem:systemUsername');
        const passwordPrompt = newSystemQuestions.find((question) => question.name === 'abapOnPrem:systemPassword');

        expect(await (userNamePrompt?.when as Function)()).toBe(true);
        expect(await (passwordPrompt?.when as Function)()).toBe(true);

        // Should not be shown if authentication is not required
        connectionValidatorMock.validity = {
            authenticated: false,
            authRequired: false,
            reachable: true
        };
        connectionValidatorMock.isAuthRequired = jest.fn().mockResolvedValue(false);

        expect(await (userNamePrompt?.when as Function)()).toBe(false);
        expect(await (passwordPrompt?.when as Function)()).toBe(false);

        // Should be shown if auth required
        connectionValidatorMock.validity = {
            authenticated: false,
            authRequired: true,
            reachable: true
        };
        connectionValidatorMock.isAuthRequired = jest.fn().mockResolvedValue(true);

        expect(await (userNamePrompt?.when as Function)()).toBe(true);
        expect(await (passwordPrompt?.when as Function)()).toBe(true);
    });

    test('should validate username/password using ConnectionValidator', async () => {
        connectionValidatorMock.validity = {
            authenticated: false,
            authRequired: true,
            reachable: true
        };
        const abapOnPremSystemUsername = 'abapOnPrem:systemUsername';
        const abapOnPremSystemPassword = 'abapOnPrem:systemPassword';

        connectionValidatorMock.validateAuth = jest.fn().mockResolvedValue({ valResult: true });
        const newSystemQuestions = getAbapOnPremQuestions();
        const userNamePrompt = newSystemQuestions.find((question) => question.name === abapOnPremSystemUsername);
        const passwordPrompt = newSystemQuestions.find((question) => question.name === abapOnPremSystemPassword);

        // Prompt state should not be updated with the connected system until the connection is validated
        expect(PromptState.odataService.connectedSystem?.serviceProvider).toBe(undefined);
        // Should validate username length is not zero
        expect(await (userNamePrompt?.validate as Function)('')).toBe(false);
        expect(await (userNamePrompt?.validate as Function)('1')).toBe(true);

        // Should validate to false if password, systemUrl or username is empty
        const systemUrl = 'http://some.abap.system:1234';
        connectionValidatorMock.validatedUrl = systemUrl;

        const abapSystemUsername = 'user01';
        const password = 'pword01';

        expect(
            await (passwordPrompt?.validate as Function)('', { [abapOnPremSystemUsername]: abapSystemUsername })
        ).toBe(false);
        expect(await (passwordPrompt?.validate as Function)(password, { [abapOnPremSystemUsername]: '' })).toBe(false);
        expect(
            await (passwordPrompt?.validate as Function)(password, { [abapOnPremSystemUsername]: abapSystemUsername })
        ).toBe(true);
        // Should have attempted to validate since required above conditions are met
        expect(connectionValidatorMock.validateAuth).toHaveBeenCalled();

        expect(
            await (passwordPrompt?.validate as Function)('pword01', { [abapOnPremSystemUsername]: abapSystemUsername })
        ).toBe(true);
        expect(connectionValidatorMock.validateAuth).toHaveBeenCalledWith(systemUrl, abapSystemUsername, password, {
            isSystem: true,
            sapClient: undefined
        });
        expect(PromptState.odataService.connectedSystem?.serviceProvider).toBe(serviceProviderMock);
    });

    test('should prompt for new system name and create Backend System for storage (VSCode)', async () => {
        const systemUrl = 'http://some.abap.system:1234';
        // Should show new system name prompt only once authenticated or authentication not required
        const newSystemQuestions = getAbapOnPremQuestions();
        const userSystemNamePrompt = newSystemQuestions.find(
            (question) => question.name === `abapOnPrem:${promptNames.userSystemName}`
        );

        const systemUrlPromptName = `abapOnPrem:${newSystemPromptNames.newSystemUrl}`;

        connectionValidatorMock.validity = {
            authenticated: false,
            authRequired: true,
            reachable: true
        };
        expect(await (userSystemNamePrompt?.when as Function)({ [systemUrlPromptName]: systemUrl })).toBe(false);

        connectionValidatorMock.validity = {
            authenticated: false,
            authRequired: false,
            reachable: true
        };
        expect(await (userSystemNamePrompt?.when as Function)({ [systemUrlPromptName]: systemUrl })).toBe(true);

        connectionValidatorMock.validity = {
            authenticated: true,
            authRequired: true,
            reachable: true
        };
        expect(await (userSystemNamePrompt?.when as Function)({ [systemUrlPromptName]: systemUrl })).toBe(true);
    });

    test('Should validate sap-client input', () => {
        const newSystemQuestions = getAbapOnPremQuestions();
        const sapClientPrompt = newSystemQuestions.find((question) => question.name === `sapClient`);
        expect((sapClientPrompt?.validate as Function)('')).toBe(true);
        expect((sapClientPrompt?.validate as Function)('123')).toBe(true);
        expect((sapClientPrompt?.validate as Function)('123x')).toEqual(expect.any(String));
    });
});
