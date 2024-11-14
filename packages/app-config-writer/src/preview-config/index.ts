import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { basename, join } from 'path';
import {
    FileName,
    getAllUi5YamlFileNames,
    getWebappPath,
    type Package,
    readUi5Yaml,
    type ValidatedUi5ConfigFileNames
} from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';
import { prompt, type PromptObject } from 'prompts';
import { createPreviewMiddlewareConfig } from '../variants-config/ui5-yaml';
import type { CustomMiddleware } from '@sap-ux/ui5-config';
import { getPreviewMiddleware, isFioriToolsDeprecatedPreviewConfig } from '../variants-config/utils';
import type { PreviewConfigOptions } from '../types';
import type { FlpConfig, MiddlewareConfig as PreviewConfig } from '@sap-ux/preview-middleware';
import { generateVariantsConfig } from '../variants-config';

const renameMessage = (filename: string): string =>
    `Renamed ${filename} to ${filename.slice(
        0,
        -5
    )}_old.html. This file is no longer needed for the preview. In case there have not been done any modifications you can delete this file. In case of modifications please move the respective content to a custom init script of the preview middleware (see migration information https://www.npmjs.com/package/preview-middleware#migration).`;

const DEFAULT_FLP_PATH = 'test/flp.html';

/**
 * Converts the local preview files of a project to virtual files.
 *
 * @param basePath - base path to be used for the conversion
 * @param logger logger to report info to the user
 * @param fs - file system reference
 * @returns file system reference
 */
export async function convertToVirtualPreview(basePath: string, logger?: ToolsLogger, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    if (!(await checkPrerequisites(basePath, fs, logger))) {
        throw Error('Prerequisites not met. See above log messages for details.');
    }

    if (!(await getExplicitApprovalToAdjustFiles())) {
        logger?.error('Approval not given. Conversion aborted.');
        return fs;
    }

    await updatePreviewMiddlewareConfigs(fs, basePath, logger);
    await renameDefaultSandboxes(fs, basePath);
    await deleteNoLongerUsedFiles(fs, basePath);
    await updateVariantsCreationScript(fs, basePath, logger);

    return fs;
}

/**
 * Update the variants creation script in package.json if needed.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param logger logger to report info to the user
 */
async function updateVariantsCreationScript(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    if (packageJson?.scripts?.['start-variants-management']) {
        const ui5Yaml = basename(extractYamlConfigFileName(packageJson?.scripts?.['start-variants-management']));
        const yamlPath = join(basePath, ui5Yaml);
        await generateVariantsConfig(basePath, yamlPath, logger, fs);
    }
}

/**
 * Extract the UI5 yaml configuration file name from the script.
 *
 * @param script - the content of the script from package.json
 * @returns the UI5 yaml configuration file name or 'ui5.yaml' as default
 */
function extractYamlConfigFileName(script: string): string {
    return / (?:--config|-c) (\S*)/.exec(script)?.[1] ?? FileName.Ui5Yaml;
}

/**
 * Check if the script/-name is valid for the conversion. The script
 * - must contain 'ui5 serve' or 'fiori run' command
 * - must not be a test script
 * - must not relate to 'webapp/index.html'.</br>
 * The script name
 * - must not be 'start-variants-management'
 * - must not be 'start-control-property-editor'.
 *
 * @param scriptName - the name of the script from package.json
 * @param script - the content of the script from package.json
 * @returns indicator if the script is valid
 */
function isValidPreviewScript(scriptName: string, script: string | undefined): boolean {
    const isValidScriptName =
        scriptName != 'start-variants-management' && scriptName != 'start-control-property-editor';

    //eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const startsWebServer = !!(script?.includes('ui5 serve') || script?.includes('fiori run'));

    const { path } = extractUrlDetails(script ?? '');
    //todo: how to ensure we don't mistake other test scripts for preview scripts?
    const opensTest = path?.includes('qunit.html');
    const opensIndexHtml = path === 'index.html';

    return isValidScriptName && startsWebServer && !opensTest && !opensIndexHtml;
}

