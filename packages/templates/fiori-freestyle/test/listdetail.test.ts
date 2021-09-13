import { FreestyleApp, generate } from '../src';
import { join } from 'path';
import { ListDetailSettings, TemplateType } from '../src/data';
import { rmdirSync } from 'fs';
import { prepareDebug, commonConfig, northwind } from './common';

describe('Fiori freestyle template: ListDetail', () => {
    const debug = prepareDebug();

    const configuration: Array<{ name: string; config: FreestyleApp<unknown> }> = [
        {
            name: 'listdetail-good',
            config: {
                ...commonConfig,
                service: northwind,
                template: {
                    type: TemplateType.ListDetail,
                    settings: {
                        entity: {
                            name: 'Suppliers',
                            key: 'SupplierID',
                            idProperty: 'CompanyName',
                            numberProperty: undefined,
                            unitOfMeasureProperty: undefined
                        },
                        lineItem: {
                            name: 'Products',
                            key: 'ProductID',
                            idProperty: 'ProductName',
                            numberProperty: 'UnitsInStock',
                            unitOfMeasureProperty: 'QuantityPerUnit'
                        }
                    }
                }
            } as FreestyleApp<ListDetailSettings>
        }
    ];

    beforeAll(() => {
        rmdirSync(debug.outputDir, { recursive: true });
    });

    test.each(configuration)('generates files for template: $name', async ({ config }) => {
        const fs = await generate(join(debug.outputDir, config.template.type), config);
        fs.commit(() => 0)
        expect((fs as any).dump(debug.outputDir)).toMatchSnapshot();
    });
});
