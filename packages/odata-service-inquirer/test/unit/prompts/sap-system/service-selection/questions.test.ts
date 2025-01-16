import { Severity } from '@sap-devx/yeoman-ui-types';
import type {
    ODataService,
    ODataServiceInfo,
    ServiceProvider,
    V2CatalogService,
    V4CatalogService
} from '@sap-ux/axios-extension';
import { ODataVersion, ServiceType } from '@sap-ux/axios-extension';
import type { ListQuestion, PromptSeverityMessage } from '@sap-ux/inquirer-common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { Answers, ChoiceOptions } from 'inquirer';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';
import { initI18nOdataServiceInquirer, t } from '../../../../../src/i18n';
import { ConnectionValidator } from '../../../../../src/prompts/connectionValidator';
import type { ServiceAnswer } from '../../../../../src/prompts/datasources/sap-system/service-selection';
import { getSystemServiceQuestion } from '../../../../../src/prompts/datasources/sap-system/service-selection';
import * as serviceHelpers from '../../../../../src/prompts/datasources/sap-system/service-selection/service-helper';
import LoggerHelper from '../../../../../src/prompts/logger-helper';
import { promptNames } from '../../../../../src/types';
import * as utils from '../../../../../src/utils';
import { PromptState } from '../../../../../src/utils';
import { hostEnvironment } from '@sap-ux/fiori-generator-shared';

const serviceV4a = {
    id: '/DMO/FLIGHT',
    serviceVersion: '0001',
    serviceType: 'WEB_API',
    group: 'DMO_GRP',
    name: 'DMO_GRP > /DMO/FLIGHT',
    path: '/sap/opu/odata4/dmo/flight/0001/?sap-client=000',
    odataVersion: ODataVersion.v4
} as ODataServiceInfo;

const serviceV2a = {
    id: 'ZTRAVEL_DESK_SRV_0002',
    serviceVersion: '2',
    serviceType: 'Not Classified',
    name: 'ZTRAVEL_DESK_SRV',
    path: '/sap/opu/odata/sap/ZTRAVEL_DESK_SRV_0002',
    odataVersion: ODataVersion.v2
} as ODataServiceInfo;

const v2Metadata =
    '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx"></edmx:Edmx>';
const v2Annotations = `<?xml version="1.0" encoding="utf-8"?>
        <edmx:Edmx Version="1.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
            <edmx:Reference Uri="../../catalogservice;v=2/Vocabularies(TechnicalName=\'%2FIWBEP%2FVOC_COMMON\',Version=\'0001\',SAP__Origin=\'\')/$value">
                <edmx:Include Namespace="com.sap.vocabularies.Common.v1" Alias="Common"/>
            </edmx:Reference>
        </edmx:Edmx>`;
const v4Metadata =
    '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="4.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx"></edmx:Edmx>';

let connectedUserNameMock: string | undefined;
const catalogs = {
    [ODataVersion.v2]: {
        listServices: jest.fn().mockResolvedValue([])
    } as Partial<V2CatalogService> | undefined,
    [ODataVersion.v4]: {
        listServices: jest.fn().mockResolvedValue([])
    } as Partial<V4CatalogService> | undefined
};
const serviceProviderMock = {} as Partial<ServiceProvider>;
let odataServiceMock: Partial<ODataService> | undefined;
let destinationUrlMock: string | undefined;

const connectionValidatorMock = {
    validity: {} as ConnectionValidator['validity'],
    connectedUserName: connectedUserNameMock,
    validatedUrl: '',
    destinationUrl: destinationUrlMock,
    serviceProvider: serviceProviderMock,
    catalogs,
    systemAuthType: 'basic',
    odataService: odataServiceMock,
    isAuthRequired: jest.fn().mockResolvedValue(false)
};

jest.mock('../../../../../src/prompts/connectionValidator', () => {
    return {
        ConnectionValidator: jest.fn().mockImplementation(() => connectionValidatorMock)
    };
});

let mockIsAppStudio = false;
jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn().mockImplementation(() => mockIsAppStudio)
}));

