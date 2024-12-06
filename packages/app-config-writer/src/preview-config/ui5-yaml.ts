import { basename, join } from 'path';
import { createPreviewMiddlewareConfig } from '../variants-config/ui5-yaml';
import { ensurePreviewMiddlewareDependency, extractUrlDetails, isValidPreviewScript } from './package-json';
import { FileName, getAllUi5YamlFileNames, getWebappPath, readUi5Yaml, type Package } from '@sap-ux/project-access';
import { getPreviewMiddleware, isFioriToolsDeprecatedPreviewConfig } from '../variants-config/utils';
import { renameSandbox } from './preview-files';
import type { CustomMiddleware, UI5Config } from '@sap-ux/ui5-config';
import type { Editor } from 'mem-fs-editor';
import type {
    FlpConfig,
    MiddlewareConfig as PreviewConfig,
    DefaultFlpPath,
    DefaultIntent
} from '@sap-ux/preview-middleware';
import type { PreviewConfigOptions } from '../types';
import type { ToolsLogger } from '@sap-ux/logger';

const DEFAULT_FLP_PATH: DefaultFlpPath = '/test/flp.html';

const DEFAULT_INTENT: DefaultIntent = {
    object: 'app',
    action: 'preview'
};

/**
 * Checks if a script can be converted based on the used UI5 yaml configuration file.
 *
 * A script can be converted when the used UI5 yaml configuration file exists and complies with the schema validation.
 *
 * @param ui5Yaml - the name of the UI5 yaml configuration file
 * @param scriptName - the name of the script from the package.json file
 * @param ui5YamlFileNames - the UI5 yaml configuration file names
 * @param logger logger to report info to the user
 * @returns indicator if the script is to be converted
 */
function isUi5YamlToBeConverted(
    ui5Yaml: string,
    scriptName: string,
    ui5YamlFileNames: string[],
    logger?: ToolsLogger
): boolean {
    if (!ui5YamlFileNames.includes(ui5Yaml)) {
        logger?.warn(
            `Skipping script, '${scriptName}', because the UI5 YAML configuration file, '${ui5Yaml}', could not be found.`
        );
        return false;
    }
    return true;
}

/**
 * Check if a UI5 yaml configuration file has already been converted based on another script.
 *
 * This is done to avoid overwriting of already converted UI5 yaml configurations.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param ui5Yaml - the name of the UI5 yaml configuration file
 * @param scriptName - the name of the script from the package.json file
 * @param script - the content of the script from the package.json file
 * @param logger logger to report info to the user
 * @returns indicator if the UI5 yaml configuration file has already been converted
 */
async function isUi5YamlAlreadyConverted(
    fs: Editor,
    basePath: string,
    ui5Yaml: string,
    scriptName: string,
    script: string,
    logger?: ToolsLogger
): Promise<boolean> {
    if (
        Object.keys(
            fs.dump(basePath, (file) => {
                return file.basename === ui5Yaml && file.state === 'modified';
            })
        ).length === 0
    ) {
        return false;
    }
    const flpPath = ((await getPreviewMiddleware(undefined, basePath, ui5Yaml, fs)) as CustomMiddleware<PreviewConfig>)
        ?.configuration?.flp?.path;
    const { path: scriptPath } = extractUrlDetails(script);
    if (flpPath != scriptPath) {
        logger?.warn(
            `Skipping script,'${scriptName}', because another script also refers to UI5 YAML configuration file, '${ui5Yaml}'. Adjust the flp.path property in the UI5 YAML configuration file to the correct endpoint or create a separate UI5 YAML configuration file for script, '${scriptName}'. ${ui5Yaml} currently uses ${
                flpPath ?? DEFAULT_FLP_PATH
            } whereas script '${scriptName}' uses '${scriptPath}'.`
        );
    } else {
        logger?.info(
            `Skipping script, '${scriptName}', because the UI5 YAML configuration file '${ui5Yaml}' has already been adjusted based on another script.`
        );
    }
    return true;
}

/**
 * Checks if the passed path is a FLP path.
 *
 * @param path - the path
 * @param configuration - the preview configuration
 * @returns indicator if the path is an FLP path
 */
