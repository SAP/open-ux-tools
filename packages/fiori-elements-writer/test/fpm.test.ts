import type { FioriElementsApp, FPMSettings } from '../src';
import { generate, TemplateType, ValidationError } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import {
    testOutputDir,
    debug,
    feBaseConfig,
    v4Service,
    v2Service,
    projectChecks,
    updatePackageJSONDependencyToUseLocalPath
} from './common';
import type { Logger } from '@sap-ux/logger';

const TEST_NAME = 'fpmTemplates';
if (debug?.enabled) {
    jest.setTimeout(360000);
}

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

    test('Should generate view XML containing custom page building block title for FPM template', async () => {
        const testPath = join(curTestOutPath, 'with-js');
        const config = {
            ...Object.assign(feBaseConfig('fefpmjs'), {
                template: {
                    ...fpmTemplate,
                    settings: {
                        ...fpmTemplate.settings,
                        pageBuildingBlockTitle: 'My Custom Page'
                    }
                }
            }),
            ui5: {
                minUI5Version: '1.137.0'
            },
            service: v4Service
        } as FioriElementsApp<FPMSettings>;
        const fs = await generate(testPath, config);
        const viewXmlPath = join(testPath, 'webapp/ext/main/Main.view.xml');
        const viewXml = fs.read(viewXmlPath).toString();

        expect(viewXml).toContain('My Custom Page');
        expect(viewXml).toContain('<macros:Page id="Page" title="My Custom Page"/>');
    });

    test('Should not generate view XML containing custom page building block title for FPM template when UI5 version is below 1.136.0', async () => {
        const testPath = join(curTestOutPath, 'with-js');
        const config = {
            ...Object.assign(feBaseConfig('fefpmjs'), {
                template: {
                    ...fpmTemplate,
                    settings: {
                        ...fpmTemplate.settings,
                        pageBuildingBlockTitle: 'My Custom Page'
                    }
                }
            }),
            ui5: {
                minUI5Version: '1.96.11'
            },
            service: v4Service
        } as FioriElementsApp<FPMSettings>;

        const fs = await generate(testPath, config);
        const viewXmlPath = join(testPath, 'webapp/ext/main/Main.view.xml');
        const viewXml = fs.read(viewXmlPath).toString();

        expect(viewXml).toContain('<Page id="Main" title="{i18n>MainTitle}">');
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
