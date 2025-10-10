import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import { MiddlewareConfigs } from '../types';
import type { CustomMiddleware, UI5Config } from '@sap-ux/ui5-config';
import type { PreviewConfigOptions, FioriToolsDeprecatedPreviewConfig } from '../types';
import type { Editor } from 'mem-fs-editor';
import { basename } from 'node:path';
import type { ToolsLogger } from '@sap-ux/logger';
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
 * Returns the intent of the preview middleware configuration from the ui5.yaml file, if given.
 *
 * @param previewMiddlewareConfig - configuration of the preview middleware
 * @returns - preview intent or undefined
 */
export function getIntentFromPreviewConfig(
    previewMiddlewareConfig: PreviewConfigOptions | undefined
): string | undefined {
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
export async function getCLIForPreview(
    basePath: string,
    yamlFileName: string,
    fs: Editor
): Promise<string | undefined> {
    const previewMiddleware = await getPreviewMiddleware(undefined, basePath, yamlFileName, fs);
    return previewMiddleware?.name === MiddlewareConfigs.PreviewMiddleware ? 'ui5 serve' : 'fiori run';
}

/**
 * Deletes the given file.
 *
 * @param fs - file system reference
 * @param files - files to be deleted
 * @param logger logger to report info to the user
 */
export async function deleteFiles(fs: Editor, files: string[], logger?: ToolsLogger): Promise<void> {
    files.forEach((path: string): void => {
        if (fs.exists(path)) {
            fs.delete(path);
            logger?.info(
                `Deleted the '${basename(path)}' file. This file is no longer needed for the virtual endpoints.`
            );
        }
    });
}
