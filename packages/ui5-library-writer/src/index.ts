import { dirname, join, sep } from 'node:path';
import { readFileSync } from 'node:fs';
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
import { getFilePaths } from '@sap-ux/project-access';

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

    const tmplVersionPath = join(tmplPath, 'common', templateVersionPath);
    const templateFiles = await getFilePaths(tmplVersionPath);
    const binaryExt = /\.(png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot|otf|zip|gz|pdf)$/i;
    const ignoreTs = ignore.includes('**/*.ts');
    const ignoreJs = ignore.includes('**/*.js');

    for (const sourcePath of templateFiles) {
        if (ignoreTs && sourcePath.endsWith('.ts')) {
            continue;
        }
        if (ignoreJs && sourcePath.endsWith('.js')) {
            continue;
        }

        const relPath = sourcePath
            .slice(tmplVersionPath.length)
            .split(sep)
            .join('/')
            .replace(/\/baselibrary(\/|$)/g, `/${libInput.libraryNamespaceURI}$1`)
            .replace(/gitignore\.tmpl$/, '.gitignore')
            .replace(/karma\.conf\.tmpl$/, 'karma.conf.js')
            .split('/')
            .join(sep);

        const destPath = join(basePath, relPath);

        if (binaryExt.test(sourcePath)) {
            fs.copy(sourcePath, destPath);
        } else {
            const rawContents = readFileSync(sourcePath, 'utf-8');
            fs.write(destPath, ejs.render(rawContents, libInput, { filename: sourcePath }));
        }
    }

    if (reuseLib.typescript) {
        await enableTypescript(libInput, basePath, tmplPath, fs);
    }

    return fs;
}

export { generate };
export { UI5LibConfig };