describe('Test new system prompt', () => {
    const promptNamespace = 'someNamespace';
    beforeAll(async () => {
        await initI18nOdataServiceInquirer();
    });

    beforeEach(() => {
        // Restore default mock implementations
        jest.restoreAllMocks();
        connectionValidatorMock.validity = {};
        connectionValidatorMock.catalogs = catalogs;
    });

    test('`getSystemServiceQuestion` should return correct prompts', async () => {
        const connectValidator = new ConnectionValidator();
        const systemServiceQuestions = getSystemServiceQuestion(connectValidator, promptNamespace);
        expect(systemServiceQuestions).toMatchInlineSnapshot(`
            [
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
                "name": "someNamespace:serviceSelection",
                "source": [Function],
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
              {
                "name": "someNamespace:cliServiceSelection",
                "when": [Function],
              },
            ]
        `);
    });

    test('should prompt for service selection', async () => {
        const connectValidator = new ConnectionValidator();
        let systemServiceQuestions = getSystemServiceQuestion(connectValidator, promptNamespace);
        let serviceSelectionPrompt = systemServiceQuestions.find(
            (question) => question.name === `${promptNamespace}:${promptNames.serviceSelection}`
        );
        expect(await (serviceSelectionPrompt?.when as Function)()).toBe(false);
        connectionValidatorMock.validity = { authenticated: true, reachable: true };
        expect((serviceSelectionPrompt!.when as Function)()).toBe(true);
        connectionValidatorMock.validity = { authRequired: false };
        expect((serviceSelectionPrompt!.when as Function)()).toBe(true);

        connectionValidatorMock.connectedUserName = 'someUser@somewhere.com';
        expect((serviceSelectionPrompt!.message as Function)()).toEqual('Service (for user [someUser@somewhere.com])');

        // Should offer service selection choices from the catolog service
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'debug');
        expect(await ((serviceSelectionPrompt as ListQuestion)?.choices as Function)()).toEqual([]);
        expect(loggerSpy).toHaveBeenCalledWith('Number of services available: 0');

        connectionValidatorMock.catalogs = {
            [ODataVersion.v2]: {
                listServices: jest.fn().mockResolvedValue([serviceV2a])
            },
            [ODataVersion.v4]: {
                listServices: jest.fn().mockResolvedValue([serviceV4a])
            }
        };

        expect(await ((serviceSelectionPrompt as ListQuestion)?.choices as Function)()).toEqual([
            {
                name: 'DMO_GRP > /DMO/FLIGHT (0001) - OData V4',
                value: {
                    serviceODataVersion: '4',
                    servicePath: '/sap/opu/odata4/dmo/flight/0001/?sap-client=000',
                    serviceType: 'WEB_API',
                    toString: expect.any(Function)
                }
            },
            {
                name: 'ZTRAVEL_DESK_SRV (2) - OData V2',
                value: {
                    serviceODataVersion: '2',
                    servicePath: '/sap/opu/odata/sap/ZTRAVEL_DESK_SRV_0002',
                    serviceType: 'Not Classified',
                    toString: expect.any(Function)
                }
            }
        ]);

        // The services choices should be restricted to the specified required odata version
        systemServiceQuestions = getSystemServiceQuestion(connectValidator, promptNamespace, {
            requiredOdataVersion: OdataVersion.v2
        });
        serviceSelectionPrompt = systemServiceQuestions.find(
            (question) => question.name === `${promptNamespace}:${promptNames.serviceSelection}`
        );

        expect(await ((serviceSelectionPrompt as ListQuestion)?.choices as Function)()).toEqual([
            {
                name: 'ZTRAVEL_DESK_SRV (2) - OData V2',
                value: {
                    serviceODataVersion: '2',
                    servicePath: '/sap/opu/odata/sap/ZTRAVEL_DESK_SRV_0002',
                    serviceType: 'Not Classified',
                    toString: expect.any(Function)
                }
            }
        ]);
    });

    test('should show additional messages in service selection prompt when no matching services', async () => {
        const connectValidator = new ConnectionValidator();
        let systemServiceQuestions = getSystemServiceQuestion(connectValidator, promptNamespace);
        let serviceSelectionPrompt = systemServiceQuestions.find(
            (question) => question.name === `${promptNamespace}:${promptNames.serviceSelection}`
        );

        // No services warnings should be shown if no services are available
        expect(await ((serviceSelectionPrompt as ListQuestion)?.choices as Function)()).toEqual([]);

        let message = await ((serviceSelectionPrompt as ListQuestion)?.additionalMessages as Function)();

        expect(message).toMatchObject({
            message: t('prompts.warnings.noServicesAvailable'),
            severity: Severity.warning
        });

        // No odata version specific (`requiredOdataVersion`) service available
        systemServiceQuestions = getSystemServiceQuestion(connectValidator, promptNamespace, {
            requiredOdataVersion: OdataVersion.v2
        });
        serviceSelectionPrompt = systemServiceQuestions.find(
            (question) => question.name === `${promptNamespace}:${promptNames.serviceSelection}`
        );
        // Choices must be initialised before we show additional messages
        connectionValidatorMock.catalogs = {
            [ODataVersion.v2]: {
                listServices: jest.fn().mockResolvedValue([])
            },
            [ODataVersion.v4]: {
                listServices: jest.fn().mockResolvedValue([serviceV4a])
            }
        };
        expect(await ((serviceSelectionPrompt as ListQuestion)?.choices as Function)()).toEqual([]);

        message = await ((serviceSelectionPrompt as ListQuestion)?.additionalMessages as Function)();

        expect(message).toMatchObject({
            message: t('prompts.warnings.noServicesAvailableForOdataVersion', {
                odataVersion: OdataVersion.v2
            }),
            severity: Severity.warning
        });
    });

    test('should show additional messages in service selection prompt selected service type is not UI', async () => {
        const connectValidator = new ConnectionValidator();
        // Should show service type warning if service is not classified as UI
        connectionValidatorMock.catalogs = {
            [ODataVersion.v2]: {
                listServices: jest.fn().mockResolvedValue([serviceV2a])
            },
            [ODataVersion.v4]: {
                listServices: jest.fn().mockResolvedValue([serviceV4a])
            }
        };
        connectionValidatorMock.validatedUrl = 'http://some.abap.system:1234';
        const systemServiceQuestions = getSystemServiceQuestion(connectValidator, promptNamespace);
        const serviceSelectionPrompt = systemServiceQuestions.find(
            (question) => question.name === `${promptNamespace}:${promptNames.serviceSelection}`
        );
        let choices: { name: string; value: ServiceAnswer }[] = await (
            (serviceSelectionPrompt as ListQuestion)?.choices as Function
        )();
        expect(choices.length).toBe(2);

        let message = await ((serviceSelectionPrompt as ListQuestion)?.additionalMessages as Function)(
            choices[1].value
        );

        expect(message).toMatchObject({
            message: t('prompts.warnings.nonUIServiceTypeWarningMessage', { serviceType: 'A2X' }),
            severity: Severity.warning
        });

        // For OData V2 services, where the service type is 'Not Determined', an additional call is made to get the service type from 'ServiceTypeForHUBServices'
        const v2ServiceTypeNotDetermined = { ...serviceV2a, serviceType: ServiceType.NotDetermined };
        connectionValidatorMock.catalogs = {
            [ODataVersion.v2]: {
                listServices: jest.fn().mockResolvedValue([v2ServiceTypeNotDetermined]),
                getServiceType: jest.fn().mockResolvedValue(ServiceType.UI)
            },
            [ODataVersion.v4]: {
                listServices: jest.fn().mockResolvedValue([serviceV4a])
            }
        };

        // If the service url (the validated url) has changed new choices should be listed
        connectionValidatorMock.validatedUrl = 'http://some.abap.system:1235';
        choices = await ((serviceSelectionPrompt as ListQuestion)?.choices as Function)();

        let choiceV2 = choices.find((choice) => choice.value.serviceODataVersion === ODataVersion.v2);
        message = await ((serviceSelectionPrompt as ListQuestion)?.additionalMessages as Function)(choiceV2?.value);
        expect(message).toBeUndefined();

        connectionValidatorMock.catalogs = {
            [ODataVersion.v2]: {
                listServices: jest.fn().mockResolvedValue([v2ServiceTypeNotDetermined]),
                getServiceType: jest.fn().mockResolvedValue(ServiceType.WebApi)
            },
            [ODataVersion.v4]: {
                listServices: jest.fn().mockResolvedValue([serviceV4a])
            }
        };
        connectionValidatorMock.validatedUrl = 'http://some.abap.system:1236';
        choices = (await ((serviceSelectionPrompt as ListQuestion)?.choices as Function)()) as {
            name: string;
            value: ServiceAnswer;
        }[];

        choiceV2 = choices.find((choice) => choice.value.serviceODataVersion === ODataVersion.v2);
        message = await ((serviceSelectionPrompt as ListQuestion)?.additionalMessages as Function)(choiceV2?.value);
        expect(message).toMatchObject({
            message: t('prompts.warnings.nonUIServiceTypeWarningMessage', { serviceType: 'A2X' }),
            severity: Severity.warning
        });
    });

    test('should show additional messages in service selection prompt selected V2 service has no annotations', async () => {
        const connectValidator = new ConnectionValidator();
        connectionValidatorMock.validatedUrl = 'http://some.abap.system:1234';
        PromptState.odataService.annotations = [];
        connectionValidatorMock.catalogs = {
            [ODataVersion.v2]: {
                listServices: jest.fn().mockResolvedValue([serviceV2a])
            },
            [ODataVersion.v4]: {
                listServices: jest.fn().mockResolvedValue([serviceV4a])
            }
        };

        const systemServiceQuestions = getSystemServiceQuestion(connectValidator, promptNamespace);
        const serviceSelectionPrompt = systemServiceQuestions.find(
            (question) => question.name === `${promptNamespace}:${promptNames.serviceSelection}`
        );
        const choices: { name: string; value: ServiceAnswer }[] = await (
            (serviceSelectionPrompt as ListQuestion)?.choices as Function
        )();
        expect(choices.length).toBe(2);

        const message = await ((serviceSelectionPrompt as ListQuestion)?.additionalMessages as Function)(
            choices[1].value
        );

        expect(message).toMatchObject({
            message: t('prompts.warnings.noAnnotations'),
            severity: Severity.warning
        });
    });

    test('should pre-select service if only one', async () => {
        const connectValidator = new ConnectionValidator();
        connectionValidatorMock.catalogs = {
            [ODataVersion.v2]: {
                listServices: jest.fn().mockResolvedValue([serviceV2a])
            },
            [ODataVersion.v4]: {
                listServices: jest.fn().mockResolvedValue([])
            }
        };
        connectionValidatorMock.validatedUrl = 'http://some.abap.system:1234';
        let systemServiceQuestions = getSystemServiceQuestion(connectValidator, promptNamespace);
        let serviceSelectionPrompt = systemServiceQuestions.find(
            (question) => question.name === `${promptNamespace}:${promptNames.serviceSelection}`
        );
        // load choices
        let choices = await ((serviceSelectionPrompt as ListQuestion)?.choices as Function)();
        expect(choices.length).toBe(1);

        let defaultIndex = await ((serviceSelectionPrompt as ListQuestion)?.default as Function)(
            choices.map((choice: ChoiceOptions) => choice.value)
        );
        expect(defaultIndex).toEqual(0);

        // More than one, no pre-selection
        connectionValidatorMock.catalogs = {
            [ODataVersion.v2]: {
                listServices: jest.fn().mockResolvedValue([serviceV2a])
            },
            [ODataVersion.v4]: {
                listServices: jest.fn().mockResolvedValue([serviceV4a])
            }
        };

        systemServiceQuestions = getSystemServiceQuestion(connectValidator, promptNamespace);
        serviceSelectionPrompt = systemServiceQuestions.find(
            (question) => question.name === `${promptNamespace}:${promptNames.serviceSelection}`
        );
        choices = await ((serviceSelectionPrompt as ListQuestion)?.choices as Function)({});
        expect(choices.length).toBe(2);
        defaultIndex = await ((serviceSelectionPrompt as ListQuestion)?.default as Function)();
        expect(defaultIndex).toEqual(undefined);
    });

    test('Should validate the selected service by retreiving the service information', async () => {
        const annotations = [
            {
                Definitions: v2Annotations,
                TechnicalName: 'ZTRAVEL_DESK_SRV',
                Version: '0001',
                Uri: 'http://some.abap.system:1234/sap/opu/odata/sap/ZTRAVEL_DESK_SRV_0002'
            }
        ];
        const connectValidator = new ConnectionValidator();
        connectionValidatorMock.validatedUrl = 'http://some.abap.system:1234';
        connectionValidatorMock.catalogs = {
            [ODataVersion.v2]: {
                listServices: jest.fn().mockResolvedValue([serviceV2a]),
                getAnnotations: jest.fn().mockResolvedValue(annotations)
            },
            [ODataVersion.v4]: {
                listServices: jest.fn().mockResolvedValue([serviceV4a])
            }
        };

        connectionValidatorMock.serviceProvider = {
            service: jest.fn().mockReturnValue({
                metadata: jest.fn().mockResolvedValue(v2Metadata)
            } as Partial<ODataService>)
        } as Partial<ServiceProvider>;
        let serviceSpy = jest.spyOn(connectionValidatorMock.serviceProvider, 'service');

        const systemServiceQuestions = getSystemServiceQuestion(connectValidator, promptNamespace);
        const serviceSelectionPrompt = systemServiceQuestions.find(
            (question) => question.name === `${promptNamespace}:${promptNames.serviceSelection}`
        );

        // v2 service
        const selectedServiceV2 = {
            servicePath: '/sap/opu/odata/sap/ZTRAVEL_DESK_SRV_0002',
            serviceODataVersion: '2',
            serviceType: 'Not implemented'
        } as ServiceAnswer;

        let validationResult = await (serviceSelectionPrompt?.validate as Function)(selectedServiceV2);
        expect(validationResult).toBe(true);
        expect(serviceSpy).toHaveBeenCalledWith(selectedServiceV2.servicePath);
        expect(PromptState.odataService).toEqual({
            annotations: annotations,
            metadata: v2Metadata,
            odataVersion: '2',
            origin: 'http://some.abap.system:1234',
            servicePath: '/sap/opu/odata/sap/ZTRAVEL_DESK_SRV_0002'
        });

        // v4 service
        connectionValidatorMock.serviceProvider = {
            service: jest.fn().mockReturnValue({
                metadata: jest.fn().mockResolvedValue(v4Metadata)
            } as Partial<ODataService>)
        } as Partial<ServiceProvider>;

        const selectedServiceV4 = {
            servicePath: '/sap/opu/odata4/dmo/flight/0001',
            serviceODataVersion: '4',
            serviceType: 'WebUI'
        } as ServiceAnswer;
        serviceSpy = jest.spyOn(connectionValidatorMock.serviceProvider, 'service');

        validationResult = await (serviceSelectionPrompt?.validate as Function)(selectedServiceV4);
        expect(validationResult).toBe(true);
        expect(serviceSpy).toHaveBeenCalledWith(selectedServiceV4.servicePath);
        expect(PromptState.odataService).toEqual({
            annotations: [],
            metadata: v4Metadata,
            odataVersion: '4',
            origin: 'http://some.abap.system:1234',
            servicePath: '/sap/opu/odata4/dmo/flight/0001'
        });
    });

    test('Should get the service details on CLI using `when` condition(list validators dont run on CLI)', async () => {
        const getHostEnvSpy = jest.spyOn(utils, 'getPromptHostEnvironment').mockReturnValueOnce(hostEnvironment.cli);
        const annotations = [
            {
                Definitions: v2Annotations,
                TechnicalName: 'ZTRAVEL_DESK_SRV',
                Version: '0001',
                Uri: 'http://some.abap.system:1234/sap/opu/odata/sap/ZTRAVEL_DESK_SRV_0002'
            }
        ];
        const connectValidator = new ConnectionValidator();
        connectionValidatorMock.catalogs = {
            [ODataVersion.v2]: {
                listServices: jest.fn().mockResolvedValue([serviceV2a]),
                getAnnotations: jest.fn().mockResolvedValue(annotations)
            },
            [ODataVersion.v4]: {
                listServices: jest.fn().mockResolvedValue([serviceV4a])
            }
        };
        connectionValidatorMock.serviceProvider = {
            service: jest.fn().mockReturnValue({
                metadata: jest.fn().mockResolvedValue(v2Metadata)
            } as Partial<ODataService>)
        } as Partial<ServiceProvider>;
        connectionValidatorMock.validatedUrl = 'http://some.abap.system:1234';

        const systemServiceQuestions = getSystemServiceQuestion(connectValidator, promptNamespace);

        expect(getHostEnvSpy).toHaveBeenCalled();
        const cliServicePromptName = systemServiceQuestions.find(
            (question) => question.name === `${promptNamespace}:cliServiceSelection`
        );
        expect(
            await (cliServicePromptName?.when as Function)({
                [`${promptNamespace}:${promptNames.serviceSelection}`]: {
                    servicePath: '/sap/opu/odata/sap/ZTRAVEL_DESK_SRV_0002',
                    serviceODataVersion: '2',
                    serviceType: 'Not Classified'
                }
            })
        ).toBe(false); // We will never show this prompt
        expect(PromptState.odataService).toEqual({
            annotations: annotations,
            metadata: v2Metadata,
            odataVersion: '2',
            origin: 'http://some.abap.system:1234',
            servicePath: '/sap/opu/odata/sap/ZTRAVEL_DESK_SRV_0002'
        });
    });

    test('Should support type-ahead serivce search when using autocomplete option', async () => {
        const connectValidator = new ConnectionValidator();
        connectionValidatorMock.catalogs = {
            [ODataVersion.v2]: {
                listServices: jest.fn().mockResolvedValue([serviceV2a])
            },
            [ODataVersion.v4]: {
                listServices: jest.fn().mockResolvedValue([serviceV4a])
            }
        };
        const systemServiceQuestions = getSystemServiceQuestion(connectValidator, promptNamespace, {
            useAutoComplete: true
        });
        const serviceSelectionPrompt = systemServiceQuestions.find(
            (question) => question.name === `${promptNamespace}:${promptNames.serviceSelection}`
        );
        // load choices from mock catalog service and find the choice for the flight service
        const flightChoice = (
            (await ((serviceSelectionPrompt as ListQuestion)?.choices as Function)()) as {
                name: string;
                value: ServiceAnswer;
            }[]
        ).find((choice) => choice.name === 'DMO_GRP > /DMO/FLIGHT (0001) - OData V4');

        expect(serviceSelectionPrompt?.type).toBe('autocomplete');

        let found = await ((serviceSelectionPrompt as AutocompleteQuestionOptions)?.source as Function)({}, 'FLIGHT');
        expect(found).toEqual([flightChoice]);
        found = await ((serviceSelectionPrompt as AutocompleteQuestionOptions)?.source as Function)({}, 'not found');
        expect(found).toEqual([]);

        // autocomplete passes the entire choice object to the validate function instead of the value (as in YUI)
        // test to ensure this is handled correctly
        const getServiceDetailsSpy = jest.spyOn(serviceHelpers, 'getServiceDetails').mockResolvedValue(true);
        connectionValidatorMock.validatedUrl = 'http://some.abap.system:1234';
        // change the choice service path otherwise the validate function not re-request the service details
        flightChoice!.value.servicePath = '/a/different/service/path';
        const validationResult = await (serviceSelectionPrompt?.validate as Function)(flightChoice);
        expect(validationResult).toBe(true);
        expect(getServiceDetailsSpy).toHaveBeenCalledWith(flightChoice?.value, connectionValidatorMock, undefined);
    });

    test('Should apply `additionalMessages` prompt option', async () => {
        const connectValidator = new ConnectionValidator();
        connectionValidatorMock.catalogs = {
            [ODataVersion.v2]: {
                listServices: jest.fn().mockResolvedValue([serviceV2a])
            },
            [ODataVersion.v4]: {
                listServices: jest.fn().mockResolvedValue([])
            }
        };
        const customAdditionalMsgs: PromptSeverityMessage = (input: unknown, answers: Answers | undefined) => {
            return { message: 'Custom message', severity: Severity.information };
        };
        const serviceSelectionPromptOptions = { additionalMessages: customAdditionalMsgs };
        const systemServiceQuestions = getSystemServiceQuestion(
            connectValidator,
            promptNamespace,
            serviceSelectionPromptOptions
        );
        const serviceSelectionPrompt = systemServiceQuestions.find(
            (question) => question.name === `${promptNamespace}:${promptNames.serviceSelection}`
        );
        expect(await ((serviceSelectionPrompt as ListQuestion)?.additionalMessages as Function)()).toEqual({
            message: 'Custom message',
            severity: Severity.information
        });
    });

    test('Should show and log error message when service validation fails', async () => {
        const connectValidator = new ConnectionValidator();
        connectionValidatorMock.catalogs = {
            [ODataVersion.v2]: {
                listServices: jest.fn().mockResolvedValue([serviceV2a])
            },
            [ODataVersion.v4]: {
                listServices: jest.fn().mockResolvedValue([serviceV4a])
            }
        };
        connectionValidatorMock.serviceProvider = {
            service: jest.fn().mockReturnValue({
                metadata: jest.fn().mockRejectedValue(new Error('Failed to get metadata'))
            } as Partial<ODataService>)
        } as Partial<ServiceProvider>;

        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'error');
        const systemServiceQuestions = getSystemServiceQuestion(connectValidator, promptNamespace);
        const serviceSelectionPrompt = systemServiceQuestions.find(
            (question) => question.name === `${promptNamespace}:${promptNames.serviceSelection}`
        );

        const selectedService = {
            servicePath: '/sap/opu/odata/sap/ZTRAVEL_DESK_SRV_0002',
            serviceODataVersion: '2',
            serviceType: 'Not implemented'
        } as ServiceAnswer;

        const validationResult = await (serviceSelectionPrompt?.validate as Function)(selectedService);
        expect(loggerSpy).toHaveBeenCalledWith(
            t('errors.serviceMetadataErrorLog', {
                servicePath: selectedService.servicePath,
                error: 'Error: Failed to get metadata'
            })
        );
        expect(validationResult).toBe(t('errors.serviceMetadataErrorUI', { servicePath: selectedService.servicePath }));
    });

    test('should show a guided answer link when no services are returned and an error was logged', async () => {
        const connectValidator = new ConnectionValidator();
        const mockV2CatUri = 'http://some.abap.system:1234/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/';
        const mockV4CatUri =
            'http://some.abap.system:1234/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups';
        const entitySet = 'RecommendedServiceCollection';
        const catRequestError = new Error('Failed to get services');
        connectionValidatorMock.catalogs = {
            [ODataVersion.v2]: {
                listServices: jest.fn().mockRejectedValue(catRequestError),
                entitySet,
                getUri: jest.fn().mockReturnValue(mockV2CatUri)
            },
            [ODataVersion.v4]: {
                listServices: jest.fn().mockResolvedValue([]),
                entitySet,
                getUri: jest.fn().mockReturnValue(mockV4CatUri)
            }
        };
        connectionValidatorMock.validatedUrl = 'http://some.abap.system:1234';
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'error');
        const systemServiceQuestions = getSystemServiceQuestion(connectValidator, promptNamespace);
        const serviceSelectionPrompt = systemServiceQuestions.find(
            (question) => question.name === `${promptNamespace}:${promptNames.serviceSelection}`
        );
        // todo: No check for GA link here???
        const choices = await ((serviceSelectionPrompt as ListQuestion)?.choices as Function)();
        expect(choices).toEqual([]);
        const valResult = await ((serviceSelectionPrompt as ListQuestion)?.validate as Function)();
        expect(valResult).toBe('An error occurred retrieving service(s) for SAP System.');
        expect(loggerSpy).toHaveBeenCalledWith(
            t('errors.serviceCatalogRequest', {
                catalogRequestUri: mockV2CatUri,
                entitySet,
                error: catRequestError
            })
        );
    });

    test('Should set a single odata service as the only choice when catalogs not available (BAS full/partial URL destinations)', async () => {
        mockIsAppStudio = true;
        const connectValidator = new ConnectionValidator();
        connectionValidatorMock.catalogs = {
            [ODataVersion.v2]: undefined,
            [ODataVersion.v4]: undefined
        };
        connectionValidatorMock.validatedUrl = 'http://someDest.dest';
        connectionValidatorMock.destinationUrl = 'http://abap01:1234/path/to/odata/service';
        // Having an odataService indicates that there will only be a single service available, and selected by default
        connectionValidatorMock.odataService = {} as Partial<ODataService>;
        const systemServiceQuestions = getSystemServiceQuestion(connectValidator, promptNamespace);

        const serviceSelectionPrompt = systemServiceQuestions.find(
            (question) => question.name === `${promptNamespace}:${promptNames.serviceSelection}`
        );
        const choices = await ((serviceSelectionPrompt as ListQuestion)?.choices as Function)();
        expect(choices).toEqual([
            { name: 'http://abap01:1234/path/to/odata/service', value: { servicePath: '/path/to/odata/service' } }
        ]);
    });
});
