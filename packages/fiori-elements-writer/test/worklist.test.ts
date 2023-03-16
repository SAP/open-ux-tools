import { removeSync } from 'fs-extra';
import { join } from 'path';
import type { FioriElementsApp } from '../src';
import { generate, TemplateType } from '../src';
import type { WorklistSettings } from '../src/types';
import {
    debug,
    feBaseConfig,
    projectChecks,
    testOutputDir,
    v2Service,
    v2TemplateSettings,
    v4Service,
    v4TemplateSettings
} from './common';

const TEST_NAME = 'worklistTemplate';
jest.setTimeout(120000); // Needed when debug.debugFull

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
        }
    ];

    beforeAll(() => {
        removeSync(curTestOutPath); // even for in memory
    });

    test.each(configuration)('Generate files for template: $name', async ({ name, config }) => {
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
        }).then(async () => {
            await projectChecks(testPath, config, debug?.debugFull);
        });
    });
});
