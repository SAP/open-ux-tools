import { OdataService, OdataVersion } from '@sap/ux-odata-service-template';
import { tmpdir } from 'os';
import { join } from 'path';

export function prepareDebug(): { enabled: boolean; outputDir: string } {
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(tmpdir(), '/templates/fiori-freestyle');
    // eslint-disable-next-line no-console
    if (debug) {
        console.log(outputDir);
    }
    return { enabled: debug, outputDir };
}

export const commonConfig = {
    app: {
        id: 'test.me',
        title: 'My Test App',
        flpAppId: 'testme-app'
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
    version: OdataVersion.v2
};
