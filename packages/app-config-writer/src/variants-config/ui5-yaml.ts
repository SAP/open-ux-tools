import { join } from 'path';
import { MiddlewareConfigs } from '../types';
import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import type { UI5Config } from '@sap-ux/ui5-config';
import type { CustomMiddleware } from '@sap-ux/ui5-config';
import type { FioriAppReloadConfig } from '@sap-ux/ui5-config';
import type { FioriPreviewConfigOptions } from '../types';

/**
 * Writes the given middleware to a ui5.yaml file.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param path - path to the ui5.yaml file
 * @param content - middleware configuration to be written
 * @param ui5YamlConfig - existing ui5.yaml configuration
 */
export function writeMiddlewareToYaml(
    fs: Editor,
    path: string,
    content: CustomMiddleware<unknown>,
    ui5YamlConfig: UI5Config
): void {
    const middlewareConfig = ui5YamlConfig.updateCustomMiddleware(content);
    fs.write(path, middlewareConfig.toString());
}

/**
 * Gets the preview middleware configuration.
 * The middleware can either be named fiori-tools-preview or preview-middleware.
 * If no preview configuration is given, then one will be created.
 *
 * @param ui5YamlConfig existing ui5.yaml configurations
 * @returns 'fiori-tools-preview' or 'preview-middleware' configuration
 */
function getPreviewMiddlewareConfig(ui5YamlConfig: UI5Config): CustomMiddleware<FioriPreviewConfigOptions> {
    const previewMiddlewareTemplate = {
        // ToDo: How to know the default if there is no preview middleware...
        name: 'fiori-tools-preview',
        afterMiddleware: 'compression'
    } as CustomMiddleware<FioriPreviewConfigOptions>;

    const existingPreviewMiddleware =
        ui5YamlConfig.findCustomMiddleware<FioriPreviewConfigOptions>(MiddlewareConfigs.FioriToolsPreview) ??
        ui5YamlConfig.findCustomMiddleware<FioriPreviewConfigOptions>(MiddlewareConfigs.PreviewMiddleware);

    if (existingPreviewMiddleware) {
        previewMiddlewareTemplate.name = existingPreviewMiddleware.name;
        if (existingPreviewMiddleware.configuration) {
            previewMiddlewareTemplate.configuration = { ...existingPreviewMiddleware.configuration };
        }
    }

    return previewMiddlewareTemplate;
}

/**
 * Gets the reload middleware configuration and sets a delay of 300ms if not given.
 * The middleware can either be named fiori-tools-appreload or reload-middleware.
 *
 * @param ui5YamlConfig existing ui5.yaml configurations
 * @returns 'fiori-tools-appreload' or reload-middleware configuration
 */
function getReloadMiddlewareConfig(ui5YamlConfig: UI5Config): CustomMiddleware<FioriAppReloadConfig> | undefined {
    const existingReloadMiddleware =
        ui5YamlConfig.findCustomMiddleware<FioriAppReloadConfig>(MiddlewareConfigs.FioriToolsAppreload) ??
        ui5YamlConfig.findCustomMiddleware<FioriAppReloadConfig>(MiddlewareConfigs.ReloadMiddleware);

    if (!existingReloadMiddleware) {
        return undefined;
    }
    if (!existingReloadMiddleware?.configuration?.delay) {
        existingReloadMiddleware.configuration = { ...existingReloadMiddleware.configuration, delay: 300 };
    }
    return existingReloadMiddleware;
}

/**
 * Checks the project for ui5.yaml files and reads out the configuration to update the preview and reload middlewares.
 * If a reload middleware exists, then a delay of 300ms will be inserted and the preview middleware will be set afterward.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to project root, where package.json and ui5.yaml is
 * @param logger - logger
 */
export async function updateMiddlewares(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const ui5Yamls = [FileName.Ui5Yaml, FileName.Ui5MockYaml, FileName.Ui5LocalYaml];
    for (const ui5Yaml of ui5Yamls) {
        let existingUi5YamlConfig: UI5Config;
        const yamlPath = join(basePath, ui5Yaml);
        try {
            existingUi5YamlConfig = await readUi5Yaml(basePath, ui5Yaml);
        } catch (error) {
            logger?.debug(`Cannot write variants-config to ${ui5Yaml}. File not existing`);
            continue;
        }

        const previewMiddlewareConfig = getPreviewMiddlewareConfig(existingUi5YamlConfig);
        const reloadMiddlewareConfig = getReloadMiddlewareConfig(existingUi5YamlConfig);

        if (reloadMiddlewareConfig) {
            previewMiddlewareConfig.afterMiddleware = reloadMiddlewareConfig.name;
            writeMiddlewareToYaml(fs, yamlPath, reloadMiddlewareConfig, existingUi5YamlConfig);
            logger?.debug(`Updated reload middleware in ${ui5Yaml}.`);
        }

        writeMiddlewareToYaml(fs, yamlPath, previewMiddlewareConfig, existingUi5YamlConfig);
        logger?.debug(`Updated preview middleware in ${ui5Yaml}.`);
    }
}
