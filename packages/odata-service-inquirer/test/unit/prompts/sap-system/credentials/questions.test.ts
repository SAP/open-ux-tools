import type { ODataService, ServiceProvider } from '@sap-ux/axios-extension';
import { type Destination, WebIDEUsage } from '@sap-ux/btp-utils';
import type { InputQuestion, PasswordQuestion } from '@sap-ux/inquirer-common';
import { type BackendSystem } from '@sap-ux/store';
import { initI18nOdataServiceInquirer, t } from '../../../../../src/i18n';
import { ConnectionValidator } from '../../../../../src/prompts/connectionValidator';
import { getCredentialsPrompts } from '../../../../../src/prompts/datasources/sap-system/credentials/questions';
import { promptNames } from '../../../../../src/types';
import type { NewSystemAnswers } from '../../../../../src/prompts/datasources/sap-system/new-system/types';
import { newSystemPromptNames } from '../../../../../src/prompts/datasources/sap-system/new-system/types';
import { PromptState } from '../../../../../src/utils';
import { Severity } from '@sap-devx/yeoman-ui-types';

const serviceProviderMock = {} as Partial<ServiceProvider>;
let odataServiceMock: Partial<ODataService> | undefined;
let destinationUrlMock: string | undefined;
let validatedUrlMock: string | undefined;
const validateAuthMock = jest.fn().mockResolvedValue({ valResult: true });
const isAuthRequiredMock = jest.fn().mockResolvedValue(false);

const connectionValidatorMock = {
    validity: {} as ConnectionValidator['validity'],
    validatedUrl: validatedUrlMock,
    validateAuth: validateAuthMock,
    isAuthRequired: isAuthRequiredMock,
    destinationUrl: destinationUrlMock,
    serviceProvider: serviceProviderMock,
    systemAuthType: 'basic',
    odataService: odataServiceMock,
    ignoreCertError: false
};

jest.mock('../../../../../src/prompts/connectionValidator', () => {
    return {
        ConnectionValidator: jest.fn().mockImplementation(() => connectionValidatorMock)
    };
});

