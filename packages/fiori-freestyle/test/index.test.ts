import { FreestyleApp, generate } from '../src';
import { join } from 'path';
import { TemplateType, OdataService, OdataVersion } from '@sap/open-ux-tools-types';
import { rmdirSync } from 'fs';
import { sample } from './sample/metadata';
import { testOutputDir, debug, northwind } from './common';

const TEST_NAME = 'TemplateAll';

describe(`Fiori freestyle templates: ${TEST_NAME}`, () => {

    const curTestOutPath = join(testOutputDir, TEST_NAME);

    // eslint-disable-next-line no-console
    if (debug) {
        console.log(testOutputDir);
    }

    const commonConfig = {
        app: {
            id: 'test.me',
            title: 'My Test App',
            description: 'Test App Description',
            flpAppId: 'testme-app'
        },
        package: {
            name: 'test.me'
        },
        ui5: {
            localVersion: '1.90.0',
            version: '', // I.e Latest
            ui5Theme: 'sap_fiori_3',
            ui5Libs: 'sap.m,sap.ushell'
        }
    };

    const northwindV2Metadata: OdataService = Object.assign(northwind, { metadata: sample.NorthwindV2 });

    const configuration: Array<{ name: string; config: FreestyleApp<any> }> = [
        {
            name: 'listdetail',
            config: {
                ...commonConfig,
                service: northwindV2Metadata,
                template: {
                    type: TemplateType.ListDetail,
                    settings: {
                        entity: {
                            name: 'Products',
                            key: 'ProductID',
                            idProperty: 'ProductName',
                            numberProperty: 'UnitsInStock',
                            unitOfMeasureProperty: 'QuantityPerUnit'
                        },
                        lineItem: { name: 'Products' }
                    }
                }
            }
        },
        {
            name: 'worklist',
            config: {
                ...commonConfig,
                service: northwindV2Metadata,
                template: {
                    type: TemplateType.Worklist,
                    settings: {
                        entity: {
                            name: 'Products',
                            key: 'ProductID',
                            idProperty: 'ProductName',
                            numberProperty: 'UnitsInStock',
                            unitOfMeasureProperty: 'QuantityPerUnit'
                        }
                    }
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
