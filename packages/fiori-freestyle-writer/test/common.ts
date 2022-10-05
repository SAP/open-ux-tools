import type { OdataService } from '@sap-ux/odata-service-writer';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { join } from 'path';
import { readFileSync } from 'fs';
import { sample } from './sample/metadata';
import { create as createStore } from 'mem-fs';
import { create } from 'mem-fs-editor';

export const testOutputDir = join(__dirname, '/test-output');

export const debug = prepareDebug();

/**
 * @returns object
 *          object.enabled debug enabled boolean
 *          object.outputDir output directory
 */
export function prepareDebug(): { enabled: boolean; outputDir: string } {
    const debug = !!process.env['UX_DEBUG'];

    if (debug) {
        console.log(testOutputDir);
    }
    return { enabled: debug, outputDir: testOutputDir };
}

export const commonConfig = {
    app: {
        id: 'test.me',
        title: 'My Test App',
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

export const northwind: OdataService = {
    url: 'https://services.odata.org',
    path: '/V2/Northwind/Northwind.svc',
    version: OdataVersion.v2,
    metadata: sample.NorthwindV2
};

const sampleTestStore = create(createStore());
export const getMetadata = (serviceName: string) => {
    const metadataPath = join(__dirname, 'sample', serviceName, 'metadata.xml');
    if (sampleTestStore.exists(metadataPath)) {
        return sampleTestStore.read(metadataPath);
    }

    return sampleTestStore.write(metadataPath, readFileSync(metadataPath));
};
