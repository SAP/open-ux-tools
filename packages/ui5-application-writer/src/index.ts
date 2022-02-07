import { join } from 'path';
import { mergeWithDefaults } from './data';
import { getUI5Libs } from './data/ui5Libs';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { mergeObjects } from 'json-merger';
import { render } from 'ejs';
import { getFilePaths } from './files';
import { App, AppOptions, Package, UI5, Ui5App } from './types';
import { UI5Config } from '@sap-ux/ui5-config';

/**
 * Writes the template to the memfs editor instance.
 *
 * @param {string} basePath - the base path
 * @param {Ui5App} ui5AppConfig - the Ui5App instance
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {*}  {Promise<Editor>} the updated memfs editor instance
 */
async function generate(basePath: string, ui5AppConfig: Ui5App, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const ui5App: { app: App; appOptions: Partial<AppOptions>; ui5: UI5; package: Package } =
        mergeWithDefaults(ui5AppConfig);

    const tmplPath = join(__dirname, '..', 'templates');

    fs.copyTpl(join(tmplPath, 'core', '**/*.*'), join(basePath), ui5App, undefined, {
        globOptions: { dot: true },
        processDestinationPath: (filePath: string) => filePath.replace(/gitignore.tmpl/g, '.gitignore')
    });

    // ui5.yaml
    const ui5ConfigPath = join(basePath, 'ui5.yaml');
    const ui5Config = await UI5Config.newInstance(fs.read(ui5ConfigPath));
    ui5Config.addFioriToolsProxydMiddleware({
        ui5: {
            version: ui5App.ui5?.version,
            url: ui5App.ui5?.frameworkUrl
        }
    });
    ui5Config.addFioriToolsAppReloadMiddleware();
    fs.write(ui5ConfigPath, ui5Config.toString());

    // ui5-local.yaml
    const ui5LocalConfigPath = join(basePath, 'ui5-local.yaml');
    const ui5LocalConfig = await UI5Config.newInstance(fs.read(ui5LocalConfigPath));
    ui5LocalConfig.addUI5Framework(
        ui5App.ui5.framework,
        ui5App.ui5.localVersion,
        getUI5Libs(ui5App.ui5.ui5Libs),
        ui5App.ui5.ui5Theme
    );
    ui5LocalConfig.addFioriToolsAppReloadMiddleware();
    fs.write(ui5LocalConfigPath, ui5LocalConfig.toString());

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
                        fs?.copyTpl(optTmplFilePath, outPath, ui5App, undefined, {
                            globOptions: { dot: true }
                        });
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
    return fs;
}

export { Ui5App, generate };
export { App, Package, UI5 } from './types';
