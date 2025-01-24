import { basename, dirname, join } from 'path';
import { createPreviewMiddlewareConfig } from '../variants-config/ui5-yaml';
import { ensurePreviewMiddlewareDependency, extractUrlDetails, isValidPreviewScript } from './package-json';
import { FileName, getAllUi5YamlFileNames, getWebappPath, readUi5Yaml, type Package } from '@sap-ux/project-access';
import { getPreviewMiddleware, isFioriToolsDeprecatedPreviewConfig } from '../variants-config/utils';
import { renameSandbox, deleteFiles } from './preview-files';
import type { CustomMiddleware, UI5Config } from '@sap-ux/ui5-config';
import type { Editor } from 'mem-fs-editor';
import type {
    MiddlewareConfig as PreviewConfig,
    DefaultFlpPath,
    DefaultIntent,
    TestConfigDefaults as PreviewTestConfigDefaults,
    TestConfig
} from '@sap-ux/preview-middleware';
import type { PreviewConfigOptions } from '../types';
import type { ToolsLogger } from '@sap-ux/logger';

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number];

type PreviewTestConfig = ArrayElement<Required<PreviewConfig>['test']>;

export type Script = { name: string; value: string };

const DEFAULT_FLP_PATH: DefaultFlpPath = '/test/flp.html';

const DEFAULT_INTENT: DefaultIntent = {
    object: 'app',
    action: 'preview'
};

export const TEST_CONFIG_DEFAULTS: Record<string, Readonly<Required<PreviewTestConfig>>> = {
    qunit: {
        path: '/test/unitTests.qunit.html',
        framework: 'QUnit'
    },
    opa5: {
        path: '/test/opaTests.qunit.html',
        framework: 'OPA5'
    },
    testsuite: {
        path: '/test/testsuite.qunit.html',
        framework: 'Testsuite'
    }
} as Omit<
    PreviewTestConfigDefaults,
    | PreviewTestConfigDefaults['testsuite']['init']
    | PreviewTestConfigDefaults['testsuite']['pattern']
    | PreviewTestConfigDefaults['opa5']['init']
    | PreviewTestConfigDefaults['opa5']['pattern']
    | PreviewTestConfigDefaults['qunit']['init']
    | PreviewTestConfigDefaults['qunit']['pattern']
>;

/**
 * Map of scripts from the package.json file.
 */
const scriptsFromPackageJson = new Map<string, string>();

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
 * Checks if the passed path is a FLP path.
 *
 * @param script - the script content
 * @param configuration - the preview configuration
 * @returns indicator if the path is an FLP path
 */
function isFlpPath(script: Script, configuration: PreviewConfig): boolean {
    const { path } = extractUrlDetails(script.value);
    if (!path) {
        return false;
    }
    const isRtaEditorPath = configuration.rta?.editors?.some((editor) => editor.path === path) ?? false;
    return !isRtaEditorPath && !isTestPath(script, configuration);
}

/**
 * Check if the path is a test path.
 * 1) path matches pattern '**.qunit.html'
 * 2) path is being used as test configuration path in yaml configuration.
 *
 * @param script - the script content
 * @param configuration - the preview configuration
 * @returns indicator if the path is a test path
 */
export function isTestPath(script: Script, configuration?: PreviewConfig): boolean {
    const { path } = extractUrlDetails(script.value);
    if (!path) {
        return !!getTestPathForUi5TestRunner(script.name);
    }
    if (path.includes('.qunit.html')) {
        return true;
    }
    return configuration?.test?.some((testConfig) => testConfig.path === path) ?? false;
}

/**
 * Extracts the test path of a given script name from the related ui5-test-runner script.
 * The relation is defined as usage in another script that references the given script name directly or via max. one indirection.
 *
 * Example:
 * - 'ui:test-server': 'ui5 serve --config ./ui5-deprecated-tools-preview-theme.yaml'
 * - 'ui:test-runner': 'ui5-test-runner --port 8081 --url http://localhost:8080/test/testsuite.qunit.html --report-dir ./target/'
 * - 'ui:test': 'start-server-and-test ui:test-server http://localhost:8080/ ui:test-runner'
 *
 * The test path for script 'ui:test-server' is 'http://localhost:8080/test/testsuite.qunit.html' from 'ui:test-runner' as they are connected via on indirection ('ui:test').
 *
 * @param scriptName - the name of the script from the package.json file
 * @returns the related test path
 */
