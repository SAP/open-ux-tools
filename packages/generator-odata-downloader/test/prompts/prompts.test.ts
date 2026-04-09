import { jest } from '@jest/globals';
import type { CheckBoxQuestion, ConfirmQuestion, InputQuestion } from '@sap-ux/inquirer-common';
import type { ServiceSpecification } from '@sap-ux/project-access';
import { PromptState } from '../../src/data-download/prompt-state';

// Mock external packages that odata-download-generator.ts imports
jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    AbapServiceProvider: class MockAbapServiceProvider {}
}));

const mockGetHostEnvironment = jest.fn();
const mockHostEnvironment = {
    cli: 'CLI',
    vscode: 'vscode'
};
jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    getHostEnvironment: mockGetHostEnvironment,
    hostEnvironment: mockHostEnvironment,
    DefaultLogger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    },
    LogWrapper: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        getLogLevel: jest.fn().mockReturnValue('info')
    })),
    setYeomanEnvConflicterForce: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/odata-service-writer', () => ({
    writeExternalServiceMetadata: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/mockserver-config-writer', () => ({
    generateMockserverConfig: jest.fn()
}));

const mockGetSystemSelectionQuestions = jest.fn();
const mockOdataVersion = { v4: 'ODATAv4' };
jest.unstable_mockModule('@sap-ux/odata-service-inquirer', () => ({
    getSystemSelectionQuestions: mockGetSystemSelectionQuestions,
    OdataVersion: mockOdataVersion
}));

const mockCreateApplicationAccess = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    createApplicationAccess: mockCreateApplicationAccess,
    DirName: {
        Webapp: 'webapp',
        LocalService: 'localService',
        Mockdata: 'mockdata'
    },
    FileName: {
        SpecificationDistTags: 'specification-dist-tags.json',
        Manifest: 'manifest.json',
        Package: 'package.json',
        Ui5Yaml: 'ui5.yaml',
        Ui5MockYaml: 'ui5-mock.yaml',
        Ui5LocalYaml: 'ui5-local.yaml'
    },
    FioriToolsSettings: {},
    MinCdsPluginUi5Version: '0.0.0',
    MinCdsVersion: '0.0.0',
    fioriToolsDirectory: '.fioritools',
    getFilePaths: jest.fn(),
    normalizePath: jest.fn(),
    addPackageDevDependency: jest.fn(),
    clearCdsModuleCache: jest.fn(),
    createProjectAccess: jest.fn(),
    deleteCapApp: jest.fn(),
    filterDataSourcesByType: jest.fn(),
    findAllApps: jest.fn(),
    findCapProjectRoot: jest.fn(),
    findCapProjects: jest.fn(),
    findFioriArtifacts: jest.fn(),
    findProjectRoot: jest.fn(),
    findRootsForPath: jest.fn(),
    getAllUi5YamlFileNames: jest.fn(),
    getAppRootFromWebappPath: jest.fn(),
    getAppProgrammingLanguage: jest.fn(),
    getAppType: jest.fn(),
    getCapCustomPaths: jest.fn(),
    getCapEnvironment: jest.fn(),
    getCapModelAndServices: jest.fn(),
    getCapServiceName: jest.fn(),
    getCapProjectType: jest.fn(),
    getCdsFiles: jest.fn(),
    getCdsRoots: jest.fn(),
    getCdsServices: jest.fn(),
    getCapI18nFolderNames: jest.fn(),
    getSpecification: jest.fn(),
    getSpecificationModuleFromCache: jest.fn(),
    getSpecificationPath: jest.fn(),
    getI18nPropertiesPaths: jest.fn(),
    getI18nBundles: jest.fn(),
    getMinUI5VersionFromManifest: jest.fn(),
    getMinUI5VersionAsArray: jest.fn(),
    getMinimumUI5Version: jest.fn(),
    getMtaPath: jest.fn(),
    getMockServerConfig: jest.fn(),
    getMockDataPath: jest.fn(),
    getNodeModulesPath: jest.fn(),
    getPathMappings: jest.fn(),
    getProject: jest.fn(),
    getProjectType: jest.fn(),
    getWebappPath: jest.fn(),
    hasUI5CliV3: jest.fn(),
    isCapProject: jest.fn(),
    isCapJavaProject: jest.fn(),
    isCapNodeJsProject: jest.fn(),
    loadModuleFromProject: jest.fn(),
    readCapServiceMetadataEdmx: jest.fn(),
    readUi5Yaml: jest.fn(),
    refreshSpecificationDistTags: jest.fn(),
    toReferenceUri: jest.fn(),
    updatePackageScript: jest.fn(),
    getWorkspaceInfo: jest.fn(),
    hasMinCdsVersion: jest.fn(),
    checkCdsUi5PluginEnabled: jest.fn(),
    readFlexChanges: jest.fn(),
    processServices: jest.fn(),
    getMainService: jest.fn(),
    getGlobalCdsHomePath: jest.fn(),
    execNpmCommand: jest.fn(),
    findRecursiveHierarchyKey: jest.fn(),
    getTableCapabilitiesByEntitySet: jest.fn(),
    hasDependency: jest.fn()
}));

// Mock yeoman-generator for ODataDownloadGenerator
jest.unstable_mockModule('yeoman-generator', () => {
    const MockGenerator = class {
        options: any = {};
        env: any = { conflicter: { force: false } };
        fs = { write: jest.fn() };
        prompt = jest.fn();
        writeDestinationJSON = jest.fn();
        writeDestination = jest.fn();
        destinationRoot = jest.fn();
        log = jest.fn();
        rootGeneratorVersion() {
            return '1.0.0';
        }
        rootGeneratorName() {
            return 'test-generator';
        }
        constructor(args: unknown, opts: Record<string, unknown>, _features?: unknown) {
            this.options = opts ?? {};
        }
    };
    return { default: MockGenerator };
});

jest.unstable_mockModule('../../src/utils/i18n', () => ({
    initI18nODataDownloadGenerator: jest.fn().mockResolvedValue(undefined),
    t: jest.fn((key: string) => key)
}));

jest.unstable_mockModule('../../src/telemetry', () => ({
    TelemetryHelper: {
        initTelemetrySettings: jest.fn().mockResolvedValue(undefined),
        sendTelemetry: jest.fn().mockResolvedValue(undefined)
    }
}));

const mockGetSpecification = jest.fn();
const mockGetServiceDetails = jest.fn();
const mockCreateEntityChoices = jest.fn();
const mockGetData = jest.fn();
jest.unstable_mockModule('../../src/data-download/prompts/prompt-helpers', () => ({
    getSpecification: mockGetSpecification,
    getServiceDetails: mockGetServiceDetails,
    createEntityChoices: mockCreateEntityChoices,
    getData: mockGetData
}));

const mockGetEntityModel = jest.fn();
jest.unstable_mockModule('../../src/data-download/utils', () => ({
    getEntityModel: mockGetEntityModel,
    createEntitySetData: jest.fn(),
    getSystemNameFromStore: jest.fn()
}));

