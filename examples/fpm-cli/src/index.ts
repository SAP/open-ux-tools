import { join } from 'path';
import { generate as generateApp } from '@sap-ux/ui5-application-writer';
import { generate as generateService, OdataVersion } from '@sap-ux/odata-service-writer';
import { generateCustomPage, enableFPM } from '@sap-ux/fe-fpm-writer';

async function createFPMExample(appId: string): Promise<void> {
    const basePath = join('.tmp', appId);

    const fs = await generateApp(basePath, {
        app: {
            id: appId
        },
        // eslint-disable-next-line quote-props
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
            metadata: fs.read(join(__dirname, '../service/metadata.xml'))
        },
        fs
    );

    enableFPM(
        basePath,
        {
            fcl: true,
            replaceAppComponent: true
        },
        fs
    );

    generateCustomPage(
        basePath,
        {
            name: 'Main',
            entity: 'RootEntity'
        },
        fs
    );

    // add some hello world content
    const viewPath = join(basePath, 'webapp/ext/main/Main.view.xml');
    const view = fs.read(viewPath);
    fs.write(viewPath, view.replace('<content></content>', '<content><Text text="Hello World"/></content>'));

    // replace start script with mock config
    fs.extendJSON(join(basePath, 'package.json'), {
        scripts: {
            start: 'ui5 serve --config=ui5-mock.yaml --open index.html'
        }
    });

    return new Promise((resolve) => {
        fs.commit(() => {
            resolve();
        });
    });
}

createFPMExample('MyApp');
