import { FioriElementsApp, generate, TemplateType, LROPSettings } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { testOutputDir, getTestData, debug } from './common';
import { OdataService, OdataVersion } from '@sap-ux/odata-service-writer';
import { OVPSettings } from '../src/types';

const TEST_NAME = 'ovpTemplate';

describe(`Fiori Elements template: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

    const v2Service: OdataService = {
        path: '/sap/opu/odata/sap/SEPMRA_PROD_MAN',
        url: 'http://example.lrop.v4',
        version: OdataVersion.v2,
        metadata: getTestData('sepmra_prod_man_v2', 'metadata'),
        annotations: {
            technicalName: 'SEPMRA_PROD_MAN_ANNO_MDL',
            xml: getTestData('sepmra_prod_man_v2', 'annotations')
        },
        model: 'mainModel',
        client: '012'
    }

    const ovpBaseConfig: FioriElementsApp<OVPSettings> = {
        app: {
            id: 'feovp1',
            title: 'App Title',
            description: 'A Fiori application.',
            flpAppId: 'feovp1-tile'
        },
        package: {
            name: 'feovp1',
            description: 'A Fiori application.'
        },
        ui5: {
            version: '1.92.0',
            descriptorVersion: '1.38.0',
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
            ui5Theme: 'sap_belize',
            localVersion: '1.86.3'
        },
        template: {
            type: TemplateType.OverviewPage,
            settings: {
                entityConfig: {
                    mainEntity: {
                        entityName: 'Artists'
                    },
                    filterEntityType: 'ProductSet',
                    navigationEntity: {
                        EntitySet: 'Publications',
                        Name: '_Publication',
                        Role: ''
                    }
                }
            }
        },
        service: v2Service
    };



    const configuration: Array<{ name: string; config: FioriElementsApp<OVPSettings> }> = [
        {
            name: 'ovpV2',
            config: {
                ...ovpBaseConfig,
                service: v2Service
            }
        }
    ];

    beforeAll(() => {
        removeSync(curTestOutPath); // even for in memory
    });

    test.each(configuration)('Generate files for template: $name', async ({ name, config }) => {
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