export function getTestPathForUi5TestRunner(scriptName: string): string | undefined {
    const TEST_RUNNER_COMMAND = 'ui5-test-runner';

    const extractUrl = (script: string): string | undefined => {
        return / (?:--url|-u|--testsuite) (\S*)/.exec(script)?.[1] ?? undefined;
    };

    const findReferencingScriptByScriptName = (scriptName: string): string | undefined => {
        return [...scriptsFromPackageJson.values()].find((tmpScriptValue) =>
            tmpScriptValue.includes(` ${scriptName} `)
        );
    };

    const findReferencingUi5TestRunnerScriptByScriptValue = (script: string): string | undefined => {
        for (const scriptPart of script.split(' ')) {
            const scriptValue = scriptsFromPackageJson.get(scriptPart);
            if (scriptValue?.includes(TEST_RUNNER_COMMAND)) {
                return scriptValue;
            }
        }
        return undefined;
    };

    let testRunnerScript = findReferencingScriptByScriptName(scriptName);

    let url = testRunnerScript?.includes(TEST_RUNNER_COMMAND) ? extractUrl(testRunnerScript) : undefined;
    if (!url) {
        testRunnerScript = findReferencingUi5TestRunnerScriptByScriptValue(testRunnerScript ?? '');
        url = extractUrl(testRunnerScript ?? '');
    }
    return url ? new URL(url).pathname : undefined;
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
 * Creates a preview middleware configuration.
 *
 * It will sanitize the given preview middleware configuration and construct the flp configuration out of the given intent and path.
 *
 * @param previewMiddleware - the preview middleware configuration
 * @param script - the content of the script from the package.json file
 * @param basePath - the base path
 * @param fs - file system reference
 * @param logger logger to report info to the user
 * @returns the preview middleware configuration
 */
export async function updatePreviewMiddlewareConfig(
    previewMiddleware: CustomMiddleware<PreviewConfigOptions>,
    script: Script,
    basePath: string,
    fs: Editor,
    logger?: ToolsLogger
): Promise<CustomMiddleware<PreviewConfigOptions>> {
    const { path, intent } = extractUrlDetails(script.value);
    const defaultIntent = `${DEFAULT_INTENT.object}-${DEFAULT_INTENT.action}`;
    const newMiddlewareConfig = sanitizePreviewMiddleware(previewMiddleware);

    //copy of configuration to avoid ending up with an empty configuration object in some cases
    const configuration = { ...newMiddlewareConfig.configuration };

    let writeConfig = false;
    if (isFlpPath(script, configuration)) {
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
    } else if (path && isTestPath(script, configuration)) {
        configuration.test = await updateTestConfig(configuration.test, path, basePath, fs, logger);
        writeConfig = true;
    } else if (path === undefined) {
        const ui5TestRunnerPath = getTestPathForUi5TestRunner(script.name);
        if (ui5TestRunnerPath) {
            configuration.test = await updateTestConfig(configuration.test, ui5TestRunnerPath, basePath, fs);
            writeConfig = true;
        }
    }

    if (writeConfig) {
        newMiddlewareConfig.configuration = configuration;
    }

    return newMiddlewareConfig as CustomMiddleware<PreviewConfig>;
}

/**
 * Sanitize the test script (*.qunit.[jt]s)
 * If the OPA5 test script uses the JourneyRunner, it will be renamed and added as pattern to the respective UI5 yaml configuration.
 * If the test script does not use the JourneyRunner, it will be deleted.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used
 * @param path - the path to the test runner html file
 * @param newConfig - the new test configuration
 * @param logger logger to report info to the user
 */
export async function sanitizeTestScript(
    fs: Editor,
    basePath: string,
    path: string,
    newConfig: TestConfig,
    logger?: ToolsLogger
): Promise<void> {
    const jsTestScriptPath = join(await getWebappPath(basePath), path.replace('.html', '.js'));
    const tsTestScriptPath = join(await getWebappPath(basePath), path.replace('.html', '.ts'));
    const testScriptPath = fs.exists(jsTestScriptPath) ? jsTestScriptPath : tsTestScriptPath;
    if (fs.exists(testScriptPath)) {
        const file = fs.read(testScriptPath);
        const usesJourneyRunner = file.includes('sap/fe/test/JourneyRunner');
        if (usesJourneyRunner) {
            const filePathRenamed = testScriptPath.replace(/(\.([jt])s)$/, '.custom$1');
            fs.move(testScriptPath, filePathRenamed);
            newConfig.pattern = `/test/**/${basename(filePathRenamed)}`;
            logger?.info(
                `Renamed '${basename(testScriptPath)}' to '${basename(
                    filePathRenamed
                )}'. This file creates the JourneyRunner for OPA5 tests. As the handling of journey runners is not part of the virtual OPA5 test runner endpoint, this file has been renamed and added to the respective UI5 yaml configuration.`
            );
        } else {
            await deleteFiles(fs, [testScriptPath]);
        }
    }
}

/**
 * Update the test configuration.
 *
 * @param testConfiguration - the test configuration
 * @param path - the path
 * @param basePath - the base path
 * @param fs - file system reference
 * @param logger logger to report info to the user
 * @returns the updated test configuration
 */
export async function updateTestConfig(
    testConfiguration: PreviewConfig['test'],
    path: string | undefined,
    basePath: string,
    fs: Editor,
    logger?: ToolsLogger
): Promise<PreviewConfig['test']> {
    const hasTestsuite = (config: PreviewConfig['test']): boolean => {
        return config?.some((test) => test.framework === 'Testsuite') ?? false;
    };

    testConfiguration = testConfiguration ?? [];

    let framework: PreviewTestConfig['framework'] | undefined;
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

    const defaultPath = TEST_CONFIG_DEFAULTS[framework.toLowerCase()].path;
    const testConfig = testConfiguration.find((test) => test.framework === framework);
    if (testConfig) {
        testConfig.path = path;
        if (testConfig.path === defaultPath) {
            //sanitize default path
            delete testConfig.path;
        }
    } else {
        const newConfig: TestConfig = {
            framework,
            ...(path && defaultPath !== (path.startsWith('/') ? path : `/${path}`) && { path })
        };
        await sanitizeTestScript(fs, basePath, path ?? defaultPath, newConfig, logger);
        testConfiguration.push({ ...newConfig });
        if (!hasTestsuite(testConfiguration)) {
            testConfiguration.push({ framework: 'Testsuite' });
            logger?.info(
                `The test framework 'Testsuite' has been added because at least one test runner has been found.`
            );
        }
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
 * Reads the scripts from the package.json file.
 * Scripts will be buffered map 'scriptsFromPackageJson' to avoid multiple reads of the package.json file.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @returns the scripts from the package.json file
 */
export function getScriptsFromPackageJson(fs: Editor, basePath: string): Map<string, string> {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    scriptsFromPackageJson.clear();
    Object.entries(packageJson?.scripts ?? {}).forEach(([scriptName, scriptContent]) => {
        scriptsFromPackageJson.set(scriptName, scriptContent ?? '');
    });
    return scriptsFromPackageJson;
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
        const fakeScript = { name: 'fake', value: '' };
        try {
            await processUi5YamlConfig(fs, basePath, ui5Yaml, fakeScript, logger, true);
        } catch (error) {
            logger?.warn(`Skipping UI5 yaml configuration file '${ui5Yaml}'. ${error.mesage}`);
        }
        logger?.warn(
            `The UI5 YAML configuration file '${ui5Yaml}', is not used in any preview script. Outdated preview middleware will be adjusted, if necessary.`
        );
    }
}
