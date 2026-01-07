import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { ServiceProvider } from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { FioriElementsApp } from '@sap-ux/fiori-elements-writer';
import { OdataVersion, generate as generateFE } from '@sap-ux/fiori-elements-writer';
import {
    type FreestyleApp,
    TemplateType as TemplateTypeFF,
    generate as generateFF
} from '@sap-ux/fiori-freestyle-writer';
import type { BasicAppSettings } from '@sap-ux/fiori-freestyle-writer/dist/types';
import { DefaultLogger, TelemetryHelper, sendTelemetry } from '@sap-ux/fiori-generator-shared';
import { type CapService, DatasourceType } from '@sap-ux/odata-service-inquirer';
import { ServiceType } from '@sap-ux/odata-service-writer';
import { join } from 'node:path';
import Generator from 'yeoman-generator';
import yeomanTest from 'yeoman-test';
import { type FioriAppGeneratorOptions, FioriAppGenerator } from '../../../src/fiori-app-generator';
import { runPostGenerationTasks } from '../../../src/fiori-app-generator/end';
import { installDependencies } from '../../../src/fiori-app-generator/install';
import { transformState } from '../../../src/fiori-app-generator/transforms';
import { writeAPIHubKeyFiles, writeAppGenInfoFiles } from '../../../src/fiori-app-generator/writing';
import type { Project, State } from '../../../src/types';
import { ApiHubType, FIORI_STEPS, FloorplanFE, FloorplanFF, PLATFORMS, generatorName } from '../../../src/types';
import { deleteCache, getYeomanUiStepConfig, t } from '../../../src/utils';

/**
 * FioriAppGenerator writing unit tests
 */

const appConfigMocked: FioriElementsApp<unknown> | FreestyleApp<BasicAppSettings> | undefined = {
    template: {
        type: TemplateTypeFF.Basic, // We only support one template type now so it can be hardcoded
        settings: {
            viewName: 'testViewName'
        }
    },
    service: {
        metadata: 'mockEdmx',
        url: 'http://mockhost:1234',
        path: 'some/service/path',
        type: ServiceType.EDMX,
        version: OdataVersion.v4
    },
    app: {
        id: 'testAppId',
        title: 'testAppTitle',
        description: 'testAppDescription',
        flpAppId: 'testSemanticObject-testAction',
        projectType: 'EDMXBackend',
        sourceTemplate: {
            toolsId: 'abcd1234'
        }
    },
    package: {
        name: 'testPackageName',
        description: 'testPackageDescription'
    },
    ui5: {
        version: '1.2.3',
        minUI5Version: '1.2.0'
    },
    appOptions: {
        sapux: true,
        addTests: true
    }
};
jest.mock('../../../src/fiori-app-generator/transforms', () => {
    return {
        ...jest.requireActual('../../../src/fiori-app-generator/transforms'),
        transformState: jest.fn().mockImplementation(() => Promise.resolve(appConfigMocked))
    };
});

jest.mock('../../../src/fiori-app-generator/writing', () => {
    return {
        ...jest.requireActual('../../../src/fiori-app-generator/writing'),
        writeAPIHubKeyFiles: jest.fn(),
        writeAppGenInfoFiles: jest.fn()
    };
});

jest.mock('../../../src/fiori-app-generator/end', () => {
    return {
        ...jest.requireActual('../../../src/fiori-app-generator/end'),
        runPostGenerationTasks: jest.fn()
    };
});

jest.mock('../../../src/fiori-app-generator/install', () => {
    return {
        ...jest.requireActual('../../../src/fiori-app-generator/install'),
        installDependencies: jest.fn()
    };
});

let mockPlatform = PLATFORMS.CLI;
jest.mock('../../../src/utils', () => ({
    __esModule: true,
    ...jest.requireActual('../../../src/utils'),
    getPlatform: jest.fn().mockImplementation(() => mockPlatform),
    deleteCache: jest.fn()
}));

