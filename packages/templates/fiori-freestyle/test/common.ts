import { OdataService, OdataVersion } from "@sap/ux-odata-service-template";
import { tmpdir } from "os";
import { join } from "path";

export function prepareDebug(): { enabled: boolean, outputDir: string } {
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(tmpdir(), '/templates/fiori-freestyle');
    // eslint-disable-next-line no-console
    if (debug) { console.log(outputDir); }
    return { enabled: debug, outputDir };
}

export const commonConfig = {
    app: {
        id: 'test.me',
        title: 'My Test App'
    },
    "package": {
        name: 'test.me'
    }
};

export const northwind: OdataService = {
    url: 'https://services.odata.org',
    path: '/V2/Northwind/Northwind.svc',
    version: OdataVersion.v2
};