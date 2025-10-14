import type { AbapServiceProvider, ServiceProvider, V2CatalogService, V4CatalogService } from '@sap-ux/axios-extension';
import { ODataVersion } from '@sap-ux/axios-extension';
import type { Destination, Destinations } from '@sap-ux/btp-utils';
import { WebIDEAdditionalData, WebIDEUsage } from '@sap-ux/btp-utils';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import { hostEnvironment } from '@sap-ux/fiori-generator-shared';
import type { SystemService, BackendSystem } from '@sap-ux/store';
import type { ListChoiceOptions, Question } from 'inquirer';
import { ERROR_TYPE } from '../../../../../src';
import { initI18nOdataServiceInquirer, t } from '../../../../../src/i18n';
import type { ValidationResult } from '../../../../../src/prompts/types';
import { ConnectionValidator } from '../../../../../src/prompts/connectionValidator';
import { newSystemPromptNames } from '../../../../../src/prompts/datasources/sap-system/new-system/types';
import * as promptHelpers from '../../../../../src/prompts/datasources/sap-system/system-selection/prompt-helpers';
import type { SystemSelectionAnswerType } from '../../../../../src/prompts/datasources/sap-system/system-selection/prompt-helpers';
import { NewSystemChoice } from '../../../../../src/prompts/datasources/sap-system/system-selection/prompt-helpers';
import type { SystemSelectionAnswers } from '../../../../../src/prompts/datasources/sap-system/system-selection/questions';
import {
    getSystemConnectionQuestions,
    getSystemSelectionQuestions
} from '../../../../../src/prompts/datasources/sap-system/system-selection/questions';
import LoggerHelper from '../../../../../src/prompts/logger-helper';
import type { ConnectedSystem } from '../../../../../src/types';
import { promptNames } from '../../../../../src/types';
import { getPromptHostEnvironment, PromptState } from '../../../../../src/utils';
import { isFeatureEnabled } from '@sap-ux/feature-toggle';

jest.mock('../../../../../src/utils', () => ({
    ...jest.requireActual('../../../../../src/utils'),
    getPromptHostEnvironment: jest.fn()
}));

const backendSystemBasic: BackendSystem = {
    name: 'http://abap.on.prem:1234',
    url: 'http://abap.on.prem:1234',
    username: 'user1',
    password: 'password1',
    systemType: 'OnPrem'
};
const backendSystemReentrance: BackendSystem = {
    name: 'http://s4hc:1234',
    url: 'http:/s4hc:1234',
    authenticationType: 'reentranceTicket',
    systemType: 'S4HC'
};
const backendSystemServiceKeys: BackendSystem = {
    name: 'http://abap.on.btp:1234',
    url: 'http:/abap.on.btp:1234',
    authenticationType: 'serviceKeys',
    serviceKeys: {
        uaa: {
            clientid: 'clientid',
            clientsecret: 'client',
            url: 'http:/abap.on.btp:1234'
        },
        url: 'https://example.com/uaa',
        systemid: 'abap_btp_001'
    },
    systemType: 'BTP'
};

const backendSystems: BackendSystem[] = [backendSystemBasic];
let mockIsAppStudio = false;
const destination1 = { Name: 'dest1', Host: 'http://dest1.com' } as Destination;
const destinations: Destinations = { 'dest1': destination1 };

const systemServiceReadMock = jest.fn();
const systemServiceMock = {
    getAll: jest.fn().mockResolvedValue(backendSystems),
    read: systemServiceReadMock
} as Partial<SystemService>;

jest.mock('@sap-ux/store', () => ({
    __esModule: true, // Workaround to for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('@sap-ux/store'),
    // Mock store access
    SystemService: jest.fn().mockImplementation(() => systemServiceMock)
}));

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn().mockImplementation(() => mockIsAppStudio),
    listDestinations: jest.fn().mockImplementation(() => destinations)
}));

