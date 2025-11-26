import { basename, dirname, join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import type { MockserverConfig, MockserverService } from '@sap-ux/ui5-config';
import { UI5Config } from '@sap-ux/ui5-config';
import { DirName, FileName } from '../constants';
import { fileExists, findFilesByExtension, findFileUp, readFile } from '../file';

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
    const defaultWebappPath = join(appRoot, DirName.Webapp);
    let ui5Config: UI5Config;
    try {
        ui5Config = await readUi5Yaml(appRoot, FileName.Ui5Yaml, memFs);
    } catch {
        return defaultWebappPath;
    }
    const relativeWebappPath = ui5Config.getConfiguration()?.paths?.webapp;
    if (!relativeWebappPath) {
        return defaultWebappPath;
    }
    const baseDir = await getBaseDir(appRoot, memFs);
    return join(baseDir, relativeWebappPath);
}

/**
 * Get path mappings defined in 'ui5.yaml' depending on the project type defined in 'ui5.yaml'.
 *
 * @param appRoot - root to the application
 * @param memFs - optional mem-fs editor instance
 * @returns - path mappings or undefined if ui5.yaml does not exist or project type is unsupported
 */
export async function getPathMappings(
    appRoot: string,
    memFs?: Editor
): Promise<{ webappPath: string } | { srcPath: string; testPath: string } | undefined> {
    let ui5Config: UI5Config;
    try {
        ui5Config = await readUi5Yaml(appRoot, FileName.Ui5Yaml, memFs);
    } catch {
        return undefined;
    }
    const projectType = ui5Config.getType();

    if (projectType === 'application') {
        return { webappPath: await getWebappPath(appRoot, memFs) };
    }

    if (projectType === 'library') {
        return await getLibraryPathMappings(appRoot, ui5Config, memFs);
    }

    return undefined;
}

/**
 * Get path mappings for project of type library.
 *
 * @param appRoot - root to the application
 * @param ui5Config - ui5 config instance
 * @param memFs - optional mem-fs editor instance
 * @returns - path mappings
 */
async function getLibraryPathMappings(
    appRoot: string,
    ui5Config: UI5Config,
    memFs?: Editor
): Promise<{ srcPath: string; testPath: string }> {
    const baseDir = await getBaseDir(appRoot, memFs);
    const configuration = ui5Config.getConfiguration();

    return {
        srcPath: configuration?.paths?.src ? join(baseDir, configuration.paths.src) : join(appRoot, 'src'),
        testPath: configuration?.paths?.test ? join(baseDir, configuration.paths.test) : join(appRoot, 'test')
    };
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
