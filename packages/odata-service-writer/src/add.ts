import type { Editor } from 'mem-fs-editor';
import type { OdataService, EdmxOdataService, ProjectPaths } from './types';
import { getWebappPath } from '@sap-ux/project-access';
import type { FioriToolsProxyConfigBackend as ProxyBackend } from '@sap-ux/ui5-config';
import { UI5Config, YAMLError, yamlErrorCode } from '@sap-ux/ui5-config';
import { generateMockserverConfig } from '@sap-ux/mockserver-config-writer';
import {
    generateMockserverMiddlewareBasedOnUi5MockYaml,
    updateManifest,
    updatePackageJson,
    writeAnnotationXmlFiles,
    writeLocalServiceFiles
} from './common';

/**
 * Extends backend middleware for UI5Config with service data.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {OdataService} service - the OData service instance data
 * @param {UI5Config} ui5Config - UI5 configuration
 * @param {string} ui5ConfigPath - path to the YAML config file
 * @throws {Error} - if required UI5 project files are not found
 */
function extendBackendMiddleware(fs: Editor, service: OdataService, ui5Config: UI5Config, ui5ConfigPath: string): void {
    try {
        ui5Config.addBackendToFioriToolsProxydMiddleware(
            service.previewSettings as ProxyBackend,
            service.ignoreCertError
        );
    } catch (error: any) {
        if (
            (error instanceof YAMLError && error.code === yamlErrorCode.nodeNotFound) ||
            error.message === 'Could not find fiori-tools-proxy'
        ) {
            ui5Config.addFioriToolsProxydMiddleware({
                backend: [service.previewSettings as ProxyBackend],
                ignoreCertError: service.ignoreCertError
            });
        } else {
            throw error;
        }
    }
    fs.write(ui5ConfigPath, ui5Config.toString());
}

/**
 * Adds services data in manifest.json and ui5-*.yaml files.
 * Firstly manifest.json is updated with new service data.
 * Then using manifest dataSources, mockserver configuration for services and annotations is written.
 * At the end, XML files for service annotations are created.
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {ProjectPaths} paths - paths to the project files (package.json, ui5.yaml, ui5-local.yaml and ui5-mock.yaml)
 * @param {string} templateRoot - path to the file templates
 * @param {EdmxOdataService} service - the OData service instance
 * @param {Editor} fs - the memfs editor instance
 */
export async function addServicesData(
    basePath: string,
    paths: ProjectPaths,
    templateRoot: string,
    service: EdmxOdataService,
    fs: Editor
): Promise<void> {
    let ui5Config: UI5Config | undefined;
    let ui5LocalConfig: UI5Config | undefined;
    let ui5MockConfig: UI5Config | undefined;
    await updateManifest(basePath, service, fs);
    if (paths.ui5Yaml) {
        ui5Config = await UI5Config.newInstance(fs.read(paths.ui5Yaml));
        // Update ui5.yaml with backend middleware
        extendBackendMiddleware(fs, service, ui5Config, paths.ui5Yaml);
        // Update ui5-local.yaml with backend middleware
        if (paths.ui5LocalYaml) {
            ui5LocalConfig = await UI5Config.newInstance(fs.read(paths.ui5LocalYaml));
            extendBackendMiddleware(fs, service, ui5LocalConfig, paths.ui5LocalYaml);
        }
    }
    if (service.metadata) {
        const webappPath = await getWebappPath(basePath, fs);
        if (paths.ui5Yaml && ui5Config) {
            const config = {
                webappPath: webappPath
            };
            // Generate mockserver middleware for ui5-mock.yaml
            await generateMockserverConfig(basePath, config, fs);
            // Update ui5-local.yaml with mockserver middleware from newly created/updated ui5-mock.yaml
            await generateMockserverMiddlewareBasedOnUi5MockYaml(fs, paths.ui5Yaml, paths.ui5LocalYaml, ui5LocalConfig);
            // Update ui5-mock.yaml with backend middleware
            if (paths.ui5MockYaml) {
                ui5MockConfig = await UI5Config.newInstance(fs.read(paths.ui5MockYaml));
                extendBackendMiddleware(fs, service, ui5MockConfig, paths.ui5MockYaml);
            }
        }
        await writeLocalServiceFiles(fs, basePath, webappPath, templateRoot, service);
    }
    // service update should not trigger the package.json update
    if (paths.packageJson && paths.ui5Yaml) {
        updatePackageJson(paths.packageJson, fs, !!service.metadata);
    }
    if (paths.ui5LocalYaml && ui5LocalConfig) {
        // write ui5 local yaml if service type is not CDS
        fs.write(paths.ui5LocalYaml, ui5LocalConfig.toString());
    }
    writeAnnotationXmlFiles(fs, basePath, service.name ?? 'mainService', service.annotations);
}
