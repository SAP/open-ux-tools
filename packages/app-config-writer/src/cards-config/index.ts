import { join, basename } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { getPreviewMiddleware, getIntentFromPreviewConfig, getCLIForPreview } from '../common/utils';
import type { MiddlewareConfig as PreviewConfig } from '@sap-ux/preview-middleware';
import type { ToolsLogger } from '@sap-ux/logger';
import { FileName, type Package, readUi5Yaml } from '@sap-ux/project-access';
import { updateMiddlewaresForPreview } from '../common/ui5-yaml';

/**
 * Updates the `ui5.yaml` file to add card generator path to preview middleware configuration.
 *
 * @param {Editor} fs - The `mem-fs-editor` instance used to read and write files.
 * @param {string} basePath - The path to the project root where the `ui5.yaml` file is located.
 * @param {string} [yamlPath] - Path to the `ui5.yaml` configuration file. Defaults to `ui5.yaml` in the project root.
 * @param {ToolsLogger} [logger] - logger instance for logging debug information.
 * @returns {Promise<void>} A promise that resolves when the `ui5.yaml` file has been successfully updated.
 */
async function updateMiddlewareConfigWithGeneratorPath(
    fs: Editor,
    basePath: string,
    yamlPath?: string,
    logger?: ToolsLogger
): Promise<void> {
    const ui5YamlFile = yamlPath ? basename(yamlPath) : FileName.Ui5Yaml;
    const ui5YamlConfig = await readUi5Yaml(basePath, ui5YamlFile, fs);
    const previewMiddleware = await getPreviewMiddleware(ui5YamlConfig);

    if (previewMiddleware) {
        previewMiddleware.configuration ??= {};

        const middlewareConfig = previewMiddleware.configuration as PreviewConfig;
        const cardGeneratorPath = middlewareConfig?.editors?.cardGenerator?.path ?? 'test/flpGeneratorSandbox.html';

        middlewareConfig.editors ??= {};
        middlewareConfig.editors.cardGenerator = {
            path: cardGeneratorPath
        };
        ui5YamlConfig.updateCustomMiddleware(previewMiddleware);
        fs.write(join(basePath, ui5YamlFile), ui5YamlConfig.toString());
        logger?.debug(`Updated preview middleware in ${ui5YamlFile}.`);
    }
}

/**
 * Updates the `package.json` file to include a script for starting the card generator.
 *
 * @param {string} basePath - The path to the project root where the `package.json` file is located.
 * @param {Editor} fs - The `mem-fs-editor` instance used to read and write files.
 * @param {string} [yamlPath] - Optional path to the `ui5.yaml` configuration file for retrieving middleware configurations.
 * @returns {Promise<void>} A promise that resolves when the `package.json` file has been successfully updated.
 */
async function updatePackageJson(basePath: string, fs: Editor, yamlPath?: string): Promise<void> {
    const packageJsonPath = join(basePath, 'package.json');
    if (!fs.exists(packageJsonPath)) {
        throw new Error('package.json not found');
    }

    const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;
    const previewMiddleware = await getPreviewMiddleware(undefined, basePath, yamlPath, fs);
    const intent = getIntentFromPreviewConfig(previewMiddleware?.configuration) ?? '#app-preview';
    const cardGeneratorPath =
        (previewMiddleware?.configuration as PreviewConfig)?.editors?.cardGenerator?.path ??
        'test/flpGeneratorSandbox.html';
    const cliForPreview = await getCLIForPreview(basePath, yamlPath ?? '', fs);

    packageJson.scripts ??= {};
    packageJson.scripts['start-cards-generator'] = `${cliForPreview} --open '${cardGeneratorPath}${intent}'`;
    fs.writeJSON(packageJsonPath, packageJson);
}

/**
 * Enables the card generator configuration for the given application.
 *
 * This function updates the `ui5.yaml` file to include the necessary middlewares for the card generator
 * and modifies the `package.json` file to add a script for starting the card generator.
 *
 * @param {string} basePath - The path to the project root.
 * @param {string} [yamlPath] - Optional path to the `ui5.yaml` configuration file.
 * @param {ToolsLogger} [logger] - Optional logger instance for logging messages.
 * @param {Editor} [fs] - Optional `mem-fs-editor` instance for file system operations. If not provided, a new instance will be created.
 * @returns {Promise<Editor>} A promise that resolves to the updated `mem-fs-editor` instance.
 */
export async function enableCardGeneratorConfig(
    basePath: string,
    yamlPath?: string,
    logger?: ToolsLogger,
    fs?: Editor
): Promise<Editor> {
    fs = fs ?? create(createStorage());
    await updateMiddlewaresForPreview(fs, basePath, yamlPath, logger);
    await updateMiddlewareConfigWithGeneratorPath(fs, basePath, yamlPath, logger);
    await updatePackageJson(basePath, fs, yamlPath);
    return fs;
}
