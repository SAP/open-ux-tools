import { basename, join, normalize } from 'path';
import type { Editor } from 'mem-fs-editor';
import { UI5Config } from '@sap-ux/ui5-config';
import { FileName } from '../constants';
import { fileExists, findFilesByExtension, readFile } from '../file';

/**
 * Get path to webapp.
 *
 * @param projectRoot - root path, where package.json or ui5.yaml is
 * @param [memFs] - optional mem-fs editor instance
 * @returns - path to webapp folder
 */
export async function getWebappPath(projectRoot: string, memFs?: Editor): Promise<string> {
    let webappPath = join(projectRoot, 'webapp');
    const ui5YamlPath = join(projectRoot, FileName.Ui5Yaml);
    if (await fileExists(ui5YamlPath, memFs)) {
        const yamlString = await readFile(ui5YamlPath, memFs);
        const ui5Config = await UI5Config.newInstance(yamlString);
        const relativeWebappPath = ui5Config.getConfiguration()?.paths?.webapp;
        if (relativeWebappPath) {
            // Additionally check if webappPath path is not conflicting with relativeWebappPath
            if (!webappPath.endsWith(normalize(relativeWebappPath))) {
                webappPath = join(projectRoot, relativeWebappPath);
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
