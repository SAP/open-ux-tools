import type { Editor } from 'mem-fs-editor';
import { dirname, join } from 'node:path';
import type { EdmxOdataService, OdataService, ProjectPaths } from './types';
import { FileName, getWebappPath } from '@sap-ux/project-access';
import type { CustomMiddleware, FioriToolsProxyConfigBackend as ProxyBackend } from '@sap-ux/ui5-config';
import { UI5Config, YAMLError, yamlErrorCode } from '@sap-ux/ui5-config';
import type { MockserverConfig } from '@sap-ux/mockserver-config-writer';
import { generateMockserverConfig } from '@sap-ux/mockserver-config-writer';
import {
    writeLocalServiceAnnotationXMLFiles,
    writeMetadata,
    writeRemoteServiceAnnotationXmlFiles
} from './data/annotations';
import { updatePackageJson } from './data/package';
import { writeExternalServiceMetadata } from './data';

/**
 * Generates mockserver middleware config for ui5-local.yaml file based on ui5-mock.yaml.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {OdataService} ui5YamlPath - path pointing to the ui5.yaml file
 * @param {UI5Config} ui5LocalConfigPath - ui5-local.yaml configuration
 * @param {string} ui5LocalConfig - path pointing to the ui5-local.yaml file
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
async function generateMockserverMiddlewareBasedOnUi5MockYaml(
    fs: Editor,
    ui5YamlPath: string,
    ui5LocalConfigPath?: string,
    ui5LocalConfig?: UI5Config
): Promise<void> {
    // Update ui5-local.yaml with mockserver middleware from ui5-mock.yaml
    const ui5MockYamlPath = join(dirname(ui5YamlPath), FileName.Ui5MockYaml);
    const ui5MockYamlConfig = await UI5Config.newInstance(fs.read(ui5MockYamlPath));
    const mockserverMiddlewareFromUi5Mock = ui5MockYamlConfig.findCustomMiddleware(
        'sap-fe-mockserver'
    ) as CustomMiddleware;
    if (ui5LocalConfigPath && fs.exists(ui5LocalConfigPath) && ui5LocalConfig && mockserverMiddlewareFromUi5Mock) {
        ui5LocalConfig.updateCustomMiddleware(mockserverMiddlewareFromUi5Mock);
    }
}

/**
 * Extends backend middleware for UI5Config with the service data.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {OdataService} service - the OData service instance data
 * @param {UI5Config} ui5Config - UI5 configuration
 * @param {string} ui5ConfigPath - path to the YAML config file
 * @param {boolean} update - whether the service update is running
 * @throws {Error} - if required UI5 project files are not found
 */
function extendBackendMiddleware(
    fs: Editor,
    service: OdataService,
    ui5Config: UI5Config,
    ui5ConfigPath: string,
    update = false
): void {
    if (update) {
        ui5Config.updateBackendToFioriToolsProxyMiddleware(service.previewSettings as ProxyBackend);
    } else {
        // Try to add backend
        try {
            ui5Config.addBackendToFioriToolsProxyMiddleware(
                service.previewSettings as ProxyBackend,
                service.ignoreCertError
            );
        } catch (error: any) {
            if (
                (error instanceof YAMLError && error.code === yamlErrorCode.nodeNotFound) ||
                error.message === 'Could not find fiori-tools-proxy'
            ) {
                // Middleware is missing, add it along with the service backend
                ui5Config.addFioriToolsProxyMiddleware({
                    backend: [service.previewSettings as ProxyBackend],
                    ignoreCertError: service.ignoreCertError
                });
            } else {
                throw error;
            }
        }
    }
    fs.write(ui5ConfigPath, ui5Config.toString());
}

/**
 * Adds services data to ui5-*.yaml files.
 * Mockserver configuration for services and annotations are written using dataSources from manifest.json.
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
        await writeLocalServiceAnnotationXMLFiles(fs, webappPath, templateRoot, service);
    }
    // Service is being added - update the package.json update as well, service update should not run the updates of the package.json
    if (paths.packageJson && paths.ui5Yaml) {
        updatePackageJson(paths.packageJson, fs, !!service.metadata);
    }
    if (paths.ui5LocalYaml && ui5LocalConfig) {
        fs.write(paths.ui5LocalYaml, ui5LocalConfig.toString());
    }
    await writeRemoteServiceAnnotationXmlFiles(fs, basePath, service.name ?? 'mainService', service.annotations);
}

/**
 * Updates services data in ui5-*.yaml files.
 * Mockserver configuration for services and annotations are updated using dataSources from manifest.json.
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {ProjectPaths} paths - paths to the project files (package.json, ui5.yaml, ui5-local.yaml and ui5-mock.yaml)
 * @param {EdmxOdataService} service - the OData service instance
 * @param {Editor} fs - the memfs editor instance
 * @param {boolean} updateMiddlewares - whether the YAML files for the service (mock-server and fiori-tools-proxy middlewares) should be updated
 */
