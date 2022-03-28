import { join } from 'path';
import { generate as generateApp } from '@sap-ux/ui5-application-writer';
import { generateCustomPage, enableFPM } from '@sap-ux/fe-fpm-writer';

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

    enableFPM(basePath, { fcl: true }, fs);

    generateCustomPage(
        basePath,
        {
            name: 'Main',
            entity: 'MyEntity'
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