jest.unstable_mockModule('../../src/data-download/prompts/value-help-prompts', () => ({
    getValueHelpSelectionPrompt: jest.fn()
}));

const { getODataDownloaderPrompts, promptNames } = await import('../../src/data-download/prompts/prompts');
const { ODataDownloadGenerator } = await import('../../src/data-download/odata-download-generator');
type SelectedEntityAnswer = { fullPath: string; entity: { entityPath: string; entitySetName: string; defaultSelected?: boolean } };

// Helper to create mock entity choice
const createMockChoice = (
    name: string,
    entityPath: string,
    entitySetName: string,
    options: { checked?: boolean; defaultSelected?: boolean } = {}
) => ({
    name,
    value: {
        fullPath: entityPath,
        entity: { entityPath, entitySetName, defaultSelected: options.defaultSelected }
    } as SelectedEntityAnswer,
    checked: options.checked ?? false
});

// Helper to create standard list entity
const createListEntity = (semanticKeys: Array<{ name: string; type: string; value: string | undefined }> = []) => ({
    entitySetName: 'TestSet',
    semanticKeys,
    entityPath: 'TestSet',
    entityType: undefined
});

describe('Test prompts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset PromptState caches for test isolation
        PromptState.externalServiceRequestCache = {};
        PromptState.entityTypeRefFacetCache = {};
    });

    describe('getODataDownloaderPrompts', () => {
        it('should return questions and answers structure', async () => {
            // Mock dependencies
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();

            expect(result).toHaveProperty('questions');
            expect(result).toHaveProperty('answers');
            expect(result.answers).toHaveProperty('application');
            expect(result.answers).toHaveProperty('odataQueryResult');
            expect(result.answers).toHaveProperty('odataServiceAnswers');
            expect(Array.isArray(result.questions)).toBe(true);
        });

        it('should include all required prompts', async () => {
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [
                    { name: 'datasourceType', type: 'list' },
                    { name: 'serviceSelection', type: 'list' }
                ],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();

            expect(result.questions.length).toBeGreaterThan(0);
            // Should include app selection, system selection, key prompts, reset, entity selection, and confirm download
            const allPromptNames = result.questions.map((q: any) => q.name);
            expect(allPromptNames).toContain(promptNames.appSelection);
            expect(allPromptNames).toContain('datasourceType');
            expect(allPromptNames).toContain('serviceSelection');
            expect(allPromptNames).toContain(promptNames.toggleSelection);
            expect(allPromptNames).toContain(promptNames.relatedEntitySelection);
            expect(allPromptNames).toContain(promptNames.skipDataDownload);
            // Verify key prompts exist
            const keyPrompts = result.questions.filter((q: any) => q.name?.startsWith('entityKeyIdx:'));
            expect(keyPrompts.length).toBe(5);
        });

        it('should pass correct options to getSystemSelectionQuestions', async () => {
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: {}
            });

            await getODataDownloaderPrompts();

            expect(mockGetSystemSelectionQuestions).toHaveBeenCalledWith(
                expect.objectContaining({
                    datasourceType: {
                        includeNone: false
                    },
                    systemSelection: expect.objectContaining({
                        includeCloudFoundryAbapEnvChoice: false,
                        hideNewSystem: true
                    }),
                    serviceSelection: expect.objectContaining({
                        requiredOdataVersion: mockOdataVersion.v4
                    })
                }),
                true,
                expect.anything()
            );
        });

        it('should generate 5 key prompts', async () => {
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();

            // Count key prompts
            const keyPrompts = result.questions.filter((q: any) => q.name?.startsWith('entityKeyIdx:'));
            expect(keyPrompts.length).toBe(5);
        });
    });

    describe('App Selection Prompt', () => {
        let appSelectionPrompt: InputQuestion;

        beforeEach(async () => {
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            appSelectionPrompt = result.questions.find(
                (q: any) => q.name === promptNames.appSelection
            ) as InputQuestion;
        });

        it('should have correct configuration', () => {
            expect(appSelectionPrompt).toBeDefined();
            expect(appSelectionPrompt.type).toBe('input');
            expect((appSelectionPrompt as any).guiType).toBe('folder-browser');
            expect(appSelectionPrompt.name).toBe(promptNames.appSelection);
        });

        it('should use appPath option as default value when passed to getODataDownloaderPrompts', async () => {
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const testAppPath = '/test/custom/app/path';
            const result = await getODataDownloaderPrompts({ appPath: testAppPath });
            const appPrompt = result.questions.find((q: any) => q.name === promptNames.appSelection) as InputQuestion;

            // The default function should return the appPath when called
            const defaultValue = (appPrompt.default as Function)({});
            expect(defaultValue).toBe(testAppPath);
        });

        it('should fallback to answers.appSelection when appPath option is not provided', async () => {
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            const appPrompt = result.questions.find((q: any) => q.name === promptNames.appSelection) as InputQuestion;

            // When appPath is not provided, should fallback to answers.appSelection
            const existingSelection = '/existing/selection/path';
            const defaultValue = (appPrompt.default as Function)({ appSelection: existingSelection });
            expect(defaultValue).toBe(existingSelection);
        });

        it('should validate app path successfully', async () => {
            const mockAppAccess = {
                app: {
                    appRoot: '/test/app',
                    services: { mainService: { uri: '/service', odataVersion: '4.01' } },
                    mainService: 'mainService'
                }
            };
            const mockSpec = { getApiVersion: () => ({ version: '24' }) };

            mockCreateApplicationAccess.mockResolvedValue(mockAppAccess);
            mockGetSpecification.mockResolvedValue(mockSpec);
            mockGetServiceDetails.mockResolvedValue({
                servicePath: '/service/path',
                systemName: 'TestSystem'
            });

            const result = await appSelectionPrompt.validate!('/test/app');

            expect(result).toBe(true);
            expect(mockCreateApplicationAccess).toHaveBeenCalledWith('/test/app');
        });

        it('should return error message for OData v2 service', async () => {
            const mockAppAccess = {
                app: {
                    appRoot: '/test/app',
                    services: { mainService: { uri: '/service', odataVersion: '2.0' } } as ServiceSpecification,
                    mainService: 'mainService'
                }
            };

            mockCreateApplicationAccess.mockResolvedValue(mockAppAccess);

            const result = await appSelectionPrompt.validate!('/test/app');

            expect(result).toBe(
                'prompts.appSelection.validation.appMainServiceOdataVersionNotSupported'
            );
        });

        it('should configure appConfig correctly after successful validation', async () => {
            const mockAppAccess = {
                app: {
                    appRoot: '/test/app',
                    services: { mainService: { uri: '/service', odataVersion: '4.0' } },
                    mainService: 'mainService'
                }
            };
            const mockSpec = {
                getApiVersion: () => ({ version: '24' }),
                serviceInfo: { name: 'TestService' }
            };

            mockCreateApplicationAccess.mockResolvedValue(mockAppAccess);
            mockGetSpecification.mockResolvedValue(mockSpec);
            mockGetServiceDetails.mockResolvedValue({
                servicePath: '/sap/opu/odata4/service/path',
                systemName: 'BACKEND_SYSTEM'
            });

            // Get the prompts to access the appConfig
            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            const prompt = result.questions.find((q: any) => q.name === promptNames.appSelection) as InputQuestion;

            // Validate the app path
            const validationResult = await prompt.validate!('/test/app');

            expect(validationResult).toBe(true);

            // Verify appConfig.appAccess is set correctly
            expect(appConfig.appAccess).toBeDefined();
            expect(appConfig.appAccess?.app.appRoot).toBe('/test/app');
            expect(appConfig.appAccess?.app.services.mainService.uri).toBe('/service');
            expect(appConfig.appAccess?.app.mainService).toBe('mainService');

            // Verify appConfig.specification is set correctly
            expect(appConfig.specification).toBeDefined();
            expect(appConfig.specification?.getApiVersion()).toEqual({ version: '24' });
            expect((appConfig.specification as any)?.serviceInfo?.name).toBe('TestService');

            // Verify appConfig.servicePath is set correctly
            expect(appConfig.servicePath).toBe('/sap/opu/odata4/service/path');

            // Verify appConfig.systemName is set correctly
            expect(appConfig.systemName).toBeDefined();
            expect(appConfig.systemName?.value).toBe('BACKEND_SYSTEM');

            // Verify helper functions were called with correct parameters
            expect(mockCreateApplicationAccess).toHaveBeenCalledWith('/test/app');
            expect(mockGetSpecification).toHaveBeenCalledWith(mockAppAccess);
            expect(mockGetServiceDetails).toHaveBeenCalledWith(
                '/test/app',
                mockAppAccess.app.services.mainService
            );
        });

        it('should return false for empty app path', async () => {
            const result = await appSelectionPrompt.validate!('');

            expect(result).toBe(false);
        });

        it('should return error message when specification check fails', async () => {
            const mockAppAccess = {
                app: {
                    appRoot: '/test/app',
                    services: { mainService: { odataVersion: '4.0' } }
                }
            };

            mockCreateApplicationAccess.mockResolvedValue(mockAppAccess);
            mockGetSpecification.mockResolvedValue('Error: Invalid specification');

            const result = await appSelectionPrompt.validate!('/test/app');

            expect(result).toBe('Error: Invalid specification');
        });

        it('should return error message and log error when createApplicationAccess throws an Error', async () => {
            const mockError = new Error('Unable to read manifest.json');
            mockCreateApplicationAccess.mockRejectedValue(mockError);

            const mockLogger = { error: jest.fn() };
            jest.spyOn(ODataDownloadGenerator, 'logger', 'get').mockReturnValue(mockLogger as any);

            const result = await appSelectionPrompt.validate!('/invalid/app/path');

            expect(result).toBe(
                'prompts.appSelection.validation.selectedPathDoesNotContainValidApptexts.seeLogForDetails'
            );
            expect(mockLogger.error).toHaveBeenCalledWith(
                'prompts.appSelection.validation.selectedPathDoesNotContainValidApp'
            );
        });

        it('should return error message and log error when createApplicationAccess throws a non-Error value', async () => {
            const mockError = 'String error message';
            mockCreateApplicationAccess.mockRejectedValue(mockError);

            const mockLogger = { error: jest.fn() };
            jest.spyOn(ODataDownloadGenerator, 'logger', 'get').mockReturnValue(mockLogger as any);

            const result = await appSelectionPrompt.validate!('/invalid/app/path');

            expect(result).toBe(
                'prompts.appSelection.validation.selectedPathDoesNotContainValidApptexts.seeLogForDetails'
            );
            expect(mockLogger.error).toHaveBeenCalledWith(
                'prompts.appSelection.validation.selectedPathDoesNotContainValidApp'
            );
        });

        it('should reset appConfig when a different app is selected', async () => {
            // First, set up initial app
            const mockAppAccess1 = {
                app: {
                    appRoot: '/test/app1',
                    services: { mainService: { uri: '/service1', odataVersion: '4.0' } },
                    mainService: 'mainService'
                }
            };
            const mockSpec1 = { getApiVersion: () => ({ version: '24' }) };

            mockCreateApplicationAccess.mockResolvedValue(mockAppAccess1);
            mockGetSpecification.mockResolvedValue(mockSpec1);
            mockGetServiceDetails.mockResolvedValue({
                servicePath: '/service1/path',
                systemName: 'System1'
            });

            // Get prompts and access the underlying appConfig through answers
            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            const firstAppPrompt = result.questions.find(
                (q: any) => q.name === promptNames.appSelection
            ) as InputQuestion;

            // Validate first app
            await firstAppPrompt.validate!('/test/app1');

            // Store the initial appConfig values
            const initialAppAccess = appConfig.appAccess;
            const initialServicePath = appConfig.servicePath;
            const initialSystemName = appConfig.systemName?.value;

            expect(initialAppAccess).toBeDefined();
            expect(initialServicePath).toBe('/service1/path');
            expect(initialSystemName).toBe('System1');

            // Now select a different app
            const mockAppAccess2 = {
                app: {
                    appRoot: '/test/app2',
                    services: { mainService: { uri: '/service2', odataVersion: '4.0' } },
                    mainService: 'mainService'
                }
            };
            const mockSpec2 = { getApiVersion: () => ({ version: '24' }) };

            mockCreateApplicationAccess.mockResolvedValue(mockAppAccess2);
            mockGetSpecification.mockResolvedValue(mockSpec2);
            mockGetServiceDetails.mockResolvedValue({
                servicePath: '/service2/path',
                systemName: 'System2'
            });

            await firstAppPrompt.validate!('/test/app2');

            // Verify that appConfig was reset and updated with new values
            expect(appConfig.appAccess).toBeDefined();
            expect(appConfig.appAccess?.app.appRoot).toBe('/test/app2');
            expect(appConfig.servicePath).toBe('/service2/path');
            expect(appConfig.systemName?.value).toBe('System2');

            // Verify the old values were replaced (not the same references)
            expect(appConfig.appAccess).not.toBe(initialAppAccess);
        });

        it('should return true when validating the same app path without resetting', async () => {
            const mockAppAccess = {
                app: {
                    appRoot: '/test/app',
                    services: { mainService: { uri: '/service', odataVersion: '4.0' } },
                    mainService: 'mainService'
                }
            };
            const mockSpec = { getApiVersion: () => ({ version: '24' }) };

            mockCreateApplicationAccess.mockResolvedValue(mockAppAccess);
            mockGetSpecification.mockResolvedValue(mockSpec);
            mockGetServiceDetails.mockResolvedValue({
                servicePath: '/service/path',
                systemName: 'TestSystem'
            });

            // Get prompts and set up appConfig
            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            const firstAppPrompt = result.questions.find(
                (q: any) => q.name === promptNames.appSelection
            ) as InputQuestion;

            // First validation
            await firstAppPrompt.validate!('/test/app');
            appConfig.referencedEntities = {
                listEntity: {
                    entitySetName: 'TestSet',
                    semanticKeys: [],
                    entityPath: 'TestSet',
                    entityType: undefined
                }
            };

            // Validate same path again
            const secondResult = await firstAppPrompt.validate!('/test/app');

            // Should return true without resetting appConfig
            expect(secondResult).toBe(true);
            expect(appConfig.referencedEntities).toBeDefined();
            expect(appConfig.referencedEntities?.listEntity.entitySetName).toBe('TestSet');

            // createApplicationAccess should only be called once (from first validation)
            expect(mockCreateApplicationAccess).toHaveBeenCalledTimes(1);
        });

        it('should reset PromptState caches when app selection changes', async () => {
            const mockAppAccess1 = {
                app: {
                    appRoot: '/test/app1',
                    services: { mainService: { uri: '/service1', odataVersion: '4.0' } },
                    mainService: 'mainService'
                }
            };
            const mockSpec1 = { getApiVersion: () => ({ version: '24' }) };

            mockCreateApplicationAccess.mockResolvedValue(mockAppAccess1);
            mockGetSpecification.mockResolvedValue(mockSpec1);
            mockGetServiceDetails.mockResolvedValue({
                servicePath: '/service1/path',
                systemName: 'System1'
            });

            // Get prompts
            const result = await getODataDownloaderPrompts();
            const firstAppPrompt = result.questions.find(
                (q: any) => q.name === promptNames.appSelection
            ) as InputQuestion;

            // Populate the PromptState caches to simulate usage
            PromptState.externalServiceRequestCache['/service/test'] = ['Entity1', 'Entity2'];
            PromptState.entityTypeRefFacetCache['TravelType'] = ['_Booking'];

            // Spy on resetServiceCaches to verify it's called
            const resetCachesSpy = jest.spyOn(PromptState, 'resetServiceCaches');

            // Validate first app - this triggers resetAppConfig which should reset caches
            await firstAppPrompt.validate!('/test/app1');

            // Verify caches were reset
            expect(resetCachesSpy).toHaveBeenCalled();
            expect(PromptState.externalServiceRequestCache).toEqual({});
            expect(PromptState.entityTypeRefFacetCache).toEqual({});

            resetCachesSpy.mockRestore();
        });

        it('should reset PromptState caches when switching between different apps', async () => {
            // First app setup
            const mockAppAccess1 = {
                app: {
                    appRoot: '/test/app1',
                    services: { mainService: { uri: '/service1', odataVersion: '4.0' } },
                    mainService: 'mainService'
                }
            };

            mockCreateApplicationAccess.mockResolvedValue(mockAppAccess1);
            mockGetSpecification.mockResolvedValue({
                getApiVersion: () => ({ version: '24' })
            });
            mockGetServiceDetails.mockResolvedValue({
                servicePath: '/service1/path',
                systemName: 'System1'
            });

            const result = await getODataDownloaderPrompts();
            const appPrompt = result.questions.find((q: any) => q.name === promptNames.appSelection) as InputQuestion;

            // Validate first app
            await appPrompt.validate!('/test/app1');

            // Simulate cache population during first app's usage
            PromptState.externalServiceRequestCache['/service1/path'] = ['Travel', 'Booking'];
            PromptState.entityTypeRefFacetCache['TravelType'] = ['_Booking', '_Agency'];

            // Verify caches are populated
            expect(Object.keys(PromptState.externalServiceRequestCache).length).toBeGreaterThan(0);
            expect(Object.keys(PromptState.entityTypeRefFacetCache).length).toBeGreaterThan(0);

            // Switch to second app
            const mockAppAccess2 = {
                app: {
                    appRoot: '/test/app2',
                    services: { mainService: { uri: '/service2', odataVersion: '4.0' } },
                    mainService: 'mainService'
                }
            };

            mockCreateApplicationAccess.mockResolvedValue(mockAppAccess2);
            mockGetServiceDetails.mockResolvedValue({
                servicePath: '/service2/path',
                systemName: 'System2'
            });

            // Validate second app - should reset caches
            await appPrompt.validate!('/test/app2');

            // Verify caches were reset when switching apps
            expect(PromptState.externalServiceRequestCache).toEqual({});
            expect(PromptState.entityTypeRefFacetCache).toEqual({});
        });

        it('should not reset PromptState caches when validating the same app path', async () => {
            const mockAppAccess = {
                app: {
                    appRoot: '/test/app',
                    services: { mainService: { uri: '/service', odataVersion: '4.0' } },
                    mainService: 'mainService'
                }
            };

            mockCreateApplicationAccess.mockResolvedValue(mockAppAccess);
            mockGetSpecification.mockResolvedValue({
                getApiVersion: () => ({ version: '24' })
            });
            mockGetServiceDetails.mockResolvedValue({
                servicePath: '/service/path',
                systemName: 'TestSystem'
            });

            const result = await getODataDownloaderPrompts();
            const appPrompt = result.questions.find((q: any) => q.name === promptNames.appSelection) as InputQuestion;

            // First validation
            await appPrompt.validate!('/test/app');

            // Populate caches after first validation
            PromptState.externalServiceRequestCache['/service/path'] = ['Entity1'];
            PromptState.entityTypeRefFacetCache['Type1'] = ['path1'];

            const resetCachesSpy = jest.spyOn(PromptState, 'resetServiceCaches');

            // Validate same path again
            await appPrompt.validate!('/test/app');

            // resetServiceCaches should NOT be called when path is the same
            expect(resetCachesSpy).not.toHaveBeenCalled();

            // Caches should remain populated
            expect(PromptState.externalServiceRequestCache['/service/path']).toEqual(['Entity1']);
            expect(PromptState.entityTypeRefFacetCache['Type1']).toEqual(['path1']);

            resetCachesSpy.mockRestore();
        });
    });

    describe('Entity Selection Prompt', () => {
        let entitySelectionPrompt: CheckBoxQuestion;

        beforeEach(async () => {
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            entitySelectionPrompt = result.questions.find(
                (q: any) => q.name === promptNames.relatedEntitySelection
            ) as CheckBoxQuestion;
        });

        it('should have correct configuration', () => {
            expect(entitySelectionPrompt).toBeDefined();
            expect(entitySelectionPrompt.type).toBe('checkbox');
            expect(entitySelectionPrompt.name).toBe(promptNames.relatedEntitySelection);
            expect(entitySelectionPrompt.guiOptions?.applyDefaultWhenDirty).toBe(true);
        });

        it('should not show when no choices available', async () => {
            const whenFn = entitySelectionPrompt.when;
            if (typeof whenFn === 'function') {
                const shouldShow = await whenFn({});
                expect(shouldShow).toBe(false);
            } else {
                expect(whenFn).toBe(false);
            }
        });

        it('should validate and update checked state', async () => {
            const mockChoices = [createMockChoice('Entity1', 'to_Entity1', 'Entity1Set')];
            (entitySelectionPrompt.choices as any) = mockChoices;

            const selectedEntities = [mockChoices[0].value];
            const result = await entitySelectionPrompt.validate!(selectedEntities);

            expect(result).toBe(true);
        });

        it('should return error when no key input provided', async () => {
            const mockChoices = [createMockChoice('Entity1', 'to_Entity1', 'Entity1Set')];
            const result = await getODataDownloaderPrompts();
            result.answers.application.relatedEntityChoices.choices = mockChoices;

            const freshEntityPrompt = result.questions.find(
                (q: any) => q.name === promptNames.relatedEntitySelection
            ) as CheckBoxQuestion;

            const selectedEntities = [mockChoices[0].value];
            const validateResult = await freshEntityPrompt.validate!(selectedEntities, {
                [promptNames.relatedEntitySelection]: selectedEntities
            });

            expect(typeof validateResult).toBe('string');
            expect(validateResult).toContain('key');
        });

        it('should call getData when key input is provided and update odataQueryResult', async () => {
            jest.useFakeTimers();
            const mockChoices = [createMockChoice('Entity1', 'to_Entity1', 'Entity1Set')];
            const mockQueryResult = { odataQueryResult: [{ id: 1 }, { id: 2 }] };
            mockGetData.mockResolvedValue(mockQueryResult);

            const result = await getODataDownloaderPrompts();
            result.answers.application.relatedEntityChoices.choices = mockChoices;

            const freshEntityPrompt = result.questions.find(
                (q: any) => q.name === promptNames.relatedEntitySelection
            ) as CheckBoxQuestion;

            const selectedEntities = [mockChoices[0].value];
            const validatePromise = freshEntityPrompt.validate!(selectedEntities, {
                [promptNames.relatedEntitySelection]: selectedEntities,
                'entityKeyIdx:0': 'testKey'
            });

            jest.advanceTimersByTime(1000);
            const validateResult = await validatePromise;

            expect(validateResult).toBe(true);
            expect(mockGetData).toHaveBeenCalled();
            expect(result.answers.odataQueryResult.odata).toEqual(mockQueryResult.odataQueryResult);

            jest.useRealTimers();
        });

        it('should return error string when getData returns error', async () => {
            jest.useFakeTimers();
            const mockChoices = [createMockChoice('Entity1', 'to_Entity1', 'Entity1Set')];
            const errorMessage = 'Connection failed';
            mockGetData.mockResolvedValue(errorMessage);

            const result = await getODataDownloaderPrompts();
            result.answers.application.relatedEntityChoices.choices = mockChoices;

            const freshEntityPrompt = result.questions.find(
                (q: any) => q.name === promptNames.relatedEntitySelection
            ) as CheckBoxQuestion;

            const selectedEntities = [mockChoices[0].value];
            const validatePromise = freshEntityPrompt.validate!(selectedEntities, {
                [promptNames.relatedEntitySelection]: selectedEntities,
                'entityKeyIdx:0': 'testKey'
            });

            jest.advanceTimersByTime(1000);
            expect(await validatePromise).toBe(errorMessage);
            jest.useRealTimers();
        });

        describe('additionalMessages', () => {
            it('should return undefined when no result available', async () => {
                const result = await getODataDownloaderPrompts();
                const freshEntityPrompt = result.questions.find(
                    (q: any) => q.name === promptNames.relatedEntitySelection
                ) as CheckBoxQuestion;

                const additionalMessagesFn = (freshEntityPrompt as any).additionalMessages;
                expect(additionalMessagesFn).toBeDefined();
                expect(additionalMessagesFn()).toBeUndefined();
            });

            it('should return success message with row count after successful validation', async () => {
                jest.useFakeTimers();
                const mockChoices = [createMockChoice('Entity1', 'to_Entity1', 'Entity1Set')];
                const mockQueryResult = { odataQueryResult: [{ id: 1 }, { id: 2 }, { id: 3 }] };
                mockGetData.mockResolvedValue(mockQueryResult);

                const result = await getODataDownloaderPrompts();
                result.answers.application.relatedEntityChoices.choices = mockChoices;

                const freshEntityPrompt = result.questions.find(
                    (q: any) => q.name === promptNames.relatedEntitySelection
                ) as CheckBoxQuestion;

                const selectedEntities = [mockChoices[0].value];
                const validatePromise = freshEntityPrompt.validate!(selectedEntities, {
                    [promptNames.relatedEntitySelection]: selectedEntities,
                    'entityKeyIdx:0': 'testKey'
                });
                jest.advanceTimersByTime(1000);
                await validatePromise;

                const message = (freshEntityPrompt as any).additionalMessages();
                expect(message).toBeDefined();
                expect(message.message).toEqual(
                    'prompts.skipDataDownload.querySuccess'
                );
                expect(message.severity).toBeDefined();

                jest.useRealTimers();
            });
        });
    });

    describe('Reset Selection Prompt', () => {
        let resetPrompt: ConfirmQuestion;

        beforeEach(async () => {
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            resetPrompt = result.questions.find((q: any) => q.name === promptNames.toggleSelection) as ConfirmQuestion;
        });

        it('should have correct configuration', () => {
            expect(resetPrompt).toBeDefined();
            expect(resetPrompt.type).toBe('confirm');
            expect(resetPrompt.name).toBe(promptNames.toggleSelection);
            expect(resetPrompt.default).toBe(false);
        });

        it('should always return true from validate', () => {
            const result = resetPrompt.validate!(true);
            expect(result).toBe(true);

            const result2 = resetPrompt.validate!(false);
            expect(result2).toBe(true);
        });

        // Helper to setup reset prompt test with mock choices
        const setupResetPromptTest = async (mockChoices: ReturnType<typeof createMockChoice>[]) => {
            mockCreateEntityChoices.mockReturnValue({
                choices: mockChoices,
                entitySetsFlat: {}
            });
            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            appConfig.servicePath = '/test/service';
            appConfig.referencedEntities = { listEntity: createListEntity() };

            const freshResetPrompt = result.questions.find(
                (q: any) => q.name === promptNames.toggleSelection
            ) as ConfirmQuestion;

            // Trigger the when function to load choices
            const whenFn = freshResetPrompt.when;
            if (typeof whenFn === 'function') {
                await whenFn({});
            }
            return { freshResetPrompt, mockChoices };
        };

        it('should clear all selections when reset is true (first call)', async () => {
            const mockChoices = [
                createMockChoice('Entity1', 'to_Entity1', 'Entity1Set', { checked: true, defaultSelected: true }),
                createMockChoice('Entity2', 'to_Entity2', 'Entity2Set', { checked: true, defaultSelected: false })
            ];
            const { freshResetPrompt } = await setupResetPromptTest(mockChoices);

            expect(freshResetPrompt.validate!(true)).toBe(true);
            expect(mockChoices[0].checked).toBe(false);
            expect(mockChoices[1].checked).toBe(false);
        });

        it('should restore default selection when reset is false (first call)', async () => {
            const mockChoices = [
                createMockChoice('Entity1', 'to_Entity1', 'Entity1Set', { checked: false, defaultSelected: true }),
                createMockChoice('Entity2', 'to_Entity2', 'Entity2Set', { checked: true, defaultSelected: false }),
                createMockChoice('Entity3', 'to_Entity3', 'Entity3Set', { checked: false, defaultSelected: true })
            ];
            const { freshResetPrompt } = await setupResetPromptTest(mockChoices);

            expect(freshResetPrompt.validate!(false)).toBe(true);
            expect(mockChoices[0].checked).toBe(true);
            expect(mockChoices[1].checked).toBe(false);
            expect(mockChoices[2].checked).toBe(true);
        });

        it('should not modify choices when reset value is unchanged (same as previous)', async () => {
            const mockChoices = [
                createMockChoice('Entity1', 'to_Entity1', 'Entity1Set', { checked: true, defaultSelected: true })
            ];
            const { freshResetPrompt } = await setupResetPromptTest(mockChoices);

            freshResetPrompt.validate!(true);
            expect(mockChoices[0].checked).toBe(false);

            mockChoices[0].checked = true;
            expect(freshResetPrompt.validate!(true)).toBe(true);
            expect(mockChoices[0].checked).toBe(true); // unchanged because reset === previousReset
        });

        it('should toggle between clear and restore on alternating calls', async () => {
            const mockChoices = [
                createMockChoice('Entity1', 'to_Entity1', 'Entity1Set', { checked: false, defaultSelected: true }),
                createMockChoice('Entity2', 'to_Entity2', 'Entity2Set', { checked: true, defaultSelected: false })
            ];
            const { freshResetPrompt } = await setupResetPromptTest(mockChoices);

            freshResetPrompt.validate!(true);
            expect(mockChoices[0].checked).toBe(false);
            expect(mockChoices[1].checked).toBe(false);

            freshResetPrompt.validate!(false);
            expect(mockChoices[0].checked).toBe(true);
            expect(mockChoices[1].checked).toBe(false);

            freshResetPrompt.validate!(true);
            expect(mockChoices[0].checked).toBe(false);
            expect(mockChoices[1].checked).toBe(false);
        });

        it('should handle choices with undefined defaultSelected', async () => {
            const mockChoices = [createMockChoice('Entity1', 'to_Entity1', 'Entity1Set', { checked: true })];
            const { freshResetPrompt } = await setupResetPromptTest(mockChoices);

            freshResetPrompt.validate!(false);
            expect(mockChoices[0].checked).toBe(undefined);
        });

        it('should handle empty choices array', async () => {
            const { freshResetPrompt } = await setupResetPromptTest([]);
            expect(freshResetPrompt.validate!(true)).toBe(true);
        });

        describe('when function', () => {
            // Helper to setup when function test
            const setupWhenTest = async (mockChoices: ReturnType<typeof createMockChoice>[] | null = null) => {
                if (mockChoices) {
                    mockCreateEntityChoices.mockReturnValue({
                        choices: mockChoices,
                        entitySetsFlat: {}
                    });
                }
                const result = await getODataDownloaderPrompts();
                const appConfig = result.answers.application;
                if (mockChoices) {
                    appConfig.servicePath = '/test/service';
                    appConfig.referencedEntities = { listEntity: createListEntity() };
                }
                const freshResetPrompt = result.questions.find(
                    (q: any) => q.name === promptNames.toggleSelection
                ) as ConfirmQuestion;
                return { freshResetPrompt, appConfig, whenFn: freshResetPrompt.when as Function };
            };

            it('should return false when no choices available', async () => {
                const { whenFn } = await setupWhenTest();
                expect(await whenFn({})).toBe(false);
            });

            it('should load entity choices when service path changes', async () => {
                const mockChoices = [createMockChoice('Entity1', 'to_Entity1', 'Entity1Set')];
                const { whenFn, appConfig } = await setupWhenTest(mockChoices);

                await whenFn({});
                expect(mockCreateEntityChoices).toHaveBeenCalledWith(
                    appConfig.referencedEntities?.listEntity,
                    appConfig.referencedEntities?.pageObjectEntities
                );
            });

            it('should not reload choices when service path is unchanged', async () => {
                const mockChoices = [createMockChoice('Entity1', 'to_Entity1', 'Entity1Set')];
                const { whenFn } = await setupWhenTest(mockChoices);

                await whenFn({});
                expect(mockCreateEntityChoices).toHaveBeenCalledTimes(1);

                await whenFn({});
                expect(mockCreateEntityChoices).toHaveBeenCalledTimes(1);
            });

            it('should reload choices when service path changes', async () => {
                const mockChoices1 = [createMockChoice('Entity1', 'to_Entity1', 'Entity1Set')];
                const mockChoices2 = [createMockChoice('Entity2', 'to_Entity2', 'Entity2Set')];
                mockCreateEntityChoices
                    .mockReturnValueOnce({ choices: mockChoices1, entitySetsFlat: {} })
                    .mockReturnValueOnce({ choices: mockChoices2, entitySetsFlat: {} });

                const result = await getODataDownloaderPrompts();
                const appConfig = result.answers.application;
                appConfig.servicePath = '/test/service1';
                appConfig.referencedEntities = { listEntity: createListEntity() };

                const freshResetPrompt = result.questions.find(
                    (q: any) => q.name === promptNames.toggleSelection
                ) as ConfirmQuestion;
                const whenFn = freshResetPrompt.when as Function;

                await whenFn({});
                expect(mockCreateEntityChoices).toHaveBeenCalledTimes(1);

                appConfig.servicePath = '/test/service2';
                await whenFn({});
                expect(mockCreateEntityChoices).toHaveBeenCalledTimes(2);
            });

            it('should reload choices when system name changes but not when only service path is unchanged', async () => {
                const mockChoices1 = [createMockChoice('Entity1', 'to_Entity1', 'Entity1Set')];
                const mockChoices2 = [createMockChoice('Entity2', 'to_Entity2', 'Entity2Set')];
                const mockChoices3 = [createMockChoice('Entity3', 'to_Entity3', 'Entity3Set')];
                mockCreateEntityChoices
                    .mockReturnValueOnce({ choices: mockChoices1, entitySetsFlat: {} })
                    .mockReturnValueOnce({ choices: mockChoices2, entitySetsFlat: {} })
                    .mockReturnValueOnce({ choices: mockChoices3, entitySetsFlat: {} });

                const result = await getODataDownloaderPrompts();
                const appConfig = result.answers.application;
                appConfig.servicePath = '/test/service';
                appConfig.referencedEntities = { listEntity: createListEntity() };
                appConfig.systemName = { value: 'System1' };

                const freshResetPrompt = result.questions.find(
                    (q: any) => q.name === promptNames.toggleSelection
                ) as ConfirmQuestion;
                const whenFn = freshResetPrompt.when as Function;

                // First call - should create choices
                await whenFn({});
                expect(mockCreateEntityChoices).toHaveBeenCalledTimes(1);

                // Same system name and service path - should NOT recreate choices
                await whenFn({});
                expect(mockCreateEntityChoices).toHaveBeenCalledTimes(1);

                // System name changes (service path unchanged) - SHOULD recreate choices
                appConfig.systemName.value = 'System2';
                await whenFn({});
                expect(mockCreateEntityChoices).toHaveBeenCalledTimes(2);

                // Same system name again - should NOT recreate choices
                await whenFn({});
                expect(mockCreateEntityChoices).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe('Key Prompts', () => {
        let keyPrompts: InputQuestion[];

        beforeEach(async () => {
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            keyPrompts = result.questions.filter((q: any) => q.name?.startsWith('entityKeyIdx:')) as InputQuestion[];
        });

        it('should generate 5 key prompts', () => {
            expect(keyPrompts.length).toBe(5);
        });

        it('should have correct naming pattern', () => {
            keyPrompts.forEach((prompt, index) => {
                expect(prompt.name).toBe(`entityKeyIdx:${index}`);
                expect(prompt.type).toBe('input');
            });
        });

        describe('when function', () => {
            it('should show when semantic key exists', async () => {
                const result = await getODataDownloaderPrompts();
                const appConfig = result.answers.application;
                appConfig.referencedEntities = {
                    listEntity: {
                        entitySetName: 'TestSet',
                        semanticKeys: [{ name: 'TravelID', type: 'Edm.String', value: undefined }],
                        entityPath: 'TestSet',
                        entityType: undefined
                    }
                };

                const freshKeyPrompts = result.questions.filter((q: any) =>
                    q.name?.startsWith('entityKeyIdx:')
                ) as InputQuestion[];
                const keyPrompt = freshKeyPrompts[0];

                const whenFn = keyPrompt.when;
                if (typeof whenFn === 'function') {
                    const shouldShow = await whenFn({});
                    expect(shouldShow).toBe(true);
                }
            });

            it('should not show when semantic key does not exist for index', async () => {
                const result = await getODataDownloaderPrompts();
                const appConfig = result.answers.application;
                appConfig.referencedEntities = {
                    listEntity: {
                        entitySetName: 'TestSet',
                        semanticKeys: [{ name: 'TravelID', type: 'Edm.String', value: undefined }],
                        entityPath: 'TestSet',
                        entityType: undefined
                    }
                };

                const freshKeyPrompts = result.questions.filter((q: any) =>
                    q.name?.startsWith('entityKeyIdx:')
                ) as InputQuestion[];
                // Second key prompt - no semantic key at index 1
                const keyPrompt = freshKeyPrompts[1];

                const whenFn = keyPrompt.when;
                if (typeof whenFn === 'function') {
                    const shouldShow = await whenFn({});
                    expect(shouldShow).toBe(false);
                }
            });
        });

        describe('validateKeysAndFetchData behavior', () => {
            // Note: These tests use fake timers because validateKeysAndFetchData calls debouncedGetData,
            // which has a 1000ms debounce delay via setTimeout before calling getData

            it('should call getData when keys exist but no entity choices exist', async () => {
                jest.useFakeTimers();
                const mockQueryResult = { odataQueryResult: [{ id: 1 }] };
                mockGetData.mockResolvedValue(mockQueryResult);

                const result = await getODataDownloaderPrompts();
                const appConfig = result.answers.application;
                appConfig.referencedEntities = {
                    listEntity: {
                        entitySetName: 'TestSet',
                        semanticKeys: [{ name: 'TravelID', type: 'Edm.String', value: undefined }],
                        entityPath: 'TestSet',
                        entityType: undefined
                    }
                };
                // Ensure no entity choices
                appConfig.relatedEntityChoices.choices = [];

                const freshKeyPrompts = result.questions.filter((q: any) =>
                    q.name?.startsWith('entityKeyIdx:')
                ) as InputQuestion[];
                const keyPrompt = freshKeyPrompts[0];

                const validatePromise = keyPrompt.validate!('123', {
                    'entityKeyIdx:0': '123',
                    [promptNames.skipDataDownload]: []
                });

                jest.advanceTimersByTime(1000);
                const validateResult = await validatePromise;

                expect(validateResult).toBe(true);
                expect(mockGetData).toHaveBeenCalled();
                expect(result.answers.odataQueryResult.odata).toEqual(mockQueryResult.odataQueryResult);

                jest.useRealTimers();
            });

            it('should not call getData when skipDownload is set', async () => {
                jest.useFakeTimers();
                mockGetData.mockClear();

                const result = await getODataDownloaderPrompts();
                const appConfig = result.answers.application;
                appConfig.referencedEntities = {
                    listEntity: {
                        entitySetName: 'TestSet',
                        semanticKeys: [{ name: 'TravelID', type: 'Edm.String', value: undefined }],
                        entityPath: 'TestSet',
                        entityType: undefined
                    }
                };
                // Ensure no entity choices
                appConfig.relatedEntityChoices.choices = [];

                const freshKeyPrompts = result.questions.filter((q: any) =>
                    q.name?.startsWith('entityKeyIdx:')
                ) as InputQuestion[];
                const keyPrompt = freshKeyPrompts[0];

                const validatePromise = keyPrompt.validate!('123', {
                    'entityKeyIdx:0': '123',
                    [promptNames.skipDataDownload]: ['skipDownload']
                });

                jest.advanceTimersByTime(1000);
                const validateResult = await validatePromise;

                expect(validateResult).toBe(true);
                expect(mockGetData).not.toHaveBeenCalled();

                jest.useRealTimers();
            });

            it('should not call getData from key prompt when entity choices exist', async () => {
                jest.useFakeTimers();
                mockGetData.mockClear();

                const result = await getODataDownloaderPrompts();
                const appConfig = result.answers.application;
                appConfig.referencedEntities = {
                    listEntity: {
                        entitySetName: 'TestSet',
                        semanticKeys: [{ name: 'TravelID', type: 'Edm.String', value: undefined }],
                        entityPath: 'TestSet',
                        entityType: undefined
                    }
                };
                // Set entity choices - getData should not be called from key prompt
                appConfig.relatedEntityChoices.choices = [createMockChoice('Entity1', 'to_Entity1', 'Entity1Set')];

                const freshKeyPrompts = result.questions.filter((q: any) =>
                    q.name?.startsWith('entityKeyIdx:')
                ) as InputQuestion[];
                const keyPrompt = freshKeyPrompts[0];

                const validatePromise = keyPrompt.validate!('123', {
                    'entityKeyIdx:0': '123',
                    [promptNames.skipDataDownload]: []
                });

                jest.advanceTimersByTime(1000);
                const validateResult = await validatePromise;

                expect(validateResult).toBe(true);
                // getData should NOT be called from key prompt when entity choices exist
                // (it will be called from entity selection prompt instead)
                expect(mockGetData).not.toHaveBeenCalled();

                jest.useRealTimers();
            });
        });

        it('should validate key value with invalid characters', async () => {
            const keyPrompt = keyPrompts[0];
            // The validation checks if the entire value is in the invalidEntityKeyFilterChars array
            // which contains ['.'], so we need to pass '.' as the value
            const result = await keyPrompt.validate!('.');

            expect(typeof result).toBe('string');
        });

        it('should validate key value successfully', async () => {
            const keyPrompt = keyPrompts[0];
            const result = await keyPrompt.validate!('validValue');

            expect(result).toBe(true);
        });

        it('should validate range values', async () => {
            const keyPrompt = keyPrompts[0];
            const result = await keyPrompt.validate!('1-10');

            expect(result).toBe(true);
        });

        it('should reject invalid range specification', async () => {
            const keyPrompt = keyPrompts[0];
            const result = await keyPrompt.validate!('1-10-20');

            expect(result).toBe('prompts.entityKey.validation.invalidRangeSpecified');
        });

        it('should not validate UUIDs as ranges', async () => {
            // UUIDs contain multiple dashes but should not be rejected as invalid ranges
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;

            appConfig.referencedEntities = {
                listEntity: {
                    entitySetName: 'TestSet',
                    semanticKeys: [{ name: 'TravelUUID', type: 'Edm.UUID', value: undefined }],
                    entityPath: 'TestSet',
                    entityType: undefined
                }
            };

            const newKeyPrompts = result.questions.filter((q: any) =>
                q.name?.startsWith('entityKeyIdx:')
            ) as InputQuestion[];
            const keyPrompt = newKeyPrompts[0];

            // UUID with multiple dashes should pass validation
            const validateResult = await keyPrompt.validate!('550e8400-e29b-41d4-a716-446655440000');

            expect(validateResult).toBe(true);
        });

        it('should validate boolean values', async () => {
            // Create a mock app config with a boolean key
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;

            // Mock referenced entities with a boolean key
            appConfig.referencedEntities = {
                listEntity: {
                    entitySetName: 'TestSet',
                    semanticKeys: [{ name: 'IsActive', type: 'Edm.Boolean', value: undefined }],
                    entityPath: 'TestSet',
                    entityType: undefined
                }
            };

            // Get the key prompts with the updated appConfig context
            const newKeyPrompts = result.questions.filter((q: any) =>
                q.name?.startsWith('entityKeyIdx:')
            ) as InputQuestion[];
            const keyPrompt = newKeyPrompts[0];
            const validateResult = await keyPrompt.validate!('true');

            expect(validateResult).toBe(true);
            expect(appConfig.referencedEntities?.listEntity.semanticKeys[0].value).toBe(true);
        });

        it('should reject invalid boolean values', async () => {
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;

            appConfig.referencedEntities = {
                listEntity: {
                    entitySetName: 'TestSet',
                    semanticKeys: [{ name: 'IsActive', type: 'Edm.Boolean', value: undefined }],
                    entityPath: 'TestSet',
                    entityType: undefined
                }
            };

            // Get the key prompts with the updated appConfig context
            const newKeyPrompts = result.questions.filter((q: any) =>
                q.name?.startsWith('entityKeyIdx:')
            ) as InputQuestion[];
            const keyPrompt = newKeyPrompts[0];
            const validateResult = await keyPrompt.validate!('notABoolean');

            expect(typeof validateResult).toBe('string');
        });
    });

    describe('Skip Data Download Prompt', () => {
        let skipDownloadPrompt: CheckBoxQuestion;

        beforeEach(async () => {
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: { metadata: '<metadata></metadata>' }
            });

            const result = await getODataDownloaderPrompts();
            skipDownloadPrompt = result.questions.find(
                (q: any) => q.name === promptNames.skipDataDownload
            ) as CheckBoxQuestion;
        });

        it('should have correct configuration', () => {
            expect(skipDownloadPrompt).toBeDefined();
            expect(skipDownloadPrompt.type).toBe('checkbox');
            expect(skipDownloadPrompt.name).toBe(promptNames.skipDataDownload);
            expect(skipDownloadPrompt.default).toBe(false);
        });

        it('should show when metadata is available and service path has a value', async () => {
            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            appConfig.servicePath = '/test/service';

            const prompt = result.questions.find(
                (q: any) => q.name === promptNames.skipDataDownload
            ) as CheckBoxQuestion;

            const whenFn = prompt.when;
            if (typeof whenFn === 'function') {
                const shouldShow = whenFn({});
                expect(shouldShow).toBeTruthy();
            }
        });

        it('should not show when metadata is not available', async () => {
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            const prompt = result.questions.find(
                (q: any) => q.name === promptNames.skipDataDownload
            ) as CheckBoxQuestion;

            const whenFn = prompt.when;
            if (typeof whenFn === 'function') {
                const shouldShow = whenFn({});
                expect(shouldShow).toBe(false);
            }
        });

        it('should have skip download choice', () => {
            const choices = skipDownloadPrompt.choices;
            expect(Array.isArray(choices)).toBe(true);
            expect((choices as any)[0].value).toBe('skipDownload');
            expect((choices as any)[0].checked).toBe(false);
        });
    });

    describe('Update Main Service Metadata Prompt', () => {
        let updateMetadataPrompt: ConfirmQuestion;

        beforeEach(async () => {
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);
            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: {}
            });

            const result = await getODataDownloaderPrompts();
            updateMetadataPrompt = result.questions.find(
                (q: any) => q.name === promptNames.updateMainServiceMetadata
            ) as ConfirmQuestion;
        });

        it('should have correct configuration', () => {
            expect(updateMetadataPrompt).toBeDefined();
            expect(updateMetadataPrompt.type).toBe('confirm');
            expect(updateMetadataPrompt.name).toBe(promptNames.updateMainServiceMetadata);
            expect(updateMetadataPrompt.default).toBe(false);
        });

        it('should show when app access, specification, and metadata are available', async () => {
            const mockAppAccess = {
                app: { appRoot: '/test/app' }
            };
            const mockSpec = { getApiVersion: () => ({ version: '24' }) };
            const mockMetadata = '<metadata></metadata>';
            const mockReferencedEntities = {
                listEntity: {
                    entitySetName: 'TestSet',
                    semanticKeys: [],
                    entityPath: 'TestSet',
                    entityType: undefined
                }
            };

            mockGetSystemSelectionQuestions.mockResolvedValue({
                prompts: [],
                answers: { metadata: mockMetadata }
            });
            mockGetEntityModel.mockResolvedValue(mockReferencedEntities);

            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            appConfig.appAccess = mockAppAccess as any;
            appConfig.specification = mockSpec as any;

            const updatePrompt = result.questions.find(
                (q: any) => q.name === promptNames.updateMainServiceMetadata
            ) as ConfirmQuestion;

            const whenFn = updatePrompt.when;
            if (typeof whenFn === 'function') {
                const shouldShow = await whenFn({});
                expect(shouldShow).toBe(true);
            }
        });

        it('should not show when metadata is missing', async () => {
            const result = await getODataDownloaderPrompts();
            const appConfig = result.answers.application;
            appConfig.appAccess = { app: { appRoot: '/test' } } as any;
            appConfig.specification = {} as any;

            const whenFn = updateMetadataPrompt.when;
            if (typeof whenFn === 'function') {
                const shouldShow = await whenFn({});
                expect(shouldShow).toBe(false);
            }
        });
    });

    describe('promptNames', () => {
        it('should export correct prompt names', () => {
            expect(promptNames.appSelection).toBe('appSelection');
            expect(promptNames.toggleSelection).toBe('toggleSelection');
            expect(promptNames.relatedEntitySelection).toBe('relatedEntitySelection');
            expect(promptNames.skipDataDownload).toBe('skipDataDownload');
            expect(promptNames.updateMainServiceMetadata).toBe('updateMainServiceMetadata');
        });
    });
});
