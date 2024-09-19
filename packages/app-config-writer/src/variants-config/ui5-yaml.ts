import { join } from 'path';
import { MiddlewareConfigs } from '../types';
import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import { convertDeprecatedConfig, isDeprecatedConfig } from './utils';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import type { UI5Config } from '@sap-ux/ui5-config';
import type { CustomMiddleware } from '@sap-ux/ui5-config';
import type { FioriAppReloadConfig } from '@sap-ux/ui5-config';
import type { FioriToolsPreviewConfig, FioriPreviewConfigOptions } from '../types';

/**
 * Adds the fiori-tools-preview middleware configuration.
 *
 * @param ui5YamlConfig existing ui5 yaml configurations
 * @returns 'fiori-tools-preview' configuration
 */
async function getPreviewMiddleware(ui5YamlConfig: UI5Config): Promise<CustomMiddleware<FioriToolsPreviewConfig>> {
    // ToDo: check for needed flp config
    const previewMiddlewareConfig = {
        name: 'fiori-tools-preview',
        afterMiddleware: 'compression',
        configuration: {}
    };

    const existingPreviewMiddleware = ui5YamlConfig.findCustomMiddleware<FioriPreviewConfigOptions>(
        MiddlewareConfigs.FioriToolsPreview
    );
    const existingLivereloadMiddleware = ui5YamlConfig.findCustomMiddleware<FioriAppReloadConfig>(
        MiddlewareConfigs.FioriToolsAppreload
    );

    if (existingPreviewMiddleware && isDeprecatedConfig(existingPreviewMiddleware.configuration)) {
        previewMiddlewareConfig.configuration = convertDeprecatedConfig(existingPreviewMiddleware.configuration);
    } else {
        previewMiddlewareConfig.configuration = existingPreviewMiddleware?.configuration
            ? { ...existingPreviewMiddleware?.configuration }
            : '';
    }

    if (existingLivereloadMiddleware) {
        previewMiddlewareConfig.afterMiddleware = 'fiori-tools-appreload';
        // ToDo: check for app-reload config and update
        // existingLivereloadMiddleware.configuration.delay = 300;
        // ui5YamlConfig.addFioriToolsAppReloadMiddleware();
    }

    return previewMiddlewareConfig;
}

/**
 * Checks the project for ui5 yaml files and adds the fiori-tools-preview middleware to it.
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
            logger?.debug(`File ${ui5Yaml} not existing`);
            //ToDo: check continue
            continue;
        }

        const previewMiddlewareConfig = existingUi5YamlConfig.updateCustomMiddleware(
            await getPreviewMiddleware(existingUi5YamlConfig)
        );

        if (previewMiddlewareConfig) {
            fs.write(join(basePath, ui5Yaml), previewMiddlewareConfig.toString());
        }
    }
}
