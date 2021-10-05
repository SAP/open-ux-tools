import { FreestyleApp, generate } from '../../src';
import { join } from 'path';
import { ListDetailSettings, TemplateType } from '@sap/open-ux-tools-types';
import { removeSync } from 'fs-extra';
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
        removeSync(curTestOutPath);  // even for in memory
    });

    test.each(configuration)('Generate files for template: $name', async ({ name, config }) => {
        const testPath = join(curTestOutPath, name);
        const fs = await generate(join(testPath), config);
        expect((fs as any).dump(testPath)).toMatchSnapshot();
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug?.enabled) {
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        });
    });
});
