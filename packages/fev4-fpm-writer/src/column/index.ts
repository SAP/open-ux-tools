import { validateVersion } from '../common/version';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { TableCustomColumn, EventHandler } from './types';
import { join, sep, dirname } from 'path';
import { render } from 'ejs';
import { getManifestRoot } from './version';

/**
 * Add a custom column to an existing UI5 application.
 *
 * @returns {Promise<Editor>} the updated mem-fs editor instance
 * @param {string} basePath - the base path
 * @param {TableCustomColumn} customColumn - the custom column configuration
 * @param {string} handler (optional) - event handler path and name (relative path from the base path). If passed, an event handler JS gets additionally created and added to the fragment
 * @param {Number} ui5Version - optional parameter to define the minimum UI5 version that the generated code must support. If nothing can be generated for the given version then an exception is thrown.
 * @param {Editor} [fs] - the mem-fs editor instance
 */
export function generateCustomColumn(
    basePath: string,
    customColumn: TableCustomColumn,
    handler?: EventHandler | undefined,
    ui5Version?: number,
    fs?: Editor
): Editor {
    validateVersion(ui5Version);
    const manifestPath = join(basePath, 'webapp/manifest.json');
    if (!fs) {
        fs = create(createStorage());
    }
    const completeColumn = Object.assign({ name: 'to be defined' }, customColumn);

    // enhance manifest with column definition
    const manifestRoot = getManifestRoot(ui5Version);
    const filledTemplate = render(fs.read(join(manifestRoot, `manifest.json`)), completeColumn);
    fs.extendJSON(manifestPath, JSON.parse(filledTemplate));

    // add fragment
    const extRoot = join(__dirname, '../../templates/column/ext');
    const viewPath = join(dirname(manifestPath), customColumn.template.replace(/\./g, '/') + '.view.xml');
    console.log(viewPath);
    const handlerPath = handler ? handler.fileName.replace('.', sep) : undefined;
    fs.copyTpl(join(extRoot, 'CustomColumnFragment.xml'), viewPath, {
        ...completeColumn,
        eventHandler: {
            fileName: handlerPath,
            predefinedMethod: handler?.predefinedMethod
        }
    });

    // add event handler
    if (handler) {
        fs.copyTpl(join(extRoot, 'EventHandler.js'), handlerPath + '.js', {
            predefinedMethod: handler.predefinedMethod
        });
    }

    return fs;
}
