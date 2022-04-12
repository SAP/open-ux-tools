import { FioriElementsApp, generate, TemplateType, LROPSettings } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { testOutputDir, debug, getTestData, feBaseConfig } from './common';
import { OdataService, OdataVersion } from '@sap-ux/odata-service-writer';
import {
    ALPSettings,
    ALPSettingsV2,
    ALPSettingsV4,
    TableSelectionMode,
    TableType,
    WorklistSettings
} from '../src/types';

const TEST_NAME = 'alpTemplates';

describe(`Fiori Elements template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

    // ALP require specific entity relationships, so we do not re-use the common test services
    const v4Service: OdataService = {
        path: '/sap/opu/odata4/sap/c_salesordermanage_srv/srvd/sap/c_salesordermanage_sd_aggregate/0001/',
        url: 'http://example.alp.v4',
        version: OdataVersion.v4,
        metadata: getTestData('sales_order_manage_v4', 'metadata')
    };

    const v2Service: OdataService = {
        path: '/sap/opu/odata/sap/SEPMRA_ALP_SO_ANA_SRV',
        url: 'http://example.alp.v2',
        version: OdataVersion.v2,
        metadata: getTestData('sepmra_so_ana_alp_v2', 'metadata'),
        annotations: {
            technicalName: 'SEPMRA_PROD_MAN_ANNO_MDL',
            xml: getTestData('sepmra_so_ana_alp_v2', 'annotations')
        }
    };

    const alpConfigs: Array<{ name: string; config: FioriElementsApp<ALPSettings> }> = [
        {
            name: 'alpV4',
            config: {
                ...Object.assign(feBaseConfig('alp1'), {
                    template: {
                        type: TemplateType.AnalyticalListPage,
                        settings: {
                            entityConfig: {
                                mainEntityName: 'SalesOrderItem',
                                navigationEntity: {
                                    EntitySet: 'MaterialDetails',
                                    Name: '_MaterialDetails'
                                }
                            },
                            tableType: TableType.RESPONSIVE
                        } as ALPSettingsV4
                    }
                }),
                service: v4Service
            } as FioriElementsApp<ALPSettings>
        },
        {
            name: 'alpV2',
            config: {
                ...Object.assign(feBaseConfig('alp2'), {
                    template: {
                        type: TemplateType.AnalyticalListPage,
                        settings: {
                            entityConfig: {
                                mainEntityName: 'SEPMRA_C_ALP_SlsOrdItemCubeALPResults',
                                navigationEntity: {
                                    EntitySet: 'SEPMRA_C_ALP_SalesOrderItem',
                                    Name: 'to_SalesOrderItem'
                                }
                            },
                            tableType: TableType.RESPONSIVE,
                            qualifier: 'DefaultVariant',
                            multiSelect: true
                        } as ALPSettingsV2
                    }
                }),
                service: v2Service
            } as FioriElementsApp<ALPSettingsV2>
        }
    ];

    beforeAll(() => {
        removeSync(curTestOutPath); // even for in memory
    });

    test.each(alpConfigs)('Generate files for template: $name', async ({ name, config }) => {
        const testPath = join(curTestOutPath, name);
        const fs = await generate(testPath, config);
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
