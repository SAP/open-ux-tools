import type { FreestyleApp } from '../src';
import { generate } from '../src';
import { join } from 'path';
import type { ListDetailSettings } from '../src/types';
import { TemplateType } from '../src/types';
import { removeSync } from 'fs-extra';
import { commonConfig, northwind, debug, testOutputDir } from './common';

const TEST_NAME = 'listDetailTemplate';

describe(`Fiori freestyle template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);
    const listDetailConfig = {
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
    } as FreestyleApp<ListDetailSettings>;

    const configuration: Array<{ name: string; config: FreestyleApp<unknown> }> = [
        {
            name: 'listdetail-good-eslint',
            config: {
                ...listDetailConfig,
                appOptions: {
                    codeAssist: true,
                    eslint: true
                }
            }
        },
        {
            name: 'listdetail-ts',
            config: {
                ...listDetailConfig,
                appOptions: {
                    typescript: true
                }
            } as FreestyleApp<ListDetailSettings>
        }
    ];

    beforeAll(() => {
        removeSync(curTestOutPath); // even for in memory
    });

    test.each(configuration)('Generate files for template: $name', async ({ name, config }) => {
        const testPath = join(curTestOutPath, name);
        const fs = await generate(join(testPath), config);
        expect(fs.dump(testPath)).toMatchSnapshot();
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
