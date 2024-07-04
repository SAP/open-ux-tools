import type { FreestyleApp } from '../src';
import { generate } from '../src';
import { join } from 'path';
import { TemplateType } from '../src/types';
import type { OdataService } from '@sap-ux/odata-service-writer';
import { removeSync } from 'fs-extra';
import { sample } from './sample/metadata';
import { testOutputDir, debug, northwind } from './common';

const TEST_NAME = 'allTemplate';

describe(`Fiori freestyle templates: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);
    const commonConfig: Partial<FreestyleApp<any>> = {
        app: {
            id: 'test.me',
            title: 'My Test App',
            description: 'Test App Description',
            flpAppId: 'testme-app',
            sourceTemplate: {
                version: '1.2.3-test',
                id: 'test-template'
            }
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

    const northwindV2Metadata: OdataService = Object.assign(northwind, { metadata: sample.NorthwindV2 });

    const configuration: Array<{ name: string; config: FreestyleApp<any> }> = [
        {
            name: 'listdetail',
            config: {
                ...commonConfig,
                service: northwindV2Metadata,
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
            } as FreestyleApp<any>
        },
        {
            name: 'worklist',
            config: {
                ...commonConfig,
                service: northwindV2Metadata,
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
            } as FreestyleApp<any>
        },
        {
            name: 'basic',
            config: {
                ...commonConfig,
                service: northwindV2Metadata,
                template: {
                    type: TemplateType.Basic,
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
            } as FreestyleApp<any>
        }
    ];

    beforeAll(() => {
        removeSync(curTestOutPath); // even for in memory
    });

    test.each(configuration)('Generate files for template: $name', async ({ name, config }) => {
        const testPath = join(curTestOutPath, name);
        const fs = await generate(testPath, config);
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
