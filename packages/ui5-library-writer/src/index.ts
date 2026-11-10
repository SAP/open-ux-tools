import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create as createStorage } from 'mem-fs';
import type { MemFsEditor as Editor, VinylMemFsEditorFile } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import cloneDeep from 'lodash/cloneDeep.js';
import type { UI5LibConfig } from './types.js';
import { enableTypescript } from './options/index.js';
import { mergeWithDefaults } from './data/index.js';
import { getTemplateVersionPath, renameInStore, type CopyOptionsWithIgnore } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Writes the template to the memfs editor instance.
 *
 * @param basePath - the base path
 * @param ui5LibConfig - the Ui5 lib instance
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
async function generate(basePath: string, ui5LibConfig: UI5LibConfig, fs?: Editor): Promise<Editor> {
    const reuseLib = cloneDeep(ui5LibConfig);

    if (!fs) {
        fs = create(createStorage<VinylMemFsEditorFile>());
    }

    const libInput = mergeWithDefaults(ui5LibConfig);
    basePath = join(basePath, libInput.libraryNamespace);

    const tmplPath = join(__dirname, '..', 'templates');
    const ignore = [reuseLib.typescript ? '**/*.js' : '**/*.ts'];

    const templateVersionPath = getTemplateVersionPath(reuseLib.frameworkVersion);

    const copyOptions: CopyOptionsWithIgnore = { globOptions: { dot: true, ignore } };
    fs.copyTpl(join(tmplPath, 'common', templateVersionPath, '**/*.*'), basePath, libInput, undefined, copyOptions);

    // mem-fs-editor@12 removed copyTpl's processDestinationPath rename callback, so rename the
    // rendered outputs afterwards. move = copy + delete, which leaves `state: 'deleted'` tombstones
    // for the source paths in the store (visible in fs.dump() snapshots).
    renameInStore(fs, basePath, (filePath) =>
        filePath
            .replace('baselibrary', libInput.libraryNamespaceURI)
            .replace(/gitignore\.tmpl$/, '.gitignore')
            .replace(/karma\.conf\.tmpl$/, 'karma.conf.js')
    );

    if (reuseLib.typescript) {
        await enableTypescript(libInput, basePath, tmplPath, fs);
    }

    return fs;
}

export { generate };
export { UI5LibConfig };
