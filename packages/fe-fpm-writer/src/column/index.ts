import { render } from 'ejs';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import type { CustomTableColumn, InternalCustomTableColumn } from './types';
import { setCommonDefaults, getDefaultFragmentContent } from '../common/defaults';
import type { Manifest } from '../common/types';
import { validateVersion, validateBasePath } from '../common/validate';
import { applyEventHandlerConfiguration } from '../common/event-handler';
import { getTemplatePath } from '../templates';
import { coerce } from 'semver';

/**
 * Get the template folder for the given UI5 version.
 *
 * @param ui5Version required UI5 version.
 * @returns path to the template folder containing the manifest.json ejs template
 */
export function getManifestRoot(ui5Version?: string): string {
    const minVersion = coerce(ui5Version);
    if (!minVersion || minVersion.minor >= 86) {
        return getTemplatePath('/column/1.86');
    } else if (minVersion.minor >= 85) {
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
        config.eventHandler = applyEventHandlerConfiguration(fs, config, config.eventHandler, false, config.typescript);
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
 * @param {Editor} [fs] - the mem-fs editor instance
 */
export function generateCustomColumn(basePath: string, customColumn: CustomTableColumn, fs?: Editor): Editor {
    validateVersion(customColumn.minUI5Version);
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath) as Manifest;

    // merge with defaults
    const completeColumn = enhanceConfig(fs, customColumn, manifestPath, manifest);

    // enhance manifest with column definition
    const manifestRoot = getManifestRoot(customColumn.minUI5Version);
    const filledTemplate = render(fs.read(join(manifestRoot, `manifest.json`)), completeColumn, {});
    fs.extendJSON(manifestPath, JSON.parse(filledTemplate));

    // add fragment
    const viewPath = join(completeColumn.path, `${completeColumn.name}.fragment.xml`);
    if (completeColumn.control || !fs.exists(viewPath)) {
        fs.copyTpl(getTemplatePath('common/Fragment.xml'), viewPath, completeColumn);
    }

    return fs;
}
