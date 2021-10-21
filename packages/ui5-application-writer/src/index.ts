import { join } from 'path';
import { mergeWithDefaults } from './data';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { mergeObjects } from 'json-merger';
import { render } from 'ejs';
import { getFilePaths } from './files';
import { Ui5App } from './types';

/**
 * Writes the template to the memfs editor instance.
 *
 * @param {string} basePath - the base path
 * @param {Ui5App} ui5App - the Ui5App instance
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {*}  {Promise<Editor>} the updated memfs editor instance
 */
async function generate(basePath: string, ui5App: Ui5App, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    ui5App = mergeWithDefaults(ui5App);

    const tmplPath = join(__dirname, '..', 'templates');

    fs.copyTpl(join(tmplPath, 'core', '**/*.*'), join(basePath), ui5App, undefined, { globOptions: { dot: true } });

    // Add optional features
    if (ui5App.appOptions) {
        Object.entries(ui5App.appOptions).forEach(([key, value]) => {
            if (value === true) {
                const optTmplDirPath = join(tmplPath, 'optional', `${key}`);
                const optTmplFilePaths = getFilePaths(optTmplDirPath);
                optTmplFilePaths.forEach((optTmplFilePath) => {
                    const relPath = optTmplFilePath.replace(optTmplDirPath, '');
                    const outPath = join(basePath, relPath);
                    // Extend or add
                    if (!fs?.exists(outPath)) {
                        fs?.copyTpl(optTmplFilePath, outPath, ui5App, undefined, { globOptions: { dot: true } });
                    } else {
                        const add = JSON.parse(render(fs?.read(optTmplFilePath), ui5App));
                        const existingFile = JSON.parse(fs?.read(outPath));
                        const merged = mergeObjects([existingFile, add], { defaultArrayMergeOperation: 'concat' });
                        fs?.writeJSON(outPath, merged);
                    }
                });
            }
        });
    }
    return fs as Editor;
}

export { Ui5App, generate };
export { Package, UI5 } from './types';
