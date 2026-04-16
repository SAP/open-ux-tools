import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import cloneDeep from 'lodash/cloneDeep.js';
import type { UI5LibConfig } from './types.js';
import { enableTypescript } from './options/index.js';
import { mergeWithDefaults } from './data/index.js';
import { getTemplateVersionPath } from './utils.js';

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
        fs = create(createStorage());
    }

    const libInput = mergeWithDefaults(ui5LibConfig);
    basePath = join(basePath, libInput.libraryNamespace);

    const tmplPath = join(__dirname, '..', 'templates');
    const ignore = [reuseLib.typescript ? '**/*.js' : '**/*.ts'];

    const templateVersionPath = getTemplateVersionPath(reuseLib.frameworkVersion);

    fs.copyTpl(join(tmplPath, 'common', templateVersionPath, '**/*.*'), basePath, libInput, undefined, {
        globOptions: { dot: true, ignore },
        processDestinationPath: (filePath: string) =>
            filePath
                .replace('baselibrary', libInput.libraryNamespaceURI)
                .replace(/gitignore.tmpl/g, '.gitignore')
                .replace(/karma.conf.tmpl/g, 'karma.conf.js')
    });

    if (reuseLib.typescript) {
        await enableTypescript(libInput, basePath, tmplPath, fs);
    }

    return fs;
}

export { generate };
export { UI5LibConfig };
