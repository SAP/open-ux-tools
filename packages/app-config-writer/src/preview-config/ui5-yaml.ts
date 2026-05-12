import { basename, join } from 'node:path';
import {
    createPreviewMiddlewareConfig,
    updatePreviewMiddlewareConfig,
    updateTestConfig,
    DEFAULT_FLP_PATH,
    TEST_CONFIG_DEFAULTS
} from '../common/ui5-yaml';
import { ensurePreviewMiddlewareDependency } from './package-json';
import { FileName, getAllUi5YamlFileNames, readUi5Yaml } from '@sap-ux/project-access';
import { getPreviewMiddleware } from '../common/utils';
import {
    extractUrlDetails,
    isValidPreviewScript,
    extractYamlConfigFileName,
    type Script,
    isTestPath,
    getScriptsFromPackageJson
} from '../common/package-json';
import { renameSandbox } from './preview-files';
import type { CustomMiddleware, UI5Config } from '@sap-ux/ui5-config';
import type { Editor } from 'mem-fs-editor';
import type { MiddlewareConfig as PreviewConfig } from '@sap-ux/preview-middleware';
import type { ToolsLogger } from '@sap-ux/logger';

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
            `Skipping script '${scriptName}', because the UI5 YAML configuration file, '${ui5Yaml}', could not be found.`
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
 * @param script - the script from the package.json file
 * @param convertTests - indicator if test suite and test runner should be included in the conversion
 * @param logger logger to report info to the user
 * @returns indicator if the UI5 yaml configuration file has already been converted
 */
