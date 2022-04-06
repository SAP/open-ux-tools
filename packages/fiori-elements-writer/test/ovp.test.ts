import { FioriElementsApp, generate, TemplateType, LROPSettings } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { testOutputDir, getTestData, debug, feBaseConfig } from './common';
import { OdataService, OdataVersion } from '@sap-ux/odata-service-writer';
import { OVPSettings } from '../src/types';

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
