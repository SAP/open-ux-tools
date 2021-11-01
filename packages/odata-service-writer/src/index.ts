import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { render } from 'ejs';
import { ProxyBackend, UI5Config } from '@sap-ux/ui5-config';
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

    // ui5.yaml
    const ui5ConfigPath = join(basePath, 'ui5.yaml');
    const ui5Config = await UI5Config.newInstance(fs.read(ui5ConfigPath));
    ui5Config.addFioriToolsProxydMiddleware({ backend: [data.previewSettings as ProxyBackend], ui5: {} });
    ui5Config.addFioriToolsAppReloadMiddleware();

    // ui5-local.yaml
    const ui5LocalConfigPath = join(basePath, 'ui5-local.yaml');
    const ui5LocalConfig = await UI5Config.newInstance(fs.read(ui5LocalConfigPath));
    ui5LocalConfig.addFioriToolsProxydMiddleware({ backend: [data.previewSettings as ProxyBackend] });

    // Add mockserver entries
    if (data.metadata) {
        // package.json updates
        const mockDevDeps = {
            devDependencies: {
                '@sap/ux-ui5-fe-mockserver-middleware': '1'
            }
        };
        const packagePath = join(basePath, 'package.json');
        fs.extendJSON(packagePath, mockDevDeps);
        // Extending here would overwrite existing array entries so we have to parse and push
        const packageJson = JSON.parse(fs.read(packagePath));
        packageJson.ui5.dependencies.push('@sap/ux-ui5-fe-mockserver-middleware');
        fs.writeJSON(packagePath, packageJson);

        // ui5-mock.yaml
        fs.copyTpl(
            join(templateRoot, 'add', 'ui5-mock.yaml'),
            join(basePath, 'ui5-mock.yaml'),
            Object.assign(data, { appid })
        );
        const ui5MockConfigPath = join(basePath, 'ui5-mock.yaml');
        const ui5MockConfig = await UI5Config.newInstance(fs.read(ui5MockConfigPath));
        ui5MockConfig.addFioriToolsProxydMiddleware({ backend: [data.previewSettings as ProxyBackend], ui5: {} });
        ui5MockConfig.addMockServerMiddleware(data.path);
        ui5MockConfig.addFioriToolsAppReloadMiddleware();
        fs.write(join(basePath, 'ui5-mock.yaml'), ui5MockConfig.toString());

        // also add mockserver middleware to ui5-local.yaml
        ui5LocalConfig.addMockServerMiddleware(data.path);

        // create local copy of metadata and annotations
        fs.write(join(basePath, 'webapp', 'localService', 'metadata.xml'), prettifyXml(data.metadata, { indent: 4 }));
    }

    // also add the reload middleware
    ui5LocalConfig.addFioriToolsAppReloadMiddleware();
    // write yamls to disk
    fs.write(ui5ConfigPath, ui5Config.toString());
    fs.write(ui5LocalConfigPath, ui5LocalConfig.toString());

    if (data.annotations?.xml) {
        fs.write(
            join(basePath, 'webapp', 'localService', `${data.annotations.technicalName}.xml`),
            prettifyXml(data.annotations.xml, { indent: 4 })
        );
    }
    return fs;
}

export { generate, OdataVersion, OdataService };