jest.mock('@sap-ux/fiori-generator-shared', () => {
    return {
        ...jest.requireActual('@sap-ux/fiori-generator-shared'),
        TelemetryHelper: {
            createTelemetryData: jest.fn(),
            markAppGenStartTime: jest.fn(),
            telemetryData: {
                data1: 'value1'
            }
        },
        sendTelemetry: jest.fn(),
        DefaultLogger: {
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            fatal: jest.fn()
        }
    };
});

jest.mock('@sap-ux/ui5-info', () => {
    return {
        ...jest.requireActual('@sap-ux/ui5-info'),
        getUI5Versions: jest.fn().mockResolvedValue(() => Promise.resolve([]))
    };
});

jest.mock('@sap-ux/telemetry', () => {
    return {
        ...jest.requireActual('@sap-ux/telemetry'),
        initTelemetrySettings: jest.fn().mockResolvedValue(() => Promise.resolve())
    };
});

jest.mock('@sap-ux/fiori-freestyle-writer', () => {
    return {
        ...jest.requireActual('@sap-ux/fiori-freestyle-writer'),
        generate: jest.fn()
    };
});
jest.mock('@sap-ux/fiori-elements-writer', () => {
    return {
        ...jest.requireActual('@sap-ux/fiori-elements-writer'),
        generate: jest.fn()
    };
});

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn().mockReturnValue(false)
}));

/**
 * Test the FioriAppGenerator internal lifecycle code only, hence the extensive mocking.
 * There are multiple other integration tests that cover the full prompting and writing functionality.
 *
 */