describe('Test credentials prompts', () => {
    const promptNamespace = 'someNamespace';
    const systemUsernamePromptName = `${promptNamespace}:systemUsername`;
    const systemPasswordPromptName = `${promptNamespace}:systemPassword`;

    beforeAll(async () => {
        await initI18nOdataServiceInquirer();
    });

    beforeEach(() => {
        connectionValidatorMock.validateAuth = validateAuthMock;
        connectionValidatorMock.isAuthRequired = isAuthRequiredMock;
        connectionValidatorMock.validity = {};
    });

    test('should show username/password prompts when authentication required', async () => {
        const connectionValidator = new ConnectionValidator();
        connectionValidatorMock.validity = {
            authenticated: false,
            authRequired: true,
            reachable: true
        };
        connectionValidatorMock.systemAuthType = 'basic';
        connectionValidatorMock.isAuthRequired = jest.fn().mockResolvedValue(true);
        const credentialsPrompts = getCredentialsPrompts(connectionValidator, promptNamespace);
        const userNamePrompt = credentialsPrompts.find(
            (question) => question.name === systemUsernamePromptName
        ) as InputQuestion;
        const passwordPrompt = credentialsPrompts.find(
            (question) => question.name === systemPasswordPromptName
        ) as PasswordQuestion;

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
        const connectionValidator = new ConnectionValidator();
        connectionValidatorMock.validity = {
            authenticated: false,
            authRequired: true,
            reachable: true
        };

        connectionValidatorMock.validateAuth = jest.fn().mockResolvedValue({ valResult: true });
        const credentialsPrompts = getCredentialsPrompts(connectionValidator, promptNamespace);
        const userNamePrompt = credentialsPrompts.find(
            (question) => question.name === systemUsernamePromptName
        ) as InputQuestion;
        const passwordPrompt = credentialsPrompts.find(
            (question) => question.name === systemPasswordPromptName
        ) as PasswordQuestion;

        // Prompt state should not be updated with the connected system until the connection is validated
        expect(PromptState.odataService.connectedSystem?.serviceProvider).toBe(undefined);
        // Should validate username length is not zero
        expect((userNamePrompt.validate as Function)('')).toBe(false);
        expect((userNamePrompt.validate as Function)('1')).toBe(true);

        // Should validate to false if password, systemUrl or username is empty
        const systemUrl = 'http://some.abap.system:1234';
        connectionValidatorMock.validatedUrl = systemUrl;

        const username = 'user01';
        const password = 'pword01';

        expect(await (passwordPrompt?.validate as Function)('', { [systemUsernamePromptName]: username })).toBe(false);
        expect(await (passwordPrompt?.validate as Function)(password, { [systemUsernamePromptName]: '' })).toBe(false);
        expect(await (passwordPrompt?.validate as Function)(password, { [systemUsernamePromptName]: username })).toBe(
            true
        );
        // Should have attempted to validate since required above conditions are met
        expect(connectionValidatorMock.validateAuth).toHaveBeenCalled();

        expect(await (passwordPrompt?.validate as Function)('pword01', { [systemUsernamePromptName]: username })).toBe(
            true
        );
        expect(connectionValidatorMock.validateAuth).toHaveBeenCalledWith(systemUrl, username, password, {
            isSystem: true,
            sapClient: undefined
        });
        expect(PromptState.odataService.connectedSystem?.serviceProvider).toBe(serviceProviderMock);

        // Should not update connected system if validation fails, validation message should be returned
        PromptState.reset();
        connectionValidatorMock.validateAuth = jest
            .fn()
            .mockResolvedValue({ valResult: 'Could not authenticate with provided credentials' });
        expect(await (passwordPrompt?.validate as Function)('pword01', { [systemUsernamePromptName]: username })).toBe(
            'Could not authenticate with provided credentials'
        );
        expect(PromptState.odataService.connectedSystem).toBeUndefined;
    });

    test('should update username/password for stored systems if changed', async () => {
        const connectionValidator = new ConnectionValidator();
        connectionValidatorMock.validity = {
            authenticated: false,
            authRequired: true,
            reachable: true
        };
        connectionValidatorMock.systemAuthType = 'basic';
        const systemUrl = 'http://some.abap.system:1234';
        connectionValidatorMock.validatedUrl = systemUrl;

        const credentialsPrompts = getCredentialsPrompts(connectionValidator, promptNamespace);
        const passwordPrompt = credentialsPrompts.find(
            (question) => question.name === systemPasswordPromptName
        ) as PasswordQuestion;

        const backendSystemBasic: BackendSystem = {
            name: 'http://abap.on.prem:1234',
            url: 'http://abap.on.prem:1234',
            username: 'user1',
            password: 'password1',
            client: '001'
        };

        const answers = {
            [systemUsernamePromptName]: 'username1',
            [promptNames.systemSelection]: {
                type: 'backendSystem',
                system: backendSystemBasic
            }
        };

        // Since a different password is entered, the system should be updated
        expect(await (passwordPrompt?.validate as Function)('password2', answers)).toBe(true);
        expect(connectionValidatorMock.validateAuth).toHaveBeenCalledWith(systemUrl, 'username1', 'password2', {
            isSystem: true,
            sapClient: '001'
        });
        expect(PromptState.odataService.connectedSystem?.backendSystem).toEqual({
            ...backendSystemBasic,
            username: 'username1',
            password: 'password2'
        });
    });

    test('should validate username/password for full or partial URL destinations that require basic authentication', async () => {
        const connectionValidator = new ConnectionValidator();
        connectionValidatorMock.validity = {
            authenticated: false,
            authRequired: true,
            reachable: true
        };
        connectionValidatorMock.systemAuthType = 'basic';
        const destUrl = 'http://dest1.dest';
        connectionValidatorMock.validatedUrl = destUrl;
        connectionValidatorMock.destinationUrl = 'http://abap01:1234/path/to/odata/service';

        const credentialsPrompts = getCredentialsPrompts(connectionValidator, promptNamespace);
        const passwordPrompt = credentialsPrompts.find(
            (question) => question.name === systemPasswordPromptName
        ) as PasswordQuestion;

        // Having an odataService indicates that there will only be a single service available, and selected by default
        connectionValidatorMock.odataService = {} as Partial<ODataService>;

        const partialUrlDest = {
            Name: 'dest1',
            Host: 'http://abap01:1234',
            WebIDEUsage: `${WebIDEUsage.ODATA_GENERIC}`
        } as Destination;

        const answers = {
            [systemUsernamePromptName]: 'username1',
            [promptNames.systemSelection]: {
                type: 'destination',
                system: partialUrlDest,
                sapClient: undefined // sap-client is not required for destination auth as its encoded in the destination configuration
            }
        };

        expect(await (passwordPrompt?.validate as Function)('password1', answers)).toBe(true);
        expect(connectionValidatorMock.validateAuth).toHaveBeenCalledWith(destUrl, 'username1', 'password1', {
            isSystem: false
        });
        expect(PromptState.odataService.connectedSystem?.destination).toEqual(partialUrlDest);
    });

    test('should show additional message indicating cert errors are ignored', async () => {
        const connectionValidator = new ConnectionValidator();
        connectionValidatorMock.validity = {
            authenticated: false,
            authRequired: true,
            reachable: true
        };
        connectionValidatorMock.systemAuthType = 'basic';
        connectionValidatorMock.validatedUrl = 'http://abap01:1234';

        const credentialsPrompts = getCredentialsPrompts(connectionValidator, promptNamespace);
        const passwordPrompt = credentialsPrompts.find(
            (question) => question.name === systemPasswordPromptName
        ) as PasswordQuestion;

        expect(passwordPrompt.additionalMessages?.('123')).toBeUndefined();

        connectionValidatorMock.ignoreCertError = true;
        expect(passwordPrompt.additionalMessages?.('123')).toEqual({
            message: t('warnings.certErrorIgnoredByNodeSetting'),
            severity: Severity.warning
        });

        // Should not show the message if the password prompt is part of the new Abap system flow as it will be shown under the new system URL prompt
        expect(
            passwordPrompt.additionalMessages?.('123', {
                [newSystemPromptNames.newSystemType]: 'abapOnPrem'
            } as NewSystemAnswers)
        ).toBeUndefined();
    });

    test('should not show credentials prompts if the sap client reference is invalid', async () => {
        const connectionValidator = new ConnectionValidator();
        connectionValidatorMock.validity = {
            authenticated: false,
            authRequired: true,
            reachable: true
        };
        connectionValidatorMock.isAuthRequired.mockReturnValue(true);
        connectionValidatorMock.systemAuthType = 'basic';
        connectionValidatorMock.validatedUrl = 'http://abap01:1234';
        const sapClientRef = {
            sapClient: '999',
            isValid: true
        };

        const credentialsPrompts = getCredentialsPrompts(connectionValidator, promptNamespace, sapClientRef);
        const userNamePrompt = credentialsPrompts.find(
            (question) => question.name === systemUsernamePromptName
        ) as InputQuestion;
        const passwordPrompt = credentialsPrompts.find(
            (question) => question.name === systemPasswordPromptName
        ) as PasswordQuestion;

        expect(await (userNamePrompt?.when as Function)()).toBe(true);
        expect(await (passwordPrompt?.when as Function)()).toBe(true);

        sapClientRef.isValid = false;
        expect(await (userNamePrompt?.when as Function)()).toBe(false);
        expect(await (passwordPrompt?.when as Function)()).toBe(false);
    });
});
