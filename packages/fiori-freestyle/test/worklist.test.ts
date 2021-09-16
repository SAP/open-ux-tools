import { FreestyleApp, generate, TemplateType } from '../src';
import { join } from 'path';
import { rmdirSync } from 'fs';
import { testOutputDir, debug, getMetadata } from './common';
import { OdataVersion, Template, WorklistSettings } from '@sap/open-ux-tools-types';

const TEST_NAME = 'worklistTemplate';

describe(`Fiori freestyle template: ${TEST_NAME}`, () => {

    const curTestOutPath = join(testOutputDir, TEST_NAME);

    const configuration: Array<{ name: string; config: FreestyleApp<unknown> }> = [
        {
            name: 'worklist_service_url',
            config: {
                app: {
                    id: 'wrk1',
                    title: 'App Title',
                    description: 'A Fiori application.',
                    flpAppId: 'wrk1-tile'
                },
                package: {
                    name: 'nods1',
                    description: 'A Fiori application.'
                },
                ui5: {
                    version: '1.78.16',
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
                    type: TemplateType.Worklist,
                    settings: {
                        entity: {
                            name: 'SEPMRA_C_PD_Product',
                            key: 'Product',
                            idProperty: 'Name',
                            numberProperty: 'Price',
                            unitOfMeasureProperty: 'Currency'
                        }
                    } as WorklistSettings
                },
                // Add a placeholder middleware, required for local run
                service: {
                    path: '/sap/opu/odata/sap/SEPMRA_PROD_MAN',
                    url: 'https://v2-products-review-exercise-beta2.cfapps.us10.hana.ondemand.com',
                    version: OdataVersion.v2,
                    metadata: getMetadata('SEPMRA_PROD_MAN')
                }
            }
        }
    ];

    beforeAll(() => {
        rmdirSync(curTestOutPath, { recursive: true });
    });

    test.each(configuration)('Generate files for template: $name', async ({ name, config }) => {
        const testPath = join(curTestOutPath, name);
        const fs = await generate(testPath, config);
        fs.commit(() => {});
        expect((fs as any).dump(testPath)).toMatchSnapshot();
    });
});
