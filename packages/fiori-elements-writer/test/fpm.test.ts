import type { FioriElementsApp, FPMSettings } from '../src';
import { generate, TemplateType, ValidationError } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { testOutputDir, debug, feBaseConfig, v4Service, v2Service } from './common';

const TEST_NAME = 'fpmTemplates';

describe(`Flexible Programming Model template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);
    const fpmTemplate = {
        type: TemplateType.FlexibleProgrammingModel,
        settings: {
            entityConfig: {
                mainEntityName: 'Booking'
            },
            pageName: 'Main'
        }
    };

    const fpmConfigs: Array<{ name: string; config: FioriElementsApp<FPMSettings> }> = [
        {
            name: 'with-js',
            config: {
                ...Object.assign(feBaseConfig('fefpmjs'), {
                    template: fpmTemplate
                }),
                ui5: {
                    minUI5Version: '1.96.11'
                },
                service: v4Service
            } as FioriElementsApp<FPMSettings>
        },
        {
            name: 'with-ts',
            config: {
                ...Object.assign(feBaseConfig('fefpmts'), {
                    template: fpmTemplate
                }),
                ui5: {
                    minUI5Version: '1.96.11'
                },
                service: v4Service,
                appOptions: {
                    typescript: true
                }
            } as FioriElementsApp<FPMSettings>
        }
    ];

    beforeAll(() => {
        removeSync(curTestOutPath); // even for in memory
    });

    test.each(fpmConfigs)('Generate files for template: $name', async ({ name, config }) => {
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

    test('Try generating with invalid service', async () => {
        const config = {
            ...fpmConfigs[0].config,
            service: v2Service
        };
        try {
            await generate(curTestOutPath, config);
            fail('generation should have raised a ValidationError');
        } catch (error) {
            expect(error instanceof ValidationError).toBe(true);
        }
    });
});
