import { basename, dirname, join } from 'path';
import type { Editor } from 'mem-fs-editor';
import type { MockserverConfig, MockserverService } from '@sap-ux/ui5-config';
import { UI5Config } from '@sap-ux/ui5-config';
import { DirName, FileName } from '../constants';
import { fileExists, findFilesByExtension, findFileUp, readFile } from '../file';

/**
 * Get path to webapp.
 *
 * @param appRoot - root to the application
 * @param [memFs] - optional mem-fs editor instance
 * @returns - path to webapp folder
 */
export async function getWebappPath(appRoot: string, memFs?: Editor): Promise<string> {
    const ui5YamlPath = join(appRoot, FileName.Ui5Yaml);
    let webappPath = join(appRoot, DirName.Webapp);
    if (await fileExists(ui5YamlPath, memFs)) {
        const yamlString = await readFile(ui5YamlPath, memFs);
        const ui5Config = await UI5Config.newInstance(yamlString);
        const relativeWebappPath = ui5Config.getConfiguration()?.paths?.webapp;
        if (relativeWebappPath) {
            // Search for folder with package.json inside
            const packageJsonPath = await findFileUp(FileName.Package, appRoot, memFs);
            if (packageJsonPath) {
                const packageJsonDirPath = dirname(packageJsonPath);
                webappPath = join(packageJsonDirPath, relativeWebappPath);
            }
        }
    }
    return webappPath;
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
