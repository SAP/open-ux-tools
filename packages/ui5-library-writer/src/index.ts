import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import cloneDeep from 'lodash/cloneDeep';
import type { UI5LibConfig } from './types';
import { enableTypescript } from './options';
import { mergeWithDefaults } from './data';
import { getTemplateVersionPath, UI5 } from '@sap-ux/ui5-application-writer';

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

    const templateVersionPath = getTemplateVersionPath({
        version: reuseLib.frameworkVersion
    } as UI5);

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
