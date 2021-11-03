import { validateVersion, validateBasePath } from '../common/validate';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { CustomTableColumn, InternalCustomTableColumn } from './types';
import { join } from 'path';
import { render } from 'ejs';
import { Manifest } from '../common/types';
import { setCommonDefaults } from '../common/defaults';

/**
 * Get the template folder for the given UI5 version.
 *
 * @param ui5Version required UI5 version.
 * @returns path to the template folder containing the manifest.json ejs template
 */
export function getManifestRoot(ui5Version?: number): string {
    if (ui5Version === undefined || ui5Version >= 1.86) {
        return join(__dirname, '../../templates/column/1.86');
    } else if (ui5Version === 1.85) {
        return join(__dirname, '../../templates/column/1.85');
    } else {
        return join(__dirname, '../../templates/column/1.84');
    }
}

/**
 * Enhances the provided custom table column configuration with default data.
 *
 * @param {CustomTableColumn} data - a custom column configuration object
 * @param {string} manifestPath - path to the project's manifest.json
 * @param {Manifest} manifest - the application manifest
 * @returns enhanced configuration
 */
function enhanceConfig(data: CustomTableColumn, manifestPath: string, manifest: Manifest): InternalCustomTableColumn {
    // clone input and set defaults
    const config: CustomTableColumn & Partial<InternalCustomTableColumn> = { ...data };
    setCommonDefaults(config, manifestPath, manifest);

    // set default event handler if it is to be created
    if (config.eventHandler === true) {
        config.eventHandler = `${config.ns}.${config.name}.onPress`;
    }

    // generate column content
    if (config.control) {
        config.content = config.control;
    } else {
        const content =
            config.properties && config.properties.length > 0
                ? `{=%{${config.properties.join("} + ' ' + %{")}}}`
                : 'Sample Text';
        if (config.eventHandler) {
            const parts = (config.eventHandler as string).split('.');
            const method = parts.pop();
            const handler = parts.join('/');
            config.content = `<Button core:require="{ handler: '${handler}'}" text="${content}" press="handler.${method}" />`;
        } else {
            config.content = `<Text text="${content}" />`;
        }
    }

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
    validateVersion(customColumn.ui5Version);
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath) as Manifest;

    const root = join(__dirname, '../../templates');

    // merge with defaults
    const completeColumn = enhanceConfig(customColumn, manifestPath, manifest);

    // add event handler if requested
    if (completeColumn.eventHandler) {
        fs.copyTpl(
            join(root, 'common/EventHandler.js'),
            join(completeColumn.path, `${completeColumn.name}.js`),
            completeColumn
        );
    }

    // enhance manifest with column definition
    const manifestRoot = getManifestRoot(customColumn.ui5Version);
    const filledTemplate = render(fs.read(join(manifestRoot, `manifest.json`)), completeColumn);
    fs.extendJSON(manifestPath, JSON.parse(filledTemplate));

    // add fragment
    const viewPath = join(completeColumn.path, `${completeColumn.name}.fragment.xml`);
    fs.copyTpl(join(root, 'column/ext/CustomColumnFragment.xml'), viewPath, completeColumn);

    return fs;
}
