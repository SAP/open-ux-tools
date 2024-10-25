import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { UI5Config } from '@sap-ux/ui5-config';
import type { CustomMiddleware } from '@sap-ux/ui5-config';
import type { Manifest } from '@sap-ux/project-access';
import type { Ui5MockYamlConfig } from '../types';
import type { MockserverConfig } from '@sap-ux/ui5-config/dist/types';
import { getMainServiceDataSource, getODataSources } from '../app-info';

/**
 * Enhance or create the ui5-mock.yaml with mockserver config.
 * Following enhancement strategy is applied:
 *
 * ui5-mock.yaml exists
 * -----------------------------
 * Update or create middleware configuration for 'sap-fe-mockserver' with the latest configuration.
 * Other parts of the ui5-mock.yaml will not be modified.
 *
 * ui5-mock.yaml does not exist
 * -----------------------------
 * If ui5.yaml exists, copy it and add/update the 'sap-fe-mockserver' middleware configuration.
 * If ui5.yaml does not exist, create a new ui5-mock.yaml file with 'sap-fe-mockserver' middleware
 * configuration and basic default configuration for 'fiori-tools-proxy' and 'fiori-tools-appreload'.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to project root, where package.json and ui5.yaml is
 * @param webappPath - path to webapp folder, where manifest.json is
 * @param config - optional config passed in by consumer
 */
export async function enhanceYaml(
    fs: Editor,
    basePath: string,
    webappPath: string,
    config?: Ui5MockYamlConfig
): Promise<void> {
    const overwrite = !!config?.overwrite;
    const ui5MockYamlPath = join(basePath, 'ui5-mock.yaml');
    let mockConfig;
    const manifest = fs.readJSON(join(webappPath, 'manifest.json')) as Partial<Manifest> as Manifest;
    const mockserverPath = config?.path ?? getMainServiceDataSource(manifest)?.uri;
    const serviceName = config?.name;
    const annotationSource = Object.values(getODataSources(manifest, 'ODataAnnotation'));
    const annotationsConfig = annotationSource.map((annotation) => ({
        localPath: `./webapp/${annotation.settings?.localUri}`,
        urlPath: annotation.uri
    }));

    if (fs.exists(ui5MockYamlPath)) {
        // In case of overwrite services from manifest dataSource section are used and existing ones removed from ui5-mock.yaml content
        let dataSourcesConfig: { serviceName: string; serviceUri: string }[] | undefined;
        if (overwrite) {
            const dataSource = getODataSources(manifest, 'OData');
            dataSourcesConfig = [];
            for (const i in dataSource) {
                dataSourcesConfig.push({
                    serviceName: i,
                    serviceUri: dataSource[i].uri
                });
            }
        }
        mockConfig = await updateUi5MockYamlConfig(
            fs,
            ui5MockYamlPath,
            serviceName,
            mockserverPath,
            annotationsConfig,
            dataSourcesConfig
        );
    } else {
        mockConfig = fs.exists(join(basePath, 'ui5.yaml'))
            ? await generateUi5MockYamlBasedOnUi5Yaml(fs, basePath, serviceName, mockserverPath, annotationsConfig)
            : await generateNewUi5MockYamlConfig(
                  manifest['sap.app']?.id || '',
                  serviceName,
                  mockserverPath,
                  annotationsConfig
              );
    }
    const yaml = mockConfig.toString();
    fs.write(ui5MockYamlPath, yaml);
}

/**
 * Update existing ui5-mock.yaml config. This will add or replace existing middleware configuration
 * 'sap-fe-mockserver' with state of the art config.
 *
 * @param fs - Editor instance to read existing information
 * @param ui5MockYamlPath - path to ui5-mock.yaml file
 * @param name - optional, name of the mockserver service
 * @param path - optional, url path the mockserver listens to
 * @param annotationsConfig - optional, annotations config to add to mockserver middleware
 * @param dataSourcesConfig - optional, dataSources config from manifest in case of overwrite
 * @returns {*}  {Promise<UI5Config>} - Update Yaml Doc
 */