/**
 * Update the preview middleware configurations according to the scripts they are being used in package.json.
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
    const validatedUi5YamlFileNames = await getAllUi5YamlFileNames(fs, basePath);
    const unprocessedUi5YamlFileNames = [...validatedUi5YamlFileNames.valid];
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    for (const [scriptName, script] of Object.entries(packageJson?.scripts ?? {})) {
        if (!script || !isValidPreviewScript(scriptName, script)) {
            continue;
        }

        const ui5Yaml = basename(extractYamlConfigFileName(script));
        unprocessedUi5YamlFileNames.splice(unprocessedUi5YamlFileNames.indexOf(ui5Yaml), 1);

        if (!isUi5YamlToBeConverted(ui5Yaml, scriptName, validatedUi5YamlFileNames, logger)) {
            continue;
        }

        if (await isUi5YamlAlreadyConverted(fs, basePath, ui5Yaml, scriptName, script, logger)) {
            continue;
        }

        await processUi5YamlConfig(fs, basePath, ui5Yaml, script);
        await renameSandbox(fs, basePath, script, logger);
        ensurePreviewMiddlewareDependency(packageJson, fs, packageJsonPath);

        logger?.info(`UI5 yaml configuration file ${ui5Yaml} updated according to script ${scriptName}.`);
    }
    for (const ui5Yaml of unprocessedUi5YamlFileNames) {
        //at least adjust deprecated preview config of unused ui5 yaml configurations
        await processUi5YamlConfig(fs, basePath, ui5Yaml, '', true);
        logger?.warn(
            `UI5 yaml configuration file ${ui5Yaml} it is not being used in any preview script. Outdated preview middleware will be adjusted nevertheless if necessary.`
        );
    }
}

/**
 * Check if the script is to be converted.
 *
 * @param ui5Yaml - the name of the UI5 yaml configuration file
 * @param scriptName - the name of the script from package.json
 * @param validatedUi5YamlFileNames - the validated UI5 yaml configuration file names
 * @param logger logger to report info to the user
 * @returns indicator if the script is to be converted
 */
function isUi5YamlToBeConverted(
    ui5Yaml: string,
    scriptName: string,
    validatedUi5YamlFileNames: ValidatedUi5ConfigFileNames,
    logger?: ToolsLogger
): boolean {
    if ((validatedUi5YamlFileNames.invalid ?? []).includes(ui5Yaml)) {
        logger?.warn(
            `Skipping script ${scriptName} with UI5 yaml configuration file ${ui5Yaml} because it does not comply with the schema.`
        );
        return false;
    }

    if ((validatedUi5YamlFileNames.skipped ?? []).includes(ui5Yaml)) {
        logger?.warn(
            `Skipping script ${scriptName} with UI5 yaml configuration file ${ui5Yaml} because the schema validation was not possible for file ${ui5Yaml}.`
        );
        return false;
    }

    if (!validatedUi5YamlFileNames.valid.includes(ui5Yaml)) {
        logger?.warn(
            `Skipping script '${scriptName}' because UI5 yaml configuration file ${ui5Yaml} could not be found.`
        );
        return false;
    }
    return true;
}

/**
 * Check if the UI5 yaml configuration file has already been converted based on another script.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param ui5Yaml - the name of the UI5 yaml configuration file
 * @param scriptName - the name of the script from package.json
 * @param script - the content of the script from package.json
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
            `Skipping script '${scriptName}' because another script also refers to UI5 yaml configuration file ${ui5Yaml}. Please manually adjust the flp.path property in the UI5 yaml configuration file to the correct endpoint or create a separate ui5 yaml configuration for script '${scriptName}'. ${ui5Yaml} currently uses ${
                flpPath ?? DEFAULT_FLP_PATH
            } whereas script '${scriptName}' uses ${scriptPath}.`
        );
    } else {
        logger?.info(
            `Skipping script '${scriptName}' because the UI5 yaml configuration file ${ui5Yaml} has already been adjusted based on another script.`
        );
    }
    return true;
}

/**
 * Rename the sandbox file used in the given script.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param script - the content of the script
 * @param logger logger to report info to the user
 */
