import type { FioriElementsApp } from '../src';
import { generate, TemplateType } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { testOutputDir, getTestData, debug, feBaseConfig } from './common';
import type { OdataService } from '@sap-ux/odata-service-writer';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { OVPSettings } from '../src/types';

const TEST_NAME = 'ovpTemplate';

describe(`Fiori Elements template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

    const ovpV2Service: OdataService = {
        path: '/sap/opu/odata/sap/GWSAMPLE_BASIC',
        url: 'http://example.ovp.v2',
        version: OdataVersion.v2,
        metadata: getTestData('gwsample_basic_v2', 'metadata'),
        annotations: {
            technicalName: 'GWSAMPLE_BASIC',
            xml: getTestData('gwsample_basic_v2', 'annotations')
        }
    };

    const v4Service: OdataService = {
        path: '/sap/opu/odata4/sap/c_salesordermanage_srv/srvd/sap/c_salesordermanage_sd_aggregate/0001/',
        url: 'http://example.alp.v4',
        version: OdataVersion.v4,
        metadata: getTestData('sales_order_manage_v4', 'metadata')
    };

    const configuration: Array<{ name: string; config: FioriElementsApp<OVPSettings> }> = [
        {
            name: 'ovpV2',
            config: {
                ...Object.assign(feBaseConfig('feovp1'), {
                    template: {
                        type: TemplateType.OverviewPage,
                        settings: {
                            filterEntityType: 'GlobalFilters'
                        }
                    }
                }),
                service: ovpV2Service
            } as FioriElementsApp<OVPSettings>
        },
        {
            name: 'ovpV4',
            config: {
                ...Object.assign(feBaseConfig('feovp2'), {
                    template: {
                        type: TemplateType.OverviewPage,
                        settings: {
                            filterEntityType: 'SalesOrderItem'
                        }
                    },
                    ui5: {
                        version: '1.97.0'
                    }
                }),
                service: v4Service
            } as FioriElementsApp<OVPSettings>
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
