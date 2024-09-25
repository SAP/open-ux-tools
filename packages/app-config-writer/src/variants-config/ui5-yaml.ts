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
 * Gets the fiori-tools-preview middleware configuration.
 *
 * @param ui5YamlConfig existing ui5.yaml configurations
 * @returns 'fiori-tools-preview' configuration
 */
function getFioriToolsPreviewConfig(ui5YamlConfig: UI5Config): CustomMiddleware<FioriPreviewConfigOptions> {
    let previewMiddlewareConfig = {
        name: 'fiori-tools-preview',
        afterMiddleware: 'compression'
    } as CustomMiddleware<FioriPreviewConfigOptions>;

    const existingPreviewMiddleware = ui5YamlConfig.findCustomMiddleware<FioriPreviewConfigOptions>(
        MiddlewareConfigs.FioriToolsPreview
    );
    const existingReloadMiddleware = ui5YamlConfig.findCustomMiddleware<FioriAppReloadConfig>(
        MiddlewareConfigs.FioriToolsAppreload
    );

    if (existingPreviewMiddleware?.configuration) {
        const config = Object.defineProperty(previewMiddlewareConfig, 'configuration', {
            writable: true,
            enumerable: true,
            configurable: true,
            value: existingPreviewMiddleware.configuration
        });
        previewMiddlewareConfig = config;
    }

    if (existingReloadMiddleware) {
        previewMiddlewareConfig.afterMiddleware = MiddlewareConfigs.FioriToolsAppreload;
        // ToDo: check if this is needed
        if (existingReloadMiddleware.configuration) {
            existingReloadMiddleware.configuration['delay'] = 300;

            ui5YamlConfig.updateCustomMiddleware({
                name: 'fiori-tools-appreload',
                afterMiddleware: existingReloadMiddleware.afterMiddleware,
                configuration: {
                    ...existingReloadMiddleware.configuration
                }
            });
        }
    }

    return previewMiddlewareConfig;
}

/**
 * Checks the project for ui5.yaml files and adds the fiori-tools-preview middleware to it.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to project root, where package.json and ui5.yaml is
 * @param logger - logger
 */
export async function addPreviewMiddlewareToYaml(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const ui5Yamls = [FileName.Ui5Yaml, FileName.Ui5MockYaml, FileName.Ui5LocalYaml];
    for (const ui5Yaml of ui5Yamls) {
        let existingUi5YamlConfig: UI5Config;
        try {
            existingUi5YamlConfig = await readUi5Yaml(basePath, ui5Yaml);
        } catch (error) {
            logger?.debug(`Cannot write varinats-config to ${ui5Yaml}. File not existing`);
            continue;
        }

        const previewMiddlewareConfig = existingUi5YamlConfig.updateCustomMiddleware(
            getFioriToolsPreviewConfig(existingUi5YamlConfig)
        );

        if (previewMiddlewareConfig) {
            fs.write(join(basePath, ui5Yaml), previewMiddlewareConfig.toString());
            logger?.info(`Updated preview middleware in ${ui5Yaml}.`);
        }
    }
}