async function renameSandbox(fs: Editor, basePath: string, script: string, logger?: ToolsLogger): Promise<void> {
    const { path: relativePath } = extractUrlDetails(script);
    if (relativePath) {
        const absolutePath = join(await getWebappPath(basePath), relativePath);
        if (fs.exists(absolutePath)) {
            fs.move(absolutePath, absolutePath.replace('.html', '_old.html'));
            logger?.info(renameMessage(relativePath));
        } else if (!fs.dump(basePath, (file) => file.history.includes(absolutePath))) {
            logger?.warn(`File ${relativePath} not found. Skipping renaming.`);
        }
    }
}

/**
 * Ensure the @sap/ux-ui5-tooling or @sap-ux/preview-middleware dependency exists in package.json.
 * If not @sap-ux/preview-middleware will be added as devDependency.
 *
 * @param packageJson - the package.json file content
 * @param fs - file system reference
 * @param packageJsonPath - the path to the package.json file
 */
export function ensurePreviewMiddlewareDependency(
    packageJson: Package | undefined,
    fs: Editor,
    packageJsonPath: string
): void {
    if (!packageJson) {
        return;
    }

    const hasDependency = (dependency: string): boolean =>
        !!packageJson?.devDependencies?.[dependency] || !!packageJson?.dependencies?.[dependency];

    const dependencies = ['@sap-ux/preview-middleware', '@sap/ux-ui5-tooling'];
    if (dependencies.some((dependency) => hasDependency(dependency))) {
        return;
    }

    packageJson.devDependencies = { ...packageJson.devDependencies, '@sap-ux/preview-middleware': 'latest' };
    fs.writeJSON(packageJsonPath, packageJson);
}

/**
 * Process the UI5 yaml configuration file.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param ui5Yaml - the name of the UI5 yaml configuration file
 * @param script - the content of the script
 * @param skipPreviewMiddlewareCreation - (default: true) indicator if the preview middleware creation should be skipped if no preview middleware is configured
 */
