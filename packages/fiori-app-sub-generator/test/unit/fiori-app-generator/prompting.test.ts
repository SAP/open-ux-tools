import { jest } from '@jest/globals';
import { Severity } from '@sap-devx/yeoman-ui-types';
import type { ServiceProvider } from '@sap-ux/axios-extension';
import type { PromptSeverityMessage } from '@sap-ux/inquirer-common';
import type { Logger } from '@sap-ux/logger';
import {
    DatasourceType,
    OdataVersion,
    promptNames as odataServiceInqPromptNames
} from '@sap-ux/odata-service-inquirer';
import type { UI5ApplicationAnswers, UI5ApplicationPromptOptions } from '@sap-ux/ui5-application-inquirer';
import { promptNames } from '@sap-ux/ui5-application-inquirer';
import 'jest-extended';
import { join } from 'node:path';
import type { Adapter } from 'yeoman-environment';
import { type Service, FloorplanFE } from '../../../src/types';
import { minUi5VersionForPageBuildingBlock } from '../../../src/types/constants';

// Pre-import actuals
const actualFioriGenShared = await import('@sap-ux/fiori-generator-shared');
const actualTelemetry = await import('@sap-ux/telemetry');
const actualFeatureToggle = await import('@sap-ux/feature-toggle');
const actualOdataServiceInquirer = await import('@sap-ux/odata-service-inquirer');
const actualUi5ApplicationInquirer = await import('@sap-ux/ui5-application-inquirer');
const actualUi5Info = await import('@sap-ux/ui5-info');
const actualStepsHelper = await import('../../../src/utils/stepsHelper');

const mockGetHostEnvironment = jest.fn();
const mockIsFeatureEnabled = jest.fn();
const mockOdataServiceInquirerPrompt = jest.fn();
const mockUi5ApplicationInquirerPrompt = jest.fn();
const mockGetUI5Versions = jest.fn();
const mockGetSapSystemUI5Version = jest.fn();
const mockValidateNextStep = jest.fn();

jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    ...actualFioriGenShared,
    sendTelemetry: jest.fn(),
    getHostEnvironment: mockGetHostEnvironment
}));

jest.unstable_mockModule('@sap-ux/telemetry', () => ({
    ...actualTelemetry,
    ClientFactory: {
        getTelemetryClient: jest.fn().mockResolvedValue({})
    }
}));

jest.unstable_mockModule('@sap-ux/feature-toggle', () => ({
    ...actualFeatureToggle,
    isFeatureEnabled: mockIsFeatureEnabled
}));

jest.unstable_mockModule('@sap-ux/odata-service-inquirer', () => ({
    ...actualOdataServiceInquirer,
    prompt: mockOdataServiceInquirerPrompt
}));

jest.unstable_mockModule('@sap-ux/ui5-application-inquirer', () => ({
    ...actualUi5ApplicationInquirer,
    prompt: mockUi5ApplicationInquirerPrompt
}));

jest.unstable_mockModule('@sap-ux/ui5-info', () => ({
    ...actualUi5Info,
    getUI5Versions: mockGetUI5Versions,
    getSapSystemUI5Version: mockGetSapSystemUI5Version
}));

jest.unstable_mockModule('../../../src/utils/stepsHelper', () => ({
    ...actualStepsHelper,
    validateNextStep: mockValidateNextStep
}));

const { createUI5ApplicationPromptOptions, getViewQuestion, promptOdataServiceAnswers, promptUI5ApplicationAnswers } =
    await import('../../../src/fiori-app-generator/prompting');
