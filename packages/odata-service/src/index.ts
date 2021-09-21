import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { render } from 'ejs';
import {
    getFioriToolsProxyMiddlewareConfig,
    getMockServerMiddlewareConfig,
    addMiddlewareConfig,
    getAppReloadMiddlewareConfig
} from '@sap/ux-ui5-config';
import prettifyXml from 'prettify-xml';

import { enhanceData } from './data';
import { OdataService, OdataVersion } from '@sap/open-ux-tools-types';

/**
 * Validates the provided base path.
 *
 * @param {string} basePath - the base path
 * @param {Editor} fs - the memfs editor instance
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
 * Writes the template to the memfs editor instance.
 *
 * @param {string} basePath - the base path
 * @param {OdataService} data - the OData service instance
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
async function generate(basePath: string, data: OdataService, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);
    enhanceData(data);

    // add new and overwrite files from templates
    //const tmpPath = join(__dirname, 'templates', 'add');
    //fs.copyTpl(join(tmpPath, '**/*.*'), basePath, data);

    // merge content into existing files
    const templateRoot = join(__dirname, '..', 'templates');
    const extRoot = join(templateRoot, 'extend');

    // package.json
    const packagePath = join(basePath, 'package.json');
    fs.extendJSON(packagePath, fs.readJSON(join(extRoot, 'package.json')));
    const packageJson = JSON.parse(fs.read(packagePath));
    packageJson.ui5.dependencies.push('@sap/ux-ui5-fe-mockserver-middleware');
    fs.writeJSON(packagePath, packageJson);

    // manifest.json
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    fs.extendJSON(manifestPath, JSON.parse(render(fs.read(join(extRoot, `manifest.json`)), data)));

    // ui*.yaml
    const proxyMiddleware = getFioriToolsProxyMiddlewareConfig(data);
    const proxyLocalMiddleware = getFioriToolsProxyMiddlewareConfig(data, false);
    const appReloadMiddleware = getAppReloadMiddlewareConfig();
    // ui5.yaml
    await addMiddlewareConfig(fs, basePath, 'ui5.yaml', proxyMiddleware.config, proxyMiddleware.comments);
    await addMiddlewareConfig(fs, basePath, 'ui5.yaml', appReloadMiddleware);

	// ui5-local.yaml
    await addMiddlewareConfig(
        fs,
        basePath,
        'ui5-local.yaml',
        proxyLocalMiddleware.config,
        proxyLocalMiddleware.comments
    );
    await addMiddlewareConfig(fs, basePath, 'ui5-local.yaml', appReloadMiddleware);
    const mwMock = getMockServerMiddlewareConfig(data);

    if (data.metadata) {
        // ui5-mock.yaml
        await addMiddlewareConfig(fs, basePath, 'ui5-mock.yaml', proxyMiddleware.config, proxyMiddleware.comments);
        await addMiddlewareConfig(fs, basePath, 'ui5-mock.yaml', mwMock);
        await addMiddlewareConfig(fs, basePath, 'ui5-mock.yaml', appReloadMiddleware);
        // create local copy of metadata and annotations
        fs.write(join(basePath, 'webapp', 'localService', 'metadata.xml'), prettifyXml(data.metadata, { indent: 4 }));
    }

    if (data.annotations?.xml) {
        fs.write(
            join(basePath, 'webapp', 'localService', `${data.annotations.technicalName}.xml`),
            prettifyXml(data.annotations.xml, { indent: 4 })
        );
    }
    return fs;
}

export { generate, OdataVersion, OdataService };
