import { basename, dirname, join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import type { MockserverConfig, MockserverService, Ui5Document, Configuration } from '@sap-ux/ui5-config';
import { UI5Config } from '@sap-ux/ui5-config';
import { DirName, FileName } from '../constants';
import { fileExists, findFilesByExtension, findFileUp, readFile } from '../file';

/**
 * Type representing the possible path mappings defined in the UI5 configuration for the different project types.
 *
 */
export type PathMappings = {
    [K in keyof typeof PATH_MAPPING_DEFAULTS]: {
        [P in keyof (typeof PATH_MAPPING_DEFAULTS)[K]]: string;
    };
}[keyof typeof PATH_MAPPING_DEFAULTS];

/**
 * Extracts the paths configuration type for a given UI5 project type.
 *
 * @template T - The UI5 project type.
 */
type PathsFor<T extends Ui5Document['type']> =
    Extract<Ui5Document, { type: T }> extends { configuration?: { paths?: infer P } } ? P : never;

/**
 * Default path mappings for each UI5 project type.
 *
 */
const PATH_MAPPING_DEFAULTS: { [K in Ui5Document['type']]: Required<PathsFor<K>> } = {
    component: { src: 'src', test: 'test' },
    application: { webapp: DirName.Webapp },
    library: { src: 'src', test: 'test' },
    'theme-library': { src: 'src', test: 'test' },
    module: {}
} as const;

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
    //Shortcut: if webapp/manifest.json exists, return webapp path w/o reading the YAML content
    if (await fileExists(join(appRoot, DirName.Webapp, FileName.Manifest), memFs)) {
        return join(appRoot, DirName.Webapp);
    }
    let pathMappings;
    try {
        pathMappings = await getPathMappings(appRoot, memFs);
    } catch {
        // For backward compatibility ignore errors and use default
        pathMappings = {} as PathMappings;
    }
    return 'webapp' in pathMappings ? pathMappings.webapp : join(appRoot, DirName.Webapp);
}

/**
 * Get path to test.
 *
 * @param appRoot - root to the application
 * @param [memFs] - optional mem-fs editor instance
 * @returns - path to test folder
 * @throws {Error} if ui5.yaml or 'type' cannot be read
 * @throws {Error} if project type is not 'application', 'library', 'theme-library' or 'module'
 */
export async function getWebappTestPath(appRoot: string, memFs?: Editor): Promise<string> {
    //Shortcut: if webapp/manifest.json exists, return webapp/test path w/o reading the YAML content
    if (await fileExists(join(appRoot, DirName.Webapp, FileName.Manifest), memFs)) {
        return join(appRoot, DirName.Webapp, 'test');
    }
    let pathMappings;
    try {
        pathMappings = await getPathMappings(appRoot, memFs);
    } catch {
        // For backward compatibility ignore errors and use default
        pathMappings = {} as PathMappings;
    }
    return 'webapp' in pathMappings ? join(pathMappings?.webapp, 'test') : join(appRoot, DirName.Webapp, 'test');
}

/**
 * Get path mappings defined in 'ui5.yaml' depending on the project type defined in 'ui5.yaml'.
 *
 * @param appRoot - root to the application
 * @param memFs - optional mem-fs editor instance
 * @param fileName - optional name of the yaml file to be read. Defaults to 'ui5.yaml'.
 * @returns - path mappings
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

    // Use Record<string, string> to permit index access during the merge loop
    const result: Record<string, string> = {};
    const configPaths = (configuration?.paths ?? {}) as Record<string, string>;
    const defaults = PATH_MAPPING_DEFAULTS[type] as Record<string, string>;

    for (const key in defaults) {
        const value = configPaths[key] ?? defaults[key];
        result[key] = join(baseDir, value);
    }

    // Cast the merged result to PathMappings to re-enforce strict union keys for the caller
    return result as PathMappings;
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
