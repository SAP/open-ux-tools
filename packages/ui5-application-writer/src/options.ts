import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { render } from 'ejs';
import { mergeObjects } from 'json-merger';
import type { Ui5App } from './types';
import { getFilePaths } from './files';
import type { UI5Config } from '@sap-ux/ui5-config';
import { ui5TsMiddlewares, ui5TsTasks } from './data/ui5Libs';
import { UI5_DEFAULT } from 'data/defaults';

export interface FeatureInput {
    ui5App: { app: { id: string; baseComponent?: string } };
    fs: Editor;
    basePath: string;
    tmplPath: string;
    ui5Configs: UI5Config[];
}

/**
 *
 * @param key
 * @param root0
 * @param root0.ui5App
 * @param root0.fs
 * @param root0.basePath
 * @param root0.tmplPath
 */
function copyTemplates(key: string, { ui5App, fs, basePath, tmplPath }: FeatureInput) {
    const optTmplDirPath = join(tmplPath, 'optional', `${key}`);
    const optTmplFilePaths = getFilePaths(optTmplDirPath);
    optTmplFilePaths.forEach((optTmplFilePath) => {
        const relPath = optTmplFilePath.replace(optTmplDirPath, '');
        const outPath = join(basePath, relPath);
        // Extend or add
        if (!fs?.exists(outPath)) {
            fs?.copyTpl(optTmplFilePath, outPath, ui5App, undefined, {
                globOptions: { dot: true }
            });
        } else {
            const add = JSON.parse(render(fs?.read(optTmplFilePath), ui5App, {}));
            const existingFile = JSON.parse(fs?.read(outPath));
            const merged = mergeObjects([existingFile, add], { defaultArrayMergeOperation: 'concat' });
            fs?.writeJSON(outPath, merged);
        }
    });
}

/**
 * Factory functions for applying optional features.
 */
const factories: { [key: string]: (input: FeatureInput) => void } = {
    codeAssist: (input: FeatureInput) => copyTemplates('codeAssist', input),
    eslint: (input: FeatureInput) => copyTemplates('eslint', input),
    loadReuseLibs: (input: FeatureInput) => copyTemplates('loadReuseLibs', input),
    sapux: (input: FeatureInput) => copyTemplates('sapux', input),
    typescript: enableTypescript
};

/**
 * Enable typescript for the given input.
 *
 * @param input
 * @param keepOldComponent
 */
export function enableTypescript(input: FeatureInput, keepOldComponent: boolean = false) {
    input.ui5App.app.baseComponent = UI5_DEFAULT.BASE_COMPONENT;
    copyTemplates('typescript', input);
    input.ui5Configs.forEach((ui5Config) => {
        ui5Config.addCustomMiddleware(ui5TsMiddlewares);
        ui5Config.addCustomTasks(ui5TsTasks);
    });
    const compPath = join(input.basePath, 'webapp/Component.js');
    if (keepOldComponent) {
        input.fs.move(compPath, `${compPath}.old`);
    } else {
        input.fs.delete(compPath);
    }
}

/**
 *
 * @param ui5App
 * @param fs
 * @param basePath
 * @param tmplPath
 * @param ui5Configs
 */
export function applyOptionalFeatures(
    ui5App: Ui5App,
    fs: Editor,
    basePath: string,
    tmplPath: string,
    ui5Configs: UI5Config[]
) {
    if (ui5App.appOptions) {
        Object.entries(ui5App.appOptions).forEach(([key, value]) => {
            if (value === true) {
                factories[key]({ ui5App, fs, basePath, tmplPath, ui5Configs });
            }
        });
    }
}
