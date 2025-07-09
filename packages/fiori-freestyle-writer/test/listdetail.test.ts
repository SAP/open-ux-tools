import type { FreestyleApp } from '../src';
import { generate } from '../src';
import { join } from 'path';
import type { ListDetailSettings } from '../src/types';
import { TemplateType } from '../src/types';
import { removeSync } from 'fs-extra';
import {
    commonConfig,
    northwind,
    debug,
    testOutputDir,
    projectChecks,
    updatePackageJSONDependencyToUseLocalPath
} from './common';
import { initI18n } from '../src/i18n';
import { before } from 'lodash';

const TEST_NAME = 'listDetailTemplate';

if (debug?.enabled) {
    jest.setTimeout(360000);
}

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
        },
        {
            name: 'listdetail-advanced-ts',
            config: {
                ...listDetailConfig,
                template: {
                    type: TemplateType.ListDetail,
                    settings: {
                        entity: {
                            name: 'Suppliers',
                            key: 'SupplierID',
                            idProperty: 'CompanyName',
                            numberProperty: 'Phone',
                            unitOfMeasureProperty: 'Region'
                        },
                        lineItem: {
                            name: 'Products',
                            key: 'ProductID',
                            idProperty: 'ProductName',
                            numberProperty: 'UnitsInStock',
                            unitOfMeasureProperty: 'QuantityPerUnit'
                        }
                    }
                },
                appOptions: {
                    typescript: true
                }
            } as FreestyleApp<ListDetailSettings>
        },
        {
            name: 'listdetail-advanced-ts_ui5_1_108',
            config: {
                ...listDetailConfig,
                template: {
                    type: TemplateType.ListDetail,
                    settings: {
                        entity: {
                            name: 'Suppliers',
                            key: 'SupplierID',
                            idProperty: 'CompanyName',
                            numberProperty: 'Phone',
                            unitOfMeasureProperty: 'Region'
                        },
                        lineItem: {
                            name: 'Products',
                            key: 'ProductID',
                            idProperty: 'ProductName',
                            numberProperty: 'UnitsInStock',
                            unitOfMeasureProperty: 'QuantityPerUnit'
                        }
                    }
                },
                ui5: {
                    minUI5Version: '1.108.0',
                    version: '', // I.e Latest
                    ui5Theme: 'sap_horizon',
                    ui5Libs: 'sap.m,sap.ushell'
                },
                appOptions: {
                    typescript: true
                }
            } as FreestyleApp<ListDetailSettings>
        },
        {
            name: 'listdetail-advanced-ts_ui5_1_113',
            config: {
                ...listDetailConfig,
                template: {
                    type: TemplateType.ListDetail,
                    settings: {
                        entity: {
                            name: 'Suppliers',
                            key: 'SupplierID',
                            idProperty: 'CompanyName',
                            numberProperty: 'Phone',
                            unitOfMeasureProperty: 'Region'
                        },
                        lineItem: {
                            name: 'Products',
                            key: 'ProductID',
                            idProperty: 'ProductName',
                            numberProperty: 'UnitsInStock',
                            unitOfMeasureProperty: 'QuantityPerUnit'
                        }
                    }
                },
                ui5: {
                    minUI5Version: '1.113.0',
                    version: '', // I.e Latest
                    ui5Theme: 'sap_horizon',
                    ui5Libs: 'sap.m,sap.ushell'
                },
                appOptions: {
                    typescript: true
                }
            } as FreestyleApp<ListDetailSettings>
        }
    ];

    beforeAll(async () => {
        removeSync(curTestOutPath); // even for in memory
        await initI18n();
    });

    test.each(configuration)('Generate files for template: $name', async ({ name, config }) => {
        const testPath = join(curTestOutPath, name);
        const fs = await generate(join(testPath), config);
        expect(fs.dump(testPath)).toMatchSnapshot();
        return new Promise(async (resolve) => {
            // write out the files for debugging
            if (debug?.enabled) {
                await updatePackageJSONDependencyToUseLocalPath(testPath, fs);
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        }).then(async () => {
            await projectChecks(testPath, config, debug?.debugFull);
        });
    });
});
