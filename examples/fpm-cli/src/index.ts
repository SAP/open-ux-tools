import { join } from 'path';
import { generate as generateApp } from '@sap-ux/ui5-application-writer';
import { generate as generateService, OdataVersion } from '@sap-ux/odata-service-writer';
import { generateCustomPage, enableFPM } from '@sap-ux/fe-fpm-writer';
import { readFileSync } from 'fs';

const createFPMExample = async function (appId: string): Promise<void> {
    const basePath = join('.tmp', appId);

    const fs = await generateApp(basePath, {
        app: {
            id: appId
        },
        package: {
            name: appId
        }
    });

    await generateService(
        basePath,
        {
            version: OdataVersion.v4,
            url: 'http://my.sap.example',
            path: '/mock/service/path',
            metadata: readFileSync(join(__dirname, '../service/metadata.xml'), 'utf-8')
        },
        fs
    );

    enableFPM(basePath, { fcl: true }, fs);

    generateCustomPage(
        basePath,
        {
            name: 'Main',
            entity: 'RootEntity'
        },
        fs
    );

    return new Promise((resolve) => {
        fs.commit(() => {
            resolve();
        });
    });
};

createFPMExample('MyApp');
