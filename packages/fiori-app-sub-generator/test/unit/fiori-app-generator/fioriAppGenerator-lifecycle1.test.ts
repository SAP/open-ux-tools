import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import { MessageType, Prompts as YeomanUiSteps } from '@sap-devx/yeoman-ui-types';
import { DefaultLogger, getHostEnvironment, hostEnvironment, TelemetryHelper } from '@sap-ux/fiori-generator-shared';
import {
    type CapService,
    DatasourceType,
    type EntityRelatedAnswers,
    getEntityRelatedPrompts
} from '@sap-ux/odata-service-inquirer';
import { initTelemetrySettings } from '@sap-ux/telemetry';
import { type UI5ApplicationAnswers } from '@sap-ux/ui5-application-inquirer';
import { getUI5Versions } from '@sap-ux/ui5-info';
import yeomanTest from 'yeoman-test';
import { FioriAppGenerator, type FioriAppGeneratorOptions } from '../../../src/fiori-app-generator';
import { promptOdataServiceAnswers, promptUI5ApplicationAnswers } from '../../../src/fiori-app-generator/prompting';
import { addDeployGen, addFlpGen } from '../../../src/fiori-app-generator/subgenHelpers';
import type { Project } from '../../../src/types';
import {
    FIORI_STEPS,
    FloorplanFE,
    FloorplanFF,
    type Service,
    STEP_DATASOURCE_AND_SERVICE,
    STEP_FLP_CONFIG,
    STEP_PROJECT_ATTRIBUTES
} from '../../../src/types';
import * as commonUtils from '../../../src/utils';
import {
    type AppWizardCache,
    getCdsUi5PluginInfo,
    getYeomanUiStepConfig,
    t,
    updateDependentStep
} from '../../../src/utils';
import type { ServiceProvider } from '@sap-ux/axios-extension';

/**
 * Tests the FioriAppGenerator generator lifecycle methods call what they should with the correct parameters.
 */

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

jest.mock('../../../src/fiori-app-generator/prompting', () => {
    return {
        ...jest.requireActual('../../../src/fiori-app-generator/prompting'),
        promptOdataServiceAnswers: jest.fn().mockImplementation(() => Promise.resolve(odataServiceAnswers)),
        promptUI5ApplicationAnswers: jest.fn().mockImplementation(() =>
            Promise.resolve({
                ui5AppAnswers: ui5ApplicationAnswers,
                localUI5Version: '3.2.1'
            })
        )
    };
});

jest.mock('../../../src/fiori-app-generator/subgenHelpers', () => {
    return {
        ...jest.requireActual('../../../src/fiori-app-generator/subgenHelpers'),
        addDeployGen: jest.fn(),
        addFlpGen: jest.fn()
    };
});

jest.mock('../../../src/utils', () => ({
    __esModule: true,
    ...jest.requireActual('../../../src/utils'),
    getCdsUi5PluginInfo: jest.fn().mockResolvedValue({
        hasCdsUi5Plugin: true,
        hasMinCdsVersion: true,
        isCdsUi5PluginEnabled: true,
        isWorkspaceEnabled: true
    }),
    updateDependentStep: jest.fn()
}));

jest.mock('@sap-ux/fiori-generator-shared', () => {
    return {
        ...jest.requireActual('@sap-ux/fiori-generator-shared'),
        TelemetryHelper: {
            createTelemetryData: jest.fn()
        },
        DefaultLogger: {
            debug: jest.fn(),
            error: jest.fn()
        },
        sendTelemetry: jest.fn(),
        getHostEnvironment: jest.fn()
    };
});

jest.mock('@sap-ux/ui5-info', () => {
    return {
        ...jest.requireActual('@sap-ux/ui5-info'),
        getUI5Versions: jest.fn().mockResolvedValue(() => Promise.resolve([]))
    };
});

