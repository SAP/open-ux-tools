import { FreestyleApp, generate } from '../src';
import { join } from 'path';
import { TemplateType } from '../src/data';
import { OdataService, OdataVersion } from '@sap/ux-odata-service-template';
import { rmdirSync } from 'fs';
import { sample } from './sample/metadata';

describe('Fiori freestyle templates', () => {
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, 'test-output');

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

    const northwind: OdataService = {
        url: 'https://services.odata.org',
        path: '/V2/Northwind/Northwind.svc',
        version: OdataVersion.v2,
        metadata: sample.NorthwindV2
    };

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
                service: northwind,
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
                service: northwind,
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
        fs.commit(() => 0);
        expect((fs as any).dump(templateOutputDir)).toMatchSnapshot();
    });
});
