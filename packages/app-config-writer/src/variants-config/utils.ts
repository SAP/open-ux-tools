import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import { MiddlewareConfigs } from '../types';
import { stringify } from 'querystring';
import type { Package } from '@sap-ux/project-access';
import type { CustomMiddleware, UI5Config } from '@sap-ux/ui5-config';
import type { PreviewConfigOptions, FioriToolsDeprecatedPreviewConfig } from '../types';
import type { Editor } from 'mem-fs-editor';

/**
 * Gets the preview middleware form the yamlConfig or provided path.
 * The middleware can either be named 'fiori-tools-preview' or 'preview-middleware'.
 *
 * @param yamlConfig - the yaml configuration to use; if not provided, the file will be read with the provided basePath and filename
 * @param basePath - path to project root, where ui5.yaml is located
 * @param filename - name of the ui5 yaml file to read from basePath; default is 'ui5.yaml'
 * @param fs - the memfs editor instance
 * @returns preview middleware configuration if found
 * Rejects if neither yamlConfig nor basePath is provided or if the file can't be read
 */
export async function getPreviewMiddleware(
    yamlConfig?: UI5Config,
    basePath?: string,
    filename: string = FileName.Ui5Yaml,
    fs?: Editor
): Promise<CustomMiddleware<PreviewConfigOptions> | undefined> {
    if (!basePath && !yamlConfig) {
        throw new Error('Either base path or yaml config must be provided.');
    }
    yamlConfig = yamlConfig ?? (await readUi5Yaml(basePath!, filename, fs));
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
export function isFioriToolsDeprecatedPreviewConfig(
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
 * Extracts the version of the given dependency from the given package.json file.
 *
 * @param packageJson - package.json file
 * @param dependencyName - name of the (dev-)dependency
 * @returns version of the dependency as an array of numbers
 */
export function getDependencyVersion(packageJson: Package, dependencyName: string): number[] | undefined {
    return (
        packageJson?.devDependencies?.[dependencyName]?.split('.').map((versionPart) => parseInt(versionPart, 10)) ??
        packageJson?.dependencies?.[dependencyName]?.split('.').map((versionPart) => parseInt(versionPart, 10))
    );
}

/**
 * Checks if the given version is less than the given major, minor and patch version.
 *
 * @param version - version to be checked
 * @param major - major version to be compared with
 * @param minor - minor version to be compared with
 * @param patch - patch version to be compared with
 * @returns true, if the given version is less than the given major, minor and patch version
 */
function isVersionLessThan(version: number[], major: number, minor: number, patch: number): boolean {
    const [vMajor, vMinor, vPatch] = version;
    return vMajor < major || (vMajor === major && (vMinor < minor || (vMinor === minor && vPatch < patch)));
}

/**
 * Enhances the given url parameters with the ones needed for the UI5 run time adaptation.
 *
 @param packageJson - package.json file
 * @param existingParams - parameters to be enhanced
 * @returns enhanced url parameters
 */
export function enhanceUrlParametersWithRta(packageJson: Package, existingParams: Record<string, string> = {}): string {
    const parameters: Record<string, string> = {};

    const previewMiddlewareVersion = getDependencyVersion(packageJson, '@sap-ux/preview-middleware');
    const uxUi5ToolingVersion = getDependencyVersion(packageJson, '@sap/ux-ui5-tooling');
    if (
        (!previewMiddlewareVersion || isVersionLessThan(previewMiddlewareVersion, 0, 16, 89)) ??
        (!uxUi5ToolingVersion || isVersionLessThan(uxUi5ToolingVersion, 1, 15, 4))
    ) {
        parameters['fiori-tools-rta-mode'] = 'true';
        parameters['sap-ui-rta-skip-flex-validation'] = 'true';
        parameters['sap-ui-xx-condense-changes'] = 'true';
    }
    return stringify(Object.assign(parameters, existingParams));
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
 * Returns the serve command for the preview middleware configuration of the ui5.yaml file, if given.
 * If the fiori-tools-preview middleware is used, then the serve command will be 'fiori run'.
 * If the preview middleware is used, the serve command will be 'ui5 serve'.
 *
 * @param basePath - path to project root, where ui5.yaml is located
 * @param yamlFileName - name of the ui5 yaml file to read from basePath; default is 'ui5.yaml'
 * @param fs - the memfs editor instance
 * @returns - preview serve or undefined
 */
export async function getRTAServe(basePath: string, yamlFileName: string, fs: Editor): Promise<string | undefined> {
    const previewMiddleware = await getPreviewMiddleware(undefined, basePath, yamlFileName, fs);
    return previewMiddleware?.name === MiddlewareConfigs.PreviewMiddleware ? 'ui5 serve' : 'fiori run';
}

/**
 * Returns the url for variants management in RTA mode.
 * The url consist of a specified mount point and intent given from the ui5.yaml file as well as parameters for the RTA mode.
 *
 * @param basePath - path to project root, where package.json and ui5.yaml is located
 * @param query - query to create fragment
 * @param yamlFileName - path of the ui5 yaml file
 * @returns - review url parameters
 */
export async function getRTAUrl(basePath: string, query: string, yamlFileName: string): Promise<string | undefined> {
    let previewMiddleware: CustomMiddleware<PreviewConfigOptions> | undefined;
    try {
        previewMiddleware = await getPreviewMiddleware(undefined, basePath, yamlFileName);
    } catch (error) {
        throw new Error(`No ${yamlFileName} file found. ${error}`);
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
