import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { basename, join } from 'path';
import { getAllUi5YamlFileNames, getWebappPath, type Package, readUi5Yaml } from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';
import { prompt, type PromptObject } from 'prompts';
import { updateMiddlewares, createPreviewMiddlewareConfig } from '../variants-config/ui5-yaml';
import type { CustomMiddleware } from '@sap-ux/ui5-config';
import { getPreviewMiddleware, isFioriToolsDeprecatedPreviewConfig } from '../variants-config/utils';
import type { PreviewConfigOptions } from '../types';
import type { FlpConfig } from '@sap-ux/preview-middleware';

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
        throw Error('Approval not given');
    }

    await renameSandboxes(fs, basePath);
    await deleteNoLongerUsedFiles(fs, basePath);

    await updatePreviewMiddlewareConfigs(fs, basePath, logger);

    await updateMiddlewares(fs, basePath, logger);

    //todo: check for more than one preview middleware and report error?

    return fs;
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
    const unprocessedUi5YamlFileNames = validatedUi5YamlFileNames.valid;
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    ensurePreviewMiddlewareDependency(packageJson, fs, packageJsonPath);
    for (const [scriptName, script] of Object.entries(packageJson?.scripts ?? {})) {
        if (
            scriptName === 'start-variants-management' ||
            !(script?.includes('ui5 serve') || script?.includes('fiori run'))
        ) {
            continue;
        }

        const ui5Yaml = basename(script?.match(/--config (\S*)/)?.[1] ?? 'ui5.yaml');
        if ((validatedUi5YamlFileNames.invalid ?? []).includes(ui5Yaml)) {
            logger?.error(
                `Skipping script ${scriptName} with UI5 yaml configuration file ${ui5Yaml} because it does not comply with the schema.`
            );
            continue;
        }

        if (!validatedUi5YamlFileNames.valid.includes(ui5Yaml)) {
            logger?.error(
                `Skipping script ${scriptName} because UI5 yaml configuration file ${ui5Yaml} could not be found.`
            );
            continue;
        }

        await processUi5YamlConfig(fs, basePath, ui5Yaml, script);
        unprocessedUi5YamlFileNames.splice(unprocessedUi5YamlFileNames.indexOf(ui5Yaml), 1);
    }
    for (const ui5Yaml of unprocessedUi5YamlFileNames) {
        //todo: adjust at least deprecated preview config in unused ui5 yaml configurations?
        //await processUi5YamlConfig(fs, basePath, ui5Yaml, '');
        logger?.warn(
            `Skipping UI5 yaml configuration file ${ui5Yaml} because it is not being used in any package.json script.`
        );
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

    const dependencies = ['@sap-ux/preview-middleware', '@sap/ux-ui5-tooling'];

    const hasDependency = (dependency: string): boolean =>
        !!packageJson?.devDependencies?.[dependency] || !!packageJson?.dependencies?.[dependency];

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
 */
async function processUi5YamlConfig(fs: Editor, basePath: string, ui5Yaml: string, script: string): Promise<void> {
    const ui5YamlConfig = await readUi5Yaml(basePath, ui5Yaml, fs);
    let previewMiddleware = await getPreviewMiddleware(ui5YamlConfig);

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
    const url = script?.match(/-o (\S*)/)?.[1] ?? script?.match(/-open (\S*)/)?.[1] ?? undefined;
    const path = url?.match(/\/([^\/?#]+\.html)(?:[\/?# ]|$)/)?.[1] ?? undefined;
    const intent = url?.match(/(?<=#)\w+-\w+/)?.[0] ?? undefined;
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
    const newMiddlewareConfig = {
        name: previewMiddleware.name,
        afterMiddleware: 'compression'
    } as CustomMiddleware<PreviewConfigOptions>;

    let configuration = previewMiddleware.configuration ?? {};

    let ui5Theme: string | undefined;
    if (isFioriToolsDeprecatedPreviewConfig(configuration)) {
        ui5Theme = configuration.ui5Theme;
        configuration = {};
    }

    // if no --open parameter given in script return the existing configuration as is
    if (!path && !intent) {
        newMiddlewareConfig.configuration = configuration;
        return newMiddlewareConfig;
    }

    configuration.flp = configuration.flp ?? {};
    if (ui5Theme) {
        configuration.flp.theme = ui5Theme;
    }

    if (path) {
        configuration.flp.path = path;
    }

    if (intent) {
        configuration.flp.intent = configuration.flp.intent ?? ({} as FlpConfig['intent']);
        configuration.flp.intent.object = intent.object;
        configuration.flp.intent.action = intent.action;
    }

    //Only add configuration property to middleware in case of
    // - a non-empty flp config object or
    // - a configuration object that contains more tha the flp property
    if (Object.keys(configuration.flp).length > 0 || Object.keys(configuration).length > 1) {
        newMiddlewareConfig.configuration = configuration;
    }

    return newMiddlewareConfig;
}

/**
 * Add '_old' to webapp/test/flpSandbox.html and webapp/test/flpSandboxMockserver.html to indicate that they will no longer be used.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param logger logger to report info to the user
 */
export async function renameSandboxes(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const message = (filename: string): string =>
        `Renamed ${filename} to ${filename}_old.html. This file is no longer needed for the preview. In case there have not been done any modifications you can delete this file. In case of modifications please move the respective content e.g. to a custom init script of the preview middleware (see migration information https://www.npmjs.com/package/preview-middleware#migration).`;
    const flpSandboxPath = join(await getWebappPath(basePath), 'test', 'flpSandbox.html');
    if (fs.exists(flpSandboxPath)) {
        fs.move(flpSandboxPath, flpSandboxPath.replace('.html', '_old.html'));
        logger?.info(message(join('webapp', 'test', 'flpSandbox.html')));
    }
    const flpSandboxMockserverPath = join(await getWebappPath(basePath), 'test', 'flpSandboxMockserver.html');
    if (fs.exists(flpSandboxMockserverPath)) {
        fs.move(flpSandboxMockserverPath, flpSandboxMockserverPath.replace('.html', '_old.html'));
        logger?.info(message(join('webapp', 'test', 'flpSandboxMockserver.html')));
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
            'The converter will rename html files and delete js files used for the existing preview and configure the usage of virtual files instead. Do you want to proceed with the conversion?'
    };

    return (await prompt([question])) as boolean;
}
