import { FreestyleApp, generate } from '../../src';
import { join } from 'path';
import { ListDetailSettings, TemplateType } from '@sap/open-ux-tools-types';
import { rmdirSync } from 'fs';
import { promisify } from 'util';
import { commonConfig, northwind, debug, testOutputDir } from './common';

const TEST_NAME = 'listDetailTemplate';

describe(`Fiori freestyle template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

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
        rmdirSync(curTestOutPath, { recursive: true });
    });

    test.each(configuration)('Generate files for template: $name', async ({ name, config }) => {
        const testPath = join(curTestOutPath, name);
        const fs = await generate(join(testPath), config);
        expect((fs as any).dump(testPath)).toMatchSnapshot();
        // write out the files for debugging
        return new Promise((resolve) => {
            fs.commit(resolve);
        });
    });
});