async function isUi5YamlFlpPathAlreadyConverted(
    fs: Editor,
    basePath: string,
    ui5Yaml: string,
    script: Script,
    convertTests: boolean,
    logger?: ToolsLogger
): Promise<boolean> {
    const yamlConfigAlreadyAdjusted =
        Object.keys(
            fs.dump(basePath, (file) => {
                return file.basename === ui5Yaml && file.state === 'modified';
            })
        ).length > 0;
    const flpPath = ((await getPreviewMiddleware(undefined, basePath, ui5Yaml, fs)) as CustomMiddleware<PreviewConfig>)
        ?.configuration?.flp?.path;
    const { path: scriptPath } = extractUrlDetails(script.value);
    if (yamlConfigAlreadyAdjusted && flpPath != scriptPath && (convertTests ? !isTestPath(script) : true)) {
        logger?.warn(
            `Skipping script '${
                script.name
            }', because another script also refers to UI5 YAML configuration file, '${ui5Yaml}'. Adjust the 'flp.path' property in the UI5 YAML configuration file to the correct endpoint or create a separate UI5 YAML configuration file for script '${
                script.name
            }'. ${ui5Yaml} currently uses ${flpPath ?? DEFAULT_FLP_PATH} whereas script '${
                script.name
            }' uses '${scriptPath}'.`
        );
        return true;
    }
    return false;
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
 * @param logger logger to report info to the user
 * @param skipPreviewMiddlewareCreation - (default: false) indicator if the preview middleware creation should be skipped if no preview middleware is configured.
 */
export async function processUi5YamlConfig(
    fs: Editor,
    basePath: string,
    ui5Yaml: string,
    script: Script,
    logger?: ToolsLogger,
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

    previewMiddleware = await updatePreviewMiddlewareConfig(previewMiddleware, script, basePath, fs, logger);

    ui5YamlConfig.updateCustomMiddleware(previewMiddleware);
    const yamlPath = join(basePath, ui5Yaml);
    fs.write(yamlPath, ui5YamlConfig.toString());
}

/**
 * Updates the default test configurations in the 'ui5.yaml' in case no test config exists in any UI5 configuration file.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param logger logger to report info to the user
 */
export async function updateDefaultTestConfig(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const ui5YamlFileNames = await getAllUi5YamlFileNames(basePath, fs);
    for (const ui5Yaml of ui5YamlFileNames.filter((ui5Yaml) => ui5Yaml !== FileName.Ui5Yaml)) {
        const ui5YamlConfig = await readUi5Yaml(basePath, ui5Yaml, fs);
        const previewMiddleware = (await getPreviewMiddleware(ui5YamlConfig)) as Partial<
            CustomMiddleware<PreviewConfig>
        >;
        if (previewMiddleware?.configuration?.test) {
            return;
        }
    }
    let ui5YamlConfig: UI5Config;
    try {
        ui5YamlConfig = await readUi5Yaml(basePath, FileName.Ui5Yaml, fs);
    } catch (error) {
        logger?.warn(
            `The UI5 YAML configuration file 'ui5.yaml', can't be updated to support test frameworks: '${error}'. Please manually add the test configuration to the UI5 YAML configuration file used for testing according to https://github.com/SAP/open-ux-tools/tree/main/packages/preview-middleware#configuration-option-test.`
        );
        return;
    }
    const previewMiddleware = (await getPreviewMiddleware(ui5YamlConfig)) as CustomMiddleware<PreviewConfig>;

    for (const defaultConfig of Object.values(TEST_CONFIG_DEFAULTS)) {
        if (
            previewMiddleware.configuration?.test?.some(
                (testConfig) => testConfig.framework.toLowerCase() === defaultConfig.framework.toLowerCase()
            )
        ) {
            //do not touch existing test config
            break;
        }
        previewMiddleware.configuration.test = await updateTestConfig(
            previewMiddleware.configuration.test,
            defaultConfig.path,
            basePath,
            fs,
            logger
        );
        logger?.info(
            `The UI5 YAML configuration file 'ui5.yaml', has been updated to support the test framework '${defaultConfig.framework}'. Please consider transferring the test configuration to the UI5 YAML configuration file used for testing.`
        );
    }
    ui5YamlConfig.updateCustomMiddleware(previewMiddleware);
    const yamlPath = join(basePath, FileName.Ui5Yaml);
    fs.write(yamlPath, ui5YamlConfig.toString());
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
 * @param convertTests - indicator if test suite and test runner should be included in the conversion
 * @param logger logger to report info to the user
 */
export async function updatePreviewMiddlewareConfigs(
    fs: Editor,
    basePath: string,
    convertTests: boolean,
    logger?: ToolsLogger
): Promise<void> {
    const ui5YamlFileNames = await getAllUi5YamlFileNames(basePath, fs);
    const unprocessedUi5YamlFileNames = [...ui5YamlFileNames];
    for (const [scriptName, scriptValue] of getScriptsFromPackageJson(fs, basePath)) {
        const script: Script = { name: scriptName, value: scriptValue };
        if (!scriptValue || !isValidPreviewScript(script, convertTests)) {
            continue;
        }

        const ui5Yaml = basename(extractYamlConfigFileName(scriptValue));
        unprocessedUi5YamlFileNames.splice(unprocessedUi5YamlFileNames.indexOf(ui5Yaml), 1);

        if (
            !isUi5YamlToBeConverted(ui5Yaml, scriptName, ui5YamlFileNames, logger) ||
            (await isUi5YamlFlpPathAlreadyConverted(fs, basePath, ui5Yaml, script, convertTests, logger))
        ) {
            continue;
        }

        try {
            await processUi5YamlConfig(fs, basePath, ui5Yaml, script, logger);
        } catch (error) {
            logger?.warn(
                `Skipping script '${scriptName}', which refers to the UI5 YAML configuration file '${ui5Yaml}'. ${error.message}`
            );
            continue;
        }

        const { path } = extractUrlDetails(scriptValue);
        if (path) {
            await renameSandbox(fs, basePath, path, logger);
        }
        ensurePreviewMiddlewareDependency(fs, basePath);

        logger?.info(
            `The UI5 YAML configuration file '${ui5Yaml}', has been updated according to script, '${scriptName}'.`
        );
    }
    for (const ui5Yaml of unprocessedUi5YamlFileNames) {
        //at least adjust deprecated preview config of unused ui5 yaml configurations
        const emptyScript = { name: '', value: '' };
        try {
            await processUi5YamlConfig(fs, basePath, ui5Yaml, emptyScript, logger, true);
        } catch (error) {
            logger?.warn(`Skipping UI5 YAML configuration file '${ui5Yaml}'. ${error.mesage}`);
        }
        logger?.warn(
            `The UI5 YAML configuration file '${ui5Yaml}', is not used in any preview script. Outdated preview middleware will be adjusted, if necessary.`
        );
    }
}
