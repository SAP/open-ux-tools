import { jest } from '@jest/globals';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import { MessageType, Prompts as YeomanUiSteps } from '@sap-devx/yeoman-ui-types';
import type { ServiceProvider } from '@sap-ux/axios-extension';
import { type CapService, DatasourceType, type EntityRelatedAnswers } from '@sap-ux/odata-service-inquirer';
import type { UI5ApplicationAnswers } from '@sap-ux/ui5-application-inquirer';
import yeomanTest from 'yeoman-test';
import type { Project, Service } from '../../../src/types';

// Pre-import actuals
const actualPrompting = await import('../../../src/fiori-app-generator/prompting');
const actualSubgenHelpers = await import('../../../src/fiori-app-generator/subgenHelpers');
const actualUtils = await import('../../../src/utils');
const actualFioriGenShared = await import('@sap-ux/fiori-generator-shared');
const actualUi5Info = await import('@sap-ux/ui5-info');
const actualOdataServiceInquirer = await import('@sap-ux/odata-service-inquirer');
const actualTelemetry = await import('@sap-ux/telemetry');

// Odata service prompting answers
let odataServiceAnswers: Partial<Service> = {
    source: DatasourceType.none
};
const ui5ApplicationAnswers: Partial<UI5ApplicationAnswers> = {
    name: 'testAppName',
    namespace: 'testNamespace',
    description: 'testDescription',
    title: 'testTitle',
    targetFolder: '/test/target/folder',
    ui5Version: '1.2.3'
};

const mockPromptOdataServiceAnswers = jest.fn().mockImplementation(() => Promise.resolve(odataServiceAnswers));
const mockPromptUI5ApplicationAnswers = jest.fn().mockImplementation(() =>
    Promise.resolve({
        ui5AppAnswers: ui5ApplicationAnswers,
        localUI5Version: '3.2.1'
    })
);
const mockAddDeployGen = jest.fn();
const mockAddFlpGen = jest.fn();
const mockGetCdsUi5PluginInfo = jest.fn().mockResolvedValue({
    hasCdsUi5Plugin: true,
    hasMinCdsVersion: true,
    isCdsUi5PluginEnabled: true,
    isWorkspaceEnabled: true
});
const mockUpdateDependentStep = jest.fn();
const mockGetFromCache = jest.fn().mockImplementation(actualUtils.getFromCache);
const mockAddToCache = jest.fn().mockImplementation(actualUtils.addToCache);
const mockGetHostEnvironment = jest.fn();
const mockGetUI5Versions = jest.fn().mockResolvedValue(() => Promise.resolve([]));
const mockEntityRelatedQuestions = [
    {
        message: 'Select a main entity',
        name: 'mainEntity',
        type: 'list'
    }
];
const mockGetEntityRelatedPrompts = jest.fn().mockImplementation(() => mockEntityRelatedQuestions);
const mockInitTelemetrySettings = jest.fn().mockResolvedValue(() => Promise.resolve());

jest.unstable_mockModule('../../../src/fiori-app-generator/prompting', () => ({
    ...actualPrompting,
    promptOdataServiceAnswers: mockPromptOdataServiceAnswers,
    promptUI5ApplicationAnswers: mockPromptUI5ApplicationAnswers
}));

jest.unstable_mockModule('../../../src/fiori-app-generator/subgenHelpers', () => ({
    ...actualSubgenHelpers,
    addDeployGen: mockAddDeployGen,
    addFlpGen: mockAddFlpGen
}));

jest.unstable_mockModule('../../../src/utils', () => ({
    ...actualUtils,
    getCdsUi5PluginInfo: mockGetCdsUi5PluginInfo,
    updateDependentStep: mockUpdateDependentStep,
    getFromCache: mockGetFromCache,
    addToCache: mockAddToCache
}));

jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    ...actualFioriGenShared,
    TelemetryHelper: {
        createTelemetryData: jest.fn()
    },
    DefaultLogger: {
        debug: jest.fn(),
        error: jest.fn()
    },
    sendTelemetry: jest.fn(),
    getHostEnvironment: mockGetHostEnvironment
}));

jest.unstable_mockModule('@sap-ux/ui5-info', () => ({
    ...actualUi5Info,
    getUI5Versions: mockGetUI5Versions
}));

