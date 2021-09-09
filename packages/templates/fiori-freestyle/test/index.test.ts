import { FreestyleApp, generate } from '../src';
import { join } from 'path';
import { TemplateType } from '../src/data';
import { OdataService, OdataVersion } from '@sap/ux-odata-service-template';
import { rmdirSync } from 'fs';

describe('Fiori freestyle templates', () => {

    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, 'test-output');

    beforeAll(() => {
        rmdirSync(outputDir, { recursive: true });
    });
    // eslint-disable-next-line no-console
    if (debug) { console.log(outputDir); }

    const commonConfig = {
        app: {
            id: 'test.me',
            title: 'My Test App',
            description: 'Test App Description',
            flpAppId: 'test.me'

        },
        "package": {
            name: 'test.me'
        }
    };

    const northwind: OdataService = {
        url: 'https://services.odata.org',
        path: '/V2/Northwind/Northwind.svc',
        version: OdataVersion.v2
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
        const templateOutputDir = join(outputDir, config.template.type);
        const fs = await generate(join(templateOutputDir, config.template.type), config);
        fs.commit(() => 0);
        expect((fs as any).dump(templateOutputDir)).toMatchSnapshot();
    });
});
