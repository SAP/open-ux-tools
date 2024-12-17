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
    TestConfig,
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

const DEFAULT_TEST_CONFIGS: TestConfig[] = [
    { framework: 'Testsuite', path: 'test/testsuite.qunit.html' },
    { framework: 'OPA5', path: 'test/opaTests.qunit.html' },
    { framework: 'QUnit', path: 'test/unitTests.qunit.html' }
];

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
 * @param scriptName - the name of the script from the package.json file
 * @param script - the content of the script from the package.json file
 * @param convertTests - indicator if test suite and test runner should be included in the conversion
 * @param logger logger to report info to the user
 * @returns indicator if the UI5 yaml configuration file has already been converted
 */
async function isUi5YamlFlpPathAlreadyConverted(
    fs: Editor,
    basePath: string,
    ui5Yaml: string,
    scriptName: string,
    script: string,
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
    const { path: scriptPath } = extractUrlDetails(script);
    if (yamlConfigAlreadyAdjusted && flpPath != scriptPath && (convertTests ? !isTestPath(scriptPath) : true)) {
        logger?.warn(
            `Skipping script'${scriptName}', because another script also refers to UI5 YAML configuration file, '${ui5Yaml}'. Adjust the 'flp.path' property in the UI5 YAML configuration file to the correct endpoint or create a separate UI5 YAML configuration file for script '${scriptName}'. ${ui5Yaml} currently uses ${
                flpPath ?? DEFAULT_FLP_PATH
            } whereas script '${scriptName}' uses '${scriptPath}'.`
        );
        return true;
    }
    return false;
}

/**
 * Checks if the passed path is a FLP path.
 *
 * @param path - the path
 * @param configuration - the preview configuration
 * @returns indicator if the path is an FLP path
 */
function isFlpPath(path: string | undefined, configuration: PreviewConfig): boolean {
    if (!path) {
        return false;
    }
    const isRtaEditorPath = configuration.rta?.editors?.some((editor) => editor.path === path) ?? false;
    return !isRtaEditorPath && !isTestPath(path, configuration);
}

/**
 * Check if the path is a test path.
 * 1) path matches pattern '**.qunit.html'
 * 2) path is being used as test configuration path in yaml configuration.
 *
 * @param path - the path
 * @param configuration - the preview configuration
 * @returns indicator if the path is a test path
 */
export function isTestPath(path: string | undefined, configuration?: PreviewConfig): boolean {
    if (!path) {
        return false;
    }
    //todo: how to ensure we don't mistake other test scripts for preview scripts?
    if (path.includes('.qunit.html')) {
        return true;
    }
    return configuration?.test?.some((testConfig) => testConfig.path === path) ?? false;
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

    let writeConfig = false;
    if (isFlpPath(path, configuration)) {
        //adjust path but respect defaults
        if (!path?.includes(DEFAULT_FLP_PATH)) {
            configuration.flp = configuration.flp ?? {};
            configuration.flp.path = path;
            writeConfig = true;
        }
        //adjust intent but respect defaults
        if (intent && `${intent?.object}-${intent?.action}` !== defaultIntent) {
            configuration.flp = configuration.flp ?? {};
            configuration.flp.intent = {
                object: intent.object,
                action: intent.action
            };
            writeConfig = true;
        }
    } else if (isTestPath(path, configuration)) {
        configuration.test = updateTestConfig(configuration.test, path);
        writeConfig = true;
    }

    if (writeConfig) {
        newMiddlewareConfig.configuration = configuration;
    }

    return newMiddlewareConfig as CustomMiddleware<PreviewConfig>;
}

/**
 * Update the test configuration.
 *
 * @param testConfiguration - the test configuration
 * @param path - the path
 * @returns the updated test configuration
 */