jest.unstable_mockModule('@sap-ux/odata-service-inquirer', () => ({
    ...actualOdataServiceInquirer,
    getEntityRelatedPrompts: mockGetEntityRelatedPrompts
}));

jest.unstable_mockModule('@sap-ux/telemetry', () => ({
    ...actualTelemetry,
    initTelemetrySettings: mockInitTelemetrySettings
}));

// Import after all mocks are set up
const { FioriAppGenerator } = await import('../../../src/fiori-app-generator');
const type_FioriAppGeneratorOptions = {} as import('../../../src/fiori-app-generator').FioriAppGeneratorOptions;
type FioriAppGeneratorOptions = typeof type_FioriAppGeneratorOptions;
const { DefaultLogger, TelemetryHelper, hostEnvironment } = await import('@sap-ux/fiori-generator-shared');
const { getUI5Versions } = await import('@sap-ux/ui5-info');
const { getEntityRelatedPrompts } = await import('@sap-ux/odata-service-inquirer');
const { initTelemetrySettings } = await import('@sap-ux/telemetry');
const { FIORI_STEPS, FloorplanFE, FloorplanFF, STEP_DATASOURCE_AND_SERVICE, STEP_FLP_CONFIG, STEP_PROJECT_ATTRIBUTES } =
    await import('../../../src/types');
const { getYeomanUiStepConfig, t } = await import('../../../src/utils');
type AppWizardCache = import('../../../src/utils').AppWizardCache;

/**
 * Tests the FioriAppGenerator generator lifecycle methods call what they should with the correct parameters.
 */
