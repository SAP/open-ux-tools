import { FreestyleApp, generate } from '../src';
import { join } from 'path';
import { TemplateType, OdataService, OdataVersion } from '@sap/open-ux-tools-types';
import { rmdirSync } from 'fs';
import { sample } from './sample/metadata';
import { outputDir, debug, northwind } from './common';

describe('Fiori freestyle templates', () => {

    beforeAll(() => {
        rmdirSync(outputDir, { recursive: true });
    });

    // eslint-disable-next-line no-console
    if (debug) {
        console.log(outputDir);
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

    const northwindMetadata: OdataService = Object.assign(northwind, { metadata: sample.NorthwindV2 });

    const configuration: Array<{ name: string; config: FreestyleApp<any> }> = [
        {
            name: 'basic',
            config: {
                ...commonConfig,
                template: {
                    type: TemplateType.Basic,
                    settings: {}
                }
            }
        },
        {
            name: 'listdetail',
            config: {
                ...commonConfig,
                service: northwindMetadata,
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
                service: northwindMetadata,
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

    test.each(configuration)('generates files for template: $name', async ({ config }) => {
        const templateOutputDir = join(outputDir);
        const fs = await generate(join(templateOutputDir, config.template.type), config);
        if (debug.enabled) fs.commit(() => 0);
        expect((fs as any).dump(templateOutputDir)).toMatchSnapshot();
    });
});
