import { Severity } from '@sap-devx/yeoman-ui-types';
import type { ServiceProvider } from '@sap-ux/axios-extension';
import * as featureToggle from '@sap-ux/feature-toggle';
import { DefaultLogger, getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import type { PromptSeverityMessage } from '@sap-ux/inquirer-common';
import type { Logger } from '@sap-ux/logger';
import * as odataServiceInquirer from '@sap-ux/odata-service-inquirer';
import {
    DatasourceType,
    OdataVersion,
    promptNames as odataServiceInqPromptNames
} from '@sap-ux/odata-service-inquirer';
import type { UI5ApplicationAnswers, UI5ApplicationPromptOptions } from '@sap-ux/ui5-application-inquirer';
import * as ui5ApplicationInquirer from '@sap-ux/ui5-application-inquirer';
import { promptNames } from '@sap-ux/ui5-application-inquirer';
import * as ui5Info from '@sap-ux/ui5-info';
import 'jest-extended';
import { join } from 'path';
import type { Adapter } from 'yeoman-environment';
import {
    createUI5ApplicationPromptOptions,
    getViewQuestion,
    promptOdataServiceAnswers,
    promptUI5ApplicationAnswers
} from '../../../src/fiori-app-generator/prompting';
import { type Service, FloorplanFE } from '../../../src/types';
import { initI18nFioriAppSubGenerator, t } from '../../../src/utils/i18n';
import * as stepsHelper from '../../../src/utils/stepsHelper';

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    sendTelemetry: jest.fn(),
    getHostEnvironment: jest.fn()
}));

jest.mock('@sap-ux/telemetry', () => ({
    ...jest.requireActual('@sap-ux/telemetry'),
    ClientFactory: {
        getTelemetryClient: jest.fn().mockResolvedValue({})
    }
}));