// ConnectionValidator mocking
let serviceProviderMock: Partial<ServiceProvider> | undefined;
let validateDestinationResultMock = { valResult: false };
const resetConnectionState = jest.fn().mockImplementation(() => {
    serviceProviderMock = undefined;
});
let validateUrlResultMock: ValidationResult = true;
const validateUrlMock = jest.fn().mockImplementation(() => {
    resetConnectionState();
    if (validateUrlResultMock === true) {
        serviceProviderMock = { name: 'connectedServiceProvider' } as Partial<ServiceProvider>;
    }
    return validateUrlResultMock;
});
const isAuthRequiredMock = jest.fn().mockResolvedValue(false);
let validateAuthResultMock: { valResult: ValidationResult; errorType?: ERROR_TYPE } = { valResult: false };

const validateAuthMock = jest.fn().mockImplementation(() => {
    resetConnectionState();
    if (validateAuthResultMock.valResult === true) {
        serviceProviderMock = { name: 'connectedServiceProvider' } as Partial<ServiceProvider>;
    } else {
        isAuthRequiredMock.mockResolvedValue(true);
    }
    return validateAuthResultMock;
});
let validateServiceInfoResultMock: ValidationResult = true;
const validateServiceInfoMock = jest.fn().mockImplementation(() => {
    resetConnectionState();
    if (validateServiceInfoResultMock === true) {
        serviceProviderMock = { name: 'connectedServiceProvider' } as Partial<ServiceProvider>;
    }
    return validateServiceInfoResultMock;
});

// Mocking the validateDestination function for various results
const validateDestination = jest.fn().mockImplementation(() => {
    resetConnectionState();
    if (validateDestinationResultMock.valResult === true) {
        serviceProviderMock = { name: 'connectedServiceProvider' } as Partial<ServiceProvider>;
    }
    return validateDestinationResultMock;
});

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
    get serviceProvider() {
        return serviceProviderMock;
    },
    catalogs,
    systemAuthType: 'basic',
    validateDestination,
    resetConnectionState,
    validateServiceInfo: validateServiceInfoMock,
    setConnectedSystem: jest.fn()
};
jest.mock('../../../../../src/prompts/connectionValidator', () => {
    return {
        ConnectionValidator: jest.fn().mockImplementation(() => connectionValidatorMock)
    };
});

