import { render } from 'ejs';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { basename, join } from 'path';
import type { CustomTableColumn, InternalCustomTableColumn } from './types';
import { setCommonDefaults, getDefaultFragmentContent } from '../common/defaults';
import type { Manifest } from '../common/types';
import { validateVersion, validateBasePath } from '../common/validate';
import { applyEventHandlerConfiguration } from '../common/event-handler';
import { extendJSON } from '../common/file';
import { getTemplatePath } from '../templates';
import { coerce, gte } from 'semver';
import { getManifest } from '../common/utils';
import { generateBuildingBlock } from '../building-block';
import { augmentXpathWithLocalNames } from '../building-block/prompts/utils';
import { BuildingBlockType } from '../building-block/types';

/**
 * Extracts the building block view path from the provided configuration.
 *
 * @param {string} columnPath - The complete column path
 * @param {string} buildingBlockView - The building block view string
 * @param {string} appId - The application ID from manifest
 * @returns {string} The constructed building block view path
 * @throws {Error} When path extraction fails or validation errors occur
 */
export function extractBuildingBlockViewPath(columnPath: string, buildingBlockView: string, appId: string): string {
    // Extract webapp path and folder name
    const webappPath = columnPath.split('/ext')[0];
    const webappFolder = basename(webappPath);

    if (!webappFolder) {
        throw new Error(`Invalid webapp folder extracted from path: ${columnPath}`);
    }

    // Extract and construct building block view path
    if (!appId) {
        throw new Error('Application ID not found in manifest');
    }

    const appIdIndex = buildingBlockView.indexOf(appId);
    if (appIdIndex === -1) {
        throw new Error(`App ID "${appId}" not found in buildingBlockView: ${buildingBlockView}`);
    }

    const viewPathSuffix = buildingBlockView.substring(appIdIndex + appId.length).replace(/\./g, '/');
    const bbView = `${viewPathSuffix}.view.xml`;
    return join(webappFolder, bbView);
}

/**
 * Get the template folder for the given UI5 version.
 *
 * @param ui5Version required UI5 version.
 * @returns path to the template folder containing the manifest.json ejs template
 */
export function getManifestRoot(ui5Version?: string): string {
    const minVersion = coerce(ui5Version);
    if (!minVersion || gte(minVersion, '1.86.0')) {
        return getTemplatePath('/column/1.86');
    } else if (gte(minVersion, '1.85.0')) {
        return getTemplatePath('/column/1.85');
    } else {
        return getTemplatePath('column/1.84');
    }
}

/**
 * Enhances the provided custom table column configuration with default data.
 *
 * @param {Editor} fs - the mem-fs editor instance
 * @param {CustomTableColumn} data - a custom column configuration object
 * @param {string} manifestPath - path to the project's manifest.json
 * @param {Manifest} manifest - the application manifest
 * @returns enhanced configuration
 */
function enhanceConfig(
    fs: Editor,
    data: CustomTableColumn,
    manifestPath: string,
    manifest: Manifest
): InternalCustomTableColumn {
    // clone input and set defaults
    const config: CustomTableColumn & Partial<InternalCustomTableColumn> = { ...data };
    setCommonDefaults(config, manifestPath, manifest);

    // Apply event handler
    if (config.eventHandler) {
        config.eventHandler = applyEventHandlerConfiguration(fs, config, config.eventHandler, {
            controllerSuffix: false,
            typescript: config.typescript
        });
    }

    // generate column content
    const content =
        config.properties && config.properties.length > 0
            ? `{=%{${config.properties.join("} + ' ' + %{")}}}`
            : 'Sample Text';
    config.content = config.control || getDefaultFragmentContent(content, config.eventHandler);

    return config as InternalCustomTableColumn;
}

/**
 * Add a custom column to an existing UI5 application.
 *
 * @returns {Promise<Editor>} the updated mem-fs editor instance
 * @param {string} basePath - the base path
 * @param {CustomTableColumn} customColumn - the custom column configuration
 * @param {Promise<Editor>} [fs] - the mem-fs editor instance
 */
export async function generateCustomColumn(
    basePath: string,
    customColumn: CustomTableColumn,
    fs?: Editor
): Promise<Editor> {
    validateVersion(customColumn.minUI5Version);
    if (!fs) {
        fs = create(createStorage());
    }
    const dependencies = customColumn.buildingBlockView ? [] : undefined;
    await validateBasePath(basePath, fs, dependencies);

    const { path: manifestPath, content: manifest } = await getManifest(basePath, fs);

    // merge with defaults
    const completeColumn = enhanceConfig(fs, customColumn, manifestPath, manifest);

    // add fragment
    const viewPath = join(completeColumn.path, `${completeColumn.fragmentFile ?? completeColumn.name}.fragment.xml`);
    if (completeColumn.control || !fs.exists(viewPath)) {
        fs.copyTpl(getTemplatePath('common/Fragment.xml'), viewPath, completeColumn);
    }

    if (customColumn.buildingBlockView) {
        const appId = manifest['sap.app']?.id;

        const bbViewPath = extractBuildingBlockViewPath(completeColumn.path, customColumn.buildingBlockView, appId);
        // add building block
        await handleCustomColumnBuildingBlock(
            basePath,
            {
                columnName: customColumn.header,
                columnFragmentName: customColumn.name
            },
            bbViewPath,
            viewPath,
            fs
        );
    } else {
        // enhance manifest with column definition
        const manifestRoot = getManifestRoot(customColumn.minUI5Version);
        const filledTemplate = render(fs.read(join(manifestRoot, `manifest.json`)), completeColumn, {});
        extendJSON(fs, {
            filepath: manifestPath,
            content: filledTemplate,
            tabInfo: customColumn.tabInfo
        });
    }

    return fs;
}

/**
 * Handles the creation of a custom column building block for a table.
 *
 * @param {string} basePath - The base path of the UI5 application.
 * @param {{ columnName: string; columnFragmentName?: string }} data - Object containing the building block title and optional minimum UI5 version.
 * @param data.columnName - The name of the custom column.
 * @param data.columnFragmentName - Optional name of the column fragment.
 * @param {string} bbViewPath - The path to the view XML file.
 * @param {string} fragmentPath - The path to the fragment XML file.
 * @param {Editor} fs - The memfs editor instance.
 * @returns {Promise<void>} Resolves when the building block is handled or skipped due to version constraints.
 */
async function handleCustomColumnBuildingBlock(
    basePath: string,
    data: { columnName: string; columnFragmentName?: string },
    bbViewPath: string,
    fragmentPath: string,
    fs: Editor
): Promise<void> {
    await generateBuildingBlock(
        basePath,
        {
            viewOrFragmentPath: bbViewPath,
            aggregationPath: augmentXpathWithLocalNames(`/mvc:View/macros:Page/macros:Table`),
            replace: false,
            allowAutoAddDependencyLib: true,
            buildingBlockData: {
                id: 'CustomColumn',
                buildingBlockType: BuildingBlockType.CustomColumn,
                title: data.columnName,
                customColumnFragmentName: data.columnFragmentName,
                customColumnFragmentPath: fragmentPath,
                appName: basename(basePath),
                hasTableColumns: false
            }
        },
        fs
    );
}