async function updateUi5MockYamlConfig(
    fs: Editor,
    ui5MockYamlPath: string,
    name?: string,
    path?: string,
    annotationsConfig?: MockserverConfig['annotations'],
    dataSourcesConfig?: { serviceName: string; serviceUri: string }[]
): Promise<UI5Config> {
    const existingUi5MockYamlConfig = await UI5Config.newInstance(fs.read(ui5MockYamlPath));
    if (dataSourcesConfig) {
        existingUi5MockYamlConfig.updateCustomMiddleware(
            await getNewMockserverMiddleware(name, path, annotationsConfig, dataSourcesConfig)
        );
    } else if (name && path) {
        // name and path are sed to generate mock content for service
        existingUi5MockYamlConfig.addServiceToMockserverMiddleware(name, path, annotationsConfig);
    }
    return existingUi5MockYamlConfig;
}

/**
 * Create a new ui5-mock.yaml based on existing ui5.yaml.
 *
 * @param fs - Editor instance to read existing information
 * @param basePath - the base path where the package.json and ui5.yaml is
 * @param name - optional, name of the mockserver service
 * @param path - optional path for mockserver config
 * @param annotationsConfig - optional annotations config to add to mockserver middleware
 * @returns {*}  {Promise<UI5Config>} - Update Yaml Doc
 */
async function generateUi5MockYamlBasedOnUi5Yaml(
    fs: Editor,
    basePath: string,
    name?: string,
    path?: string,
    annotationsConfig?: MockserverConfig['annotations']
): Promise<UI5Config> {
    const ui5MockYamlConfig = await UI5Config.newInstance(fs.read(join(basePath, 'ui5.yaml')));
    const ui5MockServerMiddleware = await getNewMockserverMiddleware(name, path, annotationsConfig);
    ui5MockYamlConfig.updateCustomMiddleware(ui5MockServerMiddleware);
    return ui5MockYamlConfig;
}

/**
 * Create fresh ui5-mock.yaml configuration which can be stringified and written.
 *
 * @param appId - application id
 * @param name - optional, name of the mockserver service
 * @param path - optional, url path the mockserver listens to
 * @param annotationsConfig - optional annotations config to add to mockserver middleware
 * @returns {*}  {Promise<UI5Config>} - Update Yaml Doc
 */
async function generateNewUi5MockYamlConfig(
    appId: string,
    name?: string,
    path?: string,
    annotationsConfig?: MockserverConfig['annotations']
): Promise<UI5Config> {
    const ui5MockYaml = await UI5Config.newInstance(
        '# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json\n\nspecVersion: "2.5"'
    );
    ui5MockYaml.setMetadata({ name: appId });
    ui5MockYaml.setType('application');
    ui5MockYaml.addFioriToolsProxydMiddleware({ ui5: {} });
    ui5MockYaml.addFioriToolsAppReloadMiddleware();
    ui5MockYaml.addMockServerMiddleware(name, path, annotationsConfig);
    return ui5MockYaml;
}

/**
 * Return new mockserver middleware.
 *
 * @param name - optional, name of the mockserver service
 * @param path - optional, path for mockserver config
 * @param annotationsConfig - optional annotations config to add to mockserver middleware
 * @param dataSourcesConfig - optional, dataSources config from manifest in case of overwrite
 * @returns - mockserver middleware
 */
async function getNewMockserverMiddleware(
    name?: string,
    path?: string,
    annotationsConfig?: MockserverConfig['annotations'],
    dataSourcesConfig?: { serviceName: string; serviceUri: string }[]
): Promise<CustomMiddleware<MockserverConfig>> {
    const ui5MockYaml = await UI5Config.newInstance('');
    ui5MockYaml.addMockServerMiddleware(name, path, annotationsConfig, dataSourcesConfig);
    const mockserverMiddleware = ui5MockYaml.findCustomMiddleware('sap-fe-mockserver');
    if (!mockserverMiddleware) {
        throw Error('Could not create new mockserver config');
    }
    return mockserverMiddleware as CustomMiddleware<MockserverConfig>;
}

/**
 * Delete ui5-mock.yaml file from mem-fs.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to project root, where package.json and ui5.yaml is
 */
export function removeUi5MockYaml(fs: Editor, basePath: string): void {
    const ui5MockYamlPath = join(basePath, 'ui5-mock.yaml');
    if (fs.exists(ui5MockYamlPath)) {
        fs.delete(ui5MockYamlPath);
    }
}
