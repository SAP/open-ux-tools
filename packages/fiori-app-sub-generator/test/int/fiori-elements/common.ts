import '@sap-ux/jest-file-matchers';

import { DatasourceType } from '@sap-ux/odata-service-inquirer';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { Project, Service, State } from '../../../src/types';
import type { FioriAppGeneratorOptions } from '../../../src/fiori-app-generator';
import { join } from 'path';
import yeomanTest from 'yeoman-test';
import { getTestData, TestWritingGenerator } from '../test-utils';

const GENERATION_TEST_DIR = './test-output/';
export const EXPECTED_OUTPUT_DIR_NAME = './expected-output';

export const testNameSpace = 'testNameSpace';
export const originalCwd: string = process.cwd(); // Generation changes the cwd, this breaks sonar report so we restore later
export const tmpFolder = join(__dirname, '../test-tmp');
export const testUI5Version = '1.98.0';

/**
 * Sets the output test directory path appending the specified path if provided.
 * If this function is not called the default test directoty will be used.
 *
 * @param testGroup - name of the folder that will be used for testing outputs
 * @returns the path to the test directory
 */
export function getTestDir(testGroup = ''): string {
    return join(__dirname, '../../', GENERATION_TEST_DIR, testGroup);
}

export async function runWritingPhase(
    state: Partial<State>,
    testSpecificTmpFolder = tmpFolder,
    options?: Partial<FioriAppGeneratorOptions>
): Promise<any> {
    const mergedOptions = {
        state,
        skipInstall: true,
        ...options
    };
    return yeomanTest.create(TestWritingGenerator, {}, {}).cd(testSpecificTmpFolder).withOptions(mergedOptions).run();
}

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
