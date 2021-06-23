import { FreestyleApp, generate } from '../src';
import { join } from 'path';
import { TemplateType } from '../src/data';
import { OdataService, OdataVersion } from '@sap/ux-odata-service-template';
import { tmpdir } from 'os';
import { rmdirSync } from 'fs';

describe('Fiori freestyle templates', () => {
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(tmpdir(), '/templates/fiori-freestyle');

    const commonConfig = {
        app: {
            id: 'test.me',
            title: 'My Test App'
        },
        package: {
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

    afterEach(() => {
        if (!debug) rmdirSync(outputDir, { recursive: true });
    });

    test.each(configuration)('generates files for template: $name', async ({ config }) => {
        const fs = await generate(join(outputDir, config.template.type), config);
        if (debug) fs.commit(() => 0);
        expect((fs as any).dump(outputDir)).toMatchSnapshot();
    });
});
