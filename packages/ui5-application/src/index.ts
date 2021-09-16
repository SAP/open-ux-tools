import { join } from 'path';
import { Ui5App, UI5 } from '@sap/open-ux-tools-types';
import { mergeWithDefaults } from './data';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';

/**
 * Writes the template to the memfs editor instance.
 *
 * @param {string} basePath - the base path
 * @param {Ui5App} ui5App - the Ui5App instance
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {*}  {Promise<Editor>} the updated memfs editor instance
 */
async function generate(basePath: string, ui5App: Ui5App, fs?: Editor): Promise<Editor>{ 

    if (!fs) {
        fs = create(createStorage());
    }
    ui5App = mergeWithDefaults(ui5App);
    const tmpPath = join(__dirname, '..', 'templates');

    fs.copyTpl(join(tmpPath, '**/*.*'), join(basePath), ui5App, undefined, { globOptions: { dot: true } });

    return fs as Editor;
}

export { Ui5App, UI5, generate };