describe('Test system selection prompts', () => {
    beforeAll(async () => {
        // Initialize i18n before running tests
        await initI18nOdataServiceInquirer();
    });

    beforeEach(() => {
        mockIsAppStudio = false;
        isAuthRequiredMock.mockResolvedValue(false);
        validateServiceInfoResultMock = true;
        validateUrlResultMock = true;
    });

    test('should return system selection prompts and choices based on development environment, BAS or non-BAS', async () => {
        mockIsAppStudio = true;
        let systemQuestions = await getSystemSelectionQuestions();
        expect(systemQuestions).toMatchSnapshot();
        let systemSelectionPrompt = systemQuestions.find((question) => question.name === 'systemSelection');
        let systemChoices = (systemSelectionPrompt as ListQuestion)
            .choices as ListChoiceOptions<SystemSelectionAnswers>[];
        expect(systemChoices.length).toBe(1);
        expect(systemChoices[0].value as SystemSelectionAnswerType).toEqual({
            type: 'destination',
            system: destination1
        });

        // Option to include CF choice on BAS
        systemQuestions = await getSystemSelectionQuestions({
            [promptNames.systemSelection]: { includeCloudFoundryAbapEnvChoice: true }
        });
        systemSelectionPrompt = systemQuestions.find((question) => question.name === 'systemSelection');
        systemChoices = (systemSelectionPrompt as ListQuestion).choices as ListChoiceOptions<SystemSelectionAnswers>[];
        expect(systemChoices.length).toBe(2);
        expect(systemChoices[0].value as SystemSelectionAnswerType).toEqual({
            type: 'cfAbapEnvService',
            system: 'cfAbapEnvService'
        });

        // Non-App Studio environment
        mockIsAppStudio = false;
        systemQuestions = await getSystemSelectionQuestions();
        expect(systemQuestions).toMatchSnapshot();
        systemSelectionPrompt = systemQuestions.find((question) => question.name === 'systemSelection');
        systemChoices = (systemSelectionPrompt as ListQuestion).choices as ListChoiceOptions<SystemSelectionAnswers>[];
        expect(systemChoices[0].value as SystemSelectionAnswerType).toEqual({
            type: 'newSystemChoice',
            system: NewSystemChoice
        });
    });

    test('should handle the "New System" choice correctly for non-BAS platforms', async () => {
        const systemQuestions = await getSystemSelectionQuestions();
        // The service selection is deferred until the new system is created, when condition will be false
        const systemServicePrompt = systemQuestions.find(
            (question) => question.name === `systemSelection:${promptNames.serviceSelection}`
        );
        const serviceSelectionWhenResult = ((systemServicePrompt as Question).when as Function)({
            systemSelection: { type: 'newSystemChoice', system: NewSystemChoice }
        } as SystemSelectionAnswers);
        expect(serviceSelectionWhenResult).toEqual(false);

        // The new system connection prompt should be displayed when the new system choice is selected
        const newSystemTypePrompt = systemQuestions.find(
            (question) => question.name === newSystemPromptNames.newSystemType
        );
        expect(
            ((newSystemTypePrompt as Question).when as Function)({
                systemSelection: { type: 'newSystemChoice', system: NewSystemChoice }
            })
        ).toBe(true);
    });

    test('getSystemConnectionQuestions: BAS (Destination)', async () => {
        const connectValidator = new ConnectionValidator();
        (getPromptHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
        mockIsAppStudio = true;
        const systemConnectionQuestions = await getSystemConnectionQuestions(connectValidator);
        expect(systemConnectionQuestions).toHaveLength(5);
        expect(systemConnectionQuestions[0].name).toBe('systemSelection');
        expect(systemConnectionQuestions[1].name).toBe('destinationServicePath');
        expect(systemConnectionQuestions[2].name).toBe('systemSelectionCli');
        expect(systemConnectionQuestions[3].name).toBe('systemSelection:systemUsername');
        expect(systemConnectionQuestions[4].name).toBe('systemSelection:systemPassword');

        const systemSelectionPrompt = systemConnectionQuestions[0] as ListQuestion;
        expect(await systemSelectionPrompt.validate?.('')).toBe(false);
        // valid destination selection
        validateDestinationResultMock = { valResult: true };
        const connectWithDestinationSpy = jest.spyOn(promptHelpers, 'connectWithDestination');
        expect(
            await systemSelectionPrompt.validate?.({
                type: 'destination',
                system: destination1
            } as SystemSelectionAnswerType)
        ).toBe(true);
        expect(PromptState.odataService.connectedSystem?.serviceProvider).toBeDefined();
        expect(connectWithDestinationSpy).toHaveBeenCalledWith(destination1, connectionValidatorMock, undefined);
        connectWithDestinationSpy.mockClear();
        // valid partial url destination selection, prompt state should not be updated yet, since the service path is not provided
        const partialUrlDest = {
            Name: 'dest2',
            Host: 'http://dest2.com:1234',
            WebIDEUsage: `${WebIDEUsage.ODATA_GENERIC}`
        } as Destination;
        expect(
            await systemSelectionPrompt.validate?.({
                type: 'destination',
                system: partialUrlDest
            } as SystemSelectionAnswerType)
        ).toBe(true); // true because we defer the validation to the (destination) service url path prompt
        expect(connectWithDestinationSpy).not.toHaveBeenCalled();

        // prompt for service path
        const destServicePathPrompt = systemConnectionQuestions[1];
        expect(
            await (destServicePathPrompt.when as Function)?.({
                [promptNames.systemSelection]: {
                    type: 'destination',
                    system: {
                        Name: 'dest2',
                        Host: 'http://dest2.com:1234',
                        WebIDEUsage: `${WebIDEUsage.ODATA_GENERIC}`,
                        WebIDEAdditionalData: `${WebIDEAdditionalData.FULL_URL}`
                    } as Destination
                }
            })
        ).toBe(false);
        expect(
            await (destServicePathPrompt.when as Function)?.({
                [promptNames.systemSelection]: {
                    type: 'destination',
                    system: partialUrlDest
                }
            })
        ).toBe(true);
        expect(await (destServicePathPrompt.validate as Function)?.('')).toEqual(
            t('prompts.destinationServicePath.invalidServicePathWarning')
        );
        // Invalid service path if only 1 char
        expect(await (destServicePathPrompt.validate as Function)?.('/')).toEqual(
            t('prompts.destinationServicePath.invalidServicePathWarning')
        );
        // Invalid service path if starts with double slash
        expect(await (destServicePathPrompt.validate as Function)?.('//123')).toEqual(
            t('prompts.destinationServicePath.invalidServicePathWarning')
        );
        expect(
            await (destServicePathPrompt.validate as Function)?.('/\\', {
                [promptNames.systemSelection]: {
                    type: 'destination',
                    system: partialUrlDest
                }
            })
        ).toEqual(t('errors.invalidUrl', { input: partialUrlDest.Host + '/\\' }));
        expect(
            await (destServicePathPrompt.validate as Function)?.('/servicepath', {
                [promptNames.systemSelection]: {
                    type: 'destination',
                    system: partialUrlDest
                }
            })
        ).toBe(true);
        expect(connectWithDestinationSpy).toHaveBeenCalledWith(
            partialUrlDest,
            connectionValidatorMock,
            undefined,
            '/servicepath'
        );
    });

    test('Should reset the connection state when the source system `cfAbapEnvService` or `newSystemChoice`', async () => {
        const connectValidator = new ConnectionValidator();
        (getPromptHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
        mockIsAppStudio = true;
        let systemConnectionQuestions = await getSystemConnectionQuestions(connectValidator);
        let systemSelectionPrompt = systemConnectionQuestions[0] as ListQuestion;
        expect(
            await systemSelectionPrompt.validate?.({
                type: 'cfAbapEnvService',
                system: 'cfAbapEnvService'
            } as SystemSelectionAnswerType)
        ).toBe(true);
        expect(resetConnectionState).toHaveBeenCalled();

        mockIsAppStudio = false;
        systemConnectionQuestions = await getSystemConnectionQuestions(connectValidator);
        systemSelectionPrompt = systemConnectionQuestions[0] as ListQuestion;
        expect(
            await systemSelectionPrompt.validate?.({
                type: 'newSystemChoice',
                system: '!@£*&937newSystem*X~qy^'
            } as SystemSelectionAnswerType)
        ).toBe(true);
        expect(resetConnectionState).toHaveBeenCalled();
    });

    test('getSystemConnectionQuestions: non-BAS (BackendSystem, AuthType: basic)', async () => {
        mockIsAppStudio = false;
        const connectValidator = new ConnectionValidator();
        (getPromptHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
        const systemConnectionQuestions = await getSystemConnectionQuestions(connectValidator);
        expect(systemConnectionQuestions).toHaveLength(4);
        expect(systemConnectionQuestions[0].name).toBe('systemSelection');
        expect(systemConnectionQuestions[1].name).toBe('systemSelectionCli');
        expect(systemConnectionQuestions[2].name).toBe('systemSelection:systemUsername');
        expect(systemConnectionQuestions[3].name).toBe('systemSelection:systemPassword');

        const systemSelectionPrompt = systemConnectionQuestions[0] as ListQuestion;
        expect(await systemSelectionPrompt.validate?.('')).toBe(false);

        // validate backend system selection
        validateAuthResultMock = { valResult: true };
        const connectWithBackendSystemSpy = jest.spyOn(promptHelpers, 'connectWithBackendSystem');
        systemServiceReadMock.mockResolvedValue(backendSystemBasic);
        expect(
            await systemSelectionPrompt.validate?.({
                type: 'backendSystem',
                system: backendSystemBasic
            } as SystemSelectionAnswerType)
        ).toBe(true);
        expect(PromptState.odataService.connectedSystem?.serviceProvider).toBeDefined();
        expect(connectWithBackendSystemSpy).toHaveBeenCalledWith(
            { url: backendSystemBasic.url, client: backendSystemBasic.client },
            connectionValidatorMock,
            undefined,
            undefined
        );
        connectWithBackendSystemSpy.mockClear();

        // If auth failed using creds from BackendSystem, the creds prompts should be displayed and the user notified that the backend system creds will be updated
        validateAuthResultMock = { valResult: t('errors.authenticationFailed'), errorType: ERROR_TYPE.AUTH };
        const loggerErrorSpy = jest.spyOn(LoggerHelper.logger, 'error');
        expect(
            await systemSelectionPrompt.validate?.({
                type: 'backendSystem',
                system: backendSystemBasic
            } as SystemSelectionAnswerType)
        ).toBe(true);
        expect(PromptState.odataService.connectedSystem?.serviceProvider).not.toBeDefined();
        expect(connectWithBackendSystemSpy).toHaveBeenCalledWith(
            { url: backendSystemBasic.url, client: backendSystemBasic.client },
            connectionValidatorMock,
            undefined,
            undefined
        );
        expect(loggerErrorSpy).toHaveBeenCalledWith(
            t('errors.storedSystemConnectionError', {
                systemName: backendSystemBasic.name,
                error: t('errors.authenticationFailed')
            })
        );

        expect(
            await systemSelectionPrompt.additionalMessages?.({
                type: 'backendSystem',
                system: backendSystemBasic
            } as SystemSelectionAnswerType)
        ).toMatchInlineSnapshot(`
            {
              "message": "Authentication failed. Please try updating the credentials.",
              "severity": 2,
            }
        `);
        const usernamePrompt = systemConnectionQuestions.find(
            (question) => question.name === 'systemSelection:systemUsername'
        );
        const passwordPrompt = systemConnectionQuestions.find(
            (question) => question.name === 'systemSelection:systemPassword'
        );
        expect(await (usernamePrompt?.when as Function)()).toBe(true);
        expect(await (passwordPrompt?.when as Function)()).toBe(true);
    });

    test('getSystemConnectionQuestions: non-BAS (BackendSystem, AuthType: reentranceTicket)', async () => {
        mockIsAppStudio = false;
        const connectValidator = new ConnectionValidator();
        (getPromptHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
        const connectWithBackendSystemSpy = jest.spyOn(promptHelpers, 'connectWithBackendSystem');
        backendSystems.push(backendSystemReentrance);

        systemServiceMock.read = jest.fn().mockResolvedValue(backendSystemReentrance);
        const systemConnectionQuestions = await getSystemConnectionQuestions(connectValidator);
        const systemSelectionPrompt = systemConnectionQuestions[0] as ListQuestion;
        expect(
            await systemSelectionPrompt.validate?.({
                type: 'backendSystem',
                system: backendSystemReentrance
            } as SystemSelectionAnswerType)
        ).toBe(true);
        expect(PromptState.odataService.connectedSystem?.serviceProvider).toBeDefined();
        expect(connectWithBackendSystemSpy).toHaveBeenCalledWith(
            { url: backendSystemReentrance.url, client: backendSystemReentrance.client },
            connectionValidatorMock,
            undefined,
            undefined
        );
        connectWithBackendSystemSpy.mockClear();
        // Handles a failed reentrance ticket validation
        validateUrlResultMock = 'Something went wrong';
        expect(
            await systemSelectionPrompt.validate?.({
                type: 'backendSystem',
                system: backendSystemReentrance
            } as SystemSelectionAnswerType)
        ).toBe('Something went wrong');
        expect(PromptState.odataService.connectedSystem?.serviceProvider).not.toBeDefined();
        expect(connectWithBackendSystemSpy).toHaveBeenCalledWith(
            { url: backendSystemReentrance.url, client: backendSystemReentrance.client },
            connectionValidatorMock,
            undefined,
            undefined
        );
    });

    test('getSystemConnectionQuestions: non-BAS (BackendSystem, AuthType: reentranceTicket) - should support cached connections', async () => {
        mockIsAppStudio = false;
        const connectValidator = new ConnectionValidator();
        (getPromptHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
        const connectWithBackendSystemSpy = jest.spyOn(promptHelpers, 'connectWithBackendSystem');
        // backendSystems.push(backendSystemReentrance);
        const cachedConnectedSystem: ConnectedSystem = {
            serviceProvider: {
                catalog: {}
            } as unknown as AbapServiceProvider,
            backendSystem: backendSystemReentrance
        };

        systemServiceMock.read = jest.fn().mockResolvedValue(backendSystemReentrance);
        const systemConnectionQuestions = await getSystemConnectionQuestions(
            connectValidator,
            undefined,
            cachedConnectedSystem
        );
        const systemSelectionPrompt = systemConnectionQuestions[0] as ListQuestion;
        expect(
            await systemSelectionPrompt.validate?.({
                type: 'backendSystem',
                system: backendSystemReentrance
            } as SystemSelectionAnswerType)
        ).toBe(true);
        expect(PromptState.odataService.connectedSystem?.serviceProvider).toBeDefined();
        expect(connectWithBackendSystemSpy).toHaveBeenCalledWith(
            { url: backendSystemReentrance.url, client: backendSystemReentrance.client },
            connectionValidatorMock,
            undefined,
            cachedConnectedSystem
        );
    });

    test('getSystemConnectionQuestions: non-BAS (BackendSystem, AuthType: serviceKeys)', async () => {
        mockIsAppStudio = false;
        const connectValidator = new ConnectionValidator();
        (getPromptHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
        const connectWithBackendSystemSpy = jest.spyOn(promptHelpers, 'connectWithBackendSystem');
        backendSystems.push(backendSystemServiceKeys);

        systemServiceMock.read = jest.fn().mockResolvedValue(backendSystemServiceKeys);
        const systemConnectionQuestions = await getSystemConnectionQuestions(connectValidator);
        const systemSelectionPrompt = systemConnectionQuestions[0] as ListQuestion;
        expect(
            await systemSelectionPrompt.validate?.({
                type: 'backendSystem',
                system: backendSystemServiceKeys
            } as SystemSelectionAnswerType)
        ).toBe(true);
        expect(PromptState.odataService.connectedSystem?.serviceProvider).toBeDefined();
        expect(connectWithBackendSystemSpy).toHaveBeenCalledWith(
            { url: backendSystemServiceKeys.url, client: backendSystemServiceKeys.client },
            connectionValidatorMock,
            undefined,
            undefined
        );
        connectWithBackendSystemSpy.mockClear();
        // Handles a failed service info validation
        validateServiceInfoResultMock = 'Something went wrong';
        expect(
            await systemSelectionPrompt.validate?.({
                type: 'backendSystem',
                system: backendSystemServiceKeys
            } as SystemSelectionAnswerType)
        ).toBe('Something went wrong');
        expect(PromptState.odataService.connectedSystem?.serviceProvider).not.toBeDefined();
        expect(connectWithBackendSystemSpy).toHaveBeenCalledWith(
            { url: backendSystemServiceKeys.url, client: backendSystemServiceKeys.client },
            connectionValidatorMock,
            undefined,
            undefined
        );
    });

    test('getSystemConnectionQuestions: non-BAS (BackendSystem, AuthType: serviceKeys) - should support cached connections', async () => {
        mockIsAppStudio = false;
        const connectValidator = new ConnectionValidator();
        (getPromptHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
        const connectWithBackendSystemSpy = jest.spyOn(promptHelpers, 'connectWithBackendSystem');
        const cachedConnectedSystem: ConnectedSystem = {
            serviceProvider: {
                catalog: {}
            } as unknown as AbapServiceProvider,
            backendSystem: backendSystemServiceKeys
        };

        systemServiceMock.read = jest.fn().mockResolvedValue(backendSystemServiceKeys);
        const systemConnectionQuestions = await getSystemConnectionQuestions(
            connectValidator,
            undefined,
            cachedConnectedSystem
        );
        const systemSelectionPrompt = systemConnectionQuestions[0] as ListQuestion;
        expect(
            await systemSelectionPrompt.validate?.({
                type: 'backendSystem',
                system: backendSystemServiceKeys
            } as SystemSelectionAnswerType)
        ).toBe(true);
        expect(PromptState.odataService.connectedSystem?.serviceProvider).toBeDefined();
        expect(connectWithBackendSystemSpy).toHaveBeenCalledWith(
            { url: backendSystemServiceKeys.url, client: backendSystemServiceKeys.client },
            connectionValidatorMock,
            undefined,
            cachedConnectedSystem
        );
    });

    test('getSystemConnectionQuestions: non-BAS (BackendSystem, AuthType: serviceKeys)', async () => {
        mockIsAppStudio = false;
        const connectValidator = new ConnectionValidator();
        (getPromptHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
        const validateServiceInfoSpy = jest.spyOn(connectValidator, 'validateServiceInfo');
        const backendSystemServiceKeysClone = { ...backendSystemServiceKeys };
        backendSystems.push(backendSystemServiceKeysClone);

        systemServiceMock.read = jest.fn().mockResolvedValue(backendSystemServiceKeysClone);
        const systemConnectionQuestions = await getSystemConnectionQuestions(connectValidator);
        const systemSelectionPrompt = systemConnectionQuestions[0] as ListQuestion;
        expect(
            await systemSelectionPrompt.validate?.({
                type: 'backendSystem',
                system: backendSystemServiceKeysClone
            } as SystemSelectionAnswerType)
        ).toBe(true);
        expect(validateServiceInfoSpy).toHaveBeenCalledWith(backendSystemServiceKeysClone.serviceKeys, undefined);
    });

    test('should execute additional prompt on CLI (if autocomplete is not used) to handle YUI validate function', async () => {
        mockIsAppStudio = false;
        (getPromptHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
        const connectWithBackendSystemSpy = jest.spyOn(promptHelpers, 'connectWithBackendSystem');
        const systemConnectionQuestions = await getSystemConnectionQuestions(new ConnectionValidator());
        const validateSystemSelectionCliPrompt = systemConnectionQuestions.find(
            (question) => question.name === 'systemSelectionCli'
        );

        expect(await (validateSystemSelectionCliPrompt!.when as Function)({})).toBe(false);

        const answers = {
            [promptNames.systemSelection]: {
                type: 'backendSystem',
                system: backendSystemBasic
            }
        };
        systemServiceMock.read = jest.fn().mockResolvedValue(backendSystemBasic);
        validateAuthResultMock = { valResult: true };
        expect(await (validateSystemSelectionCliPrompt!.when as Function)(answers)).toBe(false); // Always false as its a functional only prompt
        expect(connectWithBackendSystemSpy).toHaveBeenCalledWith(
            { url: backendSystemBasic.url, client: backendSystemBasic.client },
            connectionValidatorMock,
            undefined,
            undefined
        );
        connectWithBackendSystemSpy.mockClear();
        // Should prompt for credentials if the system selection is a backend system and an auth error is returned
        validateAuthResultMock = { valResult: 'A connection error occurred.' };
        await expect((validateSystemSelectionCliPrompt!.when as Function)(answers)).rejects.toThrow(
            'A connection error occurred.'
        );
        expect(connectWithBackendSystemSpy).toHaveBeenCalledWith(
            { url: backendSystemBasic.url, client: backendSystemBasic.client },
            connectionValidatorMock,
            undefined,
            undefined
        );
    });

    test('Should set the default system choice based on the defaultChoice options', async () => {
        backendSystems.push(backendSystemReentrance);
        const defaultChoice = backendSystemReentrance.name;
        const systemSelectionQuestions = await getSystemSelectionQuestions({
            [promptNames.systemSelection]: { defaultChoice }
        });
        const systemSelectionPrompt = systemSelectionQuestions.find(
            (question) => question.name === promptNames.systemSelection
        );
        const defaultIndex = (systemSelectionPrompt as Question).default;
        expect(((systemSelectionPrompt as ListQuestion).choices as [])[defaultIndex]).toMatchObject({
            value: {
                system: backendSystemReentrance,
                type: 'backendSystem'
            }
        });
    });

    test('Should provide only one choice for the system selection based on onlyDefaultChoice option and defaultChoice', async () => {
        backendSystems.push(backendSystemReentrance);
        const defaultChoice = backendSystemReentrance.name;
        const systemSelectionQuestions = await getSystemSelectionQuestions({
            [promptNames.systemSelection]: { defaultChoice, onlyShowDefaultChoice: true }
        });
        const systemSelectionPrompt = systemSelectionQuestions.find(
            (question) => question.name === promptNames.systemSelection
        );
        const defaultIndex = (systemSelectionPrompt as Question).default;
        expect((systemSelectionPrompt as ListQuestion).choices as []).toHaveLength(1);
        expect(((systemSelectionPrompt as ListQuestion).choices as [])[defaultIndex]).toMatchObject({
            value: {
                system: backendSystemReentrance,
                type: 'backendSystem'
            }
        });
    });

    test('Should provide full list of choices if onlyShowDefaultChoice is provided, but without defaultChoice option', async () => {
        backendSystems.push(backendSystemReentrance);
        const systemSelectionQuestions = await getSystemSelectionQuestions({
            [promptNames.systemSelection]: { onlyShowDefaultChoice: true }
        });
        const systemSelectionPrompt = systemSelectionQuestions.find(
            (question) => question.name === promptNames.systemSelection
        );
        expect((systemSelectionPrompt as ListQuestion).choices as []).toHaveLength(8);
    });

    test('Should hide the service selection prompt when hide option in provided as true', async () => {
        const systemSelectionQuestions = await getSystemSelectionQuestions({
            [promptNames.serviceSelection]: { hide: true }
        });
        const serviceSelectionPrompt = systemSelectionQuestions.find(
            (question) => question.name === `systemSelection:${promptNames.serviceSelection}`
        );
        expect(serviceSelectionPrompt).toBeUndefined();
    });

    test('Should show the service selection prompt when hide option is not provided', async () => {
        const systemSelectionQuestions = await getSystemSelectionQuestions();
        const serviceSelectionPrompt = systemSelectionQuestions.find(
            (question) => question.name === `systemSelection:${promptNames.serviceSelection}`
        );
        expect(serviceSelectionPrompt).toBeDefined();
    });

    test('Should show the service selection prompt when hide option is provided as false', async () => {
        const systemSelectionQuestions = await getSystemSelectionQuestions({
            [promptNames.serviceSelection]: { hide: false }
        });
        const serviceSelectionPrompt = systemSelectionQuestions.find(
            (question) => question.name === `systemSelection:${promptNames.serviceSelection}`
        );
        expect(serviceSelectionPrompt).toBeDefined();
    });
});
