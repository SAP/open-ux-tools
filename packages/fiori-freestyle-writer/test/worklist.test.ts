import type { FreestyleApp } from '../src';
import { generate, TemplateType } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { testOutputDir, debug, getMetadata } from './common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { WorklistSettings } from '../src/types';

const TEST_NAME = 'worklistTemplate';

describe(`Fiori freestyle template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

    const commonConfig = {
        app: {
            id: 'wrk1',
            title: 'App Title',
            description: 'A Fiori application.',
            sourceTemplate: {
                version: '1.2.3-test',
                id: 'test-template'
            }
        },
        'package': {
            name: 'nods1',
            description: 'A Fiori application.'
        },
        ui5: {
            version: '1.78.16',
            descriptorVersion: '1.22.0',
            ui5Libs: [
                'sap.f',
                'sap.m',
                'sap.suite.ui.generic.template',
                'sap.ui.comp',
                'sap.ui.core',
                'sap.ui.generic.app',
                'sap.ui.table',
                'sap.ushell'
            ],
            localVersion: '1.86.3',
            ui5Theme: 'sap_belize'
        }
    };

    const v2Service = {
        path: '/sap/opu/odata/sap/SEPMRA_PROD_MAN',
        url: 'https://v2-products-review-exercise-beta2.cfapps.us10.hana.ondemand.com',
        version: OdataVersion.v2,
        metadata: getMetadata('sepmra_prod_man_v2'),
        model: '',
        client: '012',
        destination: {
            name: 'SIDCLNT012'
        },
        previewSettings: {
            scp: true
        }
    };

    const configuration: Array<{ name: string; config: FreestyleApp<unknown> }> = [
        {
            name: 'worklist_service_url_v2',
            config: {
                ...commonConfig,
                template: {
                    type: TemplateType.Worklist,
                    settings: {
                        entity: {
                            name: 'SEPMRA_C_PD_Product',
                            key: 'Product',
                            idProperty: 'Name',
                            numberProperty: 'Price',
                            unitOfMeasureProperty: 'Currency'
                        }
                    } as WorklistSettings
                },
                service: v2Service
            }
        },
        {
            name: 'worklist_metadata_v4',
            config: {
                ...commonConfig,
                template: {
                    type: TemplateType.Worklist,
                    settings: {
                        entity: {
                            name: 'SalesOrderItem',
                            key: 'ID',
                            idProperty: 'PurchaseOrderByCustomer'
                        }
                    } as WorklistSettings
                },
                service: {
                    path: '/here/goes/your/serviceurl/',
                    version: OdataVersion.v4,
                    metadata: getMetadata('sales_order_manage_v4')
                }
            }
        },
        {
            name: 'worklist_service_url_v4',
            config: {
                ...commonConfig,
                ui5: {
                    ...commonConfig.ui5,
                    ui5Theme: 'sap_fiori_3_dark'
                },
                template: {
                    type: TemplateType.Worklist,
                    settings: {
                        entity: {
                            name: 'Products',
                            key: 'ID',
                            idProperty: 'ID'
                        }
                    } as WorklistSettings
                },
                service: {
                    path: '/catalog-admin-noauth',
                    url: 'https://fesamples-tooling.cfapps.sap.hana.ondemand.com',
                    version: OdataVersion.v4,
                    metadata: getMetadata('fe_samples_v4')
                }
            }
        },
        {
            name: 'worklist_ts',
            config: {
                ...commonConfig,
                template: {
                    type: TemplateType.Worklist,
                    settings: {
                        entity: {
                            name: 'SEPMRA_C_PD_Product',
                            key: 'Product',
                            idProperty: 'Name',
                            numberProperty: 'Price',
                            unitOfMeasureProperty: 'Currency'
                        }
                    } as WorklistSettings
                },
                service: v2Service,
                appOptions: {
                    typescript: true
                }
            }
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
