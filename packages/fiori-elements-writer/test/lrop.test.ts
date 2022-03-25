import { FioriElementsApp, generate, TemplateType, LROPSettings, Template } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import {
    testOutputDir,
    debug,
    feBaseConfig,
    v4TemplateSettings,
    v4Service,
    v2TemplateSettings,
    v2Service
} from './common';

const TEST_NAME = 'lropTemplates';

describe(`Fiori Elements template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

    const lropConfigs: Array<{ name: string; config: FioriElementsApp<LROPSettings> }> = [
        {
            name: 'lropV4',
            config: {
                ...Object.assign(feBaseConfig('felrop1'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v4TemplateSettings
                    }
                }),
                service: v4Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lropV4noUi5Version',
            config: {
                ...Object.assign(feBaseConfig('felropui5', false), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v4TemplateSettings
                    }
                }),
                service: v4Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lropV2',
            config: {
                ...Object.assign(feBaseConfig('felrop2'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v2TemplateSettings
                    }
                }),
                service: v2Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lropV2_flex_changes',
            config: {
                ...Object.assign(feBaseConfig('felrop3'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v2TemplateSettings
                    },
                    ui5: {
                        ...feBaseConfig('felrop3'),
                        version: '1.77.2' // flex changes preview should be included with this version
                    }
                }),
                service: v2Service
            } as FioriElementsApp<LROPSettings>
        },
        {
            name: 'lropV2_omit_reuse_libs',
            config: {
                ...Object.assign(feBaseConfig('felrop4'), {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: v2TemplateSettings
                    },
                    ui5: {
                        ...feBaseConfig('felrop4'),
                        version: '1.77.2' // flex changes preview should be included with this version
                    },
                    appOptions: {
                        loadReuseLibs: false
                    }
                }),
                service: v2Service
            } as FioriElementsApp<LROPSettings>
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
