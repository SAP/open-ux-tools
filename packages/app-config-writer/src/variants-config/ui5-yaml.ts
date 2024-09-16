import { join } from 'path';
import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import type { UI5Config } from '@sap-ux/ui5-config';
import type { Editor } from 'mem-fs-editor';
import type { CustomMiddleware } from '@sap-ux/ui5-config';
import type { ToolsLogger } from '@sap-ux/logger';
import type { PreviewConfigOptions, DeprecatedConfig, MiddlewareConfig } from './types';

/**
 * Checks if a fiori-tools-preview middleware configuration is decprecated.
 *
 * @param config fiori-tools-preview middleware configuration
 * @returns type conversion if true
 */
function isDeprecatedConfig(config: PreviewConfigOptions): config is DeprecatedConfig {
    return (config as DeprecatedConfig)?.component !== undefined;
}

/**
 * Adds the fiori-tools-preview middleware configuration.
 *
 * @param ui5YamlConfig existing ui5 yaml configurations
 * @returns 'fiori-tools-preview' configuration
 */
async function addPreviewMiddleware(
    ui5YamlConfig: UI5Config
    // ToDo: create middleware type
): Promise<CustomMiddleware<MiddlewareConfig>> {
    const previewMiddlewareConfig = {
        name: 'fiori-tools-preview',
        afterMiddleware: 'compression',
        configuration: {}
    };

    // ToDo: check if needed
    // replace null occurrences with an empty string
    // yamlContent = JSON.parse(JSON.stringify(yamlContent).replace(/null/g, '""'));

    const existingPreviewMiddleware = ui5YamlConfig.findCustomMiddleware<PreviewConfigOptions>('firoi-tools-preview');
    const existingLivereloadMiddleware = ui5YamlConfig.findCustomMiddleware<any>('fiori-tools-appreload');

    if (isDeprecatedConfig(existingPreviewMiddleware!.configuration)) {
        previewMiddlewareConfig.configuration = {
            flp: {
                path: '/test/flpSandbox.html',
                intent: { object: 'preview', action: 'app' },
                theme: existingPreviewMiddleware?.configuration.ui5Theme,
                libs: existingPreviewMiddleware?.configuration.libs
            }
        };
    } else {
        previewMiddlewareConfig.configuration = existingPreviewMiddleware?.configuration
            ? { ...existingPreviewMiddleware?.configuration }
            : {};
    }

    if (existingLivereloadMiddleware) {
        previewMiddlewareConfig.afterMiddleware = 'fiori-tools-appreload';
        existingLivereloadMiddleware.configuration.delay = 300;
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
            // existingUi5YamlConfig = await UI5Config.newInstance(fs.read(ui5Yaml));
            existingUi5YamlConfig = await readUi5Yaml(basePath, ui5Yaml);
            // previewMiddlewareConfig = await addPreviewMiddleware(fs, existingUi5YamlConfig, ui5YamlPath);
        } catch (error) {
            logger?.debug(`File ${ui5Yaml} not existing`);
            //ToDo: check continue
            continue;
        }

        //ToDo: check for logic if middleware is there
        const previewMiddlewareConfig = existingUi5YamlConfig.updateCustomMiddleware(
            await addPreviewMiddleware(existingUi5YamlConfig)
        );

        if (previewMiddlewareConfig) {
            // const yamlConfig = existingUi5YamlConfig.updateCustomMiddleware(previewMiddlewareConfig);
            const yamlConfig = previewMiddlewareConfig.toString();
            fs.write(join(basePath, ui5Yaml), yamlConfig);
        }
    }
}
