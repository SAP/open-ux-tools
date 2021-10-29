import { validateVersion } from '../common/version';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { TableCustomColumn, EventHandler, InternalTableCustomColumn } from './types';
import { join, sep, dirname } from 'path';
import { render } from 'ejs';
import { getManifestRoot } from './version';
import { InternalCustomAction } from 'action/types';

/**
 * Add a custom column to an existing UI5 application.
 *
 * @returns {Promise<Editor>} the updated mem-fs editor instance
 * @param {string} basePath - the base path
 * @param {TableCustomColumn} customColumn - the custom column configuration
 * @param {Number} ui5Version - optional parameter to define the minimum UI5 version that the generated code must support. If nothing can be generated for the given version then an exception is thrown.
 * @param {Editor} [fs] - the mem-fs editor instance
 */
export function generateCustomColumn(
    basePath: string,
    customColumn: TableCustomColumn,
    ui5Version?: number,
    fs?: Editor
): Editor {
    validateVersion(ui5Version);
    if (!fs) {
        fs = create(createStorage());
    }
    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath);

    // merge with defaults
    const completeColumn = Object.assign(
        {
            content: 'to be defined',
            folder: 'ext',
            control: 'Text'
        } as Partial<InternalTableCustomColumn>,
        customColumn
    ) as InternalTableCustomColumn;
    completeColumn.template = `${(manifest as any)['sap.app']!.id}.${completeColumn.folder.replace('/', '.')}.${
        completeColumn.id
    }`;

    // enhance manifest with column definition
    const manifestRoot = getManifestRoot(ui5Version);
    const filledTemplate = render(fs.read(join(manifestRoot, `manifest.json`)), completeColumn);
    fs.extendJSON(manifestPath, JSON.parse(filledTemplate));

    // add fragment
    const extRoot = join(__dirname, '../../templates/column/ext');
    const viewPath = join(dirname(manifestPath), completeColumn.folder, `${completeColumn.id}.fragment.xml`);
    //const handlerPath = handler ? handler.fileName.replace('.', sep) : undefined;
    fs.copyTpl(join(extRoot, 'CustomColumnFragment.xml'), viewPath, completeColumn);

    // add event handler
    if (completeColumn.control === 'Button') {
        fs.copy(join(extRoot, 'EventHandler.js'), viewPath.replace('.fragment.xml', '.js'));
    }

    return fs;
}
