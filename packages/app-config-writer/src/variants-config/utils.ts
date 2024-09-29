import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import type { Package } from '@sap-ux/project-access';
import { MiddlewareConfigs } from '../types';
import { stringify } from 'querystring';
import type { CustomMiddleware } from '@sap-ux/ui5-config';
import type { FioriPreviewConfigOptions, FioriToolsDeprecatedPreviewConfig } from '../types';

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
 * Type guard to check if the given configuration is a deprecated preview middleware configuration.
 *
 * @param configuration preview middleware configuration
 * @returns true, if a preview middleware configuration is deprecated
 */
function isFioriToolsDeprecatedPreviewConfig(
    configuration: FioriPreviewConfigOptions | undefined
): configuration is FioriToolsDeprecatedPreviewConfig {
    return (configuration as FioriToolsDeprecatedPreviewConfig)?.component !== undefined;
}

/**
 * Extracts sap client string from existing scripts in package.json.
 *
 * @param scripts - script section of the package.json
 * @returns sap client
 */
export function getSapClientFromPackageJson(scripts: Package['scripts']): string | undefined {
    for (const value of Object.values(scripts!)) {
        const match = value?.match(/sap-client=([0-9]{3})/);
        if (match) {
            return match[1];
        }
    }
    return undefined;
}

/**
 * Returns the UI5 url parameters.
 *
 * @param overwritingParams - parameters to be overwritten
 * @returns - UI5 url parameters
 */
export function getUi5UrlParameters(overwritingParams: Record<string, string> = {}): string {
    const parameters: Record<string, string> = {
        'fiori-tools-rta-mode': 'true',
        'sap-ui-rta-skip-flex-validation': 'true',
        'sap-ui-xx-condense-changes': 'true'
    };
    return stringify(Object.assign(parameters, overwritingParams));
}

/**
 * Returns the preview url.
 *
 * @param basePath - path to project root, where package.json and ui5.yaml is located
 * @param query - query to create fragment
 * @returns - review url parameters
 */
export async function getPreviewUrl(basePath: string, query: string): Promise<string> {
    const existingPreviewMiddleware = await getFioriToolsPreviewMiddleware(basePath);
    return isFioriToolsDeprecatedPreviewConfig(existingPreviewMiddleware?.configuration)
        ? `preview.html?${query}#preview-app`
        : `preview.html?${query}#app-preview`;
}
