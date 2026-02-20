import '@sap-ux/jest-file-matchers';

import { DatasourceType } from '@sap-ux/odata-service-inquirer';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { join } from 'node:path';
import type { Project, Service, State } from '../../../src/types';
import { getTestData, getTestDir } from '../test-utils';

export const EXPECTED_OUTPUT_DIR_NAME = './expected-output';

export const testNameSpace = 'testNameSpace';
export const testUI5Version = '1.98.0';

/**
 * Get the expected output path where snapshots are found
 */
export function getExpectedOutputPath(testProjectName: string): string {
    return join(__dirname, EXPECTED_OUTPUT_DIR_NAME, testProjectName);
}

export const v2Service: Service = {
    servicePath: '/sap/opu/odata/sap/SEPMRA_PROD_MAN',
    host: 'https://sap-ux-mock-services-v2-lrop.cfapps.us10.hana.ondemand.com',
    version: OdataVersion.v2,
    edmx: getTestData(join(__dirname, './fixtures'), 'sepmra_prod_man_v2', 'metadata'),
    annotations: [
        {
            TechnicalName: 'SEPMRA_PROD_MAN_ANNO_MDL',
            Definitions: getTestData(join(__dirname, './fixtures'), 'sepmra_prod_man_v2', 'annotations'),
            Version: '2.0',
            Uri: ''
        }
    ],
    client: '012',
    source: DatasourceType.odataServiceUrl
};

export const v2EntityConfig: State['entityRelatedConfig'] = {
    mainEntity: {
        entitySetName: 'SEPMRA_C_PD_Product',
        entitySetType: 'SEPMRA_C_PD_ProductType'
    },
    navigationEntity: {
        entitySetName: 'SEPMRA_C_PD_ProductSalesData',
        navigationPropertyName: 'to_ProductSalesData'
    }
};

export const v4Service: Service = {
    servicePath: '/sap/opu/odata4/dmo/sb_travel_mduu_o4/srvd/dmo/sd_travel_mduu/0001/',
    host: 'https://sap-ux-mock-services-v4-feop.cfapps.us10.hana.ondemand.com',
    version: OdataVersion.v4,
    edmx: getTestData(join(__dirname, './fixtures'), 'travel_v4', 'metadata'),
    source: DatasourceType.odataServiceUrl
};

export const v4EntityConfig: State['entityRelatedConfig'] = {
    mainEntity: {
        entitySetName: 'Travel',
        entitySetType: 'TravelType'
    },
    navigationEntity: {
        entitySetName: 'Booking',
        navigationPropertyName: '_Booking'
    }
};

// Base test Project
export const baseTestProject = (targetFolder = getTestDir()): Partial<Project> => ({
    title: `Project's "Title"`,
    description: `Test 'Project' "Description"`,
    namespace: testNameSpace,
    targetFolder: targetFolder,
    ui5Version: testUI5Version,
    ui5Theme: 'sap_fiori_3',
    skipAnnotations: false,
    sapux: true,
    localUI5Version: '1.82.2'
});
