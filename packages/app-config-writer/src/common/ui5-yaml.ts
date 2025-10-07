import { basename, join } from 'node:path';
import { MiddlewareConfigs } from '../types';
import { FileName, type Package, readUi5Yaml, getWebappPath } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import type { PreviewConfigOptions } from '../types';
import type { CustomMiddleware, FioriAppReloadConfig, UI5Config } from '@sap-ux/ui5-config';
import { getPreviewMiddleware, isFioriToolsDeprecatedPreviewConfig, deleteFiles } from './utils';
import {
    type DefaultFlpPath,
    type DefaultIntent,
    type MiddlewareConfig as PreviewConfig,
    type TestConfigDefaults as PreviewTestConfigDefaults,
    type TestConfig,
    type RtaConfig
} from '@sap-ux/preview-middleware';
import {
    getRunScriptForYamlConfig,
    getTestPathForUi5TestRunner,
    type Script,
    extractUrlDetails,
    isTestPath,
    isFlpPath
} from './package-json';

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number];

type PreviewTestConfig = ArrayElement<Required<PreviewConfig>['test']>;

const DEFAULT_INTENT: DefaultIntent = {
    object: 'app',
    action: 'preview'
};

export const DEFAULT_FLP_PATH: DefaultFlpPath = '/test/flp.html';

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
 * Sanitize the deprecated RTA configuration.
 *
 * @param deprecatedRtaConfig deprecated RTA configuration
 * @param logger logger instance
 * @returns sanitized RTA configuration
 */
//prettier-ignore
export function sanitizeRtaConfig(deprecatedRtaConfig: PreviewConfig['rta'], logger?: ToolsLogger): RtaConfig | undefined { //NOSONAR
    let rtaConfig: RtaConfig | undefined;
    if (deprecatedRtaConfig) {
        const { editors, ...rta } = deprecatedRtaConfig;
        rtaConfig = { ...rta, endpoints: [...editors] };
        logger?.warn(`The configuration option 'rta' is deprecated and has been adjusted to 'editors.rta'.`);
    }
    return rtaConfig;
}

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
 * In case the deprecated 'rta.editors' config is being used it is moves to 'editors.rta'.
 * In case of an outdated preview configuration, the following changes will be applied:
 * - property 'ui5Theme' will be moved to 'flp.theme'.
 * - no longer used property 'component' will be removed.
 *
 * @param previewMiddleware - the preview middleware
 * @param logger - logger to report info to the user
 * @returns the sanitized preview middleware
 */
export function sanitizePreviewMiddleware(
    previewMiddleware: CustomMiddleware<PreviewConfigOptions>,
    logger?: ToolsLogger
): CustomMiddleware<PreviewConfig | undefined> {
    if (!previewMiddleware.configuration) {
        return previewMiddleware as CustomMiddleware<PreviewConfig>;
    }
    //if we find the deprecated 'rta.editors' config, we will sanitize it
    if ('rta' in previewMiddleware.configuration) {
        const rtaConfig = sanitizeRtaConfig(previewMiddleware.configuration.rta, logger); //NOSONAR
        delete previewMiddleware.configuration.rta; //NOSONAR
        previewMiddleware.configuration.editors ??= {};
        previewMiddleware.configuration.editors.rta = rtaConfig;
    }
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
    const newMiddlewareConfig = sanitizePreviewMiddleware(previewMiddleware, logger);

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
    } else if (!path) {
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
                )}'. This file creates the JourneyRunner for OPA5 tests. As the handling of journey runners is not part of the virtual OPA5 test runner endpoint, this file has been renamed and added to the respective UI5 YAML configuration.`
            );
        } else {
            await deleteFiles(fs, [testScriptPath]);
        }
    }
}