export async function updateServicesData(
    basePath: string,
    paths: ProjectPaths,
    service: EdmxOdataService,
    fs: Editor,
    updateMiddlewares: boolean
): Promise<void> {
    let ui5Config: UI5Config | undefined;
    let ui5LocalConfig: UI5Config | undefined;

    if (updateMiddlewares) {
        if (paths.ui5Yaml) {
            ui5Config = await UI5Config.newInstance(fs.read(paths.ui5Yaml));
            // Update ui5.yaml with backend middleware
            extendBackendMiddleware(fs, service, ui5Config, paths.ui5Yaml, true);
        }
        // Update ui5-local.yaml with backend middleware
        if (paths.ui5LocalYaml) {
            ui5LocalConfig = await UI5Config.newInstance(fs.read(paths.ui5LocalYaml));
            extendBackendMiddleware(fs, service, ui5LocalConfig, paths.ui5LocalYaml, true);
        }
    }
    // For update, updatable files should already exist
    const webappPath = await updateMetadata(basePath, paths, service, ui5Config, ui5LocalConfig, fs, updateMiddlewares);

    if (paths.ui5LocalYaml && ui5LocalConfig) {
        // write ui5 local yaml if service type is not CDS
        fs.write(paths.ui5LocalYaml, ui5LocalConfig.toString());
    }
    // Write new annotations files
    await writeRemoteServiceAnnotationXmlFiles(fs, basePath, service.name ?? 'mainService', service.annotations);
    if (service.externalServices && webappPath) {
        writeExternalServiceMetadata(fs, webappPath, service.externalServices, service.name, service.path);
    }
}

/**
 * Updates metadata related data for the given service in the project files.
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {ProjectPaths} paths - paths to the project files (package.json, ui5.yaml, ui5-local.yaml and ui5-mock.yaml)
 * @param {EdmxOdataService} service - the OData service instance
 * @param {UI5Config | undefined} ui5Config - ui5.yaml configuration
 * @param {UI5Config | undefined} ui5LocalConfig - ui5-local.yaml configuration
 * @param {Editor} fs - the memfs editor instance
 * @param {boolean} updateMiddlewares - whether the YAML files for the service (mock-server and fiori-tools-proxy middlewares) should be updated
 * @returns {Promise<string | undefined>} webapp path if metadata was written, undefined otherwise
 */
async function updateMetadata(
    basePath: string,
    paths: ProjectPaths,
    service: EdmxOdataService,
    ui5Config: UI5Config | undefined,
    ui5LocalConfig: UI5Config | undefined,
    fs: Editor,
    updateMiddlewares: boolean
): Promise<string | undefined> {
    if (!service.metadata) {
        return undefined;
    }
    const webappPath = await getWebappPath(basePath, fs);
    // Generate mockserver only when ui5-mock.yaml already exists
    if (paths.ui5MockYaml && paths.ui5Yaml && ui5Config && updateMiddlewares) {
        const config: MockserverConfig = {
            webappPath: webappPath,
            // Since ui5-mock.yaml already exists, set 'skip' to skip package.json file updates
            packageJsonConfig: {
                skip: true
            },
            // Set 'overwrite' to true to overwrite services data in YAML files
            ui5MockYamlConfig: {
                overwrite: true
            }
        };
        if (config.ui5MockYamlConfig && service.name && service.externalServices?.length) {
            config.ui5MockYamlConfig.resolveExternalServiceReferences = {
                [service.name]: true
            };
        }

        // Regenerate mockserver middleware for ui5-mock.yaml by overwriting
        await generateMockserverConfig(basePath, config, fs);
        // Update ui5-local.yaml with mockserver middleware from updated ui5-mock.yaml
        await generateMockserverMiddlewareBasedOnUi5MockYaml(fs, paths.ui5Yaml, paths.ui5LocalYaml, ui5LocalConfig);
        // Update ui5-mock.yaml with backend middleware
        if (paths.ui5MockYaml) {
            const ui5MockConfig = await UI5Config.newInstance(fs.read(paths.ui5MockYaml));
            extendBackendMiddleware(fs, service, ui5MockConfig, paths.ui5MockYaml, true);
        }
    }
    // Write metadata.xml file
    await writeMetadata(fs, webappPath, service);
    return webappPath;
}
