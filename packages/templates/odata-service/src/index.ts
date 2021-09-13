import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { render } from 'ejs';
import {
	getFioriToolsProxyMiddlewareConfig,
	getMockServerMiddlewareConfig,
	addMiddlewareConfig, NodeComment
} from "@sap/ux-ui5-config";
import prettifyXml from 'prettify-xml';

import { OdataService, OdataVersion, enhanceData } from './data';


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
		await addMiddlewareConfig(fs, basePath,'ui5.yaml', proxyMiddleware.config, proxyMiddleware.comments);
		await addMiddlewareConfig(fs, basePath,'ui5-local.yaml', proxyMiddleware.config, proxyMiddleware.comments);
		const mwMock = getFioriToolsProxyMiddlewareConfig(data);
		await addMiddlewareConfig(fs, basePath,'ui5-mock.yaml',proxyMiddleware.config, proxyMiddleware.comments);
		await addMiddlewareConfig(fs, basePath,'ui5-mock.yaml',mwMock.config, mwMock.comments);
		// await addMiddlewareConfig(basePath,'ui5-mock.yaml', ,fs);
    // // ui5.yaml
    // const ui5ConfigPath = join(basePath, 'ui5.yaml');
    // const existingUI5Config = fs.read(ui5ConfigPath);
		//
    // const ui5Config = await UI5Config.newInstance(existingUI5Config);
    // ui5Config.addCustomMiddleware(...getFioriToolsProxyMiddlewareConfig(data));
    // fs.write(ui5ConfigPath, ui5Config.toString());
		//
    // // ui5-local.yaml
    // const ui5LocalConfigPath = join(basePath, 'ui5-local.yaml');
    // const existingUI5LocalConfig = fs.read(ui5LocalConfigPath);
		//
    // const ui5LocalConfig = await UI5Config.newInstance(existingUI5LocalConfig);
    // ui5LocalConfig.addCustomMiddleware(...getFioriToolsProxyMiddlewareConfig(data));
    // fs.write(ui5LocalConfigPath, ui5LocalConfig.toString());
		//
    // // ui5-mock.yaml
    // const ui5MockConfig = await UI5Config.newInstance(existingUI5Config);
    // ui5MockConfig.addCustomMiddleware(getMockServerMiddlewareConfig(data));
    // fs.write(join(basePath, 'ui5-mock.yaml'), ui5MockConfig.toString());

    // create local copy of metadata and annotations
    if (data.metadata) {
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
