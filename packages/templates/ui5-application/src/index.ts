import { join } from 'path';
import { Ui5App, UI5, mergeWithDefaults } from './data';
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
async function generate(basePath: string, ui5App: Ui5App, fs?: Editor): Promise<Editor> {
    let ui5AppCloned: Ui5App = Object.assign({}, ui5App);

    if (!fs) {
        fs = create(createStorage());
    }
    ui5AppCloned = mergeWithDefaults(ui5AppCloned);
    const tmpPath = join(__dirname, '..', 'templates');

    fs.copyTpl(join(tmpPath, '**/*.*'), join(basePath), ui5AppCloned, undefined, { globOptions: { dot: true } });

    return fs as Editor;
}

export { Ui5App, UI5, generate };
