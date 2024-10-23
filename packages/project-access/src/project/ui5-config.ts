import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { UI5Config } from '@sap-ux/ui5-config';
import { FileName } from '../constants';
import { fileExists, readFile } from '../file';
import { readdir } from 'fs';

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
            webappPath = join(projectRoot, relativeWebappPath);
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
 * @returns {UI5Config} UI5 config file in yaml format
 */
export async function readUi5Yaml(projectRoot: string, fileName: string, memFs?: Editor): Promise<UI5Config> {
    const ui5YamlPath = join(projectRoot, fileName);
    if (await fileExists(ui5YamlPath)) {
        const yamlString = await readFile(ui5YamlPath, memFs);
        return await UI5Config.newInstance(yamlString);
    }
    throw Error(`File '${fileName}' not found in project '${projectRoot}'`);
}

/**
 * Scans the project directory for ui5 configuration yaml files.
 *
 * @param memFs - mem-fs editor instance
 * @param projectRoot - path to project root, where ui5 configuration y*ml files are located
 * @returns {Promise<string[]>} list of UI5 configuration yaml file names
 * @throws {Error} if an error occurs while reading files from projectRoot
 */
export async function getAllUi5YamlFileNames(memFs: Editor, projectRoot: string): Promise<string[]> {
    return new Promise((resolve) => {
        //use 'fs' here directly because we only create a list of file names without any i/o operations
        readdir(projectRoot, (error, files) => {
            if (error) {
                throw new Error(`Error reading files from directory '${projectRoot}': ${error}`);
            }
            const yamlFileNames = new Set<string>();
            files
                .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
                .forEach((file) => {
                    yamlFileNames.add(file);
                });
            //add not yet saved .y*ml files from mem-fs as well
            const memYamlFiles = memFs.dump(projectRoot, '*.yaml|*.yml');
            for (const file in memYamlFiles) {
                if (memYamlFiles[file].state === 'deleted') {
                    yamlFileNames.delete(file);
                    continue;
                }
                yamlFileNames.add(file);
            }
            //todo: schema validation to verify if a yaml file is a valid ui5 configuration yaml
            resolve(Array.from(yamlFileNames));
        });
    });
}
