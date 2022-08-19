import { FioriElementsApp, generate, TemplateType, FPMSettings } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { testOutputDir, debug, feBaseConfig, v4Service } from './common';

const TEST_NAME = 'fpmTemplates';

jest.mock('read-pkg-up', () => ({
    sync: jest.fn().mockReturnValue({
        packageJson: {
            name: 'mocked-package-name',
            version: '9.9.9-mocked'
        }
    })
}));

describe(`Flexible Programming Model template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

    const fpmConfigs: Array<{ name: string; config: FioriElementsApp<FPMSettings> }> = [
        {
            name: 'with-js',
            config: {
                ...Object.assign(feBaseConfig('fefpmjs'), {
                    template: {
                        type: TemplateType.FlexibleProgrammingModel,
                        settings: {
                            entityConfig: {
                                mainEntityName: 'Bookings'
                            },
                            pageName: 'Main'
                        }
                    }
                }),
                ui5: {
                    minUI5Version: '1.96.11'
                },
                service: v4Service
            } as FioriElementsApp<FPMSettings>
        }
    ];

    beforeAll(() => {
        removeSync(curTestOutPath); // even for in memory
    });

    test.each(fpmConfigs)('Generate files for template: $name', async ({ name, config }) => {
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
