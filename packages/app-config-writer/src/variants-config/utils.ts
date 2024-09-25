import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import { MiddlewareConfigs } from '../types';
import type { CustomMiddleware } from '@sap-ux/ui5-config';
import type { FioriPreviewConfigOptions, FioriToolsDeprecatedPreviewConfig } from '../types';

/**
 * Checks if a fiori-tools-preview middleware configuration is decprecated.
 *
 * @param config fiori-tools-preview middleware configuration
 * @returns type conversion if true
 */
function isDeprecatedConfig(config: FioriPreviewConfigOptions): config is FioriToolsDeprecatedPreviewConfig {
    return (config as FioriToolsDeprecatedPreviewConfig)?.component !== undefined;
}

/**
 * Gets the fiori-tools-preview middleware configuration.
 *
 * @param basePath - path to project root, where package.json and ui5.yaml is
 * @returns 'fiori-tools-preview' configuration if given
 */
async function getFioriToolsPreviewMiddleware(
    basePath: string
): Promise<CustomMiddleware<FioriPreviewConfigOptions> | undefined> {
    const existingUi5YamlConfig = await readUi5Yaml(basePath, FileName.Ui5Yaml);
    return existingUi5YamlConfig.findCustomMiddleware<FioriPreviewConfigOptions>(MiddlewareConfigs.FioriToolsPreview);
}

/**
 * Gets the the fiori-tools-preview middleware configuration and checks if it's decprecated.
 *
 * @param basePath - path to project root, where package.json and ui5.yaml is
 * @returns true, if a fiori-tools-previewre middleware configuration is deprecated
 */
export async function checkDeprecatedPreviewMiddleware(basePath: string): Promise<boolean> {
    const existingPreviewMiddleware = await getFioriToolsPreviewMiddleware(basePath);
    if (existingPreviewMiddleware && isDeprecatedConfig(existingPreviewMiddleware.configuration)) {
        return true;
    } else {
        return false;
    }
}