export async function processUi5YamlConfig(
    fs: Editor,
    basePath: string,
    ui5Yaml: string,
    script: string,
    skipPreviewMiddlewareCreation = false
): Promise<void> {
    const ui5YamlConfig = await readUi5Yaml(basePath, ui5Yaml, fs);
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
 * Extract the URL details from the script.
 *
 * @param script - the content of the script
 * @returns the URL details
 */
function extractUrlDetails(script: string): {
    path: string | undefined;
    intent: FlpConfig['intent'] | undefined;
} {
    //extract the URL from the 'open' command of the script
    let url = / (?:--open|-o|--o) ([^"]?\S*)/.exec(script)?.[1] ?? undefined;
    url = url?.startsWith('"') ? url.slice(1) : url;

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
 * Create a preview middleware configuration.
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
    if (intent && `${intent?.object}-${intent?.action}` !== 'app-preview') {
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
 * Check if the path is an FLP path.
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
 * Sanitize the preview middleware. In case of an outdated preview configuration the following changes will be applied:
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

/**
 * Add '_old' to test/flpSandbox.html and test/flpSandboxMockserver.html to indicate that they will no longer be used.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param logger logger to report info to the user
 */
export async function renameDefaultSandboxes(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const defaultSandboxPaths = [join('test', 'flpSandbox.html'), join('test', 'flpSandboxMockserver.html')];
    for (const path of defaultSandboxPaths) {
        //use fake script to be able to re-use the renameSandbox function for the default sandboxes as well
        const fakeScript = ` --open ${path}`;
        await renameSandbox(fs, basePath, fakeScript, logger);
    }
}

/**
 * Delete files that are no longer used for the virtual preview.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param logger logger to report info to the user
 */
export async function deleteNoLongerUsedFiles(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const webappTestPath = join(await getWebappPath(basePath), 'test');
    [
        join(webappTestPath, 'locate-reuse-libs.js'),
        join(webappTestPath, 'changes_loader.js'),
        join(webappTestPath, 'changes_loader.ts'),
        join(webappTestPath, 'changes_preview.js'),
        join(webappTestPath, 'changes_preview.ts'),
        join(webappTestPath, 'flpSandbox.js'),
        join(webappTestPath, 'flpSandbox.ts'),
        join(webappTestPath, 'initFlpSandbox.js'),
        join(webappTestPath, 'initFlpSandbox.ts')
    ].forEach((path: string): void => {
        if (fs.exists(path)) {
            fs.delete(path);
            logger?.info(
                `Deleted ${join('webapp', 'test', basename(path))}. This file is no longer needed for the preview.`
            );
        }
    });
}

/**
 * Check if the prerequisites for the conversion are met.
 * - UI5 CLI version 3.0.0 or higher is being used.
 * - '@sap/grunt-sapui5-bestpractice-build' is not being used.
 * - '@sap-ux/ui5-middleware-fe-mockserver' or 'cds-plugin-ui5' is being used.
 *
 * @param basePath - base path to be used for the conversion
 * @param fs - file system reference
 * @param logger logger to report info to the user
 * @returns indicator if the prerequisites are met
 */
export async function checkPrerequisites(basePath: string, fs: Editor, logger?: ToolsLogger): Promise<boolean> {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    let prerequisitesMet = true;

    if (!packageJson) {
        throw Error(`File 'package.json' not found at ${basePath}`);
    }

    const sapui5BestpracticeBuildExists =
        !!packageJson?.devDependencies?.['@sap/grunt-sapui5-bestpractice-build'] ||
        !!packageJson?.dependencies?.['@sap/grunt-sapui5-bestpractice-build'];
    if (sapui5BestpracticeBuildExists) {
        logger?.error(
            "A conversion from '@sap/grunt-sapui5-bestpractice-build' is not supported. Please migrate to UI5 CLI version 3.0.0 or higher first. See https://sap.github.io/ui5-tooling/v3/updates/migrate-v3/ for more information."
        );
        prerequisitesMet = false;
    }

    const ui5CliVersion = packageJson?.devDependencies?.['@ui5/cli'] ?? packageJson?.dependencies?.['@ui5/cli'] ?? '0';
    if (parseInt(ui5CliVersion.split('.')[0], 10) < 3) {
        logger?.error(
            'UI5 CLI version 3.0.0 or higher is required to convert the preview to virtual files. See https://sap.github.io/ui5-tooling/v3/updates/migrate-v3/ for more information.'
        );
        prerequisitesMet = false;
    }

    const ui5MiddlewareMockserverExists =
        !!packageJson?.devDependencies?.['@sap-ux/ui5-middleware-fe-mockserver'] ||
        !!packageJson?.dependencies?.['@sap-ux/ui5-middleware-fe-mockserver'];
    const cdsPluginUi5Exists =
        !!packageJson?.devDependencies?.['cds-plugin-ui5'] || !!packageJson?.dependencies?.['cds-plugin-ui5'];
    if (!ui5MiddlewareMockserverExists && !cdsPluginUi5Exists) {
        logger?.error(
            "A conversion from 'sap/ui/core/util/MockServer' is not supported. Please migrate to '@sap-ux/ui5-middleware-fe-mockserver' first (details see https://www.npmjs.com/package/@sap-ux/ui5-middleware-fe-mockserver)."
        );
        prerequisitesMet = false;
    }

    return prerequisitesMet;
}

/**
 * Get the explicit approval form the user to do the conversion.
 *
 * @returns Explicit user approval to do the conversion.
 */
async function getExplicitApprovalToAdjustFiles(): Promise<boolean> {
    const question: PromptObject = {
        name: 'approval',
        type: 'confirm',
        initial: false,
        message:
            'The converter will rename html files and delete js/ts files used for the existing preview and configure the usage of virtual files instead. Do you want to proceed with the conversion?'
    };

    return !!(await prompt([question])).approval;
}