export function updateTestConfig(
    testConfiguration: PreviewConfig['test'],
    path: string | undefined
): PreviewConfig['test'] {
    testConfiguration = testConfiguration ?? [];

    let framework: TestConfig['framework'] | undefined;
    if (path?.includes('testsuite.qunit.html')) {
        framework = 'Testsuite';
    } else if (path?.includes('opaTests.qunit.html')) {
        framework = 'OPA5';
    } else if (path?.includes('unitTests.qunit.html')) {
        framework = 'QUnit';
    }

    if (!framework) {
        return testConfiguration;
    }

    const defaultPath = DEFAULT_TEST_CONFIGS.find((config) => config.framework === framework)?.path ?? '';
    const testConfig = testConfiguration.find((test) => test.framework === framework);
    if (testConfig) {
        testConfig.path = path;
        if (testConfig.path === defaultPath) {
            //sanitize default path
            delete testConfig.path;
        }
    } else if (path?.includes(defaultPath)) {
        testConfiguration.push({ framework });
    } else {
        testConfiguration.push({ framework, path });
    }
    return testConfiguration;
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
        const previewMiddleware = (await getPreviewMiddleware(ui5YamlConfig)) as CustomMiddleware<PreviewConfig>;
        if (previewMiddleware.configuration.test) {
            return;
        }
    }
    let ui5YamlConfig: UI5Config;
    try {
        ui5YamlConfig = await readUi5Yaml(basePath, FileName.Ui5Yaml, fs);
    } catch (error) {
        logger?.info(
            `The UI5 YAML configuration file 'ui5.yaml', can't be updated according to support test frameworks: '${error}'. Please manually add the test configuration to the UI5 YAML configuration file used for testing according to https://github.com/SAP/open-ux-tools/tree/main/packages/preview-middleware#configuration-option-test.`
        );
        return;
    }
    const previewMiddleware = (await getPreviewMiddleware(ui5YamlConfig)) as CustomMiddleware<PreviewConfig>;
    DEFAULT_TEST_CONFIGS.forEach((defaultTest) => {
        if (
            previewMiddleware.configuration?.test?.some((testConfig) => testConfig.framework === defaultTest.framework)
        ) {
            //do not touch existing test config
            return;
        }
        previewMiddleware.configuration.test = updateTestConfig(previewMiddleware.configuration.test, defaultTest.path);
        logger?.info(
            `The UI5 YAML configuration file 'ui5.yaml', has been updated to support the test framework '${defaultTest.framework}'. Please consider transferring the test configuration to the UI5 YAML configuration file used for testing.`
        );
    });
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
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    for (const [scriptName, script] of Object.entries(packageJson?.scripts ?? {})) {
        if (!script || !isValidPreviewScript(scriptName, script, convertTests)) {
            continue;
        }

        const ui5Yaml = basename(extractYamlConfigFileName(script));
        unprocessedUi5YamlFileNames.splice(unprocessedUi5YamlFileNames.indexOf(ui5Yaml), 1);

        if (
            !isUi5YamlToBeConverted(ui5Yaml, scriptName, ui5YamlFileNames, logger) ||
            (await isUi5YamlFlpPathAlreadyConverted(fs, basePath, ui5Yaml, scriptName, script, convertTests, logger))
        ) {
            continue;
        }

        try {
            await processUi5YamlConfig(fs, basePath, ui5Yaml, script);
        } catch (error) {
            logger?.warn(
                `Skipping script '${scriptName}', which refers to the UI5 YAML configuration file '${ui5Yaml}'. ${error.message}`
            );
            continue;
        }

        const { path } = extractUrlDetails(script);
        if (path) {
            await renameSandbox(fs, join(await getWebappPath(basePath), path), logger);
        }
        ensurePreviewMiddlewareDependency(packageJson, fs, packageJsonPath);

        logger?.info(
            `The UI5 YAML configuration file '${ui5Yaml}', has been updated according to script, '${scriptName}'.`
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
            `The UI5 YAML configuration file '${ui5Yaml}', is not used in any preview script. Outdated preview middleware will be adjusted, if necessary.`
        );
    }
}
