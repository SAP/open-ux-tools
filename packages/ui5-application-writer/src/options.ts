import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { render } from 'ejs';
import type { Ui5App } from './types';
import { getFilePaths } from './files';
import type { UI5Config } from '@sap-ux/ui5-config';
import { ui5NPMSupport, ui5TSSupport } from './data/ui5Libs';
import { mergeObjects, UI5_DEFAULT } from './data/defaults';

/**
 * Input required to enable optional features.
 */
export interface FeatureInput {
    ui5App: { app: { id: string; baseComponent?: string } };
    fs: Editor;
    basePath: string;
    tmplPath: string;
    ui5Configs: UI5Config[];
}

/**
 * Copy all template files into the target project.
 *
 * @param name the name of the optional feature
 * @param input collection of input properties
 * @param input.ui5App ui5 app config
 * @param input.fs reference to the mem-fs instance
 * @param input.basePath project base path
 * @param input.tmplPath template basepath
 */
function copyTemplates(name: string, { ui5App, fs, basePath, tmplPath }: FeatureInput) {
    const optTmplDirPath = join(tmplPath, 'optional', `${name}`);
    const optTmplFilePaths = getFilePaths(optTmplDirPath);
    optTmplFilePaths.forEach((optTmplFilePath) => {
        const relPath = optTmplFilePath.replace(optTmplDirPath, '');
        const outPath = join(basePath, relPath);
        // Extend or add
        if (!fs.exists(outPath)) {
            fs.copyTpl(optTmplFilePath, outPath, ui5App, undefined, {
                globOptions: { dot: true }
            });
        } else {
            const add = JSON.parse(render(fs.read(optTmplFilePath), ui5App, {}));
            const existingFile = JSON.parse(fs.read(outPath));
            const merged = mergeObjects(existingFile, add);
            fs.writeJSON(outPath, merged);
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
    typescript: enableTypescript,
    npmPackageConsumption: enableNpmPackageConsumption
};

/**
 * Enable typescript for the given input.
 *
 * @param input Input required to enable the optional typescript features
 * @param keepOldComponent if set to true then the old Component.js will be renamed but kept.
 */
export function enableTypescript(input: FeatureInput, keepOldComponent: boolean = false) {
    input.ui5App.app.baseComponent = input.ui5App.app.baseComponent ?? UI5_DEFAULT.BASE_COMPONENT;
    copyTemplates('typescript', input);
    input.ui5Configs.forEach((ui5Config) => {
        ui5Config.addCustomMiddleware([ui5TSSupport.middleware]);
        ui5Config.addCustomTasks([ui5TSSupport.task]);
    });
    const compPath = join(input.basePath, 'webapp/Component.js');
    if (keepOldComponent) {
        input.fs.move(compPath, `${compPath}.old`);
    } else {
        input.fs.delete(compPath);
    }
}

/**
 * Enable npm module import for the given input.
 *
 * @param input Input required to enable the optional npm modules import
 */
export function enableNpmPackageConsumption(input: FeatureInput) {
    copyTemplates('npmPackageConsumption', input);
    input.ui5Configs.forEach((ui5Config) => {
        ui5Config.addCustomMiddleware([ui5NPMSupport.middleware]);
        ui5Config.addCustomTasks([ui5NPMSupport.task]);
    });
}

/**
 * Check if the ui5 app config requires optional features to be enabled and if yes, enable them.
 *
 * @param ui5App ui5 app config
 * @param fs reference to the mem-fs instance
 * @param basePath project base path
 * @param tmplPath template basepath
 * @param ui5Configs available UI5 configs
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
                factories[key]?.({ ui5App, fs, basePath, tmplPath, ui5Configs });
            }
        });
    }
}
