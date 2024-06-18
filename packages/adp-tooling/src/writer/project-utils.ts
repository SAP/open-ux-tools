import { readFileSync } from 'fs';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import type { CloudApp, AdpWriterConfig } from '../types';
import {
    enhanceUI5DeployYaml,
    enhanceUI5Yaml,
    hasDeployConfig,
    enhanceUI5YamlWithCustomConfig,
    enhanceUI5YamlWithCustomTask
} from './options';

import { UI5Config } from '@sap-ux/ui5-config';

/**
 * Retrieves the package name and version from the package.json file located two levels up the directory tree.
 *
 * @returns {Object} An object containing the `name` and `version` of the package.
 */
export function getPackageJSONInfo(): { name: string; version: string } {
    const defaultPackage = {
        name: '@sap-ux/adp-tooling',
        version: 'NO_VERSION_FOUND'
    };

    try {
        return JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
    } catch (e) {
        return defaultPackage;
    }
}

/**
 * Writes a given project template files within a specified folder in the project directory.
 *
 * @param {string} templatePath - The root path of the project template.
 * @param {string} projectPath - The root path of the project.
 * @param {AdpWriterConfig} data - The data to be populated in the template file.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export function writeTemplateToFolder(
    templatePath: string,
    projectPath: string,
    data: AdpWriterConfig,
    fs: Editor
): void {
    try {
        fs.copyTpl(templatePath, projectPath, data, undefined, {
            globOptions: { dot: true },
            processDestinationPath: (filePath: string) => filePath.replace(/gitignore.tmpl/g, '.gitignore')
        });
    } catch (e) {
        throw new Error(`Could not write template files to folder. Reason: ${e.message}`);
    }
}

/**
 * Writes a ui5.yaml file within a specified folder in the project directory.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {AdpWriterConfig} data - The data to be populated in the template file.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export async function writeUI5Yaml(projectPath: string, data: AdpWriterConfig, fs: Editor): Promise<void> {
    try {
        const ui5ConfigPath = join(projectPath, 'ui5.yaml');
        const baseUi5ConfigContent = fs.read(ui5ConfigPath);
        const ui5Config = await UI5Config.newInstance(baseUi5ConfigContent);
        enhanceUI5Yaml(ui5Config, data);
        enhanceUI5YamlWithCustomConfig(ui5Config, data?.customConfig);
        if (data.customConfig?.adp?.environment === 'C') {
            enhanceUI5YamlWithCustomTask(ui5Config, data as AdpWriterConfig & { app: CloudApp });
        }

        fs.write(ui5ConfigPath, ui5Config.toString());
    } catch (e) {
        throw new Error(`Could not write ui5.yaml file. Reason: ${e.message}`);
    }
}

/**
 * Writes a ui5-deploy.yaml file within a specified folder in the project directory.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {AdpWriterConfig} data - The data to be populated in the template file.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export async function writeUI5DeployYaml(projectPath: string, data: AdpWriterConfig, fs: Editor): Promise<void> {
    try {
        if (hasDeployConfig(data)) {
            const ui5ConfigPath = join(projectPath, 'ui5.yaml');
            const baseUi5ConfigContent = fs.read(ui5ConfigPath);
            const ui5DeployConfig = await UI5Config.newInstance(baseUi5ConfigContent);
            enhanceUI5DeployYaml(ui5DeployConfig, data);

            fs.write(join(projectPath, 'ui5-deploy.yaml'), ui5DeployConfig.toString());
        }
    } catch (e) {
        throw new Error(`Could not write ui5-deploy.yaml file. Reason: ${e.message}`);
    }
}