function pathIsFlpPath(path: string | undefined, configuration: PreviewConfig): boolean {
    if (!path) {
        return false;
    }
    const isNotRtaEditorPath = configuration.rta?.editors?.every((editor) => editor.path !== path) ?? true;
    const isNotTestPath = configuration.test?.every((test) => test.path !== path) ?? true;

    return isNotRtaEditorPath && isNotTestPath;
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
function sanitizePreviewMiddleware(
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

/**
 * Extract the UI5 yaml configuration file name from the script.
 *
 * @param script - the content of the script from the package.json file
 * @returns the UI5 yaml configuration file name or 'ui5.yaml' as default
 */
export function extractYamlConfigFileName(script: string): string {
    return / (?:--config|-c) (\S*)/.exec(script)?.[1] ?? FileName.Ui5Yaml;
}

/**
 * Processes the passed UI5 yaml configuration file and reads out the preview middleware configuration.
 *
 * If the preview middleware creation is not skipped and none is given, one will be created.
 * The configuration for the preview middleware creation will be based on the parameters of the passed script.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param ui5Yaml - the name of the UI5 yaml configuration file
 * @param script - the content of the script
 * @param skipPreviewMiddlewareCreation - (default: false) indicator if the preview middleware creation should be skipped if no preview middleware is configured.
 */
export async function processUi5YamlConfig(
    fs: Editor,
    basePath: string,
    ui5Yaml: string,
    script: string,
    skipPreviewMiddlewareCreation = false
): Promise<void> {
    let ui5YamlConfig: UI5Config;
    try {
        ui5YamlConfig = await readUi5Yaml(basePath, ui5Yaml, fs, { validateSchema: true });
    } catch (error) {
        throw new Error(`An error occurred when reading '${ui5Yaml}': ${error.message}`);
    }
    let previewMiddleware = await getPreviewMiddleware(ui5YamlConfig);

    if (skipPreviewMiddlewareCreation && !previewMiddleware) {
        return;
    }
    if (!previewMiddleware) {
        previewMiddleware = createPreviewMiddlewareConfig(fs, basePath);
    }

    const { path, intent } = extractUrlDetails(script);
    previewMiddleware = updatePreviewMiddlewareConfig(previewMiddleware, intent, path);

    ui5YamlConfig.updateCustomMiddleware(previewMiddleware);
    const yamlPath = join(basePath, ui5Yaml);
    fs.write(yamlPath, ui5YamlConfig.toString());
}

/**
 * Creates a preview middleware configuration.
 *
 * It will sanitize the given preview middleware configuration and construct the flp configuration out of the given intent and path.
 *
 * @param previewMiddleware - the preview middleware configuration
 * @param intent - the intent
 * @param path - the flp path
 * @returns the preview middleware configuration
 */
export function updatePreviewMiddlewareConfig(
    previewMiddleware: CustomMiddleware<PreviewConfigOptions>,
    intent: FlpConfig['intent'] | undefined,
    path: string | undefined
): CustomMiddleware<PreviewConfigOptions> {
    const defaultIntent = `${DEFAULT_INTENT.object}-${DEFAULT_INTENT.action}`;
    const newMiddlewareConfig = sanitizePreviewMiddleware(previewMiddleware);

    //copy of configuration to avoid ending up with an empty configuration object in some cases
    const configuration = { ...newMiddlewareConfig.configuration };
    configuration.flp = configuration.flp ?? {};

    let writeConfig = false;
    //check path and respect defaults
    if (pathIsFlpPath(path, configuration) && !path?.includes(DEFAULT_FLP_PATH)) {
        configuration.flp.path = path;
        writeConfig = true;
    }
    //check intent and respect defaults
    if (intent && `${intent?.object}-${intent?.action}` !== defaultIntent) {
        configuration.flp.intent = {
            object: intent.object,
            action: intent.action
        };
        writeConfig = true;
    }

    if (writeConfig) {
        newMiddlewareConfig.configuration = configuration;
    }

    return newMiddlewareConfig as CustomMiddleware<PreviewConfig>;
}

/**
 * Updates the preview middleware configurations according to the scripts they are being used in package.json.
 *
 * It will process all given UI5 configuration yaml files and check if the preview middleware configuration must be updated based on a given script.
 * If a script is valid, the preview middleware configuration will be updated and the corresponding file renamed.
 * UI5 configuration yaml files which are not used in any script will be sanitized.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param logger logger to report info to the user
 */
export async function updatePreviewMiddlewareConfigs(
    fs: Editor,
    basePath: string,
    logger?: ToolsLogger
): Promise<void> {
    const ui5YamlFileNames = await getAllUi5YamlFileNames(basePath, fs);
    const unprocessedUi5YamlFileNames = [...ui5YamlFileNames];
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    for (const [scriptName, script] of Object.entries(packageJson?.scripts ?? {})) {
        if (!script || !isValidPreviewScript(scriptName, script)) {
            continue;
        }

        const ui5Yaml = basename(extractYamlConfigFileName(script));
        unprocessedUi5YamlFileNames.splice(unprocessedUi5YamlFileNames.indexOf(ui5Yaml), 1);

        if (
            !isUi5YamlToBeConverted(ui5Yaml, scriptName, ui5YamlFileNames, logger) ||
            (await isUi5YamlAlreadyConverted(fs, basePath, ui5Yaml, scriptName, script, logger))
        ) {
            continue;
        }

        try {
            await processUi5YamlConfig(fs, basePath, ui5Yaml, script);
        } catch (error) {
            logger?.warn(
                `Skipping script, '${scriptName}', which refers to the UI5 YAML configuration file '${ui5Yaml}'. ${error.message}`
            );
            continue;
        }

        const { path } = extractUrlDetails(script);
        if (path) {
            await renameSandbox(fs, join(await getWebappPath(basePath), path), logger);
        }
        ensurePreviewMiddlewareDependency(packageJson, fs, packageJsonPath);

        logger?.info(
            `The UI5 YAML configuration file, '${ui5Yaml}', has been updated according to script, '${scriptName}'.`
        );
    }
    for (const ui5Yaml of unprocessedUi5YamlFileNames) {
        //at least adjust deprecated preview config of unused ui5 yaml configurations
        try {
            await processUi5YamlConfig(fs, basePath, ui5Yaml, '', true);
        } catch (error) {
            logger?.warn(`Skipping UI5 yaml configuration file '${ui5Yaml}'. ${error.mesage}`);
        }
        logger?.warn(
            `The UI5 YAML configuration file, '${ui5Yaml}', is not used in any preview script. Outdated preview middleware will be adjusted if necessary.`
        );
    }
}
