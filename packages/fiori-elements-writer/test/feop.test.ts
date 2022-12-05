import type { FioriElementsApp } from '../src';
import { generate, TemplateType } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { testOutputDir, debug, feBaseConfig, v4TemplateSettings, v4Service } from './common';
import type { FEOPSettings } from '../src/types';

const TEST_NAME = 'feopTemplate';

describe(`Fiori Elements template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

    const feopConfigs: Array<{ name: string; config: FioriElementsApp<FEOPSettings> }> = [
        {
            name: 'fefeop1',
            config: {
                ...Object.assign(feBaseConfig('fefeop1'), {
                    template: {
                        type: TemplateType.FormEntryObjectPage,
                        settings: v4TemplateSettings
                    }
                }),
                service: v4Service
            } as FioriElementsApp<FEOPSettings>
        },
        {
            name: 'fefeop2ts',
            config: {
                ...Object.assign(feBaseConfig('fefeop2ts'), {
                    template: {
                        type: TemplateType.FormEntryObjectPage,
                        settings: v4TemplateSettings
                    }
                }),
                service: v4Service,
                appOptions: {
                    typescript: true
                }
            } as FioriElementsApp<FEOPSettings>
        }
    ];

    beforeAll(() => {
        removeSync(curTestOutPath); // even for in memory
    });

    test.each(feopConfigs)('Generate files for template: $name', async ({ name, config }) => {
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
});