describe('Test FioriAppGenerator', () => {
    const allYUIStepsConfig = getYeomanUiStepConfig([...FIORI_STEPS]);
    // Basic test options for the FioriAppGenerator
    let options: FioriAppGeneratorOptions = {};
    const targetFolder = join(__dirname, 'test-output');

    beforeEach(() => {
        // Reset the options object
        options = {
            appWizard: {} as AppWizard,
            env: (yeomanTest as any).createEnv([]),
            telemetryData: { data1: 'value1' },
            floorplan: FloorplanFE.FE_OVP,
            yeomanUiStepConfig: allYUIStepsConfig
        };
        mockPlatform = PLATFORMS.CLI;
        jest.restoreAllMocks();
        (isAppStudio as jest.Mock).mockReturnValue(false);
    });

    test('Should call `transformState`, `generate` and `writeInfoFiles` during writing phase', async () => {
        options.generateIndexHtml = true;
        const mockState: State = {
            project: {
                name: 'testApp',
                targetFolder,
                ui5Version: '1.2.3',
                ui5Theme: 'sap_fiori_3'
            } as Project,
            service: {
                host: 'http://mockhost:1234',
                servicePath: 'some/service/path',
                source: DatasourceType.odataServiceUrl,
                edmx: '<edmx>mock</edmx>',
                version: OdataVersion.v4
            },
            entityRelatedConfig: {
                mainEntity: {
                    entitySetName: 'SEPMRA_C_PD_Product',
                    entitySetType: 'SEPMRA_C_PD_ProductType'
                }
            },
            floorplan: FloorplanFE.FE_WORKLIST
        };
        const mockGenVer = '9.9.9';
        // Testing each branch of the floorplan condition
        for (const testFloorplan of [
            { floorplan: FloorplanFE.FE_OVP, generateMockFunc: generateFE },
            { floorplan: FloorplanFF.FF_SIMPLE, generateMockFunc: generateFF }
        ]) {
            const floorplan = testFloorplan.floorplan;
            options.floorplan = floorplan;
            const appPath = join(targetFolder, 'testApp');
            const fioriAppGen = new FioriAppGenerator([], options);
            console.log('Testing floorplan:', floorplan);
            fioriAppGen['generatorVersion'] = mockGenVer;
            fioriAppGen['state'] = { ...mockState, floorplan };

            await fioriAppGen.writing();
            console.log('Floorplan wrote:', floorplan);

            expect(DefaultLogger.info).toHaveBeenCalledWith(`Copying ${floorplan} template files...`);
            expect(transformState).toHaveBeenCalledWith(fioriAppGen['state'], true);
            expect(testFloorplan.generateMockFunc).toHaveBeenCalledWith(
                appPath,
                appConfigMocked,
                expect.objectContaining({ commit: expect.any(Function) })
            );
            expect(TelemetryHelper.createTelemetryData).toHaveBeenCalledWith({
                Template: t(`floorplans.label.${floorplan}`, {
                    odataVersion: mockState.service.version
                }),
                DataSource: mockState.service.source,
                UI5Version: mockState.project.ui5Version,
                Theme: mockState.project.ui5Theme,
                AppGenVersion: mockGenVer,
                AppGenSourceType: mockState.service.source,
                AppGenSapSystemType: 'n/a',
                AppGenBusinessHubType: undefined,
                EnableEslint: undefined,
                EnableTypeScript: undefined,
                ToolsId: 'abcd1234',
                ValueHelpCount: 0
            });
            expect(writeAppGenInfoFiles).toHaveBeenCalledWith(
                {
                    project: mockState.project,
                    service: mockState.service,
                    floorplan,
                    entityRelatedConfig: mockState.entityRelatedConfig
                },
                generatorName,
                mockGenVer,
                appPath,
                expect.objectContaining({ commit: expect.any(Function) }),
                { ui5Version: appConfigMocked.ui5?.minUI5Version }
            );
            expect(writeAPIHubKeyFiles).not.toHaveBeenCalled();
        }
    });

    test('Should call `writeAPIHubKeyFiles` if key is provided', async () => {
        (isAppStudio as jest.Mock).mockReturnValue(true);
        const mockState: State = {
            project: {
                name: 'testApp',
                targetFolder,
                ui5Version: '1.2.3',
                ui5Theme: 'sap_fiori_3'
            } as Project,
            service: {
                host: 'http://mockhost:1234',
                servicePath: 'some/service/path',
                source: DatasourceType.businessHub,
                edmx: '<edmx>mock</edmx>',
                version: OdataVersion.v4,
                apiHubConfig: {
                    apiHubKey: 'apiHubKey1234',
                    apiHubType: ApiHubType.apiHubEnterprise
                }
            },
            floorplan: FloorplanFE.FE_ALP
        };
        const fioriAppGen = new FioriAppGenerator([], options);
        fioriAppGen['state'] = { ...mockState, floorplan: FloorplanFE.FE_WORKLIST };
        await fioriAppGen.writing();

        expect(writeAPIHubKeyFiles).toHaveBeenCalledWith(
            expect.objectContaining({ commit: expect.any(Function) }),
            join(targetFolder, 'testApp'),
            mockState.service.apiHubConfig
        );
    });

    test('Should log, send telemetry event and exit if an error is thrown during writing', async () => {
        const fioriAppGen = new FioriAppGenerator([], options);
        // Non-existent path should throw an error
        const mockState: Partial<State> = {
            project: {
                name: 'testApp',
                targetFolder: '/not/exiting/path'
            } as Project
        };
        fioriAppGen['state'] = { ...mockState, floorplan: FloorplanFE.FE_LROP } as State;
        await expect(fioriAppGen.writing()).rejects.toThrow();
        expect(DefaultLogger.fatal).toHaveBeenCalledWith(
            expect.stringContaining(t('error.errorWritingApplicationFiles'))
        );
        expect(sendTelemetry).toHaveBeenCalledWith('GENERATION_WRITING_FAIL', {
            data1: 'value1'
        });
    });

    test('Should call `installDependencies` during install phase', async () => {
        const appPath = join(targetFolder, 'testApp');
        jest.spyOn(Generator.prototype, 'destinationPath').mockImplementation(() => appPath);
        let fioriAppGen = new FioriAppGenerator([], options);
        const mockState: State = {
            project: {
                name: 'testApp',
                targetFolder
            } as Project,
            service: {
                capService: {
                    serviceName: 'aCapService',
                    projectPath: '/cap/project/path',
                    cdsVersionInfo: {
                        home: '/home',
                        version: '1.2.3',
                        root: '/root'
                    },
                    cdsUi5PluginInfo: {
                        isCdsUi5PluginEnabled: true,
                        hasCdsUi5Plugin: true,
                        hasMinCdsVersion: true,
                        isWorkspaceEnabled: true
                    }
                },
                source: DatasourceType.capProject
            },
            floorplan: FloorplanFE.FE_WORKLIST
        };
        fioriAppGen['state'] = mockState;
        await fioriAppGen.install();
        expect(installDependencies).toHaveBeenCalledWith(
            {
                appPackagePath: appPath,
                capService: mockState.service!.capService,
                useNpmWorkspaces: true
            },
            expect.objectContaining({ debug: expect.any(Function) }) // Logger
        );
        (installDependencies as jest.Mock).mockClear();

        // Should call installDependencies with useNpmWorkspaces as enableTypescript is true
        fioriAppGen['state'] = {
            ...mockState,
            project: {
                ...mockState.project,
                enableTypeScript: true
            },
            service: {
                ...mockState.service,
                capService: {
                    ...mockState.service.capService,
                    cdsUi5PluginInfo: {
                        isCdsUi5PluginEnabled: false,
                        hasCdsUi5Plugin: false,
                        hasMinCdsVersion: true,
                        isWorkspaceEnabled: false
                    }
                } as CapService
            }
        };

        await fioriAppGen.install();
        expect(installDependencies).toHaveBeenCalledWith(
            expect.objectContaining({ useNpmWorkspaces: true }),
            expect.objectContaining({ debug: expect.any(Function) }) // Logger
        );
        (installDependencies as jest.Mock).mockClear();

        // Should skip installation if option specified
        fioriAppGen = new FioriAppGenerator([], { ...options, skipInstall: true });
        await fioriAppGen.install();
        expect(installDependencies).not.toHaveBeenCalled();
        expect(DefaultLogger.info).toHaveBeenCalledWith(t('logMessages.installSkippedOptionSpecified'));
    });

    test('Should call `runPostGenerationTasks` during end phase', async () => {
        const fioriAppGen = new FioriAppGenerator([], { ...options, followUpCommand: { cmdName: 'testCommand' } });
        // Note: The state object is not representative of a real state object, only for testing purposes
        const mockState: State = {
            project: {
                name: 'testApp',
                targetFolder,
                flpAppId: 'flpAppId-1'
            } as Project,
            service: {
                client: '010',
                version: OdataVersion.v4,
                connectedSystem: {
                    backendSystem: {
                        newOrUpdated: true,
                        name: 'mockBackendSystem',
                        url: 'http://mockhost:1234',
                        client: '010',
                        username: 'mockUser',
                        password: 'mockPassword',
                        systemType: 'OnPrem',
                        connectionType: 'abap_catalog'
                    },
                    serviceProvider: {} as ServiceProvider
                },
                capService: {
                    serviceName: 'aCapService',
                    projectPath: '/cap/project/path',
                    cdsVersionInfo: {
                        home: '/home',
                        version: '1.2.3',
                        root: '/root'
                    }
                },
                source: DatasourceType.capProject
            },
            floorplan: FloorplanFE.FE_FEOP
        };
        fioriAppGen['state'] = mockState;
        fioriAppGen['appWizard'] = { appWizard: 'appWizard' } as unknown as AppWizard;

        await fioriAppGen.end();
        expect(runPostGenerationTasks).toHaveBeenCalledWith(
            {
                service: {
                    backendSystem: mockState.service?.connectedSystem?.backendSystem,
                    capService: mockState.service?.capService,
                    sapClient: mockState.service?.client,
                    odataVersion: mockState.service?.version,
                    datasourceType: DatasourceType.capProject
                },
                project: {
                    targetFolder: mockState.project?.targetFolder,
                    name: mockState.project?.name,
                    flpAppId: mockState.project?.flpAppId
                }
            },
            expect.objectContaining({ commit: expect.any(Function) }), // mem-fs-editor
            expect.objectContaining({ debug: expect.any(Function) }), // Logger
            undefined, // vscode
            { appWizard: 'appWizard' }, // appWizard
            { cmdName: 'testCommand' } // followUpCommand
        );
        expect(deleteCache).toHaveBeenCalled();
    });
});
