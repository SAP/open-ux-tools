import { jest } from '@jest/globals';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { ServiceProvider } from '@sap-ux/axios-extension';
import { OdataVersion } from '@sap-ux/fiori-elements-writer';
import type { FioriElementsApp } from '@sap-ux/fiori-elements-writer';
import type { FreestyleApp } from '@sap-ux/fiori-freestyle-writer';
import { TemplateType as TemplateTypeFF } from '@sap-ux/fiori-freestyle-writer';
import type { BasicAppSettings } from '@sap-ux/fiori-freestyle-writer/dist/types';
import { type CapService, DatasourceType } from '@sap-ux/odata-service-inquirer';
import { ServiceType } from '@sap-ux/odata-service-writer';
import type { FioriAppGeneratorOptions } from '../../../src/fiori-app-generator';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Generator from 'yeoman-generator';
import yeomanTest from 'yeoman-test';
import type { Project, State } from '../../../src/types';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Pre-import actuals
const actualTransforms = await import('../../../src/fiori-app-generator/transforms');
const actualWriting = await import('../../../src/fiori-app-generator/writing');
const actualEnd = await import('../../../src/fiori-app-generator/end');
const actualInstall = await import('../../../src/fiori-app-generator/install');
const actualUtils = await import('../../../src/utils');
const actualFioriGenShared = await import('@sap-ux/fiori-generator-shared');
const actualUi5Info = await import('@sap-ux/ui5-info');
const actualTelemetry = await import('@sap-ux/telemetry');
const actualFioriFreestyleWriter = await import('@sap-ux/fiori-freestyle-writer');
const actualFioriElementsWriter = await import('@sap-ux/fiori-elements-writer');
const actualBtpUtils = await import('@sap-ux/btp-utils');

const appConfigMocked: FioriElementsApp<unknown> | FreestyleApp<BasicAppSettings> | undefined = {
    template: {
        type: TemplateTypeFF.Basic,
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

const mockTransformState = jest.fn().mockImplementation(() => Promise.resolve(appConfigMocked));
const mockWriteAPIHubKeyFiles = jest.fn();
const mockWriteAppGenInfoFiles = jest.fn();
const mockRunPostGenerationTasks = jest.fn();
const mockInstallDependencies = jest.fn();
let mockPlatform = 'CLI';
const mockGetPlatform = jest.fn().mockImplementation(() => mockPlatform);
const mockDeleteCache = jest.fn();
const mockIsAppStudio = jest.fn().mockReturnValue(false);
const mockGenerateFE = jest.fn();
const mockGenerateFF = jest.fn();

jest.unstable_mockModule('../../../src/fiori-app-generator/transforms', () => ({
    ...actualTransforms,
    transformState: mockTransformState
}));

jest.unstable_mockModule('../../../src/fiori-app-generator/writing', () => ({
    ...actualWriting,
    writeAPIHubKeyFiles: mockWriteAPIHubKeyFiles,
    writeAppGenInfoFiles: mockWriteAppGenInfoFiles
}));

jest.unstable_mockModule('../../../src/fiori-app-generator/end', () => ({
    ...actualEnd,
    runPostGenerationTasks: mockRunPostGenerationTasks
}));

jest.unstable_mockModule('../../../src/fiori-app-generator/install', () => ({
    ...actualInstall,
    installDependencies: mockInstallDependencies
}));

jest.unstable_mockModule('../../../src/utils', () => ({
    ...actualUtils,
    getPlatform: mockGetPlatform,
    deleteCache: mockDeleteCache
}));

jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    ...actualFioriGenShared,
    TelemetryHelper: {
        createTelemetryData: jest.fn(),
        markAppGenStartTime: jest.fn(),
        telemetryData: { data1: 'value1' }
    },
    sendTelemetry: jest.fn(),
    DefaultLogger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        fatal: jest.fn()
    }
}));

jest.unstable_mockModule('@sap-ux/ui5-info', () => ({
    ...actualUi5Info,
    getUI5Versions: jest.fn().mockResolvedValue(() => Promise.resolve([]))
}));

jest.unstable_mockModule('@sap-ux/telemetry', () => ({
    ...actualTelemetry,
    initTelemetrySettings: jest.fn().mockResolvedValue(() => Promise.resolve())
}));