const mockEntityRelatedQuestions = [
    {
        message: 'Select a main entity',
        name: 'mainEntity',
        type: 'list'
    }
];
jest.mock('@sap-ux/odata-service-inquirer', () => {
    return {
        ...jest.requireActual('@sap-ux/odata-service-inquirer'),
        getEntityRelatedPrompts: jest.fn().mockImplementation(() => mockEntityRelatedQuestions)
    };
});

jest.mock('@sap-ux/telemetry', () => {
    return {
        ...jest.requireActual('@sap-ux/telemetry'),
        initTelemetrySettings: jest.fn().mockResolvedValue(() => Promise.resolve())
    };
});

/**
 * Test the FioriAppGenerator internal lifecycle code only, hence the extensive mocking.
 * There are multiple other integration tests that cover the full prompting and writing functionality.
 *
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
        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
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
        const getFromCacheSpy = jest.spyOn(commonUtils, 'getFromCache');
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
        expect(getFromCacheSpy).toHaveBeenCalledWith(
            {
                '$fiori-cache': {},
                showError: expect.any(Function)
            },
            'service',
            expect.objectContaining({ debug: expect.any(Function) }) // Logger
        );

        // Should prompt for OData service answers and update state with the answers
        expect(promptOdataServiceAnswers).toHaveBeenCalledWith(
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
        // Options may be set from FioriGenerator adaptors and/or extensions
        // N.B. These combinations of options do not represent real-world scenarios, they are for testing as many branches as possible
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
        expect(promptOdataServiceAnswers).toHaveBeenCalledWith(
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
        console.log(`cds mock:` + getCdsUi5PluginInfo.toString());
        // Since a CAP project was pre-selected cds ui5 plugin info should be loaded
        expect(getCdsUi5PluginInfo).toHaveBeenCalledWith(
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
        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.vscode);
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
        // Note: These are not real-world combinations of options and state, they are for testing as many branches and options as possible
        (options.appWizard as AppWizardCache)!['$fiori-cache'] = {
            service: mockCachedService
        };
        options.floorplan = FloorplanFE.FE_LROP;
        options.preselectedEntityName = 'TestPreSelectedEntity';
        options.showLayoutPrompts = false;
        // Skipping the project attributes step for this test
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
        // Should prompt for entity related answers
        const promptForEntitiesSpy = jest
            .spyOn(FioriAppGenerator.prototype, 'prompt')
            .mockResolvedValueOnce(mockEntityRelatedAnswers);

        const fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        // Should pass relevant option to `getEntityRelatedPrompts`
        expect(getEntityRelatedPrompts).toHaveBeenCalledWith(
            mockCachedService.edmx,
            'lrop',
            true,
            { defaultMainEntityName: 'TestPreSelectedEntity', hideTableLayoutPrompts: true, useAutoComplete: false },
            mockCachedService.annotations?.[0],
            expect.objectContaining({ debug: expect.any(Function) }), // Logger
            true
        );
        // Should prompt for entity related answers, since this is an FE floorplan
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
        // Skipping the service selection step for this test
        options.fioriSteps = FIORI_STEPS.filter((step) => step.key !== STEP_DATASOURCE_AND_SERVICE);
        // edmx must be provided to prompt for entity related answers which is not skippable
        options.state = {
            project: {} as Project,
            service: {
                edmx: '<edmx></edmx>',
                source: DatasourceType.odataServiceUrl
            },
            floorplan: FloorplanFF.FF_SIMPLE
        };
        // Resolve entity related prompts
        jest.spyOn(FioriAppGenerator.prototype, 'prompt').mockResolvedValueOnce({});

        const fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        // Should call to prompt for UI5 application answers with the expected parameters
        expect(promptUI5ApplicationAnswers).toHaveBeenCalledWith(
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
        // Skipping the service selection step for this test
        options.fioriSteps = FIORI_STEPS.filter((step) => step.key !== STEP_DATASOURCE_AND_SERVICE);
        // Provided project settings
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
                name: {
                    hide: true
                },
                targetFolder: {
                    hide: true
                },
                ui5Version: {
                    hide: true
                }
            }
        };
        options.extensions = {
            addDeployConfig: {
                default: false
            }
        };
        // Resolve view name prompt
        jest.spyOn(FioriAppGenerator.prototype, 'prompt').mockResolvedValueOnce({});

        const fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        // Should call to prompt for UI5 application answers with the expected parameters
        expect(promptUI5ApplicationAnswers).toHaveBeenCalledWith(
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
        // Skipping the service selection step for this test
        options.fioriSteps = FIORI_STEPS.filter((step) => step.key !== STEP_DATASOURCE_AND_SERVICE);
        // Provided project settings
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
                'ui5AbapRepo': {
                    hide: true,
                    default: 'ZAPP'
                }
            },
            '@sap-ux/flp-config-sub-generator': {
                'semanticObject': {
                    hide: true
                }
            }
        };
        // Answers to add deploy config and flp config
        ui5ApplicationAnswers.addDeployConfig = true;
        ui5ApplicationAnswers.addFlpConfig = true;

        // Resolve view name prompt
        jest.spyOn(FioriAppGenerator.prototype, 'prompt').mockResolvedValue({});

        let fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        // Should call to prompt for UI5 application answers with the expected parameters
        expect(promptUI5ApplicationAnswers).toHaveBeenCalled();

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

        expect(addDeployGen).toHaveBeenCalledWith(
            {
                service: {
                    edmx: '<edmx></edmx>',
                    source: DatasourceType.none
                },
                projectName: ui5ApplicationAnswers.name,
                targetFolder: ui5ApplicationAnswers.targetFolder,
                applicationType: 'FF'
            },
            expect.any(Function), // composeWith
            expect.objectContaining({ debug: expect.any(Function) }), // Logger
            { '$fiori-cache': {}, showError: expect.any(Function) }, // AppWizard
            {
                'ui5AbapRepo': {
                    hide: true,
                    default: 'ZAPP'
                }
            }
        );

        expect(addFlpGen).toHaveBeenCalledWith(
            {
                projectName: ui5ApplicationAnswers.name,
                targetFolder: ui5ApplicationAnswers.targetFolder,
                title: ui5ApplicationAnswers.title,
                skipPrompt: false
            },
            expect.any(Function), // composeWith
            expect.objectContaining({ debug: expect.any(Function) }), // Logger
            undefined, // VSCode
            { '$fiori-cache': {}, showError: expect.any(Function) }, // AppWizard
            {
                'semanticObject': {
                    hide: true
                }
            }
        );

        // If the FLP config step is skipped, the addFlpGen should be called with skipPrompt: true, if `addFlpConfig` is true (can be set from adaptors, for example)
        // Skipping the service selection step and FLP config for this test. `updateDependentStep` is not called since the step is not in the active steps.
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
        options.promptSettings = undefined; // No prompt settings for this test
        // Skipping the FLP config step should still call the addFlpGen but with the skipPrompt option true
        ui5ApplicationAnswers.addFlpConfig = true;
        (addFlpGen as jest.Mock).mockClear();
        (updateDependentStep as jest.Mock).mockClear();

        fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();
        expect(addFlpGen).toHaveBeenCalledWith(
            {
                projectName: ui5ApplicationAnswers.name,
                targetFolder: ui5ApplicationAnswers.targetFolder,
                title: ui5ApplicationAnswers.title,
                skipPrompt: true
            },
            expect.any(Function), // composeWith
            expect.objectContaining({ debug: expect.any(Function) }), // Logger
            undefined, // VSCode
            { '$fiori-cache': {}, showError: expect.any(Function) }, // AppWizard
            undefined
        );
        // Should only be called for deploy config step, not flp config step since its skipped
        expect(updateDependentStep).toHaveBeenCalledTimes(1);
        expect(updateDependentStep).toHaveBeenCalledWith(
            'Project Attributes',
            [options.yeomanUiStepConfig],
            true,
            t('steps.deployConfig.title')
        );
    });

    test('Should report errors and exit', async () => {
        options.floorplan = undefined; // Force an error since supported odata version lookup requires a floorplan
        const fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await expect(fioriAppGen.prompting()).rejects.toThrow(t('error.fatalError'));

        expect(DefaultLogger.error).toHaveBeenCalledWith(expect.stringContaining(t('error.fatalError')));

        // Fatal error must exit YUI or genertion continues
        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.vscode);
        await fioriAppGen.initializing();
        await expect(fioriAppGen.prompting()).rejects.toThrow(t('error.fatalError'));
        expect(DefaultLogger.error).toHaveBeenCalledWith(expect.stringContaining(t('error.fatalError')));
        expect(options.appWizard?.showError).toHaveBeenCalledWith(
            expect.stringContaining(t('error.fatalError')),
            MessageType.notification
        );
    });

    test('Should skip prompt steps as expected', async () => {
        // YUI should run all steps
        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.vscode);
        options.fioriSteps = FIORI_STEPS;
        options.floorplan = FloorplanFF.FF_SIMPLE;
        jest.spyOn(FioriAppGenerator.prototype, 'prompt').mockResolvedValue({ viewName: 'TestView' });

        const fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        expect(promptOdataServiceAnswers).toHaveBeenCalled();
        expect(promptUI5ApplicationAnswers).toHaveBeenCalled();

        // Skip odata service step
        (promptOdataServiceAnswers as jest.Mock).mockClear();
        (promptUI5ApplicationAnswers as jest.Mock).mockClear();
        options.fioriSteps = FIORI_STEPS.filter((step) => step.key !== STEP_DATASOURCE_AND_SERVICE);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        expect(promptOdataServiceAnswers).not.toHaveBeenCalled();
        expect(promptUI5ApplicationAnswers).toHaveBeenCalled();

        // Skip project attributes step
        (promptOdataServiceAnswers as jest.Mock).mockClear();
        (promptUI5ApplicationAnswers as jest.Mock).mockClear();
        options.fioriSteps = FIORI_STEPS.filter((step) => step.key !== STEP_PROJECT_ATTRIBUTES);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        expect(promptOdataServiceAnswers).toHaveBeenCalled();
        expect(promptUI5ApplicationAnswers).not.toHaveBeenCalled();
    });

    test('Tests back nav in YUI reloads from cache (includes cached connected system)', async () => {
        // Force cache usage, YUI only
        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.vscode);
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
                    authenticationType: 'reentranceTicket'
                }
            }
        };
        // We dont mock the cache as its simpler to test with the real cache
        const getFromCacheSpy = jest.spyOn(commonUtils, 'getFromCache');
        const addToCacheSpy = jest.spyOn(commonUtils, 'addToCache');

        // First run, populates cache
        let fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        // Should add to cache (to support back navigation state restoration)
        expect(addToCacheSpy).toHaveBeenCalledWith(
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
                            url: 'http:/s4hsystem:1234'
                        },
                        serviceProvider: {} as ServiceProvider
                    }
                }
            },
            expect.objectContaining({ debug: expect.any(Function) }) // Logger
        );

        // Second run, should load from cache
        // Reset state to mimick a reload of YUI which occurs when navigating back
        fioriAppGen = new FioriAppGenerator([], options);
        await fioriAppGen.initializing();
        await fioriAppGen.prompting();

        await fioriAppGen.prompting();
        expect(getFromCacheSpy).toHaveBeenCalledWith(
            options.appWizard,
            'service',
            expect.objectContaining({ debug: expect.any(Function) })
        );
        expect(fioriAppGen['state'].service).toEqual(odataServiceAnswers);
    });
});
