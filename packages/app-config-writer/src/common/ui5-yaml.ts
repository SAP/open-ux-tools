import { basename, join } from 'path';
import { MiddlewareConfigs } from '../types';
import { FileName, type Package, readUi5Yaml } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import type { PreviewConfigOptions } from '../types';
import type { CustomMiddleware, FioriAppReloadConfig, UI5Config } from '@sap-ux/ui5-config';
import { getPreviewMiddleware, isFioriToolsDeprecatedPreviewConfig } from './utils';
import type { MiddlewareConfig as PreviewConfig } from '@sap-ux/preview-middleware';
import { updatePreviewMiddlewareConfig } from '../preview-config/ui5-yaml';
import { getRunScriptForYamlConfig } from './package-json';

/**
 * Gets the reload middleware form the provided yamlConfig.
 * The middleware can either be named 'fiori-tools-appreload' or 'reload-middleware'.
 * If the middleware is found, a delay of 300ms will be inserted.
 *
 * @param yamlConfig - the yaml configuration to use
 * @returns reload middleware configuration if found or undefined
 */
export async function getEnhancedReloadMiddleware(
    yamlConfig: UI5Config
): Promise<CustomMiddleware<FioriAppReloadConfig> | undefined> {
    const reloadMiddleware =
        yamlConfig.findCustomMiddleware<FioriAppReloadConfig>(MiddlewareConfigs.FioriToolsAppreload) ??
        yamlConfig.findCustomMiddleware<FioriAppReloadConfig>(MiddlewareConfigs.ReloadMiddleware);
    if (!reloadMiddleware) {
        return undefined;
    }
    if (!reloadMiddleware?.configuration?.delay) {
        reloadMiddleware.configuration = { ...reloadMiddleware.configuration, delay: 300 };
    }
    return reloadMiddleware;
}

/**
 * Creates a preview middleware configuration based on the presence of the @sap/ux-ui5-tooling dependency.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to project root, where package.json and ui5.yaml is
 * @returns 'fiori-tools-preview' or 'preview-middleware' configuration
 */
export function createPreviewMiddlewareConfig(fs: Editor, basePath: string): CustomMiddleware<PreviewConfigOptions> {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    return {
        name: packageJson?.devDependencies?.['@sap/ux-ui5-tooling']
            ? MiddlewareConfigs.FioriToolsPreview
            : MiddlewareConfigs.PreviewMiddleware,
        afterMiddleware: 'compression'
    } as CustomMiddleware<PreviewConfigOptions>;
}

/**
 * Checks the project for ui5 configuration yaml files and reads the configuration to update the preview and reload middlewares.
 * If a reload middleware exists, then a delay of 300ms will be inserted and the preview middleware will be set afterward.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to project root, where package.json and ui5.yaml is
 * @param yamlPath - path to the ui5*.yaml file passed by cli
 * @param logger - logger
 */
export async function updateMiddlewaresForPreview(
    fs: Editor,
    basePath: string,
    yamlPath?: string,
    logger?: ToolsLogger
): Promise<void> {
    const ui5YamlFile = yamlPath ? basename(yamlPath) : FileName.Ui5Yaml;
    const ui5YamlConfig = await readUi5Yaml(basePath, ui5YamlFile, fs);

    let previewMiddleware = await getPreviewMiddleware(ui5YamlConfig);
    if (!previewMiddleware) {
        logger?.warn(`No preview middleware found in ${ui5YamlFile}. Preview middleware will be added.`);
        previewMiddleware = createPreviewMiddlewareConfig(fs, basePath);
    } else {
        const script = getRunScriptForYamlConfig(ui5YamlFile, fs, basePath);
        if (script) {
            previewMiddleware = await updatePreviewMiddlewareConfig(previewMiddleware, script, basePath, fs, logger);
        } else {
            //if we don't find a script for flp.path and intent we assume the default values and sanitize the config
            previewMiddleware = sanitizePreviewMiddleware(previewMiddleware) as CustomMiddleware<PreviewConfig>;
        }
    }
    const reloadMiddleware = await getEnhancedReloadMiddleware(ui5YamlConfig);
    if (reloadMiddleware) {
        previewMiddleware.afterMiddleware = reloadMiddleware.name;
        ui5YamlConfig.updateCustomMiddleware(reloadMiddleware);
        logger?.debug(`Updated reload middleware in ${ui5YamlFile}.`);
    }

    ui5YamlConfig.updateCustomMiddleware(previewMiddleware);
    fs.write(join(basePath, ui5YamlFile), ui5YamlConfig.toString());
    logger?.debug(`Updated preview middleware in ${ui5YamlFile}.`);
}

/**
 * Sanitizes the preview middleware configuration.
 *
 * In case of an outdated preview configuration, the following changes will be applied:
 * - property 'ui5Theme' will be moved to 'flp.theme'.
 * - no longer used property 'component' will be removed.
 *
 * @param previewMiddleware - the preview middleware
 * @returns the sanitized preview middleware
 */
export function sanitizePreviewMiddleware(
    previewMiddleware: CustomMiddleware<PreviewConfigOptions>
): CustomMiddleware<PreviewConfig | undefined> {
    if (!isFioriToolsDeprecatedPreviewConfig(previewMiddleware.configuration)) {
        return previewMiddleware as CustomMiddleware<PreviewConfig>;
    }
    const ui5Theme = previewMiddleware.configuration.ui5Theme;
    delete (previewMiddleware as CustomMiddleware<PreviewConfig | undefined>).configuration;

    if (!ui5Theme) {
        return previewMiddleware as unknown as CustomMiddleware<undefined>;
    }

    const configuration = {} as PreviewConfig;
    configuration.flp = {};
    configuration.flp.theme = ui5Theme;
    previewMiddleware.configuration = configuration;
    return previewMiddleware as CustomMiddleware<PreviewConfig>;
}
