import { OdataService, OdataVersion } from '@sap-ux/odata-service-writer';
import { readFileSync } from 'fs';
import { create as createStore } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { FEOPSettings, FioriElementsApp, LROPSettings, WorklistSettings } from '../src/types';

export const testOutputDir = join(__dirname, 'test-output');

export const debug = prepareDebug();

export function prepareDebug(): { enabled: boolean; outputDir: string } {
    const debug = !!process.env['UX_DEBUG'];
    // eslint-disable-next-line no-console
    if (debug) {
        console.log(testOutputDir);
    }
    return { enabled: debug, outputDir: testOutputDir };
}

const sampleTestStore = create(createStore());

/**
 * Get (and load to store) the specified service test data
 * @param serviceName
 * @param serviceType
 * @returns
 */
export const getTestData = (serviceName: string, serviceType: 'metadata' | 'annotations') => {
    const sampleDataPath = join(__dirname, 'sample', serviceName, `${serviceType}.xml`);
    if (sampleTestStore.exists(sampleDataPath)) {
        return sampleTestStore.read(sampleDataPath);
    }
    return sampleTestStore.write(sampleDataPath, readFileSync(sampleDataPath));
};

/**
 * List Report Object Page test settings
 */
export const feBaseConfig = (
    appId: string,
    addUi5Config: boolean = true
): Partial<FioriElementsApp<LROPSettings | FEOPSettings>> => {
    const config: Partial<FioriElementsApp<LROPSettings | FEOPSettings>> = {
        app: {
            id: appId,
            title: 'App "Title" \\"',
            description: 'A Fiori application.',
            flpAppId: `${appId}-tile`,
            sourceTemplate: {
                version: '1.2.3-test',
                id: 'test-fe-template'
            }
        },
        appOptions: {
            loadReuseLibs: true
        },
        package: {
            name: appId,
            description: 'A Fiori application.'
        }
    };

    if (addUi5Config) {
        config.ui5 = {
            version: '1.92.0',
            minUI5Version: '1.90.0',
            descriptorVersion: '1.37.0',
            ui5Libs: [],
            ui5Theme: 'sap_belize',
            localVersion: '1.86.3'
        };
    }

    return config;
};

export const v4Service: OdataService = {
    path: 'sap/opu/odata4/dmo/sb_travel_mduu_o4/srvd/dmo/sd_travel_mduu/0001/',
    url: 'http://example.feop.v4',
    version: OdataVersion.v4,
    metadata: getTestData('travel_v4', 'metadata'),
    localAnnotationsName: 'annotation'
};

export const v2Service: OdataService = {
    path: '/sap/opu/odata/sap/SEPMRA_PROD_MAN',
    url: 'http://example.lrop.v2',
    version: OdataVersion.v2,
    metadata: getTestData('sepmra_prod_man_v2', 'metadata'),
    annotations: {
        technicalName: 'SEPMRA_PROD_MAN_ANNO_MDL',
        xml: getTestData('sepmra_prod_man_v2', 'annotations')
    },
    client: '012'
};

export const v4TemplateSettings: LROPSettings | FEOPSettings | WorklistSettings = {
    entityConfig: {
        mainEntityName: 'Travel',
        navigationEntity: {
            EntitySet: 'Booking',
            Name: '_Booking'
        }
    }
};

export const v2TemplateSettings: LROPSettings | WorklistSettings = {
    entityConfig: {
        mainEntityName: 'SEPMRA_C_PD_Product',
        navigationEntity: {
            EntitySet: 'SEPMRA_C_PD_ProductSalesData',
            Name: 'to_ProductSalesData'
        }
    }
};
