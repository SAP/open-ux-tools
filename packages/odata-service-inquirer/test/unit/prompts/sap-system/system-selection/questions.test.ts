import type { ServiceProvider, V2CatalogService, V4CatalogService } from '@sap-ux/axios-extension';
import { ODataVersion } from '@sap-ux/axios-extension';
import type { Destination, Destinations } from '@sap-ux/btp-utils';
import { WebIDEUsage } from '@sap-ux/btp-utils';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import type { BackendSystem } from '@sap-ux/store';
import type { ListChoiceOptions, Question } from 'inquirer';
import { ERROR_TYPE } from '../../../../../src';
import { initI18nOdataServiceInquirer, t } from '../../../../../src/i18n';
import type { ValidationResult } from '../../../../../src/prompts/connectionValidator';
import { ConnectionValidator } from '../../../../../src/prompts/connectionValidator';
import { newSystemPromptNames } from '../../../../../src/prompts/datasources/sap-system/new-system/types';
import * as promptHelpers from '../../../../../src/prompts/datasources/sap-system/system-selection/prompt-helpers';
import type {
    SystemSelectionAnswers,
    SystemSelectionAnswerType
} from '../../../../../src/prompts/datasources/sap-system/system-selection/questions';
import {
    getSystemConnectionQuestions,
    getSystemSelectionQuestions,
    newSystemChoiceValue
} from '../../../../../src/prompts/datasources/sap-system/system-selection/questions';
import LoggerHelper from '../../../../../src/prompts/logger-helper';
import { hostEnvironment, promptNames } from '../../../../../src/types';
import { getHostEnvironment, PromptState } from '../../../../../src/utils';

jest.mock('../../../../../src/utils', () => ({
    ...jest.requireActual('../../../../../src/utils'),
    getHostEnvironment: jest.fn()
}));
const backendSystemBasic: BackendSystem = {
    name: 'http://abap.on.prem:1234',
    url: 'http://abap.on.prem:1234',
    username: 'user1',
    password: 'password1'
};
const backendSystemReentrance: BackendSystem = {
    name: 'http://s4hc:1234',
    url: 'http:/s4hc:1234',
    authenticationType: 'reentranceTicket'
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
    }
};
const backendSystems: BackendSystem[] = [backendSystemBasic];
let mockIsAppStudio = false;
const destination1 = { Name: 'dest1', Host: 'http://dest1.com' } as Destination;
const destinations: Destinations = { 'dest1': destination1 };

jest.mock('@sap-ux/store', () => ({
    __esModule: true, // Workaround to for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('@sap-ux/store'),
    // Mock store access
    SystemService: jest.fn().mockImplementation(() => ({
        getAll: jest.fn().mockResolvedValue(backendSystems)
    }))
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
    validateServiceInfo: validateServiceInfoMock
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
            system: newSystemChoiceValue
        });
    });

    test('should handle the "New System" choice correctly for non-BAS platforms', async () => {
        const systemQuestions = await getSystemSelectionQuestions();
        // The service selection is deferred until the new system is created, when condition will be false
        const systemServicePrompt = systemQuestions.find(
            (question) => question.name === `systemSelection:${promptNames.serviceSelection}`
        );
        const serviceSelectionWhenResult = ((systemServicePrompt as Question).when as Function)({
            systemSelection: { type: 'newSystemChoice', system: newSystemChoiceValue }
        } as SystemSelectionAnswers);
        expect(serviceSelectionWhenResult).toEqual(false);

        // The new system connection prompt should be displayed when the new system choice is selected
        const newSystemTypePrompt = systemQuestions.find(
            (question) => question.name === newSystemPromptNames.newSystemType
        );
        expect(
            ((newSystemTypePrompt as Question).when as Function)({
                systemSelection: { type: 'newSystemChoice', system: newSystemChoiceValue }
            })
        ).toBe(true);
    });

    test.only('getSystemConnectionQuestions: BAS (Destination)', async () => {
        const connectValidator = new ConnectionValidator();
        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
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
        ).toBe(true); // true because we defer the validation to the (destintion) service url path prompt
        expect(connectWithDestinationSpy).not.toHaveBeenCalled();

        // prompt for service path
        const destServicePathPrompt = systemConnectionQuestions[1];
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

    test('getSystemConnectionQuestions: non-BAS (BackendSystem, AuthType: basic)', async () => {
        mockIsAppStudio = false;
        const connectValidator = new ConnectionValidator();
        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
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
        expect(
            await systemSelectionPrompt.validate?.({
                type: 'backendSystem',
                system: backendSystemBasic
            } as SystemSelectionAnswerType)
        ).toBe(true);
        expect(PromptState.odataService.connectedSystem?.serviceProvider).toBeDefined();
        expect(connectWithBackendSystemSpy).toHaveBeenCalledWith(
            backendSystemBasic,
            connectionValidatorMock,
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
            backendSystemBasic,
            connectionValidatorMock,
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
        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
        const connectWithBackendSystemSpy = jest.spyOn(promptHelpers, 'connectWithBackendSystem');
        backendSystems.push(backendSystemReentrance);

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
            backendSystemReentrance,
            connectionValidatorMock,
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
            backendSystemReentrance,
            connectionValidatorMock,
            undefined
        );
    });

    test('getSystemConnectionQuestions: non-BAS (BackendSystem, AuthType: serviceKeys)', async () => {
        mockIsAppStudio = false;
        const connectValidator = new ConnectionValidator();
        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
        const connectWithBackendSystemSpy = jest.spyOn(promptHelpers, 'connectWithBackendSystem');
        backendSystems.push(backendSystemReentrance);

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
            backendSystemServiceKeys,
            connectionValidatorMock,
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
            backendSystemServiceKeys,
            connectionValidatorMock,
            undefined
        );
    });
});
