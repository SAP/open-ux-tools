import type { FreestyleApp } from '../src';
import { generate, TemplateType } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { testOutputDir, debug } from './common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { BasicAppSettings } from '../src/types';

const TEST_NAME = 'basicTemplate';

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

    const commonConfig: FreestyleApp<BasicAppSettings> = {
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
        },
        // Add a placeholder middleware, required for local run
        service: {
            path: '/sap/opu/odata/',
            url: 'http://localhost',
            version: OdataVersion.v2,
            metadata: '<metadata />'
        }
    };

    const configuration: Array<{ name: string; config: FreestyleApp<BasicAppSettings>; settings: BasicAppSettings }> = [
        {
            name: 'basic_no_datasource',
            config: commonConfig,
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

        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug?.enabled) {
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        });
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
