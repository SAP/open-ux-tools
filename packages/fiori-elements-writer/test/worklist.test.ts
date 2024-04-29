import type { FioriElementsApp } from '../src';
import { generate, TableType, TemplateType } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import {
    testOutputDir,
    debug,
    v2Service,
    feBaseConfig,
    v2TemplateSettings,
    v4TemplateSettings,
    v4Service,
    projectChecks,
    updatePackageJSONDependencyToUseLocalPath
} from './common';
import type { WorklistSettings } from '../src/types';

const TEST_NAME = 'worklistTemplate';
if (debug?.enabled) {
    jest.setTimeout(360000);
}

describe(`Fiori Elements template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

    const configuration: Array<{ name: string; config: FioriElementsApp<WorklistSettings> }> = [
        {
            name: 'worklistV2',
            config: {
                ...Object.assign(feBaseConfig('fewrk1'), {
                    template: {
                        type: TemplateType.Worklist,
                        settings: v2TemplateSettings
                    }
                }),
                service: v2Service
            } as FioriElementsApp<WorklistSettings>
        },
        {
            name: 'worklistV2_table_type',
            config: {
                ...Object.assign(feBaseConfig('fewrk1'), {
                    template: {
                        type: TemplateType.Worklist,
                        settings: Object.assign(v2TemplateSettings, { tableType: TableType.TREE })
                    }
                }),
                service: v2Service
            } as FioriElementsApp<WorklistSettings>
        },
        {
            name: 'worklistV4',
            config: {
                ...Object.assign(feBaseConfig('fewrk2'), {
                    template: {
                        type: TemplateType.Worklist,
                        settings: v4TemplateSettings
                    },
                    ui5: {
                        ...feBaseConfig('fewrk2', true),
                        version: '1.99.0'
                    }
                }),
                service: v4Service
            } as FioriElementsApp<WorklistSettings>
        },
        {
            name: 'worklistV4_Add_tests',
            config: {
                ...Object.assign(feBaseConfig('fewrk2'), {
                    template: {
                        type: TemplateType.Worklist,
                        settings: v4TemplateSettings
                    },
                    ui5: {
                        ...feBaseConfig('fewrk2', true),
                        version: '1.99.0'
                    }
                }),
                service: v4Service,
                appOptions: {
                    ...feBaseConfig('fewrk2').appOptions,
                    addTests: true
                }
            } as FioriElementsApp<WorklistSettings>
        }
    ];

    beforeAll(() => {
        removeSync(curTestOutPath); // even for in memory
    });

    test.each(configuration)('Generate files for template: $name', async ({ name, config }) => {
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
});
