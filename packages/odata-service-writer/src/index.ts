import { join, dirname, sep } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { updateManifest, updatePackageJson, updateCdsFilesWithAnnotations, writeAnnotationXmlFiles } from './updates';
import type { FioriToolsProxyConfigBackend as ProxyBackend } from '@sap-ux/ui5-config';
import { UI5Config, yamlErrorCode, YAMLError } from '@sap-ux/ui5-config';
import prettifyXml from 'prettify-xml';
import { enhanceData, getAnnotationNamespaces } from './data';
import { t } from './i18n';
import { OdataService, OdataVersion, ServiceType, CdsAnnotationsInfo, EdmxAnnotationsInfo } from './types';
import { getWebappPath } from '@sap-ux/project-access';
import { generateMockserverConfig } from '@sap-ux/mockserver-config-writer';

/**
 * Ensures the existence of the given files in the provided base path. If a file in the provided list does not exit, an error would be thrown.
 *
 * @param basePath - the root path of an existing UI5 application
 * @param files - list of files that need to exist
 * @param fs - the memfs editor instance
 */
function ensureExists(basePath: string, files: string[], fs: Editor) {
    files.forEach((path) => {
        if (!fs.exists(join(basePath, path))) {
            throw new Error(t('error.requiredProjectFileNotFound', { path }));
        }
    });
}

/**
 * Try finding a package.json and a ui5.yaml for the given project by looking upwards in the folder hierachy.
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {Editor} [fs] - the memfs editor instance
 * @returns an object with the optional locations of the package.json and ui5.yaml
 */
export async function findProjectFiles(
    basePath: string,
    fs: Editor
): Promise<{ packageJson?: string; ui5Yaml?: string }> {
    const files: { packageJson?: string; ui5Yaml?: string } = {};
    const parts = basePath.split(sep);

    while (parts.length > 0 && (!files.packageJson || !files.ui5Yaml)) {
        const path = parts.join(sep);
        if (!files.packageJson && fs.exists(join(path, 'package.json'))) {
            files.packageJson = join(path, 'package.json');
        }
        if (!files.ui5Yaml && fs.exists(join(path, 'ui5.yaml'))) {
            files.ui5Yaml = join(path, 'ui5.yaml');
        }
        parts.pop();
    }

    return files;
}

/**
 * Writes the odata service related file updates to an existing UI5 project specified by the base path.
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
    const paths = await findProjectFiles(basePath, fs);
    ensureExists(basePath, ['webapp/manifest.json'], fs);
    enhanceData(service);
    // set isServiceTypeEdmx true if service is EDMX
    const isServiceTypeEdmx = service.type === ServiceType.EDMX;
    // merge content into existing files
    const templateRoot = join(__dirname, '../templates');

    // update cds files with annotations only if service type is CDS and annotations are provided
    if (!isServiceTypeEdmx && service.annotations) {
        await updateCdsFilesWithAnnotations(service.annotations as CdsAnnotationsInfo | CdsAnnotationsInfo[], fs);
    }
    // manifest.json
    updateManifest(basePath, service, fs, templateRoot);

    // update ui5.yaml if it exists
    let ui5Config: UI5Config | undefined;
    let ui5LocalConfig: UI5Config | undefined;
    let ui5LocalConfigPath: string | undefined;
    if (isServiceTypeEdmx && paths.ui5Yaml) {
        // Dont extend backend middlewares if service type is CDS.
        ui5Config = await UI5Config.newInstance(fs.read(paths.ui5Yaml));
        try {
            ui5Config.addBackendToFioriToolsProxydMiddleware(service.previewSettings as ProxyBackend);
        } catch (error: any) {
            if (error instanceof YAMLError && error.code === yamlErrorCode.nodeNotFound) {
                ui5Config.addFioriToolsProxydMiddleware({
                    backend: [service.previewSettings as ProxyBackend],
                    ignoreCertError: service.ignoreCertError
                });
            } else {
                throw error;
            }
        }

        fs.write(paths.ui5Yaml, ui5Config.toString());

        // ui5-local.yaml
        ui5LocalConfigPath = join(dirname(paths.ui5Yaml), 'ui5-local.yaml');
        if (fs.exists(ui5LocalConfigPath)) {
            ui5LocalConfig = await UI5Config.newInstance(fs.read(ui5LocalConfigPath));
            ui5LocalConfig.addFioriToolsProxydMiddleware({
                backend: [service.previewSettings as ProxyBackend],
                ignoreCertError: service.ignoreCertError
            });
        }
    }

    // Add mockserver entries
    if (isServiceTypeEdmx && service.metadata) {
        // mockserver entries are not required if service type is CDS
        // copy existing `ui5.yaml` as starting point for ui5-mock.yaml
        if (paths.ui5Yaml && ui5Config) {
            const webappPath = await getWebappPath(basePath, fs);
            const config = {
                webappPath: webappPath,
                ui5MockYamlConfig: { path: service.path }
            };
            await generateMockserverConfig(basePath, config, fs);
            // add mockserver middleware to ui5-local.yaml
            if (ui5LocalConfig) {
                ui5LocalConfig.addMockServerMiddleware(service.path);
            }
        }

        // create local copy of metadata and annotations
        fs.write(
            join(basePath, 'webapp', 'localService', 'metadata.xml'),
            prettifyXml(service.metadata, { indent: 4 })
        );

        // Adds local annotations to datasources section of manifest.json and writes the annotations file
        if (service.localAnnotationsName) {
            const namespaces = getAnnotationNamespaces(service);
            fs.copyTpl(
                join(templateRoot, 'add', 'annotation.xml'),
                join(basePath, 'webapp', 'annotations', `${service.localAnnotationsName}.xml`),
                { ...service, namespaces }
            );
        }
    }

    // update package.json for non-cap applications
    if (isServiceTypeEdmx && paths.packageJson && paths.ui5Yaml) {
        updatePackageJson(paths.packageJson, fs, !!service.metadata);
    }

    if (isServiceTypeEdmx && ui5LocalConfigPath && ui5LocalConfig) {
        // write ui5 local yaml if service type is not CDS
        fs.write(ui5LocalConfigPath, ui5LocalConfig.toString());
    }

    // Write annotation xml if annotations are provided and service type is EDMX
    if (isServiceTypeEdmx) {
        writeAnnotationXmlFiles(fs, basePath, service);
    }

    return fs;
}

export { generate, OdataVersion, OdataService, ServiceType, EdmxAnnotationsInfo, CdsAnnotationsInfo };