const { initI18nFioriAppSubGenerator, t } = await import('../../../src/utils/i18n');
const { DefaultLogger, hostEnvironment } = await import('@sap-ux/fiori-generator-shared');

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
            mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        });

        test('createUI5ApplicationPromptOptions - empty state', async () => {
            const promptOptions = await createUI5ApplicationPromptOptions({
                service: {},
                appGenStepConfigList: [],
                floorplan: FloorplanFE.FE_FEOP
            });
            expect(promptOptions).toMatchInlineSnapshot(`
                {
                  "addDeployConfig": {
                    "validatorCallback": [Function],
                  },
                  "addFlpConfig": {
                    "validatorCallback": [Function],
                  },
                  "enableEslint": {
                    "advancedOption": true,
                    "default": true,
                    "hide": true,
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
            const promptOptions = await createUI5ApplicationPromptOptions({
                service,
                appGenStepConfigList: [],
                floorplan: FloorplanFE.FE_FEOP,
                projectName: 'project_name1',
                targetFolder: join('/some/project/path')
            });
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

            const promptOptions = await createUI5ApplicationPromptOptions({
                service: service,
                appGenStepConfigList: [],
                floorplan: FloorplanFE.FE_FEOP,
                projectName: 'project_name1',
                targetFolder: join('/ignored/for/cap')
            });
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

            const promptOptions = await createUI5ApplicationPromptOptions({
                service,
                appGenStepConfigList: [],
                floorplan: FloorplanFE.FE_FEOP,
                projectName: 'project_name1',
                targetFolder: join('/ignored/for/cap'),
                promptSettings: {
                    [promptNames.ui5Version]: { hide: true }
                }
            });
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
            const promptOptions = await createUI5ApplicationPromptOptions({
                service: {},
                appGenStepConfigList: [],
                floorplan: FloorplanFE.FE_LROP,
                projectName: 'project_name1',
                targetFolder: join('/some/project/path'),
                promptSettings: {
                    [promptNames.targetFolder]: {
                        hide: true
                    },
                    [promptNames.name]: {
                        hide: true
                    }
                }
            });
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
            mockGetSapSystemUI5Version.mockResolvedValue('1.100.100');
            const promptOptions = await createUI5ApplicationPromptOptions({
                service: {
                    version: OdataVersion.v4,
                    host: 'http://some/sap/system/url'
                },
                appGenStepConfigList: [],
                floorplan: FloorplanFE.FE_LROP
            });
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
            mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);
            let promptOptions = await createUI5ApplicationPromptOptions({
                service: { version: OdataVersion.v4 },
                appGenStepConfigList: [],
                floorplan: FloorplanFE.FE_LROP
            });
            expect(promptOptions).toMatchObject({
                ui5Version: {
                    hide: false,
                    includeSeparators: true,
                    minUI5Version: '1.84.0',
                    useAutocomplete: false
                }
            });
            mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
            promptOptions = await createUI5ApplicationPromptOptions({
                service: { version: OdataVersion.v4 },
                appGenStepConfigList: [],
                floorplan: FloorplanFE.FE_LROP
            });
            expect(promptOptions).toMatchObject({
                ui5Version: {
                    hide: false,
                    includeSeparators: false,
                    minUI5Version: '1.84.0',
                    useAutocomplete: true
                }
            });
        });

        test('createUI5ApplicationPromptOptions - applies extension settings and sets min UI5 version for page building block', async () => {
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
            const promptOptions = await createUI5ApplicationPromptOptions({
                service: {},
                appGenStepConfigList: [],
                floorplan: FloorplanFE.FE_FPM,
                projectName: undefined,
                targetFolder: undefined,
                promptSettings: undefined,
                promptExtension: promptExtensions,
                entityRelatedConfig: { addPageBuildingBlock: true }
            });
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
            expect(promptOptions.ui5Version?.minUI5Version).toBe(minUi5VersionForPageBuildingBlock);
        });

        test('createUI5ApplicationPromptOptions - extension minUI5Version takes precendence when provided with page building block', async () => {
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
                },
                ui5Version: {
                    minUI5Version: '1.65.0'
                }
            };
            const promptOptions = await createUI5ApplicationPromptOptions({
                service: {},
                appGenStepConfigList: [],
                floorplan: FloorplanFE.FE_FPM,
                projectName: undefined,
                targetFolder: undefined,
                promptSettings: undefined,
                promptExtension: promptExtensions,
                entityRelatedConfig: { addPageBuildingBlock: true }
            });
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
            expect(promptOptions.ui5Version?.minUI5Version).toBe(promptExtensions.ui5Version?.minUI5Version);
        });

        test('createUI5ApplicationPromptOptions - validator callbacks are added by default', async () => {
            mockValidateNextStep.mockReturnValue(true);
            const promptOptions = await createUI5ApplicationPromptOptions({
                service: {},
                appGenStepConfigList: [],
                floorplan: FloorplanFE.FE_FEOP
            });
            expect(promptOptions.addDeployConfig?.validatorCallback).toBeDefined();
            expect(promptOptions.addFlpConfig?.validatorCallback).toBeDefined();

            (promptOptions.addDeployConfig?.validatorCallback as Function)(true);
            expect(mockValidateNextStep).toHaveBeenCalledWith(
                true,
                'Project Attributes',
                [],
                t('steps.deployConfig.title')
            );
            mockValidateNextStep.mockClear();

            (promptOptions.addFlpConfig?.validatorCallback as Function)(true);
            expect(mockValidateNextStep).toHaveBeenCalledWith(
                true,
                t('steps.projectAttributesConfig.title'),
                [],
                t('steps.flpConfig.title')
            );
            mockValidateNextStep.mockClear();
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
            const promptOptions = await createUI5ApplicationPromptOptions({
                service: {},
                appGenStepConfigList: [],
                floorplan: FloorplanFE.FE_FEOP,
                projectName: undefined,
                targetFolder: undefined,
                promptSettings: undefined,
                promptExtension: promptExtensions
            });
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
            mockGetUI5Versions.mockResolvedValue([{ version: '1.1.1' }]);
            mockUi5ApplicationInquirerPrompt.mockImplementation(
                async () => ({ ui5Version: '9.9.9' }) as UI5ApplicationAnswers
            );
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
            expect(mockUi5ApplicationInquirerPrompt).toHaveBeenCalledWith(
                {},
                {
                    addDeployConfig: { validatorCallback: expect.toBeFunction() },
                    addFlpConfig: { validatorCallback: expect.toBeFunction() },
                    enableEslint: { advancedOption: true, default: true, hide: true },
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
            expect(mockGetUI5Versions).toHaveBeenCalledWith({
                minSupportedUI5Version: expect.toBeString(),
                onlyNpmVersion: true,
                onlyVersionNumbers: true,
                ui5SelectedVersion: '9.9.9'
            });
        });

        test('promptOdataServiceAnswers - basic functionality', async () => {
            mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);
            mockIsFeatureEnabled.mockReturnValue(true);
            const mockAdapter = {} as Adapter;
            mockOdataServiceInquirerPrompt.mockResolvedValue({
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
                    backendSystem: {
                        url: 'http://some/sap/system/url',
                        name: 'on-prem-system',
                        systemType: 'OnPrem',
                        connectionType: 'abap_catalog'
                    }
                }
            });

            const service = await promptOdataServiceAnswers(
                {
                    requiredOdataVersion: OdataVersion.v4,
                    allowNoDatasource: undefined,
                    promptOptions: {
                        [odataServiceInqPromptNames.datasourceType]: {
                            choices: [DatasourceType.sapSystem, DatasourceType.odataServiceUrl, DatasourceType.none]
                        },
                        [odataServiceInqPromptNames.metadataFilePath]: { requiredOdataVersion: OdataVersion.v4 },
                        [odataServiceInqPromptNames.systemSelection]: { defaultChoice: 'someDestination' },
                        [odataServiceInqPromptNames.serviceSelection]: {
                            serviceFilter: ['Service1', 'Service2'],
                            requiredOdataVersion: OdataVersion.v4
                        },
                        [odataServiceInqPromptNames.userSystemName]: {
                            hide: true
                        }
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
            expect(mockOdataServiceInquirerPrompt).toHaveBeenCalledWith(
                mockAdapter,
                expect.objectContaining({
                    [odataServiceInqPromptNames.capProject]: {
                        capSearchPaths: [],
                        defaultChoice: undefined,
                        useAutoComplete: false
                    },
                    [odataServiceInqPromptNames.capService]: { defaultChoice: undefined },
                    [odataServiceInqPromptNames.datasourceType]: {
                        default: DatasourceType.sapSystem,
                        includeNone: false,
                        choices: [DatasourceType.sapSystem, DatasourceType.odataServiceUrl, DatasourceType.none]
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
                    },
                    [odataServiceInqPromptNames.userSystemName]: { hide: true }
                }),
                DefaultLogger as unknown as Logger,
                true, // is GA feature enabled
                expect.anything(), // telemetry client
                true, // isYUI
                undefined // cached connected system
            );
        });

        test('promptOdataServiceAnswers - cap related prompt options', async () => {
            mockIsFeatureEnabled.mockReturnValue(true);
            const mockAdapter = {} as Adapter;
            mockOdataServiceInquirerPrompt.mockResolvedValue({
                origin: 'http://some/sap/system/url',
                sapClient: '100',
                servicePath: '/some/service/path',
                metadata: '<edmx />',
                annotations: [],
                odataVersion: OdataVersion.v4,
                datasourceType: DatasourceType.capProject,
                connectedSystem: {
                    serviceProvider: {} as ServiceProvider,
                    backendSystem: {
                        url: 'http://some/sap/system/url',
                        name: 'on-prem-system',
                        systemType: 'OnPrem',
                        connectionType: 'abap_catalog'
                    }
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
            expect(mockOdataServiceInquirerPrompt).toHaveBeenCalledWith(
                mockAdapter,
                expect.objectContaining({
                    [odataServiceInqPromptNames.capProject]: {
                        capSearchPaths: ['/some/workspace/folder'],
                        defaultChoice: '/some/cap/project/path',
                        useAutoComplete: true
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
