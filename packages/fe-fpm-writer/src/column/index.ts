import { render } from 'ejs';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'node:path';
import type { CustomTableColumn, InternalCustomTableColumn } from './types';
import { setCommonDefaults, getDefaultFragmentContent } from '../common/defaults';
import type { Manifest } from '../common/types';
import { validateVersion, validateBasePath } from '../common/validate';
import { applyEventHandlerConfiguration } from '../common/event-handler';
import { extendJSON } from '../common/file';
import { getTemplatePath } from '../templates';
import { coerce, gte } from 'semver';
import { getManifest } from '../common/utils';

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
    await validateBasePath(basePath, fs);

    const { path: manifestPath, content: manifest } = await getManifest(basePath, fs);

    // merge with defaults
    const completeColumn = enhanceConfig(fs, customColumn, manifestPath, manifest);

    // add fragment
    const viewPath = join(completeColumn.path, `${completeColumn.fragmentFile ?? completeColumn.name}.fragment.xml`);
    if (completeColumn.control || !fs.exists(viewPath)) {
        fs.copyTpl(getTemplatePath('common/Fragment.xml'), viewPath, completeColumn);
    }

    // enhance manifest with column definition
    const manifestRoot = getManifestRoot(customColumn.minUI5Version);
    const filledTemplate = render(fs.read(join(manifestRoot, `manifest.json`)), completeColumn, {});
    extendJSON(fs, {
        filepath: manifestPath,
        content: filledTemplate,
        tabInfo: customColumn.tabInfo
    });

    return fs;
}
