import { render } from 'ejs';
import type { Editor } from 'mem-fs-editor';
import type { UI5LibInputTS } from '../types';
import { getFilePaths, mergeObjects } from '@sap-ux/ui5-application-writer';
import { join } from 'path';
import { UI5Config } from '@sap-ux/ui5-config';

/**
 * Enable typescript for the given input.
 *
 * @param input Input required to enable the optional typescript features
 * @param tmplPath - the template path
 * @param basePath - the base path
 * @param fs - the memfs editor instance
 */
export async function enableTypescript(tsLibConfig: UI5LibInputTS, basePath: string, tmplPath: string, fs: Editor) {
    const tsTmplDirPath = join(tmplPath, 'optional', 'typescript');
    const tsTmplFilePaths = getFilePaths(tsTmplDirPath);

    tsTmplFilePaths.forEach((tsTmplFilePath) => {
        const relPath = tsTmplFilePath.replace(tsTmplDirPath, '');
        const outPath = join(basePath, relPath);
        // Extend or add
        if (!fs.exists(outPath)) {
            const processedPath = outPath.replace(/^_/, '').replace(/\/_/, '/');
            fs.copyTpl(tsTmplFilePath, processedPath, tsLibConfig, undefined, {
                globOptions: { dot: true }
            });
        } else {
            const add = JSON.parse(render(fs.read(tsTmplFilePath), tsLibConfig, {}));
            const existingFile = JSON.parse(fs.read(outPath));
            const merged = mergeObjects(existingFile, add);
            fs.writeJSON(outPath, merged);
        }
    });

    // ui5 yaml
    const ui5ConfigPath = join(basePath, 'ui5.yaml');
    const ui5Config = await UI5Config.newInstance(fs.read(ui5ConfigPath));

    ui5Config.setConfiguration({
        paths: {
            src: 'src-gen',
            test: 'test-gen'
        }
    });

    ui5Config.updateCustomMiddleware({
        name: 'ui5-middleware-livereload',
        afterMiddleware: 'compression',
        configuration: {
            extraExts: 'xml,json,properties',
            path: ['src-gen', 'test-gen']
        }
    });

    // write ts ui5 yaml
    fs.write(ui5ConfigPath, ui5Config.toString());
}
