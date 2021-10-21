import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { render } from 'ejs';
import {
    getFioriToolsProxyMiddlewareConfig,
    getMockServerMiddlewareConfig,
    addMiddlewareConfig,
    getAppReloadMiddlewareConfig
} from '@sap-ux/ui5-config';
import prettifyXml from 'prettify-xml';

import { enhanceData } from './data';
import { t } from './i18n';
import { OdataService, OdataVersion } from './types';

/**
 * Validates the provided base path.
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {Editor} fs - the memfs editor instance
 */
function validateBasePath(basePath: string, fs: Editor) {
    [join(basePath, 'package.json'), join(basePath, 'webapp', 'manifest.json'), join(basePath, 'ui5.yaml')].forEach(
        (path) => {
            if (!fs.exists(path)) {
                throw new Error(t('error.requiredProjectFileNotFound', { path }));
            }
        }
    );
}
/**
 * Writes the odata service related file updates to an existing UI5 project specified by the base path.
 *
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {OdataService} data - the OData service instance
 * @param {Editor} [fs] - the memfs editor instance
 * @throws {Error} - if required UI5 project files are not found
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
async function generate(basePath: string, data: OdataService, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);
    enhanceData(data);

    // merge content into existing files
    const templateRoot = join(__dirname, '..', 'templates');
    const extRoot = join(templateRoot, 'extend');

    // manifest.json
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    // Get component app id
    const manifest = fs.readJSON(manifestPath);
    const appProp = 'sap.app';
    const appid = manifest?.[appProp]?.id;
    // Throw if required property is not found manifest.json
    if (!appid) {
        throw new Error(
            t('error.requiredProjectPropertyNotFound', { property: `'${appProp}'.id`, path: manifestPath })
        );
    }

    const manifestJsonExt = fs.read(join(extRoot, `manifest.json`));
    fs.extendJSON(manifestPath, JSON.parse(render(manifestJsonExt, data)));

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

    // Add mockserver entries
    if (data.metadata) {
        // package.json updates
        const mockDevDeps = {
            devDependencies: {
                '@sap/ux-ui5-fe-mockserver-middleware': 'latest'
            }
        };
        const packagePath = join(basePath, 'package.json');
        fs.extendJSON(packagePath, mockDevDeps);
        // Extending here would overwrite existing array entries so we have to parse and push
        const packageJson = JSON.parse(fs.read(packagePath));
        packageJson.ui5.dependencies.push('@sap/ux-ui5-fe-mockserver-middleware');
        fs.writeJSON(packagePath, packageJson);

        // yaml updates
        const mockserverMiddleware = getMockServerMiddlewareConfig(data);
        await addMiddlewareConfig(fs, basePath, 'ui5-local.yaml', mockserverMiddleware);
        fs.copyTpl(
            join(templateRoot, 'add', 'ui5-mock.yaml'),
            join(basePath, 'ui5-mock.yaml'),
            Object.assign(data, { appid })
        );
        await addMiddlewareConfig(fs, basePath, 'ui5-mock.yaml', proxyMiddleware.config, proxyMiddleware.comments);
        await addMiddlewareConfig(fs, basePath, 'ui5-mock.yaml', mockserverMiddleware);
        await addMiddlewareConfig(fs, basePath, 'ui5-mock.yaml', appReloadMiddleware);
        // create local copy of metadata and annotations
        fs.write(join(basePath, 'webapp', 'localService', 'metadata.xml'), prettifyXml(data.metadata, { indent: 4 }));
    }

    await addMiddlewareConfig(fs, basePath, 'ui5-local.yaml', appReloadMiddleware);

    if (data.annotations?.xml) {
        fs.write(
            join(basePath, 'webapp', 'localService', `${data.annotations.technicalName}.xml`),
            prettifyXml(data.annotations.xml, { indent: 4 })
        );
    }
    return fs;
}

export { generate, OdataVersion, OdataService };
