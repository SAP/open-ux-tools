import type { FioriElementsApp, LROPSettings } from '../src';
import { generate, TemplateType } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import {
    testOutputDir,
    debug,
    createFeTestConfig,
    v4TemplateSettings,
    v4Service,
    v2TemplateSettings,
    v2Service
} from './common';

const TEST_NAME = 'lropTemplates';

jest.mock('read-pkg-up', () => ({
    sync: jest.fn().mockReturnValue({
        packageJson: {
            name: 'mocked-package-name',
            version: '9.9.9-mocked'
        }
    })
}));

describe(`Fiori Elements template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

    const lropConfigs: Array<{ name: string; config: FioriElementsApp<LROPSettings> }> = [
        {
            name: 'lropV4',
            config: createFeTestConfig('felrop1', {
                template: {
                    type: TemplateType.ListReportObjectPage,
                    settings: v4TemplateSettings
                },
                service: v4Service
            })
        },
        {
            name: 'lropV4noUi5Version',
            config: createFeTestConfig(
                'felropui5',
                {
                    app: {
                        flpAppId: 'felropui5-tile'
                    },
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v4TemplateSettings
                    },
                    service: v4Service
                },
                false
            )
        },
        {
            name: 'lropV4_addTests',
            config: createFeTestConfig('lropV4AddTests', {
                template: {
                    type: TemplateType.ListReportObjectPage,
                    settings: v4TemplateSettings
                },
                appOptions: {
                    addTests: true
                },
                service: v4Service
            })
        },
        {
            name: 'lropV2',
            config: createFeTestConfig('felrop2', {
                template: {
                    type: TemplateType.ListReportObjectPage,
                    settings: v2TemplateSettings
                },
                service: v2Service
            })
        },
        {
            name: 'lropV2_flex_changes',
            config: createFeTestConfig('felrop3', {
                template: {
                    type: TemplateType.ListReportObjectPage,
                    settings: v2TemplateSettings
                },
                ui5: {
                    version: '1.77.2' // flex changes preview should be included with this version
                },
                service: v2Service
            })
        },
        {
            name: 'lropV2_omit_reuse_libs',
            config: createFeTestConfig('felrop4', {
                template: {
                    type: TemplateType.ListReportObjectPage,
                    settings: v2TemplateSettings
                },
                ui5: {
                    version: '1.77.2' // flex changes preview should be included with this version
                },
                appOptions: {
                    loadReuseLibs: false
                },
                service: v2Service
            })
        },
        {
            name: 'lropV2_set_toolsId',
            config: createFeTestConfig('lropV2_set_toolsId', {
                template: {
                    type: TemplateType.ListReportObjectPage,
                    settings: v2TemplateSettings
                },
                app: {
                    sourceTemplate: {
                        version: '1.2.3-test',
                        id: 'test-fe-template',
                        toolsId: 'toolsId:1234abcd'
                    }
                },
                service: v2Service
            })
        },
        {
            name: 'lropV2_set_toolsId_only',
            config: createFeTestConfig('lropV2_set_toolsId_only', {
                template: {
                    type: TemplateType.ListReportObjectPage,
                    settings: v2TemplateSettings
                },
                app: {
                    sourceTemplate: {
                        toolsId: 'toolsId:1234abcd'
                    }
                },
                service: v2Service
            })
        },
        {
            name: 'lropV2_ts',
            config: createFeTestConfig('lropV2_ts', {
                template: {
                    type: TemplateType.ListReportObjectPage,
                    settings: v2TemplateSettings
                },
                ui5: {
                    version: '1.77.2' // flex changes preview should be included with this version
                },
                appOptions: {
                    loadReuseLibs: false,
                    typescript: true
                },
                service: v2Service
            })
        }
    ];

    beforeAll(() => {
        removeSync(curTestOutPath); // even for in memory
    });

    test.each(lropConfigs)('Generate files for template: $name', async ({ name, config }) => {
        const testPath = join(curTestOutPath, name);
        const fs = await generate(testPath, config);
        expect((fs as any).dump(testPath)).toMatchSnapshot();

        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug?.enabled) {
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        });
    });
});
