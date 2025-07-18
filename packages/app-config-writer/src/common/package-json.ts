import type { FlpConfig, MiddlewareConfig as PreviewConfig } from '@sap-ux/preview-middleware';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { type Package, FileName } from '@sap-ux/project-access';

export type Script = { name: string; value: string };

/**
 * Map of scripts from the package.json file.
 */
const scriptsFromPackageJson = new Map<string, string>();

/**
 * Reads the scripts from the package.json file.
 * Scripts will be buffered in map 'scriptsFromPackageJson' to avoid multiple reads of the package.json file.
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
 * Extracts the URL details from a given script.
 *
 * It extracts the used mount point for the preview and the used intent.
 *
 * @param script - the content of the script
 * @returns the URL details
 */
export function extractUrlDetails(script: string): {
    path: string | undefined;
    intent: FlpConfig['intent'] | undefined;
} {
    //extract the URL from the 'open' command of the script
    let url = / (?:--open|-o|--o) (\S*)/.exec(script)?.[1] ?? undefined;
    //delete double or single quotes from the URL
    url = url?.replace(/['"]/g, '');

    //extract the path from the URL
    const path = /^[^?#]+\.html/.exec(url ?? '')?.[0] ?? undefined;

    //extract the intent from the URL
    const intent = /(?<=#)\w+-\w+/.exec(url ?? '')?.[0] ?? undefined;

    return {
        path,
        intent: intent
            ? {
                  object: intent?.split('-')[0],
                  action: intent?.split('-')[1]
              }
            : undefined
    };
}

/**
 * Check if the script/-name is valid for the conversion.
 *
 * The script:
 * - must contain 'ui5 serve' or 'fiori run' command
 * - must not be a test script
 * - must not relate to 'webapp/index.html'.
 *
 * The script name:
 * - must not be 'start-variants-management'
 * - must not be 'start-control-property-editor'
 * - must not be 'start-cards-generator'.
 *
 * @param script - the script from the package.json file
 * @param convertTests - indicator if test suite and test runner should be included in the conversion (default: false)
 * @returns indicator if the script is valid
 */
export function isValidPreviewScript(script: Script, convertTests: boolean = false): boolean {
    const isValidScriptName =
        script.name != 'start-variants-management' &&
        script.name != 'start-control-property-editor' &&
        script.name != 'start-cards-generator';

    //eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const startsWebServer = !!(script.value.includes('ui5 serve') || script.value.includes('fiori run'));
    const { path } = extractUrlDetails(script.value);
    const opensTest = isTestPath(script ?? '');
    const opensIndexHtml = path === 'index.html';

    //tests are only relevant if the conversion of test runners is excluded
    return isValidScriptName && startsWebServer && !opensIndexHtml && (convertTests ? true : !opensTest);
}

/**
 * Get the first valid preview script from package.json that uses the given yaml config.
 *
 * @param yamlConfigName - name of the yaml config to be used
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to project root, where package.json is
 * @returns the run script or undefined
 */
export function getRunScriptForYamlConfig(yamlConfigName: string, fs: Editor, basePath: string): Script | undefined {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    if (!packageJson) {
        return undefined;
    }
    for (const [scriptName, scriptValue] of getScriptsFromPackageJson(fs, basePath)) {
        if (
            isValidPreviewScript({ name: scriptName, value: scriptValue }) &&
            extractYamlConfigFileName(scriptValue) === yamlConfigName
        ) {
            return {
                name: scriptName,
                value: scriptValue
            };
        }
    }
    return undefined;
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
 * Checks if the passed path is an FLP path.
 *
 * @param script - the script content
 * @param configuration - the preview configuration
 * @returns indicator if the path is an FLP path
 */
export function isFlpPath(script: Script, configuration: PreviewConfig): boolean {
    const { path } = extractUrlDetails(script.value);
    if (!path) {
        return false;
    }
    const isRtaEditorPath =
        configuration.rta?.editors?.some((editor) => editor.path === path) ?? //NOSONAR
        configuration.editors?.rta?.endpoints?.some((editor) => editor.path === path) ??
        false;
    const isCardsGeneratorPath = configuration.editors?.cardGenerator?.path === path;
    return !isRtaEditorPath && !isCardsGeneratorPath && !isTestPath(script, configuration);
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
 * The test path for script 'ui:test-server' is 'http://localhost:8080/test/testsuite.qunit.html' from 'ui:test-runner' as they are connected via one indirection ('ui:test').
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