jest.unstable_mockModule('@sap-ux/fiori-freestyle-writer', () => ({
    ...actualFioriFreestyleWriter,
    generate: mockGenerateFF
}));

jest.unstable_mockModule('@sap-ux/fiori-elements-writer', () => ({
    ...actualFioriElementsWriter,
    generate: mockGenerateFE
}));

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...actualBtpUtils,
    isAppStudio: mockIsAppStudio
}));

// Import after all mocks are set up
const { FioriAppGenerator } = await import('../../../src/fiori-app-generator');
const { DefaultLogger, TelemetryHelper, sendTelemetry } = await import('@sap-ux/fiori-generator-shared');
const { ApiHubType, FIORI_STEPS, FloorplanFE, FloorplanFF, PLATFORMS, generatorName } =
    await import('../../../src/types');
const { deleteCache, getYeomanUiStepConfig, t } = await import('../../../src/utils');

/**
 * Test the FioriAppGenerator internal lifecycle code only, hence the extensive mocking.
 */
describe('Test FioriAppGenerator', () => {
    const allYUIStepsConfig = getYeomanUiStepConfig([...FIORI_STEPS]);
    let options: FioriAppGeneratorOptions = {};
    const targetFolder = join(__dirname, 'test-output');

    beforeEach(() => {
        options = {
            appWizard: {} as AppWizard,
            env: (yeomanTest as any).createEnv([]),
            telemetryData: { data1: 'value1' },
            floorplan: FloorplanFE.FE_OVP,
            yeomanUiStepConfig: allYUIStepsConfig
        };
        mockPlatform = PLATFORMS.CLI;
        jest.restoreAllMocks();
        mockIsAppStudio.mockReturnValue(false);
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
        for (const testFloorplan of [
            { floorplan: FloorplanFE.FE_OVP, generateMockFunc: mockGenerateFE },
            { floorplan: FloorplanFF.FF_SIMPLE, generateMockFunc: mockGenerateFF }
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
            expect(mockTransformState).toHaveBeenCalledWith(fioriAppGen['state'], true);
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
                EnableTypeScript: undefined,
                ToolsId: 'abcd1234',
                ValueHelpCount: 0
            });
            expect(mockWriteAppGenInfoFiles).toHaveBeenCalledWith(
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
            expect(mockWriteAPIHubKeyFiles).not.toHaveBeenCalled();
        }
    });

    test('Should call `writeAPIHubKeyFiles` if key is provided', async () => {
        mockIsAppStudio.mockReturnValue(true);
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

        expect(mockWriteAPIHubKeyFiles).toHaveBeenCalledWith(
            expect.objectContaining({ commit: expect.any(Function) }),
            join(targetFolder, 'testApp'),
            mockState.service.apiHubConfig
        );
    });

    test('Should log, send telemetry event and exit if an error is thrown during writing', async () => {
        const fioriAppGen = new FioriAppGenerator([], options);
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
        expect(mockInstallDependencies).toHaveBeenCalledWith(
            {
                appPackagePath: appPath,
                capService: mockState.service!.capService,
                useNpmWorkspaces: true
            },
            expect.objectContaining({ debug: expect.any(Function) })
        );
        mockInstallDependencies.mockClear();

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
        expect(mockInstallDependencies).toHaveBeenCalledWith(
            expect.objectContaining({ useNpmWorkspaces: true }),
            expect.objectContaining({ debug: expect.any(Function) })
        );
        mockInstallDependencies.mockClear();

        fioriAppGen = new FioriAppGenerator([], { ...options, skipInstall: true });
        await fioriAppGen.install();
        expect(mockInstallDependencies).not.toHaveBeenCalled();
        expect(DefaultLogger.info).toHaveBeenCalledWith(t('logMessages.installSkippedOptionSpecified'));
    });

    test('Should call `runPostGenerationTasks` during end phase', async () => {
        const fioriAppGen = new FioriAppGenerator([], { ...options, followUpCommand: { cmdName: 'testCommand' } });
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
        expect(mockRunPostGenerationTasks).toHaveBeenCalledWith(
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
            expect.objectContaining({ commit: expect.any(Function) }),
            expect.objectContaining({ debug: expect.any(Function) }),
            undefined,
            { appWizard: 'appWizard' },
            { cmdName: 'testCommand' }
        );
        expect(deleteCache).toHaveBeenCalled();
    });
});
