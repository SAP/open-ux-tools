import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { UI5Config } from '@sap-ux/ui5-config';
import type { CustomMiddleware, DataSourceConfig } from '@sap-ux/ui5-config';
import type { Manifest } from '@sap-ux/project-access';
import { DirName, FileName, getWebappPath, readUi5Yaml } from '@sap-ux/project-access';
import type { Ui5MockYamlConfig } from '../types';
import type { MockserverConfig } from '@sap-ux/ui5-config/dist/types';
import { getODataSources } from '../app-info';

/**
 * Enhance or create the ui5-mock.yaml with mockserver config.
 * Mockserver config services and annotations are collected from associated manifest.json file of the project.
 * If there aren't any services or annotations defined in manifest dataSources section, then mockserver config will be generated without those.
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
    // Prepare annotations list to be used in mockserver middleware config annotations
    const annotationSource = Object.values(getODataSources(manifest, 'ODataAnnotation'));
    const annotationsConfig = annotationSource.map((annotation) => ({
        localPath: `./webapp/${annotation.settings?.localUri}`,
        urlPath: annotation.uri
    }));
    // Prepare dataSources list to be used in mockserver middleware config services
    const dataSources = getODataSources(manifest);
    const dataSourcesConfig: DataSourceConfig[] = [];
    for (const dataSource in dataSources) {
        const localUri = dataSources[dataSource].settings?.localUri;
        dataSourcesConfig.push({
            serviceName: dataSource,
            servicePath: dataSources[dataSource].uri,
            metadataPath: localUri ? `./webapp/${localUri}` : undefined
        });
    }

    if (fs.exists(ui5MockYamlPath)) {
        mockConfig = await updateUi5MockYamlConfig(
            fs,
            ui5MockYamlPath,
            dataSourcesConfig,
            annotationsConfig,
            overwrite
        );
    } else {
        mockConfig = fs.exists(join(basePath, 'ui5.yaml'))
            ? await generateUi5MockYamlBasedOnUi5Yaml(fs, basePath, dataSourcesConfig, annotationsConfig)
            : await generateNewUi5MockYamlConfig(manifest['sap.app']?.id || '', dataSourcesConfig, annotationsConfig);
    }
    const yaml = mockConfig.toString();
    fs.write(ui5MockYamlPath, yaml);
}

/**
 * Deletes mock data folders for all services from mem-fs.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to project root, where package.json and ui5.yaml is
 */
export async function removeMockDataFolders(fs: Editor, basePath: string): Promise<void> {
    const webappPath = await getWebappPath(basePath, fs);
    const manifestPath = join(webappPath, FileName.Manifest);
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;
    // Read service names from manifest.json
    const dataSources = manifest['sap.app'].dataSources;
    if (dataSources) {
        const serviceNames = Object.keys(dataSources);
        serviceNames.forEach((serviceName: string) => {
            const mockdataPath = join(webappPath, DirName.LocalService, serviceName, DirName.Data);
            if (mockdataPath) {
                fs.delete(mockdataPath);
            }
        });
    }
}

/**
 * Update existing ui5-mock.yaml config. This will add or replace existing middleware configuration.
 * If 'overwrite' is set to true, then mockserver middleware configuration would be replaced else only enhanced with data from 'name' and 'path'.
 * 'sap-fe-mockserver' with state of the art config.
 *
 * @param fs - Editor instance to read existing information
 * @param ui5MockYamlPath - path to ui5-mock.yaml file
 * @param dataSourcesConfig - dataSources config from manifest to add to mockserver middleware services list
 * @param annotationsConfig - annotations config to add to mockserver mockserver middleware annotations list
 * @param overwrite - optional, whether to overwrite existing annotations and services
 * @returns {*}  {Promise<UI5Config>} - Updated Yaml Doc
 */
async function updateUi5MockYamlConfig(
    fs: Editor,
    ui5MockYamlPath: string,
    dataSourcesConfig: DataSourceConfig[],
    annotationsConfig: MockserverConfig['annotations'],
    overwrite = false
): Promise<UI5Config> {
    const existingUi5MockYamlConfig = await UI5Config.newInstance(fs.read(ui5MockYamlPath));
    if (overwrite) {
        const newMockserverMiddleware = await getNewMockserverMiddleware(dataSourcesConfig, annotationsConfig);
        existingUi5MockYamlConfig.updateCustomMiddleware(newMockserverMiddleware);
    } else {
        for (const dataSourceName in dataSourcesConfig) {
            existingUi5MockYamlConfig.addServiceToMockserverMiddleware(
                dataSourcesConfig[dataSourceName],
                undefined,
                annotationsConfig
            );
        }
    }
    return existingUi5MockYamlConfig;
}

/**
 * Create a new ui5-mock.yaml based on existing ui5.yaml.
 *
 * @param fs - Editor instance to read existing information
 * @param basePath - the base path where the package.json and ui5.yaml is
 * @param dataSourcesConfig - dataSources config from manifest to add to mockserver middleware services list
 * @param annotationsConfig - annotations config to add to mockserver mockserver middleware annotations list
 * @returns {*}  {Promise<UI5Config>} - Update Yaml Doc
 */
async function generateUi5MockYamlBasedOnUi5Yaml(
    fs: Editor,
    basePath: string,
    dataSourcesConfig: DataSourceConfig[],
    annotationsConfig: MockserverConfig['annotations']
): Promise<UI5Config> {
    const ui5MockYamlConfig = await readUi5Yaml(basePath, FileName.Ui5Yaml, fs);
    const ui5MockServerMiddleware = await getNewMockserverMiddleware(dataSourcesConfig, annotationsConfig);
    ui5MockYamlConfig.updateCustomMiddleware(ui5MockServerMiddleware);
    return ui5MockYamlConfig;
}

/**
 * Create fresh ui5-mock.yaml configuration which can be stringified and written.
 *
 * @param appId - application id
 * @param dataSourcesConfig - dataSources config from manifest to add to mockserver middleware services list
 * @param annotationsConfig - annotations config to add to mockserver mockserver middleware annotations list
 * @returns {*}  {Promise<UI5Config>} - Update Yaml Doc
 */
async function generateNewUi5MockYamlConfig(
    appId: string,
    dataSourcesConfig: DataSourceConfig[],
    annotationsConfig: MockserverConfig['annotations']
): Promise<UI5Config> {
    const ui5MockYaml = await UI5Config.newInstance(
        '# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json\n\nspecVersion: "2.5"'
    );
    ui5MockYaml.setMetadata({ name: appId });
    ui5MockYaml.setType('application');
    ui5MockYaml.addFioriToolsProxydMiddleware({ ui5: {} });
    ui5MockYaml.addFioriToolsAppReloadMiddleware();
    ui5MockYaml.addMockServerMiddleware(dataSourcesConfig, annotationsConfig);
    return ui5MockYaml;
}

/**
 * Return new mockserver middleware.
 *
 * @param dataSourcesConfig - dataSources config from manifest to add to mockserver middleware services list
 * @param annotationsConfig - annotations config to add to mockserver mockserver middleware annotations list
 * @returns - mockserver middleware
 */
async function getNewMockserverMiddleware(
    dataSourcesConfig: DataSourceConfig[],
    annotationsConfig: MockserverConfig['annotations']
): Promise<CustomMiddleware<MockserverConfig>> {
    const ui5MockYaml = await UI5Config.newInstance('');
    ui5MockYaml.addMockServerMiddleware(dataSourcesConfig, annotationsConfig);
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
