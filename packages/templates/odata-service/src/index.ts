import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { render } from 'ejs';
import { UI5Config } from '@sap/ux-ui5-config';

import { OdataService, OdataVersion, enhanceData } from './data';
import { getMiddlewareConfig, getLocalMiddlewareConfig } from './data/middleware';

/**
 * @param basePath
 * @param fs
 */
function validateBasePath(basePath: string, fs: Editor) {
    [join(basePath, 'package.json'), join(basePath, 'webapp', 'manifest.json'), join(basePath, 'ui5.yaml')].forEach(
        (path) => {
            if (!fs.exists(path)) {
                throw new Error(`Invalid project folder. Cannot find required file ${path}`);
            }
        }
    );
}

/**
 * @param basePath
 * @param data
 * @param fs
 */
async function generate<T>(basePath: string, data: OdataService, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);
    enhanceData(data);

    // add new and overwrite files from templates
    //const tmpPath = join(__dirname, 'templates', 'add');
    //fs.copyTpl(join(tmpPath, '**/*.*'), basePath, data);

    // merge content into existing files
    const extRoot = join(__dirname, '..', 'templates', 'extend');

    // package.json
    const packagePath = join(basePath, 'package.json');
    fs.extendJSON(packagePath, fs.readJSON(join(extRoot, 'package.json')));
    const packageJson = JSON.parse(fs.read(packagePath));
    packageJson.ui5.dependencies.push('@sap/ux-ui5-fe-mockserver-middleware');
    fs.writeJSON(packagePath, packageJson);

    // manifest.json
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    fs.extendJSON(manifestPath, JSON.parse(render(fs.read(join(extRoot, `manifest.json`)), data)));

    // ui5.yaml and ui5-local.yaml
    const ui5ConfigPath = join(basePath, 'ui5.yaml');
    const existingUI5Config = fs.read(ui5ConfigPath);

    const ui5Config = await UI5Config.newInstance(existingUI5Config);
    ui5Config.addCustomMiddleware(...getMiddlewareConfig(data));
    fs.write(ui5ConfigPath, ui5Config.toString());

    const ui5LocalConfig = await UI5Config.newInstance(existingUI5Config);
    ui5LocalConfig.addCustomMiddleware(getLocalMiddlewareConfig(data));
    fs.write(join(basePath, 'ui5-local.yaml'), ui5LocalConfig.toString());

    // create local copy of metadata and annotations
    if (data.metadata) {
        fs.write(join(basePath, 'webapp', 'localService', 'metadata.xml'), data.metadata);
    }
    if (data.annotations?.xml) {
        fs.write(
            join(basePath, 'webapp', 'localService', `${data.annotations.technicalName}.xml`),
            data.annotations.xml
        );
    }

    return fs;
}

export { generate, OdataVersion, OdataService };
