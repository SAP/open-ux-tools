import type { FreestyleApp } from '../src';
import { generate, TemplateType } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { testOutputDir, debug, updatePackageJSONDependencyToUseLocalPath } from './common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { BasicAppSettings } from '../src/types';
import { projectChecks } from './common';
import { t, initI18n } from '../src/i18n';
import { getPackageJsonTasks } from '../src/packageConfig';

const TEST_NAME = 'basicTemplate';
jest.setTimeout(240000); // Needed when debug.enabled

// Mocking the i18n dependency
jest.mock('../src/i18n', () => ({
    initI18n: jest.fn().mockResolvedValue(undefined),
    t: jest.fn()
}));

// Mock getPackageJsonTasks
jest.mock('../src/packageConfig', () => {
    const originalModule = jest.requireActual('../src/packageConfig');
    return {
        ...jest.requireActual('../src/packageConfig'),
        // Mock getPackageJsonTasks to return original implementation
        getPackageJsonTasks: jest.fn((options) => originalModule.getPackageJsonTasks(options))
    };
});

jest.mock('read-pkg-up', () => ({
    sync: jest.fn().mockReturnValue({
        packageJson: {
            name: 'mocked-package-name',
            version: '9.9.9-mocked'
        }
    })
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
            }
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
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks(); // Clear all mocks before each test
    });

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

    test('Generate files for template with corrent i18n translations when localOnly is set to true', async () => {
        // Select the last configuration from configuration array with name 'basic_with_custom_view_name' to test i18n translations
        // Testing with a single configuration to verify consistent translations across all configurations
        const lropv4Config = configuration.filter((config) => config.name === 'basic_with_custom_view_name')[0];
        const testPath = join(curTestOutPath, lropv4Config.name);
        await generate(testPath, lropv4Config.config);
        // Ensure initI18n function is called during generation
        expect(initI18n).toHaveBeenCalledTimes(1);
        // Get the scripts generated by getPackageJsonTasks function
        const scripts = getPackageJsonTasks({
            // set localOnly and generateIndex to true to test the i18n translations
            localOnly: true,
            addMock: true,
            sapClient: '',
            flpAppId: '',
            startFile: '',
            localStartFile: '',
            generateIndex: true
        });
        // Get start and start-noflp scripts from generated scripts
        const startScript = scripts['start'];
        const noflpScript = scripts['start-noflp'];
        // Assert that startScript and noflpScript contain the expected echo commands with mockOnlyWarning translation
        expect(startScript).toBe(`echo \\\"${t('info.mockOnlyWarning')}\\\"`);
        expect(noflpScript).toBe(`echo \\\"${t('info.mockOnlyWarning')}\\\"`);
    });

    test("app id prefix correctly generated in template's Component.js", async () => {
        const freestyleApp: FreestyleApp<any> = {
            app: {
                id: 'my.demo.App'
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

    describe('set view-name at scaffolding time', () => {
        const viewPrefix = 'MainView';
        const freestyleApp: FreestyleApp<BasicAppSettings> = {
            app: {
                id: 'someId'
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
});
