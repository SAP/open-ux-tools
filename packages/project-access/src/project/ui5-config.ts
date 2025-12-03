import { basename, dirname, join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import type { MockserverConfig, MockserverService, Ui5Document, Configuration } from '@sap-ux/ui5-config';
import { UI5Config } from '@sap-ux/ui5-config';
import { DirName, FileName } from '../constants';
import { fileExists, findFilesByExtension, findFileUp, readFile } from '../file';

type PathMappings = { [key: string]: string | undefined };

const PATH_MAPPING_DEFAULTS: Record<Ui5Document['type'], Record<string, string>> = {
    application: { webapp: DirName.Webapp },
    library: { src: 'src', test: 'test' },
    'theme-library': { src: 'src', test: 'test' },
    module: {}
};

/**
 * Get base directory of the project where package.json is located.
 *
 * @param appRoot - root to the application
 * @param memFs - optional mem-fs editor instance
 * @returns - base directory of the project
 */
async function getBaseDir(appRoot: string, memFs?: Editor): Promise<string> {
    const packageJsonPath = await findFileUp(FileName.Package, appRoot, memFs);
    return packageJsonPath ? dirname(packageJsonPath) : appRoot;
}

/**
 * Get path to webapp.
 *
 * @param appRoot - root to the application
 * @param [memFs] - optional mem-fs editor instance
 * @returns - path to webapp folder
 */
export async function getWebappPath(appRoot: string, memFs?: Editor): Promise<string> {
    let pathMappings: PathMappings = {};
    try {
        pathMappings = await getPathMappings(appRoot, memFs);
    } catch {
        // For backward compatibility ignore errors and use default
    }
    return pathMappings?.webapp ?? join(appRoot, DirName.Webapp);
}

/**
 * Get path mappings defined in 'ui5.yaml' depending on the project type defined in 'ui5.yaml'.
 *
 * @param appRoot - root to the application
 * @param memFs - optional mem-fs editor instance
 * @param fileName - optional name of yaml file to be read. Defaults to 'ui5.yaml'.
 * @returns - path mappings or undefined if ui5.yaml does not exist or project type is unsupported
 * @throws {Error} if ui5.yaml or 'type' cannot be read
 * @throws {Error} if project type is not 'application', 'library', 'theme-library' or 'module'
 */
export async function getPathMappings(
    appRoot: string,
    memFs?: Editor,
    fileName: string = FileName.Ui5Yaml
): Promise<PathMappings> {
    let ui5Config: UI5Config;
    let configuration: Configuration;
    let type: Ui5Document['type'];
    try {
        ui5Config = await readUi5Yaml(appRoot, fileName, memFs);
        configuration = ui5Config.getConfiguration();
        type = ui5Config.getType();
    } catch {
        throw new Error(`Could not read 'type' from ${fileName} in project root: ${appRoot}`);
    }

    if (!(type in PATH_MAPPING_DEFAULTS)) {
        throw new Error(`Unsupported project type for path mappings: ${type}`);
    }

    const baseDir = await getBaseDir(appRoot, memFs);
    const pathMappings: PathMappings = {};
    for (const [key, value] of Object.entries(configuration?.paths || {})) {
        pathMappings[key] = join(baseDir, value ?? PATH_MAPPING_DEFAULTS[type][key] ?? undefined);
    }

    //Add defaults if no specific value exists
    for (const [key, defaultValue] of Object.entries(PATH_MAPPING_DEFAULTS[type] ?? {})) {
        if (!pathMappings[key]) {
            pathMappings[key] = join(baseDir, defaultValue);
        }
    }

    return pathMappings;
}

/**
 * Checks if UI5 config yaml file exists and returns its content.
 *
 * @param projectRoot - path to project root
 * @param fileName - name of yaml file to be read
 * @param [memFs] - optional mem-fs editor instance
 * @param options - options
 * @param [options.validateSchema] - optional flag to validate the schema of the yaml file
 * @returns {UI5Config} UI5 config file in yaml format
 * @throws {Error} if file is not found
 */
export async function readUi5Yaml(
    projectRoot: string,
    fileName: string,
    memFs?: Editor,
    options?: { validateSchema: boolean }
): Promise<UI5Config> {
    const ui5YamlPath = join(projectRoot, fileName);
    if (await fileExists(ui5YamlPath, memFs)) {
        const yamlString = await readFile(ui5YamlPath, memFs);
        return await UI5Config.newInstance(yamlString, { validateSchema: options?.validateSchema });
    }
    throw Error(`File '${fileName}' not found in project '${projectRoot}'`);
}

/**
 * Scans the project directory for ui5 configuration yaml files.
 *
 * @param projectRoot - path to project root, where ui5 configuration y*ml files are located
 * @param [memFs] - optional mem-fs editor instance
 * @returns list of valid and invalid UI5 configuration yaml file names
 * @throws {Error} if an error occurs while reading files from projectRoot
 */
export async function getAllUi5YamlFileNames(projectRoot: string, memFs?: Editor): Promise<string[]> {
    try {
        const yamlFilePaths = await findFilesByExtension('.yaml', projectRoot, [], memFs, true);
        return yamlFilePaths.map((path) => basename(path));
    } catch (error) {
        throw new Error(`There was an error reading files from the directory '${projectRoot}': ${error}`);
    }
}

/**
 * Retrieves the mock server configuration from the UI5 mock YAML file.
 *
 * @param projectRoot - Path to the project root.
 * @param fileName - Name of the YAML file to read. Defaults to FileName.Ui5MockYaml.
 * @returns The mock server configuration or null if not found.
 * @throws {Error} If the sap-fe-mockserver middleware is not found.
 */
export async function getMockServerConfig(
    projectRoot: string,
    fileName: string = FileName.Ui5MockYaml
): Promise<MockserverConfig> {
    const ui5MockYamlFile = await readUi5Yaml(projectRoot, fileName);
    const mockserverMiddleware = ui5MockYamlFile.findCustomMiddleware('sap-fe-mockserver');
    if (!mockserverMiddleware) {
        throw new Error('Could not find sap-fe-mockserver');
    }
    return mockserverMiddleware.configuration as MockserverConfig;
}

/**
 * Retrieves the mock data path from the mock server configuration.
 *
 * @param projectRoot - Path to the project root.
 * @param fileName - Name of the YAML file to read. Defaults to FileName.Ui5MockYaml.
 * @returns The mock data path as a string. Returns an empty string if not found.
 */
export async function getMockDataPath(projectRoot: string, fileName: string = FileName.Ui5MockYaml): Promise<string> {
    const mockServerConfig: MockserverConfig = await getMockServerConfig(projectRoot, fileName);
    if (!mockServerConfig) {
        return '';
    }

    const services = extractServices(mockServerConfig);
    if (!services) {
        return '';
    }

    const found = services.find((service) => !!service.mockdataPath);
    return found?.mockdataPath ?? '';
}

/**
 * Helper to extract the services array from a MockServerConfiguration.
 *
 * @param config - The mock server configuration object.
 * @returns An array of MockServerService objects, or undefined if not found.
 */
function extractServices(config: MockserverConfig): MockserverService[] | undefined {
    if ('services' in config && config.services) {
        return Array.isArray(config.services) ? config.services : [config.services];
    }
    return undefined;
}
