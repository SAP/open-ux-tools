import type { ServiceProvider, V2CatalogService, V4CatalogService } from '@sap-ux/axios-extension';
import { ODataVersion } from '@sap-ux/axios-extension';
import { initI18nOdataServiceInquirer, t } from '../../../../../src/i18n';
import type { ConnectionValidator } from '../../../../../src/prompts/connectionValidator';
import { getAbapOnPremQuestions } from '../../../../../src/prompts/datasources/sap-system/abap-on-prem/questions';
import { newSystemPromptNames } from '../../../../../src/prompts/datasources/sap-system/new-system/types';
import { promptNames } from '../../../../../src/types';
import { PromptState } from '../../../../../src/utils';
import * as utils from '../../../../../src/utils';
import type { InputQuestion } from '@sap-ux/inquirer-common';
import { Severity } from '@sap-devx/yeoman-ui-types';

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
    systemAuthType: 'basic',
    ignoreCertError: undefined
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
                "additionalMessages": [Function],
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
                "additionalMessages": [Function],
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
        connectionValidatorMock.validity.authenticated = true;
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

    test('Should not show an existing system validation error (since it is shown with client prompt)', async () => {
        const isBackendSystemKeyExistingSpy = jest.spyOn(utils, 'isBackendSystemKeyExisting');
        const systemUrl = 'http://some.abap.system:1234';
        const systemUrlPromptName = `abapOnPrem:${newSystemPromptNames.newSystemUrl}`;
        const newSystemQuestions = getAbapOnPremQuestions();
        const systemUrlQuestion = newSystemQuestions.find((question) => question.name === systemUrlPromptName);
        expect(await (systemUrlQuestion?.validate as Function)('')).toBe(true);
        expect(isBackendSystemKeyExistingSpy).not.toHaveBeenCalled();
    });

    test('Should validate sap-client input', () => {
        jest.spyOn(utils, 'isBackendSystemKeyExisting').mockReturnValue({
            name: 'System1234',
            url: 'http://some.system.hos'
        });
        const newSystemQuestions = getAbapOnPremQuestions();
        const sapClientPrompt = newSystemQuestions.find((question) => question.name === `sapClient`);
        expect((sapClientPrompt?.validate as Function)('')).toBe(true);
        expect((sapClientPrompt?.validate as Function)('123')).toBe(true);
        expect((sapClientPrompt?.validate as Function)('123x')).toEqual(expect.any(String));

        // Should show an existing system warning for client prompt when abap on prem url provided for an existing system (non-BAS)
        expect(
            (sapClientPrompt?.validate as Function)('123', { 'abapOnPrem:newSystemUrl': 'http://some.system.host' })
        ).toEqual(t('prompts.validationMessages.backendSystemExistsWarning', { backendName: 'System1234' }));
    });

    test('Should show `NODE_TLD_REJECT_UNAUTHORIZED` warning if set when bypassing certificate errors', async () => {
        const newSystemQuestions = getAbapOnPremQuestions();
        const systemUrlQuestion = newSystemQuestions.find(
            (question) => question.name === `abapOnPrem:${newSystemPromptNames.newSystemUrl}`
        ) as InputQuestion;
        const systemUrl = 'https://example.com';
        // @ts-expect-error ignore type error for mock
        connectionValidatorMock.ignoreCertError = true;
        expect(await (systemUrlQuestion?.additionalMessages as Function)()).toEqual({
            message: t('warnings.certErrorIgnoredByNodeSetting'),
            severity: Severity.warning
        });
    });
});
