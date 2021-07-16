import { join } from 'path';
import { Ui5App, mergeWithDefaults } from './data';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';

/**
 * Writes the template to the memfs editor instance.
 *
 * @param {string} basePath - the base path
 * @param {Ui5App} data - the Ui5App instance
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {*}  {Promise<Editor>} the updated memfs editor instance
 */
async function generate(basePath: string, data: Ui5App, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const fullData = mergeWithDefaults(data);
    const tmpPath = join(__dirname, '..', 'templates');

    fs.copyTpl(join(tmpPath, '**/*.*'), join(basePath), fullData);

    return fs;
}

export { Ui5App, generate };
