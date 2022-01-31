import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { render } from 'ejs';
import { ProxyBackend, UI5Config } from '@sap-ux/ui5-config';
import prettifyXml from 'prettify-xml';
import { enhanceData, getAnnotationNamespaces } from './data';
import { t } from './i18n';
import { OdataService, OdataVersion, NamespaceAlias } from './types';

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
 * @param {OdataService} service - the OData service instance
 * @param {Editor} [fs] - the memfs editor instance
 * @throws {Error} - if required UI5 project files are not found
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
async function generate(basePath: string, service: OdataService, fs?: Editor): Promise<Editor> {

    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);
    enhanceData(service);

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
    fs.extendJSON(manifestPath, JSON.parse(render(manifestJsonExt, service)));

    // ui5.yaml
    const ui5ConfigPath = join(basePath, 'ui5.yaml');
    const ui5Config = await UI5Config.newInstance(fs.read(ui5ConfigPath));
    ui5Config.addBackendToFioriToolsProxydMiddleware(service.previewSettings as ProxyBackend);

    // ui5-local.yaml
    const ui5LocalConfigPath = join(basePath, 'ui5-local.yaml');
    const ui5LocalConfig = await UI5Config.newInstance(fs.read(ui5LocalConfigPath));
    ui5LocalConfig.addFioriToolsProxydMiddleware({ backend: [service.previewSettings as ProxyBackend] });

    // Add mockserver entries
    if (service.metadata) {
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

        // copy existing `ui5.yaml` as starting point for ui5-mock.yaml
        const ui5MockConfig = await UI5Config.newInstance(ui5Config.toString());
        ui5MockConfig.addMockServerMiddleware(service.path);
        fs.write(join(basePath, 'ui5-mock.yaml'), ui5MockConfig.toString());

        // also add mockserver middleware to ui5-local.yaml
        ui5LocalConfig.addMockServerMiddleware(service.path);

        // create local copy of metadata and annotations
        fs.write(
            join(basePath, 'webapp', 'localService', 'metadata.xml'),
            prettifyXml(service.metadata, { indent: 4 })
        );

        // Adds local annotations to datasources section of manifest.json and writer the annotations file
        let namespaces: NamespaceAlias[] = [];
        if (service.localAnnotationsName) {
            namespaces = getAnnotationNamespaces(service);
            fs.copyTpl(
                join(templateRoot, 'add', 'annotation.xml'),
                join(basePath, 'webapp', 'annotations', `${service.localAnnotationsName}.xml`),
                { ...service, namespaces }
            );
        }
    }

    // write yamls to disk
    fs.write(ui5ConfigPath, ui5Config.toString());
    fs.write(ui5LocalConfigPath, ui5LocalConfig.toString());

    if (service.annotations?.xml) {
        fs.write(
            join(basePath, 'webapp', 'localService', `${service.annotations.technicalName}.xml`),
            prettifyXml(service.annotations.xml, { indent: 4 })
        );
    }

    return fs;
}

export { generate, OdataVersion, OdataService };
