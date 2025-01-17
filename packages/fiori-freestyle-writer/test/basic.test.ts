import type { FreestyleApp } from '../src';
import { generate, TemplateType } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { testOutputDir, debug, updatePackageJSONDependencyToUseLocalPath } from './common';
import { OdataVersion, ServiceType } from '@sap-ux/odata-service-writer';
import type { BasicAppSettings } from '../src/types';
import { projectChecks } from './common';
import { applyCAPUpdates, type CapServiceCdsInfo } from '@sap-ux/cap-config-writer';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { types } from 'util';

const TEST_NAME = 'basicTemplate';
jest.setTimeout(240000); // Needed when debug.enabled

jest.mock('read-pkg-up', () => ({
    sync: jest.fn().mockReturnValue({
        packageJson: {
            name: 'mocked-package-name',
            version: '9.9.9-mocked'
        }
    })
}));

jest.mock('@sap-ux/cap-config-writer', () => ({
    ...jest.requireActual('@sap-ux/cap-config-writer'),
    applyCAPUpdates: jest.fn()
}));

describe(`Fiori freestyle template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

    const baseConfig: FreestyleApp<BasicAppSettings> = {
        app: {
            id: 'nods1',
            title: 'App Title',
            description: 'A Fiori application.',
            flpAppId: 'nods1-tile',
            sourceTemplate: {
                version: '1.2.3-test',
                id: 'test-template'
            },
            projectType: 'EDMXBackend'
        },
        package: {
            name: 'nods1',
            description: 'A Fiori application.'
        },
        ui5: {
            version: '1.78.11',
            descriptorVersion: '1.22.0',
            ui5Libs: [
                'sap.f',
                'sap.m',
                'sap.suite.ui.generic.template',
                'sap.ui.comp',
                'sap.ui.core',
                'sap.ui.generic.app',
                'sap.ui.table',
                'sap.ushell'
            ],
            ui5Theme: 'sap_belize',
            localVersion: '1.86.3'
        },
        template: {
            type: TemplateType.Basic,
            settings: {}
        }
    };
    const commonConfig = { ...baseConfig };
    // Add a default
    commonConfig.service = {
        path: '/sap/opu/odata/',
        url: 'http://localhost',
        version: OdataVersion.v2,
        metadata: '<metadata />'
    };
    const configuration: Array<{ name: string; config: FreestyleApp<BasicAppSettings>; settings: BasicAppSettings }> = [
        {
            name: 'basic_no_datasource',
            config: baseConfig,
            settings: {}
        },
        {
            name: 'basic_with_custom_view_name',
            config: commonConfig,
            settings: {
                viewName: 'CustomViewName'
            }
        },
        {
            name: 'basic_without_reuse_libs',
            config: {
                ...commonConfig,
                appOptions: { loadReuseLibs: false }
            },
            settings: {}
        },
        {
            name: 'basic_with_toolsId',
            config: {
                ...commonConfig,
                app: {
                    ...commonConfig.app,
                    sourceTemplate: {
                        toolsId: 'testToolsId:abcd1234'
                    }
                }
            },
            settings: {}
        },
        {
            name: 'basic_typescript',
            config: {
                ...commonConfig,
                appOptions: {
                    loadReuseLibs: false,
                    typescript: true
                }
            },
            settings: {}
        },
        {
            name: 'basic_typescript_ui5_1_108',
            config: {
                ...commonConfig,
                appOptions: {
                    loadReuseLibs: false,
                    typescript: true
                },
                ui5: {
                    version: '1.108.1',
                    ui5Libs: ['sap.m'],
                    ui5Theme: 'sap_horizon',
                    minUI5Version: '1.108.1'
                }
            },
            settings: {}
        },
        {
            name: 'basic_typescript_ui5_1_114',
            config: {
                ...commonConfig,
                appOptions: {
                    loadReuseLibs: false,
                    typescript: true
                },
                ui5: {
                    version: '1.114.0',
                    ui5Libs: ['sap.m'],
                    ui5Theme: 'sap_horizon',
                    minUI5Version: '1.114.0'
                }
            },
            settings: {}
        },
        {
            name: 'basic_without_start-noflp',
            config: {
                ...commonConfig,
                appOptions: { generateIndex: false }
            },
            settings: {}
        },
        {
            name: 'basic_with_start-noflp',
            config: {
                ...commonConfig,
                service: {
                    ...commonConfig.service,
                    url: undefined // remove the URL to ensure the localOnly flag is set to true during the generation process
                },
                appOptions: { generateIndex: true }
            },
            settings: {}
        },
        {
            name: 'basic_cap',
            config: {
                ...commonConfig,
                app: {
                    ...commonConfig.app,
                    projectType: 'CAPNodejs'
                },
                service: {
                    ...commonConfig.service,
                    type: ServiceType.CDS,
                    metadata: undefined
                },
                appOptions: { generateIndex: true }
            },
            settings: {}
        },
        {
            name: 'basic_cap_typescript',
            config: {
                ...commonConfig,
                app: {
                    ...commonConfig.app,
                    projectType: 'CAPNodejs'
                },
                service: {
                    ...commonConfig.service,
                    type: ServiceType.CDS,
                    metadata: undefined
                },
                appOptions: {
                    generateIndex: true,
                    typescript: true
                }
            },
            settings: {}
        },
        {
            name: 'basic_typescript_ui5_1_120_0',
            config: {
                ...commonConfig,
                appOptions: {
                    typescript: true
                },
                ui5: {
                    version: '1.120.0',
                    ui5Libs: ['sap.m'],
                    ui5Theme: 'sap_horizon',
                    minUI5Version: '1.120.0'
                }
            },
            settings: {}
        },
        {
            name: 'basic_ui5_1_120_0',
            config: {
                ...commonConfig,
                appOptions: {
                    typescript: false
                },
                ui5: {
                    version: '1.120.0',
                    ui5Libs: ['sap.m'],
                    ui5Theme: 'sap_horizon',
                    minUI5Version: '1.120.0'
                }
            },
            settings: {}
        },
        {
            name: 'basic_ui5_1_120_0_with_reuse_libs_and_eslint',
            config: {
                ...commonConfig,
                appOptions: {
                    typescript: false,
                    loadReuseLibs: true,
                    eslint: true
                },
                ui5: {
                    version: '1.120.0',
                    ui5Libs: ['sap.m'],
                    ui5Theme: 'sap_horizon',
                    minUI5Version: '1.120.0'
                }
            },
            settings: {}
        }
    ];

    beforeAll(() => {
        removeSync(curTestOutPath); // even for in memory
    });

    test.each(configuration)('Generate files for template: $name', async ({ name, config, settings }) => {
        config.template.settings = settings;
        const testPath = join(curTestOutPath, name);
        const fs = await generate(testPath, config);
        expect(fs.dump(testPath)).toMatchSnapshot();

        return new Promise(async (resolve) => {
            // write out the files for debugging
            if (debug?.enabled) {
                await updatePackageJSONDependencyToUseLocalPath(testPath, fs);
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        }).then(async () => {
            await projectChecks(testPath, config, debug?.debugFull);
        });
    });

    test("app id prefix correctly generated in template's Component.js", async () => {
        const freestyleApp: FreestyleApp<any> = {
            app: {
                id: 'my.demo.App',
                projectType: 'EDMXBackend'
            },
            package: {
                name: 'my.demo.App'
            },
            template: {
                type: TemplateType.Basic,
                settings: {}
            }
        };

        const testPath = join(curTestOutPath, 'generateAppIdComponentJs');
        const fs = await generate(testPath, freestyleApp);
        const Component = { js: join(testPath, 'webapp', 'Component.js') };

        expect(fs.exists(Component.js)).toBeTruthy();
        expect(await fs.read(Component.js).includes('my/demo/App')).toBeTruthy();
    });

    test('sapuxLayer is added to package json for edmx projects when provided', async () => {
        const freestyleApp: FreestyleApp<any> = {
            app: {
                id: 'my.demo.App',
                projectType: 'EDMXBackend'
            },
            package: {
                name: 'my.demo.App',
                sapuxLayer: 'CUSTOMER_BASE'
            },
            template: {
                type: TemplateType.Basic,
                settings: {}
            }
        };

        const fs = await generate(curTestOutPath, freestyleApp);
        const packageJsonPath = join(curTestOutPath, 'package.json');
        const packageJson = fs.readJSON(packageJsonPath);
        expect((packageJson as any)?.sapuxLayer).toBe('CUSTOMER_BASE');
    });

    describe('set view-name at scaffolding time', () => {
        const viewPrefix = 'MainView';
        const freestyleApp: FreestyleApp<BasicAppSettings> = {
            app: {
                id: 'someId',
                projectType: 'EDMXBackend'
            },
            package: {
                name: 'someId'
            },
            template: {
                type: TemplateType.Basic,
                settings: {
                    viewName: viewPrefix
                }
            }
        };

        test('initial view- and controller-name can be adjusted by configuration', async () => {
            const testPath = join(curTestOutPath, 'initViewAndController');
            const fs = await generate(testPath, freestyleApp);
            expect(fs.exists(join(testPath, 'webapp', 'view', `${viewPrefix}.view.xml`))).toBeTruthy();
            expect(fs.exists(join(testPath, 'webapp', 'controller', `${viewPrefix}.controller.js`))).toBeTruthy();
        });

        test('manifest.json adheres to view-/controller-name set at scaffolding time', async () => {
            const testPath = join(curTestOutPath, 'mainfestJson');
            const fs = await generate(testPath, freestyleApp);
            const manifest = { json: fs.readJSON(join(testPath, 'webapp', 'manifest.json')) as any };
            expect(manifest.json['sap.ui5'].rootView.viewName.startsWith(freestyleApp.app.id)).toBe(true);
            expect(manifest.json['sap.ui5'].routing.routes[0].pattern).toBe(':?query:');
            expect(
                [
                    manifest.json['sap.ui5'].routing.routes[0].name,
                    manifest.json['sap.ui5'].routing.routes[0].target[0],
                    manifest.json['sap.ui5'].routing.targets[`Target${viewPrefix}`].viewId,
                    manifest.json['sap.ui5'].routing.targets[`Target${viewPrefix}`].viewName
                ].every((entry) => entry.includes(viewPrefix))
            ).toBeTruthy();
        });
    });

    describe('CAP updates', () => {
        const capService: CapServiceCdsInfo = {
            cdsUi5PluginInfo: {
                isCdsUi5PluginEnabled: true,
                hasMinCdsVersion: true,
                isWorkspaceEnabled: true,
                hasCdsUi5Plugin: true
            },
            projectPath: 'test/path',
            serviceName: 'test-service',
            capType: 'Node.js'
        };

        const getFreestyleApp = (options: {
            enableNPMWorkspaces: boolean,
            typescript: boolean,
            sapux: boolean, 
            capService?: CapServiceCdsInfo
        }) => {
            const { enableNPMWorkspaces, typescript, sapux, capService } = options;
            return {
                app: {
                    id: 'ff-basic-id'
                },
                template: {
                    type: TemplateType.Basic,
                    settings: {}
                },
                service: {
                    version: OdataVersion.v4,
                    capService
                },
                package: {
                    name: 'ff-basic-id'
                },
                appOptions: {
                    enableNPMWorkspaces: enableNPMWorkspaces,
                    sapux,
                    typescript
                }
            } as FreestyleApp<BasicAppSettings>;
        };

        const capProjectSettings = {
            appRoot: curTestOutPath,
            packageName: 'ff-basic-id',
            appId: 'ff-basic-id',
            sapux: true,
            enableNPMWorkspaces: false,
            enableTypescript: false,
            enableCdsUi5Plugin: true
        };

        afterEach(() => {
            jest.clearAllMocks();
            jest.resetAllMocks();
        });

        test('should perform CAP updates when CAP service is available and enableNPMWorkspaces is true', async () => {
            const fs = create(createStorage());

            const freestyleApp: FreestyleApp<BasicAppSettings> = getFreestyleApp({
                enableNPMWorkspaces: true, 
                sapux: false,
                typescript: false,
                capService
            });
            await generate(curTestOutPath, freestyleApp, fs);
            expect(applyCAPUpdates).toBeCalledTimes(1);
            expect(applyCAPUpdates).toBeCalledWith(fs, capService, {
                ...capProjectSettings,
                enableNPMWorkspaces: true, 
                sapux: false
            });
        });

        test('should perform CAP updates when CAP service is available, enableNPMWorkspaces is false', async () => {
            const fs = create(createStorage());

            const freestyleApp: FreestyleApp<BasicAppSettings> = getFreestyleApp({
                enableNPMWorkspaces: false, 
                sapux: false,
                typescript: false,
                capService
            });
            await generate(curTestOutPath, freestyleApp, fs);

            expect(applyCAPUpdates).toBeCalledTimes(1);
            expect(applyCAPUpdates).toBeCalledWith(fs, capService, {
                ...capProjectSettings,
                sapux: false
            });
        });

        test('should perform CAP updates correctly, when no cdsUi5PluginInfo available and enabled typescript', async () => {
            const fs = create(createStorage());
            const capServiceWithNocdsUi5PluginInfo = {
                ...capService,
                cdsUi5PluginInfo: {
                    ...capService.cdsUi5PluginInfo,
                    hasCdsUi5Plugin: false
                }
            };
            const freestyleApp: FreestyleApp<BasicAppSettings> = getFreestyleApp({
                enableNPMWorkspaces: false, 
                sapux: true,
                typescript: true,
                capService: capServiceWithNocdsUi5PluginInfo
            });
            await generate(curTestOutPath, freestyleApp, fs);

            expect(applyCAPUpdates).toBeCalledTimes(1);
            expect(applyCAPUpdates).toBeCalledWith(
                fs,
                capServiceWithNocdsUi5PluginInfo,
                {
                    ...capProjectSettings,
                    enableTypescript: true
                }
            );
        });

        test('should not perform CAP updates, when no cap service provided', async () => {
            const fs = create(createStorage());
            const freestyleApp: FreestyleApp<BasicAppSettings> = getFreestyleApp({
                enableNPMWorkspaces: false, 
                sapux: false,
                typescript: false
            });
            await generate(curTestOutPath, freestyleApp, fs);
            expect(applyCAPUpdates).toBeCalledTimes(0);
        });
    });
});
