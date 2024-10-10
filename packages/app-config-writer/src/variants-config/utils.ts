import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import { MiddlewareConfigs } from '../types';
import { stringify } from 'querystring';
import type { Package } from '@sap-ux/project-access';
import type { CustomMiddleware, UI5Config } from '@sap-ux/ui5-config';
import type { PreviewConfigOptions, FioriToolsDeprecatedPreviewConfig } from '../types';

/**
 * Gets the preview middleware form the yamlConfig or provided path.
 * The middleware can either be named 'fiori-tools-preview' or 'preview-middleware'.
 *
 * @param yamlConfig - the yaml configuration to use; if not provided, the file will be read with the provided basePath and filename
 * @param basePath - path to project root, where ui5.yaml is located
 * @param filename - name of the ui5 yaml file to read from basePath; default is 'ui5.yaml'
 * @returns preview middleware configuration if found or undefined
 * @throws {Error} if filename is not found at basePath
 * @throws {Error} if basePath and yamlConfig are undefined
 */
export async function getPreviewMiddleware(
    yamlConfig?: UI5Config,
    basePath?: string,
    filename: string = FileName.Ui5Yaml
): Promise<CustomMiddleware<PreviewConfigOptions> | undefined> {
    if (!basePath && !yamlConfig) {
        throw new Error('Either base path or yaml config must be provided');
    }
    yamlConfig = yamlConfig ?? (await readUi5Yaml(basePath!, filename));
    return (
        yamlConfig.findCustomMiddleware<PreviewConfigOptions>(MiddlewareConfigs.FioriToolsPreview) ??
        yamlConfig.findCustomMiddleware<PreviewConfigOptions>(MiddlewareConfigs.PreviewMiddleware)
    );
}

/**
 * Type guard to check if the given configuration is a deprecated preview middleware configuration.
 *
 * @param configuration preview middleware configuration
 * @returns true, if a preview middleware configuration is deprecated
 */
function isFioriToolsDeprecatedPreviewConfig(
    configuration: PreviewConfigOptions | undefined
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
        const match = value?.match(/sap-client=(\d{3})/);
        if (match) {
            return match[1];
        }
    }
    return undefined;
}

/**
 * Returns the UI5 url parameters.
 * This is needed for the UI5 run time adaptation.
 *
 * @param overwritingParams - parameters to be overwritten
 * @returns - UI5 url parameters
 */
export function getUI5UrlParameters(overwritingParams: Record<string, string> = {}): string {
    const parameters: Record<string, string> = {
        'fiori-tools-rta-mode': 'true',
        'sap-ui-rta-skip-flex-validation': 'true',
        'sap-ui-xx-condense-changes': 'true'
    };
    return stringify(Object.assign(parameters, overwritingParams));
}

/**
 * Returns the RTA mount point of the preview middleware configuration from the ui5.yaml file, if given.
 *
 * @param previewMiddlewareConfig - configuration of the preview middleware
 * @returns - RTA mount point or undefined
 */
function getRTAMountPoint(previewMiddlewareConfig: PreviewConfigOptions | undefined): string | undefined {
    if (!isFioriToolsDeprecatedPreviewConfig(previewMiddlewareConfig) && previewMiddlewareConfig?.rta?.editors) {
        const editors = previewMiddlewareConfig.rta.editors;
        for (const editor of editors) {
            if (!('developerMode' in editor)) {
                return editor.path;
            }
        }
    }
    return undefined;
}

/**
 * Returns the intent of the preview middleware configuration from the ui5.yaml file, if given.
 *
 * @param previewMiddlewareConfig - configuration of the preview middleware
 * @returns - preview intent or undefined
 */
function getRTAIntent(previewMiddlewareConfig: PreviewConfigOptions | undefined): string | undefined {
    if (isFioriToolsDeprecatedPreviewConfig(previewMiddlewareConfig)) {
        return undefined;
    }
    const intent = previewMiddlewareConfig?.flp?.intent;
    return intent ? `#${intent.object}-${intent.action}` : undefined;
}

/**
 * Returns the url for variants management in RTA mode.
 * The url consist of a specified mount point and intent given from the ui5.yaml file as well as parameters for the RTA mode.
 *
 * @param basePath - path to project root, where package.json and ui5.yaml is located
 * @param query - query to create fragment
 * @returns - review url parameters
 */
export async function getRTAUrl(basePath: string, query: string): Promise<string | undefined> {
    let previewMiddleware: CustomMiddleware<PreviewConfigOptions> | undefined;
    try {
        previewMiddleware = await getPreviewMiddleware(undefined, basePath);
    } catch (error) {
        //todo: what to do in case there is no ui5.yaml file? try FileName.Ui5MockYaml or FileName.Ui5LocalYaml as fallback?
        return undefined;
    }

    if (
        previewMiddleware?.name === MiddlewareConfigs.PreviewMiddleware &&
        !getRTAMountPoint(previewMiddleware?.configuration)
    ) {
        return undefined;
    }
    const mountPoint = getRTAMountPoint(previewMiddleware?.configuration) ?? '/preview.html';
    const intent = getRTAIntent(previewMiddleware?.configuration) ?? '#app-preview';

    return isFioriToolsDeprecatedPreviewConfig(previewMiddleware?.configuration)
        ? `${mountPoint}?${query}#preview-app`
        : `${mountPoint}?${query}${intent}`;
}
