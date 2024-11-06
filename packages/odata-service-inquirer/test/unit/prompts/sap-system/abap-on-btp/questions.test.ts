import type { ServiceInfo, ServiceProvider } from '@sap-ux/axios-extension';
import type { Question } from 'inquirer';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import { apiGetServicesInstancesFilteredByType as getServicesFromCF, type ServiceInstanceInfo } from '@sap/cf-tools';
import { ERROR_TYPE, ErrorHandler } from '../../../../../src/error-handler/error-handler';
import { initI18nOdataServiceInquirer, t } from '../../../../../src/i18n';
import type { ConnectionValidator } from '../../../../../src/prompts/connectionValidator';
import { getAbapOnBTPSystemQuestions } from '../../../../../src/prompts/datasources/sap-system/abap-on-btp/questions';
import { PromptState } from '../../../../../src/utils';
import * as sapSystemValidators from '../../../../../src/prompts/datasources/sap-system/validators';

const validateUrlMock = jest.fn().mockResolvedValue(true);
const validateAuthMock = jest.fn().mockResolvedValue(true);
const isAuthRequiredMock = jest.fn().mockResolvedValue(false);
const serviceProviderMock = {} as Partial<ServiceProvider>;
let validateServiceInfoMock: boolean | string = true;

const connectionValidatorMock = {
    validity: {} as ConnectionValidator['validity'],
    validatedUrl: '',
    validateUrl: validateUrlMock,
    validateAuth: validateAuthMock,
    isAuthRequired: isAuthRequiredMock,
    serviceProvider: serviceProviderMock,
    validateServiceInfo: jest.fn().mockImplementation(() => {
        connectionValidatorMock.connectedSystemName = undefined; // Mimic the behaviour of the real function
        return validateServiceInfoMock;
    }),
    connectedSystemName: undefined
};
jest.mock('../../../../../src/prompts/connectionValidator', () => {
    return {
        ConnectionValidator: jest.fn().mockImplementation(() => connectionValidatorMock)
    };
});

