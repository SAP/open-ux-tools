import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { AdpWriterConfig, ManifestAppdescr, ProjectType } from '../types';
import {
    enhanceUI5DeployYaml,
    enhanceUI5Yaml,
    hasDeployConfig,
    enhanceUI5YamlWithCustomConfig,
    enhanceUI5YamlWithCustomTask
} from './options';
import { UI5Config } from '@sap-ux/ui5-config';

/**
 * Writes a given project template files within a specified folder in the project directory.
 *
 * @param {string} templatePath - The root path of the project template.
 * @param {string} projectPath - The root path of the project.
 * @param {CfModuleData | AdpWriterConfig} data - The data to be populated in the template file.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @param {string[]} ignoredFiles - Files to be ignored when writing.
 * @returns {void}
 */
export function writeTemplateToFolder(
    templatePath: string,
    projectPath: string,
    data: AdpWriterConfig,
    fs: Editor,
    ignoredFiles: string[] | [] = []
): void {
    try {
        fs.copyTpl(templatePath, projectPath, data, undefined, {
            globOptions: { dot: true, ignore: ignoredFiles },
            processDestinationPath: (filePath: string) => filePath.replace(/gitignore.tmpl/g, '.gitignore')
        });
    } catch (e) {
        throw new Error(`Could not write template files to folder. Reason: ${e.message}`);
    }
}

/**
 * Writes a manifest.adpescr file within a specified folder in the project directory.
 *
 * @param {string} templatePath - The root path of the project template.
 * @param {string} projectPath - The root path of the project.
 * @param {ManifestAppdescr} data - The data to be populated in the template file.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export function writeManifestAppdescr(
    templatePath: string,
    projectPath: string,
    data: ManifestAppdescr,
    fs: Editor
): void {
    try {
        const appdescrTplPath = join(templatePath, 'webapp', 'manifest.appdescr_variant');
        const appdescrPath = join(projectPath, 'webapp', 'manifest.appdescr_variant');
        const baseAppdescrContent: ManifestAppdescr = JSON.parse(fs.read(appdescrTplPath));
        data.content = [...baseAppdescrContent.content, ...data.content];
        Object.assign(baseAppdescrContent, data);

        fs.writeJSON(appdescrPath, baseAppdescrContent);
    } catch (e) {
        throw new Error(`Could not write manifest.appdescr_variant file. Reason: ${e.message}`);
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
        if (data.customConfig?.adp?.environment === ProjectType.S4) {
            enhanceUI5YamlWithCustomTask(ui5Config, data);
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

/**
 * Writes a .env file within a specified folder in the project directory.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {AdpWriterConfig} data - The data to be populated in the template file.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export async function writeEnvFile(projectPath: string, data: AdpWriterConfig, fs: Editor): Promise<void> {
    try {
        if (data?.flp?.credentials) {
            const templateModel = `ABAP_USERNAME: ${data.flp.credentials.username}
			ABAP_PASSWORD: ${data.flp.credentials.password}`;

            fs.write(join(projectPath, '.env'), templateModel);
        }
    } catch (e) {
        throw new Error(`Could not write .env file. Reason: ${e.message}`);
    }
}