describe('prompting.ts', () => {
    beforeAll(async () => {
        await initI18nFioriAppSubGenerator();
    });
    describe('getViewQuestion', () => {
        it('should have the correct question properties', () => {
            const question = getViewQuestion();
            expect(question).toEqual({
                type: 'input',
                name: 'viewName',
                message: 'View Name',
                guiOptions: {
                    breadcrumb: true
                },
                default: 'View1',
                validate: expect.any(Function)
            });
        });

        it('should validate view name correctly', () => {
            const validate = getViewQuestion().validate as (input: string) => boolean | string;

            expect(validate('')).toBe(t('prompts.viewName.validationMessages.viewNameRequired'));
            expect(validate('Invalid Name')).toBe(t('prompts.viewName.validationMessages.viewNameInvalid'));
            expect(validate('a'.repeat(121))).toBe(t('prompts.viewName.validationMessages.viewNameTooLong'));
            expect(validate('ValidName')).toBe(true);
            expect(validate('123')).toBe(t('prompts.viewName.validationMessages.viewNameInvalid')); // Must start with a letter
        });
    });

    describe('promptSettings', () => {
        beforeEach(() => {
            // Restore spies between each tests
            jest.restoreAllMocks();
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
        });

        test('createUI5ApplicationPromptOptions - empty state', async () => {
            const promptOptions = await createUI5ApplicationPromptOptions({}, [], FloorplanFE.FE_FEOP);
            expect(promptOptions).toMatchInlineSnapshot(`
                {
                  "addDeployConfig": {
                    "validatorCallback": [Function],
                  },
                  "addFlpConfig": {
                    "validatorCallback": [Function],
                  },
                  "enableCodeAssist": {
                    "advancedOption": true,
                    "default": false,
                  },
                  "enableEslint": {
                    "advancedOption": true,
                    "default": false,
                  },
                  "enableTypeScript": {
                    "default": false,
                  },
                  "enableVirtualEndpoints": {
                    "hide": false,
                  },
                  "name": {
                    "defaultValue": undefined,
                  },
                  "skipAnnotations": {
                    "advancedOption": true,
                    "default": false,
                    "hide": true,
                  },
                  "targetFolder": {
                    "defaultValue": undefined,
                    "validateFioriAppFolder": true,
                  },
                  "ui5Theme": {
                    "advancedOption": true,
                  },
                  "ui5Version": {
                    "hide": false,
                    "includeSeparators": false,
                    "minUI5Version": "1.65.0",
                    "useAutocomplete": true,
                  },
                }
            `);
        });

        test('createUI5ApplicationPromptOptions - project name and projectFolder provided', async () => {
            const service: Partial<Service> = {};
            const promptOptions = await createUI5ApplicationPromptOptions(
                service,
                [],
                FloorplanFE.FE_FEOP,
                'project_name1',
                join('/some/project/path')
            );
            expect(promptOptions).toMatchObject({
                name: {
                    defaultValue: 'project_name1'
                },
                targetFolder: {
                    defaultValue: join('/some/project/path')
                }
            });
        });

        test('createUI5ApplicationPromptOptions - project name, targetFolder and capService provided ', async () => {
            const service: Partial<Service> = {
                capService: {
                    projectPath: join('/some/cap/path'),
                    appPath: '/some/cap/app/path',
                    serviceName: 'cap_service_name'
                }
            };

            const promptOptions = await createUI5ApplicationPromptOptions(
                service,
                [],
                FloorplanFE.FE_FEOP,
                'project_name1',
                join('/ignored/for/cap')
            );
            expect(promptOptions).toMatchObject({
                name: {
                    defaultValue: 'project_name1'
                },
                skipAnnotations: {
                    hide: false
                },
                targetFolder: {
                    default: join('/some/cap/path/some/cap/app/path')
                }
            });
        });

        test('createUI5ApplicationPromptOptions - project, service and options', async () => {
            const service: Partial<Service> = {
                capService: {
                    projectPath: join('/some/cap/path'),
                    appPath: '/some/cap/app/path',
                    serviceName: 'cap_service_name'
                }
            };

            const promptOptions = await createUI5ApplicationPromptOptions(
                service,
                [],
                FloorplanFE.FE_FEOP,
                'project_name1',
                join('/ignored/for/cap'),
                {
                    [promptNames.ui5Version]: { hide: true }
                }
            );
            expect(promptOptions).toMatchObject({
                name: {
                    defaultValue: 'project_name1'
                },
                skipAnnotations: {
                    hide: false
                },
                targetFolder: {
                    default: join('/some/cap/path/some/cap/app/path')
                },
                ui5Version: {
                    hide: true
                }
            });
        });

        test('createUI5ApplicationPromptOptions - provided prompt settings (e.g. from adaptors) are merged', async () => {
            const promptOptions = await createUI5ApplicationPromptOptions(
                {},
                [],
                FloorplanFE.FE_LROP,
                'project_name1',
                join('/some/project/path'),
                {
                    [promptNames.targetFolder]: {
                        hide: true
                    },
                    [promptNames.name]: {
                        hide: true
                    }
                }
            );
            expect(promptOptions).toMatchObject({
                name: {
                    hide: true,
                    defaultValue: 'project_name1'
                },
                skipAnnotations: {
                    hide: true
                },
                targetFolder: {
                    hide: true,
                    defaultValue: join('/some/project/path')
                }
            });
        });

        test('createUI5ApplicationPromptOptions - sap system UI5 version is set as default choice', async () => {
            jest.spyOn(ui5Info, 'getSapSystemUI5Version').mockResolvedValue('1.100.100');
            const promptOptions = await createUI5ApplicationPromptOptions(
                {
                    version: OdataVersion.v4,
                    host: 'http://some/sap/system/url'
                },
                [],
                FloorplanFE.FE_LROP
            );
            expect(promptOptions).toMatchObject({
                ui5Version: {
                    defaultChoice: {
                        name: '1.100.100 (Source system version)',
                        value: '1.100.100'
                    },
                    hide: false,
                    includeSeparators: false,
                    minUI5Version: '1.84.0',
                    useAutocomplete: true
                }
            });
        });

        test('createUI5ApplicationPromptOptions - ui5Version options set based on platform', async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.vscode);
            let promptOptions = await createUI5ApplicationPromptOptions(
                { version: OdataVersion.v4 },
                [],
                FloorplanFE.FE_LROP
            );
            expect(promptOptions).toMatchObject({
                ui5Version: {
                    hide: false,
                    includeSeparators: true,
                    minUI5Version: '1.84.0',
                    useAutocomplete: false
                }
            });
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
            promptOptions = await createUI5ApplicationPromptOptions(
                { version: OdataVersion.v4 },
                [],
                FloorplanFE.FE_LROP
            );
            expect(promptOptions).toMatchObject({
                ui5Version: {
                    hide: false,
                    includeSeparators: false,
                    minUI5Version: '1.84.0',
                    useAutocomplete: true
                }
            });
        });

        test('createUI5ApplicationPromptOptions - validator callbacks are added by default', async () => {
            const validateNextStepSpy = jest.spyOn(stepsHelper, 'validateNextStep').mockReturnValue(true);
            const promptOptions = await createUI5ApplicationPromptOptions({}, [], FloorplanFE.FE_FEOP);
            expect(promptOptions.addDeployConfig?.validatorCallback).toBeDefined();
            expect(promptOptions.addFlpConfig?.validatorCallback).toBeDefined();

            (promptOptions.addDeployConfig?.validatorCallback as Function)(true);
            expect(validateNextStepSpy).toHaveBeenCalledWith(
                true,
                'Project Attributes',
                [],
                t('steps.deployConfig.title')
            );
            validateNextStepSpy.mockClear();

            (promptOptions.addFlpConfig?.validatorCallback as Function)(true);
            expect(validateNextStepSpy).toHaveBeenCalledWith(
                true,
                t('steps.projectAttributesConfig.title'),
                [],
                t('steps.flpConfig.title')
            );
            validateNextStepSpy.mockRestore();
        });

        test('createUI5ApplicationPromptOptions - generator extension settings are applied', async () => {
            const validateExtFunc = (input: string, answers: unknown) => true;
            const addMsgs: PromptSeverityMessage = (input, previousAnswers) => ({
                message: 'msg',
                severity: Severity.information
            });
            const promptExtensions: UI5ApplicationPromptOptions = {
                addDeployConfig: {
                    default: true,
                    validate: validateExtFunc,
                    additionalMessages: addMsgs
                },
                namespace: {
                    default: 'sap.com'
                }
            };
            const promptOptions = await createUI5ApplicationPromptOptions(
                {},
                [],
                FloorplanFE.FE_FEOP,
                undefined,
                undefined,
                undefined,
                promptExtensions
            );
            expect(promptOptions).toMatchObject({
                addDeployConfig: {
                    default: true,
                    validate: validateExtFunc,
                    additionalMessages: addMsgs
                },
                namespace: {
                    default: 'sap.com'
                }
            });
        });

        test('promptUI5ApplicationAnswers', async () => {
            const getUI5VersionSpy = jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue([{ version: '1.1.1' }]);
            const ui5ApplicationInquirerSpy = jest
                .spyOn(ui5ApplicationInquirer, 'prompt')
                .mockImplementation(async () => ({ ui5Version: '9.9.9' } as UI5ApplicationAnswers));
            expect(
                await promptUI5ApplicationAnswers(
                    {
                        service: {},
                        floorplan: FloorplanFE.FE_LROP
                    },
                    [],
                    {} as Adapter
                )
            ).toEqual({
                localUI5Version: expect.toBeString(),
                ui5AppAnswers: {
                    ui5Version: '9.9.9'
                }
            });
            expect(ui5ApplicationInquirerSpy).toHaveBeenCalledWith(
                {},
                {
                    addDeployConfig: { validatorCallback: expect.toBeFunction() },
                    addFlpConfig: { validatorCallback: expect.toBeFunction() },
                    enableCodeAssist: { advancedOption: true, default: false },
                    enableEslint: { advancedOption: true, default: false },
                    enableTypeScript: { default: false },
                    enableVirtualEndpoints: { hide: false },
                    name: { defaultValue: undefined },
                    skipAnnotations: { advancedOption: true, default: false, hide: true },
                    targetFolder: { defaultValue: undefined, validateFioriAppFolder: true },
                    ui5Theme: { advancedOption: true },
                    ui5Version: {
                        hide: false,
                        includeSeparators: false,
                        minUI5Version: expect.toBeString(),
                        useAutocomplete: true
                    }
                },
                undefined,
                false
            );
            expect(getUI5VersionSpy).toHaveBeenCalledWith({
                minSupportedUI5Version: expect.toBeString(),
                onlyNpmVersion: true,
                onlyVersionNumbers: true,
                ui5SelectedVersion: '9.9.9'
            });
        });

        test('promptOdataServiceAnswers - basic functionality', async () => {
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.vscode);
            jest.spyOn(featureToggle, 'isFeatureEnabled').mockReturnValue(true);
            const mockAdapter = {} as Adapter;
            const promptOdataServiceInquirerSpy = jest.spyOn(odataServiceInquirer, 'prompt').mockResolvedValue({
                origin: 'http://some/sap/system/url',
                sapClient: '100',
                servicePath: '/some/service/path',
                metadata: '<edmx />',
                annotations: [],
                odataVersion: OdataVersion.v4,
                datasourceType: DatasourceType.sapSystem,
                metadataFilePath: '/some/metadata/file/path',
                connectedSystem: {
                    serviceProvider: {
                        services: {
                            'mock/service': {
                                interceptors: [],
                                log: {}
                            }
                        },
                        log: {}
                    } as unknown as ServiceProvider,
                    backendSystem: { url: 'http://some/sap/system/url', name: 'on-prem-system' }
                }
            });

            const service = await promptOdataServiceAnswers(
                {
                    requiredOdataVersion: OdataVersion.v4,
                    allowNoDatasource: undefined,
                    promptOptions: {
                        [odataServiceInqPromptNames.systemSelection]: { defaultChoice: 'someDestination' },
                        [odataServiceInqPromptNames.serviceSelection]: { serviceFilter: ['Service1', 'Service2'] }
                    },
                    showCollabDraftWarning: true
                },
                DefaultLogger as unknown as Logger,
                mockAdapter
            );

            // Should match the mocked response from promptOdataServiceInquirerSpy
            expect(service).toMatchObject({
                host: 'http://some/sap/system/url',
                client: '100',
                servicePath: '/some/service/path',
                edmx: '<edmx />',
                annotations: [],
                version: OdataVersion.v4,
                source: DatasourceType.sapSystem,
                localEdmxFilePath: '/some/metadata/file/path',
                connectedSystem: {
                    serviceProvider: {
                        services: {
                            'mock/service': {
                                interceptors: []
                            }
                        }
                    } as unknown as ServiceProvider,
                    backendSystem: { url: 'http://some/sap/system/url', name: 'on-prem-system' }
                }
            });
            // Should have called prompt with the expected options (tests createOdataServicePromptOptions)
            expect(promptOdataServiceInquirerSpy).toHaveBeenCalledWith(
                mockAdapter,
                expect.objectContaining({
                    [odataServiceInqPromptNames.capProject]: {
                        capSearchPaths: [],
                        defaultChoice: undefined
                    },
                    [odataServiceInqPromptNames.capService]: { defaultChoice: undefined },
                    [odataServiceInqPromptNames.datasourceType]: {
                        default: DatasourceType.sapSystem,
                        includeNone: false
                    },
                    [odataServiceInqPromptNames.metadataFilePath]: { requiredOdataVersion: OdataVersion.v4 },
                    [odataServiceInqPromptNames.serviceSelection]: {
                        useAutoComplete: false,
                        requiredOdataVersion: OdataVersion.v4,
                        showCollaborativeDraftWarning: true,
                        serviceFilter: ['Service1', 'Service2']
                    },
                    [odataServiceInqPromptNames.serviceUrl]: {
                        requiredOdataVersion: OdataVersion.v4,
                        showCollaborativeDraftWarning: true
                    },
                    [odataServiceInqPromptNames.systemSelection]: {
                        destinationFilters: { odata_abap: true, full_service_url: true, partial_service_url: true },
                        useAutoComplete: false,
                        includeCloudFoundryAbapEnvChoice: true,
                        defaultChoice: 'someDestination'
                    }
                }),
                DefaultLogger as unknown as Logger,
                true, // is GA feature enabled
                expect.anything(), // telemetry client
                true, // isYUI
                undefined // cached connected system
            );
        });

        test('promptOdataServiceAnswers - cap related prompt options', async () => {
            jest.spyOn(featureToggle, 'isFeatureEnabled').mockReturnValue(true);
            const mockAdapter = {} as Adapter;
            const promptOdataServiceInquirerSpy = jest.spyOn(odataServiceInquirer, 'prompt').mockResolvedValue({
                origin: 'http://some/sap/system/url',
                sapClient: '100',
                servicePath: '/some/service/path',
                metadata: '<edmx />',
                annotations: [],
                odataVersion: OdataVersion.v4,
                datasourceType: DatasourceType.capProject,
                connectedSystem: {
                    serviceProvider: {} as ServiceProvider,
                    backendSystem: { url: 'http://some/sap/system/url', name: 'on-prem-system' }
                },
                capService: {
                    serviceName: 'cap_service_name',
                    projectPath: '/some/cap/path',
                    appPath: '/some/cap/app/path'
                }
            });

            const service = await promptOdataServiceAnswers(
                {
                    requiredOdataVersion: OdataVersion.v4,
                    allowNoDatasource: undefined,
                    promptOptions: {
                        [odataServiceInqPromptNames.systemSelection]: { defaultChoice: 'someDestination' } // should be ignored
                    },
                    workspaceFolders: ['/some/workspace/folder'],
                    capService: {
                        projectPath: '/some/cap/project/path',
                        appPath: '/some/cap/app/path',
                        serviceName: 'cap_service_name'
                    }
                },
                DefaultLogger as unknown as Logger,
                mockAdapter
            );
            // Should match the mocked response from promptOdataServiceInquirerSpy
            expect(service).toMatchObject({
                host: 'http://some/sap/system/url',
                client: '100',
                servicePath: '/some/service/path',
                edmx: '<edmx />',
                annotations: [],
                version: OdataVersion.v4,
                source: DatasourceType.capProject,
                localEdmxFilePath: undefined,
                connectedSystem: {
                    serviceProvider: {} as ServiceProvider,
                    backendSystem: { url: 'http://some/sap/system/url', name: 'on-prem-system' }
                }
            });
            // Should have called prompt with the expected options (tests createOdataServicePromptOptions)
            expect(promptOdataServiceInquirerSpy).toHaveBeenCalledWith(
                mockAdapter,
                expect.objectContaining({
                    [odataServiceInqPromptNames.capProject]: {
                        capSearchPaths: ['/some/workspace/folder'],
                        defaultChoice: '/some/cap/project/path'
                    },
                    [odataServiceInqPromptNames.capService]: {
                        defaultChoice: {
                            projectPath: '/some/cap/project/path',
                            appPath: '/some/cap/app/path',
                            serviceName: 'cap_service_name'
                        }
                    },
                    [odataServiceInqPromptNames.datasourceType]: {
                        default: DatasourceType.capProject,
                        includeNone: false
                    },
                    [odataServiceInqPromptNames.metadataFilePath]: { requiredOdataVersion: OdataVersion.v4 },
                    [odataServiceInqPromptNames.serviceSelection]: {
                        useAutoComplete: true,
                        requiredOdataVersion: OdataVersion.v4,
                        showCollaborativeDraftWarning: undefined
                    },
                    [odataServiceInqPromptNames.serviceUrl]: {
                        requiredOdataVersion: OdataVersion.v4,
                        showCollaborativeDraftWarning: undefined
                    },
                    [odataServiceInqPromptNames.systemSelection]: {
                        destinationFilters: { odata_abap: true, full_service_url: true, partial_service_url: true },
                        useAutoComplete: true,
                        includeCloudFoundryAbapEnvChoice: true,
                        defaultChoice: 'someDestination'
                    }
                }),
                DefaultLogger as unknown as Logger,
                true, // is GA feature enabled
                expect.anything(), // telemetry client
                false, // isYUI
                undefined // cached connected system
            );
        });
    });
});