describe('Test FioriAppGenerator', () => {
    const allYUIStepsConfig = getYeomanUiStepConfig([...FIORI_STEPS]);
    // Basic test options for the FioriAppGenerator
    let options: FioriAppGeneratorOptions = {};

    beforeEach(() => {
        // Reset the options object
        options = {
            appWizard: {
                showError: jest.fn()
            } as unknown as AppWizard,
            env: (yeomanTest as any).createEnv([]), // Latest @types/yeoman-test are not up to date with yeoman-test@6.3.0
            telemetryData: { data1: 'value1' },
            floorplan: FloorplanFE.FE_OVP,
            yeomanUiStepConfig: allYUIStepsConfig
        };
        odataServiceAnswers.source = DatasourceType.none;
        jest.restoreAllMocks();
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
    });

    test('Should initialize as expected', async () => {
        const fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();

        // Caching should be initialized
        expect((options.appWizard as AppWizardCache)!['$fiori-cache']).toBeDefined();
        expect(DefaultLogger.debug).toHaveBeenCalledWith('AppWizard based cache initialized.');

        // Telemetry settings should be initialized
        expect(initTelemetrySettings).toHaveBeenCalledWith({
            consumerModule: {
                name: '@sap/generator-fiori',
                version: expect.stringMatching(/\d{1,2}\.\d{1,2}\.\d{1,2}/)
            },
            internalFeature: false,
            watchTelemetrySettingStore: false
        });
        expect(TelemetryHelper.createTelemetryData).toHaveBeenCalledWith({ data1: 'value1' });

        // UI5 versions should be fetched to load the versions cache
        expect(getUI5Versions).toHaveBeenCalledWith({
            useCache: true
        });

        // FioriAppGenerator should have the expected properties
        expect(fioriAppGen['state'].floorplan).toEqual(FloorplanFE.FE_OVP);
        expect(fioriAppGen['fioriSteps']).toEqual(FIORI_STEPS);
        expect(fioriAppGen['yeomanUiStepConfig']).toEqual(allYUIStepsConfig);
        expect(fioriAppGen['prompts']).toEqual(allYUIStepsConfig.activeSteps);
    });

    test('Should prompt for odata service and view name', async () => {
        // Freestyle floorplan should prompt for View name
        const promptForViewNameSpy = jest
            .spyOn(FioriAppGenerator.prototype, 'prompt')
            .mockResolvedValueOnce({ viewName: 'TestView' });
        options.floorplan = FloorplanFF.FF_SIMPLE;
        // Skipping the project attributes step for this test
        options.fioriSteps = FIORI_STEPS.filter((step) => step.key !== STEP_PROJECT_ATTRIBUTES);

        const fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        // Should load from cache (to support back navigation state restoration)
        expect(mockGetFromCache).toHaveBeenCalledWith(
            {
                '$fiori-cache': {},
                showError: expect.any(Function)
            },
            'service',
            expect.objectContaining({ debug: expect.any(Function) }) // Logger
        );

        // Should prompt for OData service answers and update state with the answers
        expect(mockPromptOdataServiceAnswers).toHaveBeenCalledWith(
            {
                allowNoDatasource: true,
                capService: undefined,
                promptOptions: undefined,
                requiredOdataVersion: undefined,
                showCollabDraftWarning: undefined,
                workspaceFolders: undefined
            },
            expect.objectContaining({ debug: expect.any(Function) }), // Logger
            expect.anything(), // Adapter
            undefined // cached connected system
        );

        // Should assign the odata service answers to the state
        expect(fioriAppGen['state'].service).toEqual(odataServiceAnswers);

        // Should prompt for view name and udpate state with the answer
        expect(promptForViewNameSpy).toHaveBeenCalledWith([
            {
                default: 'View1',
                guiOptions: { breadcrumb: true },
                message: 'View Name',
                name: 'viewName',
                type: 'input',
                validate: expect.any(Function)
            }
        ]);
        expect(fioriAppGen['state'].viewName).toEqual('TestView');
    });

    test('Should pass specific options to `promptOdataServiceAnswers`', async () => {
        const mockCapService: CapService = {
            serviceName: 'aCapService',
            projectPath: '/cap/project/path',
            cdsVersionInfo: {
                home: '/home',
                version: '1.2.3',
                root: '/root'
            }
        };
        jest.spyOn(FioriAppGenerator.prototype, 'prompt').mockResolvedValueOnce({ viewName: 'TestView' });
        odataServiceAnswers.source = DatasourceType.capProject;

        options.floorplan = FloorplanFF.FF_SIMPLE;
        // Skipping the project attributes step for this test
        options.fioriSteps = FIORI_STEPS.filter((step) => step.key !== STEP_PROJECT_ATTRIBUTES);
        options.state = {
            service: {
                capService: mockCapService,
                source: DatasourceType.capProject
            },
            project: {} as Project,
            floorplan: FloorplanFF.FF_SIMPLE
        };
        options.showCollabDraftWarning = true;
        options.workspaceFolders = ['folder1', 'folder2'];
        options.promptSettings = {
            '@sap/generator-fiori': {
                systemSelection: {
                    defaultChoice: 'system1'
                }
            }
        };

        const fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        // Should prompt for OData service answers with the expected options
        expect(mockPromptOdataServiceAnswers).toHaveBeenCalledWith(
            {
                allowNoDatasource: true,
                capService: mockCapService,
                promptOptions: {
                    systemSelection: {
                        defaultChoice: 'system1'
                    }
                },
                requiredOdataVersion: undefined,
                showCollabDraftWarning: true,
                workspaceFolders: ['folder1', 'folder2']
            },
            expect.objectContaining({ debug: expect.any(Function) }), // Logger
            expect.anything(), // Adapter
            undefined // cached connected system
        );
        console.log(`cds mock:` + mockGetCdsUi5PluginInfo.toString());
        // Since a CAP project was pre-selected cds ui5 plugin info should be loaded
        expect(mockGetCdsUi5PluginInfo).toHaveBeenCalledWith(
            mockCapService.projectPath,
            expect.anything(),
            mockCapService.cdsVersionInfo
        );
        expect(fioriAppGen['state'].service).toEqual({
            capService: {
                cdsUi5PluginInfo: {
                    hasCdsUi5Plugin: true,
                    hasMinCdsVersion: true,
                    isCdsUi5PluginEnabled: true,
                    isWorkspaceEnabled: true
                },
                cdsVersionInfo: {
                    home: '/home',
                    root: '/root',
                    version: '1.2.3'
                },
                projectPath: '/cap/project/path',
                serviceName: 'aCapService'
            },
            source: 'capProject'
        });
    });

    test('Should prompt for entity related answers', async () => {
        // Force cache usage, YUI only
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);
        // Must be a datasource that provides an service to be cached (DatasourceType.none is not cached)
        odataServiceAnswers.source = DatasourceType.odataServiceUrl;
        // Set cache to simulate back navigation state (edmx and cap service) restoration entity prompting
        const mockCachedService: Service = {
            edmx: '<edmx></edmx>',
            capService: {
                projectPath: '/cap/project/path',
                serviceName: 'aCapService'
            },
            annotations: [
                {
                    TechnicalName: 'testAnnotationsTechName',
                    Definitions: 'testAnnotations',
                    Version: '1.0.0',
                    Uri: 'testUri'
                }
            ],
            source: DatasourceType.capProject
        };
        (options.appWizard as AppWizardCache)!['$fiori-cache'] = {
            service: mockCachedService
        };
        options.floorplan = FloorplanFE.FE_LROP;
        options.preselectedEntityName = 'TestPreSelectedEntity';
        options.showLayoutPrompts = false;
        options.fioriSteps = FIORI_STEPS.filter((step) => step.key !== STEP_PROJECT_ATTRIBUTES);

        const mockEntityRelatedAnswers: EntityRelatedAnswers = {
            mainEntity: {
                entitySetName: 'SEPMRA_C_PD_Product',
                entitySetType: 'SEPMRA_C_PD_ProductType'
            },
            navigationEntity: {
                entitySetName: 'to_ProductTextSetName',
                navigationPropertyName: 'to_ProductTextNavPropName'
            },
            presentationQualifier: '',
            tableType: 'ResponsiveTable',
            tableSelectionMode: 'None'
        };
        const promptForEntitiesSpy = jest
            .spyOn(FioriAppGenerator.prototype, 'prompt')
            .mockResolvedValueOnce(mockEntityRelatedAnswers);

        const fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        expect(getEntityRelatedPrompts).toHaveBeenCalledWith(
            mockCachedService.edmx,
            'lrop',
            true,
            { defaultMainEntityName: 'TestPreSelectedEntity', hideTableLayoutPrompts: true, useAutoComplete: false },
            mockCachedService.annotations?.[0],
            expect.objectContaining({ debug: expect.any(Function) }),
            true
        );
        expect(promptForEntitiesSpy).toHaveBeenCalledWith(mockEntityRelatedQuestions);
        expect(fioriAppGen['state'].entityRelatedConfig).toEqual({
            mainEntity: {
                entitySetName: 'SEPMRA_C_PD_Product',
                entitySetType: 'SEPMRA_C_PD_ProductType'
            },
            navigationEntity: {
                entitySetName: 'to_ProductTextSetName',
                navigationPropertyName: 'to_ProductTextNavPropName'
            },
            presentationQualifier: '',
            tableSelectionMode: 'None',
            tableType: 'ResponsiveTable'
        });
    });

    test('Should prompt for entity related answers custom page ', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);
        odataServiceAnswers.source = DatasourceType.odataServiceUrl;
        const mockCachedService: Service = {
            edmx: '<edmx></edmx>',
            capService: {
                projectPath: '/cap/project/path',
                serviceName: 'aCapService'
            },
            annotations: [
                {
                    TechnicalName: 'testAnnotationsTechName',
                    Definitions: 'testAnnotations',
                    Version: '1.0.0',
                    Uri: 'testUri'
                }
            ],
            source: DatasourceType.capProject
        };
        (options.appWizard as AppWizardCache)!['$fiori-cache'] = {
            service: mockCachedService
        };
        options.floorplan = FloorplanFE.FE_FPM;
        options.preselectedEntityName = 'TestPreSelectedEntity';
        options.showLayoutPrompts = false;
        options.fioriSteps = FIORI_STEPS.filter((step) => step.key !== STEP_PROJECT_ATTRIBUTES);

        const mockEntityRelatedAnswers: EntityRelatedAnswers = {
            mainEntity: {
                entitySetName: 'SEPMRA_C_PD_Product',
                entitySetType: 'SEPMRA_C_PD_ProductType'
            },
            navigationEntity: {
                entitySetName: 'to_ProductTextSetName',
                navigationPropertyName: 'to_ProductTextNavPropName'
            },
            presentationQualifier: '',
            tableType: 'ResponsiveTable',
            tableSelectionMode: 'None'
        };
        const promptForEntitiesSpy = jest
            .spyOn(FioriAppGenerator.prototype, 'prompt')
            .mockResolvedValueOnce(mockEntityRelatedAnswers);

        const fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        expect(getEntityRelatedPrompts).toHaveBeenCalledWith(
            mockCachedService.edmx,
            'fpm',
            true,
            {
                defaultMainEntityName: 'TestPreSelectedEntity',
                hideTableLayoutPrompts: true,
                useAutoComplete: false,
                displayPageBuildingBlockPrompt: true
            },
            mockCachedService.annotations?.[0],
            expect.objectContaining({ debug: expect.any(Function) }),
            true
        );
        expect(promptForEntitiesSpy).toHaveBeenCalledWith(mockEntityRelatedQuestions);
        expect(fioriAppGen['state'].entityRelatedConfig).toEqual({
            mainEntity: {
                entitySetName: 'SEPMRA_C_PD_Product',
                entitySetType: 'SEPMRA_C_PD_ProductType'
            },
            navigationEntity: {
                entitySetName: 'to_ProductTextSetName',
                navigationPropertyName: 'to_ProductTextNavPropName'
            },
            presentationQualifier: '',
            tableSelectionMode: 'None',
            tableType: 'ResponsiveTable'
        });
    });

    test('Should prompt for project attributes', async () => {
        options.floorplan = FloorplanFF.FF_SIMPLE;
        options.fioriSteps = FIORI_STEPS.filter((step) => step.key !== STEP_DATASOURCE_AND_SERVICE);
        options.state = {
            project: {} as Project,
            service: {
                edmx: '<edmx></edmx>',
                source: DatasourceType.odataServiceUrl
            },
            floorplan: FloorplanFF.FF_SIMPLE
        };
        jest.spyOn(FioriAppGenerator.prototype, 'prompt').mockResolvedValueOnce({});

        const fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        expect(mockPromptUI5ApplicationAnswers).toHaveBeenCalledWith(
            {
                projectName: undefined,
                targetFolder: undefined,
                service: {
                    edmx: '<edmx></edmx>',
                    source: DatasourceType.odataServiceUrl
                },
                floorplan: FloorplanFF.FF_SIMPLE,
                promptSettings: undefined,
                promptExtension: undefined
            },
            expect.arrayContaining([
                {
                    activeSteps: expect.any(YeomanUiSteps),
                    dependentMap: expect.any(Object)
                }
            ]),
            expect.anything()
        );

        expect(fioriAppGen['state'].project).toEqual({
            name: ui5ApplicationAnswers.name,
            ui5Version: ui5ApplicationAnswers.ui5Version,
            targetFolder: ui5ApplicationAnswers.targetFolder,
            title: ui5ApplicationAnswers.title,
            namespace: ui5ApplicationAnswers.namespace,
            description: ui5ApplicationAnswers.description,
            localUI5Version: '3.2.1',
            flpAppId: 'testNamespacetestAppName-display'
        });
    });

    test('Should prompt for project attributes, with provided settings', async () => {
        options.floorplan = FloorplanFF.FF_SIMPLE;
        options.fioriSteps = FIORI_STEPS.filter((step) => step.key !== STEP_DATASOURCE_AND_SERVICE);
        options.state = {
            project: {} as Project,
            service: {
                edmx: '<edmx></edmx>',
                source: DatasourceType.sapSystem
            },
            floorplan: FloorplanFE.FE_WORKLIST
        };
        options.promptSettings = {
            '@sap/generator-fiori': {
                name: { hide: true },
                targetFolder: { hide: true },
                ui5Version: { hide: true }
            }
        };
        options.extensions = {
            addDeployConfig: { default: false }
        };
        jest.spyOn(FioriAppGenerator.prototype, 'prompt').mockResolvedValueOnce({});

        const fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        expect(mockPromptUI5ApplicationAnswers).toHaveBeenCalledWith(
            {
                name: undefined,
                targetFolder: undefined,
                service: {
                    edmx: '<edmx></edmx>',
                    source: DatasourceType.sapSystem
                },
                floorplan: FloorplanFF.FF_SIMPLE,
                promptSettings: options.promptSettings['@sap/generator-fiori'],
                promptExtension: options.extensions
            },
            expect.arrayContaining([
                {
                    activeSteps: expect.any(YeomanUiSteps),
                    dependentMap: expect.any(Object)
                }
            ]),
            expect.anything()
        );

        expect(fioriAppGen['state'].project).toEqual({
            name: ui5ApplicationAnswers.name,
            ui5Version: ui5ApplicationAnswers.ui5Version,
            targetFolder: ui5ApplicationAnswers.targetFolder,
            title: ui5ApplicationAnswers.title,
            namespace: ui5ApplicationAnswers.namespace,
            description: ui5ApplicationAnswers.description,
            enableNpmWorkspaces: undefined,
            localUI5Version: '3.2.1',
            flpAppId: 'testNamespacetestAppName-display'
        });
    });

    test('Should add sub-gens (deply-config, flp-config) based on provided answers', async () => {
        options.floorplan = FloorplanFF.FF_SIMPLE;
        options.fioriSteps = FIORI_STEPS.filter((step) => step.key !== STEP_DATASOURCE_AND_SERVICE);
        options.state = {
            project: {} as Project,
            service: {
                edmx: '<edmx></edmx>',
                source: DatasourceType.none
            },
            floorplan: FloorplanFF.FF_SIMPLE
        };
        options.promptSettings = {
            '@sap-ux/deploy-config-sub-generator': {
                'ui5AbapRepo': { hide: true, default: 'ZAPP' }
            },
            '@sap-ux/flp-config-sub-generator': {
                'semanticObject': { hide: true }
            }
        };
        ui5ApplicationAnswers.addDeployConfig = true;
        ui5ApplicationAnswers.addFlpConfig = true;

        jest.spyOn(FioriAppGenerator.prototype, 'prompt').mockResolvedValue({});

        let fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        expect(mockPromptUI5ApplicationAnswers).toHaveBeenCalled();

        expect(fioriAppGen['state'].project).toEqual({
            name: ui5ApplicationAnswers.name,
            ui5Version: ui5ApplicationAnswers.ui5Version,
            targetFolder: ui5ApplicationAnswers.targetFolder,
            title: ui5ApplicationAnswers.title,
            namespace: ui5ApplicationAnswers.namespace,
            description: ui5ApplicationAnswers.description,
            localUI5Version: '3.2.1',
            addDeployConfig: true,
            addFlpConfig: true,
            flpAppId: 'testNamespacetestAppName-display'
        });

        expect(mockAddDeployGen).toHaveBeenCalledWith(
            {
                service: {
                    edmx: '<edmx></edmx>',
                    source: DatasourceType.none
                },
                projectName: ui5ApplicationAnswers.name,
                targetFolder: ui5ApplicationAnswers.targetFolder,
                applicationType: 'FF'
            },
            expect.any(Function),
            expect.objectContaining({ debug: expect.any(Function) }),
            { '$fiori-cache': {}, showError: expect.any(Function) },
            { 'ui5AbapRepo': { hide: true, default: 'ZAPP' } }
        );

        expect(mockAddFlpGen).toHaveBeenCalledWith(
            {
                projectName: ui5ApplicationAnswers.name,
                targetFolder: ui5ApplicationAnswers.targetFolder,
                title: ui5ApplicationAnswers.title,
                skipPrompt: false
            },
            expect.any(Function),
            expect.objectContaining({ debug: expect.any(Function) }),
            undefined,
            { '$fiori-cache': {}, showError: expect.any(Function) },
            { 'semanticObject': { hide: true } }
        );

        options.fioriSteps = FIORI_STEPS.filter(
            (step) => ![STEP_DATASOURCE_AND_SERVICE, STEP_FLP_CONFIG].includes(step.key)
        );
        options.state = {
            project: {} as Project,
            service: {
                edmx: '<edmx></edmx>',
                source: DatasourceType.none
            },
            floorplan: FloorplanFF.FF_SIMPLE
        };
        options.promptSettings = undefined;
        ui5ApplicationAnswers.addFlpConfig = true;
        mockAddFlpGen.mockClear();
        mockUpdateDependentStep.mockClear();

        fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();
        expect(mockAddFlpGen).toHaveBeenCalledWith(
            {
                projectName: ui5ApplicationAnswers.name,
                targetFolder: ui5ApplicationAnswers.targetFolder,
                title: ui5ApplicationAnswers.title,
                skipPrompt: true
            },
            expect.any(Function),
            expect.objectContaining({ debug: expect.any(Function) }),
            undefined,
            { '$fiori-cache': {}, showError: expect.any(Function) },
            undefined
        );
        expect(mockUpdateDependentStep).toHaveBeenCalledTimes(1);
        expect(mockUpdateDependentStep).toHaveBeenCalledWith(
            'Project Attributes',
            [options.yeomanUiStepConfig],
            true,
            t('steps.deployConfig.title')
        );
    });

    test('Should report errors and exit', async () => {
        options.floorplan = undefined;
        const fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await expect(fioriAppGen.prompting()).rejects.toThrow(t('error.fatalError'));

        expect(DefaultLogger.error).toHaveBeenCalledWith(expect.stringContaining(t('error.fatalError')));

        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);
        await fioriAppGen.initializing();
        await expect(fioriAppGen.prompting()).rejects.toThrow(t('error.fatalError'));
        expect(DefaultLogger.error).toHaveBeenCalledWith(expect.stringContaining(t('error.fatalError')));
        expect(options.appWizard?.showError).toHaveBeenCalledWith(
            expect.stringContaining(t('error.fatalError')),
            MessageType.notification
        );
    });

    test('Should skip prompt steps as expected', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);
        options.fioriSteps = FIORI_STEPS;
        options.floorplan = FloorplanFF.FF_SIMPLE;
        jest.spyOn(FioriAppGenerator.prototype, 'prompt').mockResolvedValue({ viewName: 'TestView' });

        const fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        expect(mockPromptOdataServiceAnswers).toHaveBeenCalled();
        expect(mockPromptUI5ApplicationAnswers).toHaveBeenCalled();

        mockPromptOdataServiceAnswers.mockClear();
        mockPromptUI5ApplicationAnswers.mockClear();
        options.fioriSteps = FIORI_STEPS.filter((step) => step.key !== STEP_DATASOURCE_AND_SERVICE);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        expect(mockPromptOdataServiceAnswers).not.toHaveBeenCalled();
        expect(mockPromptUI5ApplicationAnswers).toHaveBeenCalled();

        mockPromptOdataServiceAnswers.mockClear();
        mockPromptUI5ApplicationAnswers.mockClear();
        options.fioriSteps = FIORI_STEPS.filter((step) => step.key !== STEP_PROJECT_ATTRIBUTES);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        expect(mockPromptOdataServiceAnswers).toHaveBeenCalled();
        expect(mockPromptUI5ApplicationAnswers).not.toHaveBeenCalled();
    });

    test('Tests back nav in YUI reloads from cache (includes cached connected system)', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);
        jest.spyOn(FioriAppGenerator.prototype, 'prompt').mockResolvedValue({
            mainEntity: 'SEPMRA_C_PD_Product'
        });
        options.floorplan = FloorplanFE.FE_WORKLIST;
        odataServiceAnswers = {
            source: DatasourceType.sapSystem,
            host: 'http:/s4hsystem:1234',
            servicePath: 'some/service/path',
            annotations: [
                {
                    TechnicalName: 'testAnnotationsTechName',
                    Definitions: 'testAnnotations',
                    Version: '1.0.0',
                    Uri: 'testUri'
                }
            ],
            edmx: '<edmx></edmx>',
            connectedSystem: {
                serviceProvider: {} as ServiceProvider,
                backendSystem: {
                    name: 'testSystemName',
                    url: 'http:/s4hsystem:1234',
                    authenticationType: 'reentranceTicket',
                    systemType: 'AbapCloud',
                    connectionType: 'abap_catalog'
                }
            }
        };

        let fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        expect(mockAddToCache).toHaveBeenCalledWith(
            options.appWizard,
            {
                service: {
                    annotations: [
                        {
                            Definitions: 'testAnnotations',
                            TechnicalName: 'testAnnotationsTechName',
                            Uri: 'testUri',
                            Version: '1.0.0'
                        }
                    ],
                    edmx: '<edmx></edmx>',
                    host: 'http:/s4hsystem:1234',
                    servicePath: 'some/service/path',
                    source: 'sapSystem',
                    connectedSystem: {
                        backendSystem: {
                            authenticationType: 'reentranceTicket',
                            name: 'testSystemName',
                            url: 'http:/s4hsystem:1234',
                            systemType: 'AbapCloud',
                            connectionType: 'abap_catalog'
                        },
                        serviceProvider: {} as ServiceProvider
                    }
                }
            },
            expect.objectContaining({ debug: expect.any(Function) })
        );

        fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        await fioriAppGen.prompting();
        expect(mockGetFromCache).toHaveBeenCalledWith(
            options.appWizard,
            'service',
            expect.objectContaining({ debug: expect.any(Function) })
        );
        expect(fioriAppGen['state'].service).toEqual(odataServiceAnswers);
    });
});
