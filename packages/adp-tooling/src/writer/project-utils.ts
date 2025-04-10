import { join } from 'path';
import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type { Editor } from 'mem-fs-editor';
import type { CloudApp, AdpWriterConfig, CustomConfig } from '../types';
import {
    enhanceUI5DeployYaml,
    enhanceUI5Yaml,
    hasDeployConfig,
    enhanceUI5YamlWithCustomConfig,
    enhanceUI5YamlWithCustomTask,
    enhanceUI5YamlWithTranspileMiddleware
} from './options';

import type { Package } from '@sap-ux/project-access';
import type { OperationsType } from '@sap-ux/axios-extension';
import { UI5Config, getEsmTypesVersion, getTypesPackage } from '@sap-ux/ui5-config';

/**
 * Retrieves the package name and version from the package.json file located two levels up the directory tree.
 *
 * @returns {Package} An object containing the `name` and `version` of the package.
 */
export function getPackageJSONInfo(): Package {
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
 * Constructs a custom configuration object for the Adaptation Project (ADP).
 *
 * @param {OperationsType} environment - The operations type ('P' for on-premise or 'C' for cloud ready).
 * @param {object} pkg - The parsed contents of `package.json`.
 * @param {string} pkg.name - The name of the tool or package generating the config.
 * @param {string} pkg.version - The version of the tool generating the config.
 * @returns {CustomConfig} The generated ADP custom configuration object.
 */
export function getCustomConfig(environment: OperationsType, { name: id, version }: Package): CustomConfig {
    return {
        adp: {
            environment,
            support: {
                id: id ?? '',
                version: version ?? '',
                toolsId: uuidv4()
            }
        }
    };
}

/**
 * Writes a given project template files within a specified folder in the project directory.
 *
 * @param {string} baseTmplPath - The root path of the templates folder.
 * @param {string} projectPath - The root path of the project.
 * @param {AdpWriterConfig} data - The data to be populated in the template file.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export function writeTemplateToFolder(
    baseTmplPath: string,
    projectPath: string,
    data: AdpWriterConfig,
    fs: Editor
): void {
    const tmplPath = join(baseTmplPath, 'project', '**/*.*');
    const tsConfigPath = join(baseTmplPath, 'typescript', 'tsconfig.json');
    const typesVersion = getEsmTypesVersion(data.ui5?.version);
    const typesPackage = getTypesPackage(typesVersion);

    try {
        fs.copyTpl(tmplPath, projectPath, { ...data, typesPackage, typesVersion }, undefined, {
            globOptions: { dot: true },
            processDestinationPath: (filePath: string) => filePath.replace(/gitignore.tmpl/g, '.gitignore')
        });

        if (data.options?.enableTypeScript) {
            const id = data.app?.id?.split('.').join('/');
            fs.copyTpl(tsConfigPath, join(projectPath, 'tsconfig.json'), { id, typesPackage }, undefined, {
                globOptions: { dot: true }
            });
        }
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
        ui5Config.setConfiguration({ propertiesFileSourceEncoding: 'UTF-8' });
        enhanceUI5YamlWithCustomConfig(ui5Config, data);
        enhanceUI5YamlWithTranspileMiddleware(ui5Config, data);
        enhanceUI5Yaml(ui5Config, data);
        enhanceUI5YamlWithCustomTask(ui5Config, data as AdpWriterConfig & { app: CloudApp });

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
