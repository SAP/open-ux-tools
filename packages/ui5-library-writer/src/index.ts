import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create as createStorage } from 'mem-fs';
import type { MemFsEditor, VinylMemFsEditorFile } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import ejs from 'ejs';
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
async function generate(basePath: string, ui5LibConfig: UI5LibConfig, fs?: MemFsEditor): Promise<MemFsEditor> {
    const reuseLib = cloneDeep(ui5LibConfig);

    if (!fs) {
        fs = create(createStorage<VinylMemFsEditorFile>());
    }

    const libInput = mergeWithDefaults(ui5LibConfig);
    basePath = join(basePath, libInput.libraryNamespace);

    const tmplPath = join(__dirname, '..', 'templates');
    const ignore = [reuseLib.typescript ? '**/*.js' : '**/*.ts'];

    const templateVersionPath = getTemplateVersionPath(reuseLib.frameworkVersion);

    fs.copy(join(tmplPath, 'common', templateVersionPath, '**/*.*'), basePath, {
        globOptions: { dot: true, ignore } as any,
        fileTransform({ destinationPath, sourcePath, contents }) {
            const renamedPath = destinationPath
                .split(sep)
                .join('/')
                .replace(/\/baselibrary(\/|$)/g, `/${libInput.libraryNamespaceURI}$1`)
                .replace(/gitignore\.tmpl$/, '.gitignore')
                .replace(/karma\.conf\.tmpl$/, 'karma.conf.js')
                .split('/')
                .join(sep);
            const isBinary = /\.(png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot|otf|zip|gz|pdf)$/i.test(sourcePath);
            const processedContents = isBinary
                ? contents
                : ejs.render(contents.toString(), libInput, { filename: sourcePath });
            return { path: renamedPath, contents: processedContents };
        }
    });

    if (reuseLib.typescript) {
        await enableTypescript(libInput, basePath, tmplPath, fs);
    }

    return fs;
}

export { generate };
export { UI5LibConfig };