let cfDiscoveredAbapEnvsMock: ServiceInstanceInfo[] = [];
const uaaCredsMock = {
    credentials: {}
};
jest.mock('@sap/cf-tools', () => {
    return {
        ...jest.requireActual('@sap/cf-tools'),
        apiGetServicesInstancesFilteredByType: jest.fn().mockImplementation(() => cfDiscoveredAbapEnvsMock),
        apiGetInstanceCredentials: jest.fn().mockImplementation(() => uaaCredsMock),
        cfGetTarget: jest.fn().mockResolvedValue({ org: 'testOrg', space: 'testSpace' })
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
        connectionValidatorMock.serviceProvider = serviceProviderMock;
        validateServiceInfoMock = true;
    });

    test('should return Abap on BTP questions', () => {
        const newSystemQuestions = getAbapOnBTPSystemQuestions();
        expect(newSystemQuestions).toMatchInlineSnapshot(`
            [
              {
                "choices": [
                  {
                    "name": "Discover a Cloud Foundry Service",
                    "value": "cloudFoundry",
                  },
                  {
                    "name": "Upload a Service Key File",
                    "value": "serviceKey",
                  },
                  {
                    "name": "Use Reentrance Ticket",
                    "value": "reentranceTicket",
                  },
                ],
                "message": "ABAP environment definition source",
                "name": "abapOnBtpAuthType",
                "type": "list",
                "validate": [Function],
              },
              {
                "guiOptions": {
                  "breadcrumb": true,
                  "hint": "Enter the URL of the SAP System",
                  "mandatory": true,
                },
                "message": "System URL",
                "name": "abapOnBtp:newSystemUrl",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              {
                "guiOptions": {
                  "hint": "Select a local file that defines the service connection for an ABAP Environment on SAP Business Technology Platform",
                  "mandatory": true,
                },
                "guiType": "file-browser",
                "message": "Service key file path",
                "name": "serviceKey",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              {
                "choices": [Function],
                "default": [Function],
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "breadcrumb": true,
                },
                "message": "ABAP environment",
                "name": "cloudFoundryAbapSystem",
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
              {
                "name": "cliCfAbapService",
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
                "name": "abapOnBtp:userSystemName",
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
                "name": "abapOnBtp:serviceSelection",
                "source": [Function],
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
              {
                "name": "abapOnBtp:cliServiceSelection",
                "when": [Function],
              },
            ]
        `);
    });

    test('should show the correct auth type prompt', () => {
        const newSystemQuestions = getAbapOnBTPSystemQuestions();
        const authTypePrompt = newSystemQuestions.find((q) => q.name === 'abapOnBtpAuthType') as ListQuestion;
        expect(authTypePrompt.choices).toEqual([
            { name: 'Discover a Cloud Foundry Service', value: 'cloudFoundry' },
            { name: 'Upload a Service Key File', value: 'serviceKey' },
            { name: 'Use Reentrance Ticket', value: 'reentranceTicket' }
        ]);

        // 'cloudFoundry' | 'serviceKey' | 'reentranceTicket';
        const reentranceTicketUrlPrompt = newSystemQuestions.find((q) => q.name === 'abapOnBtp:newSystemUrl');
        expect((reentranceTicketUrlPrompt?.when as Function)({ 'abapOnBtpAuthType': 'reentranceTicket' })).toBe(true);
        expect((reentranceTicketUrlPrompt?.when as Function)({ 'abapOnBtpAuthType': 'serviceKey' })).toBe(false);
        expect((reentranceTicketUrlPrompt?.when as Function)({ 'abapOnBtpAuthType': 'cloudFoundry' })).toBe(false);

        const serviceKeyPrompt = newSystemQuestions.find((q) => q.name === 'serviceKey');
        expect((serviceKeyPrompt?.when as Function)({ 'abapOnBtpAuthType': 'reentranceTicket' })).toBe(false);
        expect((serviceKeyPrompt?.when as Function)({ 'abapOnBtpAuthType': 'serviceKey' })).toBe(true);
        expect((serviceKeyPrompt?.when as Function)({ 'abapOnBtpAuthType': 'cloudFoundry' })).toBe(false);

        const cfAbapSysPrompt = newSystemQuestions.find((q) => q.name === 'cloudFoundryAbapSystem');
        expect((cfAbapSysPrompt?.when as Function)({ 'abapOnBtpAuthType': 'reentranceTicket' })).toBe(false);
        expect((cfAbapSysPrompt?.when as Function)({ 'abapOnBtpAuthType': 'serviceKey' })).toBe(false);
        expect((cfAbapSysPrompt?.when as Function)({ 'abapOnBtpAuthType': 'cloudFoundry' })).toBe(true);
    });

    test('system name prompt should only be shown if not hidden and there is a validated system connection', () => {
        let newSystemQuestions = getAbapOnBTPSystemQuestions({ userSystemName: { hide: true } });
        expect(newSystemQuestions.find((q) => q.name === 'abapOnBtp:userSystemName')).toBeUndefined();

        newSystemQuestions = getAbapOnBTPSystemQuestions();
        const systemNamePrompt = newSystemQuestions.find((q) => q.name === 'abapOnBtp:userSystemName');
        expect(systemNamePrompt).toBeDefined();
        // No connected system, so prompt should not be shown
        expect((systemNamePrompt?.when as Function)({})).toBe(false);

        // Mock system connection
        connectionValidatorMock.validatedUrl = 'https://example.com';
        connectionValidatorMock.validity = {
            reachable: true,
            authenticated: true
        };

        expect((systemNamePrompt?.when as Function)()).toBe(true);

        // No auth necessary, so prompt should be shown
        connectionValidatorMock.validity = {
            reachable: true,
            authRequired: false
        };
        expect((systemNamePrompt?.when as Function)()).toBe(true);
    });

    test('Cloud Foundry discovery prompt should offer Abap environments or otherwise, a helpful end-user message and log', async () => {
        const newSystemQuestions = getAbapOnBTPSystemQuestions();
        const cfDiscoPrompt = newSystemQuestions.find((q) => q.name === 'cloudFoundryAbapSystem');
        expect(cfDiscoPrompt).toBeDefined();

        // YUI returns empty list and shows validation error message if no ABAP environments error occurs
        const errorHandlerSpy = jest.spyOn(ErrorHandler.prototype, 'logErrorMsgs');
        PromptState.isYUI = true;
        expect(await ((cfDiscoPrompt as ListQuestion).choices as Function)()).toEqual([]);
        expect(errorHandlerSpy).toHaveBeenCalledWith(ERROR_TYPE.NO_ABAP_ENVS, t('errors.noAbapEnvsInCFSpace'));
        expect(await ((cfDiscoPrompt as ListQuestion).validate as Function)()).toEqual(
            'No ABAP environments in CF space found. See log for more details.'
        );

        // CLI throws to exit, as you cannot continue
        PromptState.isYUI = false;
        await expect(((cfDiscoPrompt as ListQuestion).choices as Function)()).rejects.toThrowError(
            t('errors.abapEnvsUnavailable')
        );

        PromptState.isYUI = true;
        // If user is not logged in to CF, a warning message is logged and shown
        (getServicesFromCF as jest.Mock).mockRejectedValueOnce(new Error('Not logged in'));
        expect(await ((cfDiscoPrompt as ListQuestion).choices as Function)()).toEqual([]);
        expect(await ((cfDiscoPrompt as ListQuestion).validate as Function)()).toEqual(
            `${t('errors.abapEnvsCFDiscoveryFailed')} ${t('texts.seeLogForDetails')}`
        );
    });

    test('Cloud Foundry discovery prompt should connect to the choosen Abap environment (YUI)', async () => {
        const newSystemQuestions = getAbapOnBTPSystemQuestions();
        const cfDiscoPrompt = newSystemQuestions.find((q) => q.name === 'cloudFoundryAbapSystem');

        PromptState.isYUI = true;
        cfDiscoveredAbapEnvsMock = [
            { label: 'test1', serviceName: 'test1Name' },
            { label: 'test2', serviceName: 'test2Name' }
        ];
        expect(await ((cfDiscoPrompt as ListQuestion).choices as Function)()).toEqual([
            {
                name: 'test1',
                value: {
                    label: 'test1',
                    serviceName: 'test1Name'
                }
            },
            {
                name: 'test2',
                value: {
                    label: 'test2',
                    serviceName: 'test2Name'
                }
            }
        ]);
        expect(await ((cfDiscoPrompt as ListQuestion).validate as Function)(cfDiscoveredAbapEnvsMock[1])).toBe(true);
        expect(connectionValidatorMock.connectedSystemName).toBe('abap-cloud-test2-testorg-testspace');

        // Validation error message is returned
        validateServiceInfoMock = 'Cannot connect';
        expect(await ((cfDiscoPrompt as ListQuestion).validate as Function)(cfDiscoveredAbapEnvsMock[0])).toBe(
            'Cannot connect'
        );
        expect(connectionValidatorMock.connectedSystemName).toBe(undefined);
    });

    test('Cloud Foundry discovery prompt should connect to the choosen Abap environment (cli)', async () => {
        PromptState.isYUI = false;
        const newSystemQuestions = getAbapOnBTPSystemQuestions();
        const cfDiscoPrompt = newSystemQuestions.find((q) => q.name === 'cloudFoundryAbapSystem');
        const cliCfServicePrompt = newSystemQuestions.find((q) => q.name === 'cliCfAbapService');

        cfDiscoveredAbapEnvsMock = [
            { label: 'test1', serviceName: 'test1Name' },
            { label: 'test2', serviceName: 'test2Name' }
        ];
        expect(await ((cfDiscoPrompt as ListQuestion).choices as Function)()).toEqual([
            {
                name: 'test1',
                value: {
                    label: 'test1',
                    serviceName: 'test1Name'
                }
            },
            {
                name: 'test2',
                value: {
                    label: 'test2',
                    serviceName: 'test2Name'
                }
            }
        ]);
        expect(
            await ((cliCfServicePrompt as Question).when as Function)({
                abapOnBtpAuthType: 'cloudFoundry',
                cloudFoundryAbapSystem: cfDiscoveredAbapEnvsMock[1]
            })
        ).toBe(false); // cliCfServicePrompt is never shown so when always should be false
        expect(connectionValidatorMock.connectedSystemName).toBe('abap-cloud-test2-testorg-testspace');

        // Validation error message is returned
        validateServiceInfoMock = 'Cannot connect';
        await expect(
            ((cliCfServicePrompt as Question).when as Function)({
                abapOnBtpAuthType: 'cloudFoundry',
                cloudFoundryAbapSystem: cfDiscoveredAbapEnvsMock[1]
            })
        ).rejects.toThrowError('Cannot connect');

        expect(connectionValidatorMock.connectedSystemName).toBe(undefined);
    });

    test.only('Service key prompt should validate service key and connect', async () => {
        const serviceInfoMock: ServiceInfo = {
            uaa: {
                clientid: 'clientid1',
                clientsecret: 'clientSecret1',
                url: 'url1'
            },
            url: 'url1',
            catalogs: {
                abap: {
                    path: 'path1',
                    type: 'type1'
                }
            }
        };
        let validateServiceKeyFileMock = jest
            .spyOn(sapSystemValidators, 'validateServiceKey')
            .mockReturnValue(serviceInfoMock); // service key file is valid
        validateServiceInfoMock = true; // connection is successful
        const newSystemQuestions = getAbapOnBTPSystemQuestions();

        const serviceKeyPrompt = newSystemQuestions.find((q) => q.name === 'serviceKey');
        expect(await (serviceKeyPrompt?.validate as Function)('path/to/service/key')).toBe(true);
        expect(validateServiceKeyFileMock).toHaveBeenCalledWith('path/to/service/key');
        expect(PromptState.odataService).toEqual({ connectedSystem: { serviceProvider: serviceProviderMock } });

        validateServiceKeyFileMock = jest
            .spyOn(sapSystemValidators, 'validateServiceKey')
            .mockReturnValue('invalid service key file'); // service key file is valid
        expect(await (serviceKeyPrompt?.validate as Function)('path/to/service/key')).toBe('invalid service key file');
    });
});
