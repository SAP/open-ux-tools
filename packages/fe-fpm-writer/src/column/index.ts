import { validateVersion } from '../common/version';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { CustomTableColumn, InternalCustomTableColumn } from './types';
import { join } from 'path';
import { render } from 'ejs';
import { getManifestRoot } from './version';
import { Manifest } from '../common/types';
import { setCommonDefaults } from '../common/defaults';

/**
 * Enhances the provided custom table column configuration with default data.
 *
 * @param {CustomTableColumn} data - a custom column configuration object
 * @param {Manifest} manifest - the application manifest
 * @returns enhanced configuration
 */
function enhanceConfig(data: CustomTableColumn, manifestPath: string, manifest: Manifest): InternalCustomTableColumn {
    // clone input and set defaults
    const config: CustomTableColumn & Partial<InternalCustomTableColumn> = { ...data };
    setCommonDefaults(config, manifestPath, manifest);

    // generate column content
    if (config.control) {
        config.content = config.control;
    } else {
        const content =
            config.properties && config.properties.length > 0
                ? `{=%{${config.properties.join("} + ' ' + %{")}}}`
                : 'Sample Text';
        if (config.eventHandler) {
            config.content = `<Button ${
                config.eventHandler
                    ? ' core:require="{ handler: \'' + (config.ns + '.' + config.name).replace(/\./g, '/') + '\'}"'
                    : ''
            } text="${content}" press="handler.onPress" />`;
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
    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath) as Manifest;

    // merge with defaults
    const completeColumn = enhanceConfig(customColumn, manifestPath, manifest);

    // enhance manifest with column definition
    const manifestRoot = getManifestRoot(customColumn.ui5Version);
    const filledTemplate = render(fs.read(join(manifestRoot, `manifest.json`)), completeColumn);
    fs.extendJSON(manifestPath, JSON.parse(filledTemplate));

    // add fragment
    const extRoot = join(__dirname, '../../templates/column/ext');
    const viewPath = join(completeColumn.path, `${completeColumn.name}.fragment.xml`);
    fs.copyTpl(join(extRoot, 'CustomColumnFragment.xml'), viewPath, completeColumn);

    // add event handler if control type is button
    if (completeColumn.eventHandler) {
        fs.copy(join(extRoot, 'EventHandler.js'), viewPath.replace('.fragment.xml', '.js'));
    }

    return fs;
}
