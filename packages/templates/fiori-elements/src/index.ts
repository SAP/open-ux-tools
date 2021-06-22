import { join } from 'path';
import { Editor } from 'mem-fs-editor';
import { render } from 'ejs';

import { generate as generateUi5Project } from '@sap/ux-ui5-application-template';
import { generate as addOdataService } from '@sap/ux-odata-service-template';
import { FEApp, getBaseComponent } from './data';
import { UI5Config } from '../../../lib/ui5-config/dist';
import { getUI5Libs } from './data/ui5Libs';
import { getMiddlewareConfig } from './data/middlewareConfig';

/**
 * @param basePath
 * @param data
 * @param fs
 */
async function generate<T>(basePath: string, data: FEApp<T>, fs?: Editor): Promise<Editor> {
    // generate base UI5 project
    data.app.baseComponent = getBaseComponent(data.template);
    fs = await generateUi5Project(basePath, data, fs);

    // add new and overwrite files from templates e.g. annotations.xml
    const tmpPath = join(__dirname, '..', 'templates', 'add');
    fs.copyTpl(join(tmpPath, '**/*.*'), basePath, data);

    // merge content into existing files
    const extRoot = join(__dirname, '..', 'templates', 'extend');

    // package.json
    const packagePath = join(basePath, 'package.json');
    fs.extendJSON(packagePath, fs.readJSON(join(extRoot, 'package.json')));
    const packageJson = JSON.parse(fs.read(packagePath));
    packageJson.ui5.dependencies.push('@sap/ux-ui5-tooling');
    fs.writeJSON(packagePath, packageJson);

    // manifest.json
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    fs.extendJSON(manifestPath, fs.readJSON(join(extRoot, 'manifest.json')));
    fs.extendJSON(
        manifestPath,
        JSON.parse(render(fs.read(join(extRoot, data.template.version, `manifest.${data.template.type}.json`)), data))
    );

    // ui5.yaml
    const ui5ConfigPath = join(basePath, 'ui5.yaml');
    const ui5Config = await UI5Config.newInstance(fs.read(ui5ConfigPath));
    ui5Config
        .addLibraries(getUI5Libs(data.template.type, data.template.version))
        .addCustomMiddleware(getMiddlewareConfig());
    fs.write(ui5ConfigPath, ui5Config.toString());

    // add service to the project
    await addOdataService(basePath, data.service, fs);
    const manifest = JSON.parse(fs.read(manifestPath));
    manifest['sap.app'].dataSources[data.service.name!].settings.annotations.push('annotation');
    fs.writeJSON(manifestPath, manifest);
    return fs;
}

export { generate };
