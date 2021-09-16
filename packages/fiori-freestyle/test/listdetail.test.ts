import { FreestyleApp, generate } from '../src';
import { join } from 'path';
import { ListDetailSettings, TemplateType } from '@sap/open-ux-tools-types';
import { rmdirSync } from 'fs';
import { commonConfig, northwind, debug, outputDir } from './common';

describe('Fiori freestyle template: ListDetail', () => {

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
        rmdirSync(outputDir, { recursive: true });
    });

    test.each(configuration)('generates files for template: $name', async ({ name, config }) => {
        const fs = await generate(join(debug.outputDir, name), config);
        if (debug.enabled) fs.commit(() => 0)
        expect((fs as any).dump(debug.outputDir)).toMatchSnapshot();
    });
});
