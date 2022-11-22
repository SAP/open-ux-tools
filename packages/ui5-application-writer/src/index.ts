import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { App, AppOptions, Package, UI5 } from './types';
import { UI5Config } from '@sap-ux/ui5-config';
import type { Manifest } from '@sap-ux/project-access';
import { mergeWithDefaults } from './data';
import { ui5TSSupport } from './data/ui5Libs';
import { applyOptionalFeatures, enableTypescript as enableTypescriptOption } from './options';
import { Ui5App } from './types';
import { getEsmTypesVersion } from './data/defaults';

/**
 * Writes the template to the memfs editor instance.
 *
 * @param basePath - the base path
 * @param ui5AppConfig - the Ui5App instance
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
async function generate(basePath: string, ui5AppConfig: Ui5App, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const ui5App: { app: App; appOptions: Partial<AppOptions>; ui5: UI5; package: Package } =
        mergeWithDefaults(ui5AppConfig);

    const tmplPath = join(__dirname, '..', 'templates');

    const ignore = [ui5AppConfig.appOptions?.typescript ? '**/*.js' : '**/*.ts'];
    fs.copyTpl(join(tmplPath, 'core', '**/*.*'), join(basePath), ui5App, undefined, {
        globOptions: { dot: true, ignore },
        processDestinationPath: (filePath: string) => filePath.replace(/gitignore.tmpl/g, '.gitignore')
    });

    // ui5.yaml
    const ui5ConfigPath = join(basePath, 'ui5.yaml');
    const ui5Config = await UI5Config.newInstance(fs.read(ui5ConfigPath));
    ui5Config.addFioriToolsProxydMiddleware({
        ui5: {
            url: ui5App.ui5?.frameworkUrl
        }
    });
    ui5Config.addFioriToolsAppReloadMiddleware();

    // ui5-local.yaml
    const ui5LocalConfigPath = join(basePath, 'ui5-local.yaml');
    const ui5LocalConfig = await UI5Config.newInstance(fs.read(ui5LocalConfigPath));
    ui5LocalConfig.addUI5Framework(
        ui5App.ui5.framework,
        ui5App.ui5.localVersion,
        ui5App.ui5.ui5Libs as string[],
        ui5App.ui5.ui5Theme
    );
    ui5LocalConfig.addFioriToolsAppReloadMiddleware();

    // Add optional features
    applyOptionalFeatures(ui5App, fs, basePath, tmplPath, [ui5Config, ui5LocalConfig]);

    // write ui5 yamls
    fs.write(ui5ConfigPath, ui5Config.toString());
    fs.write(ui5LocalConfigPath, ui5LocalConfig.toString());

    return fs;
}

/**
 * Check if Typescript is enabled for the given path.
 *
 * @param basePath - the base path
 * @param fs - the memfs editor instance
 * @returns true is the project is ready for typescript code
 */
async function isTypescriptEnabled(basePath: string, fs?: Editor): Promise<boolean> {
    if (!fs) {
        fs = create(createStorage());
    }

    // check middlewares and tasks
    const ui5Config = await UI5Config.newInstance(fs.read(join(basePath, 'ui5.yaml')));
    if (!ui5Config.findCustomMiddleware(ui5TSSupport.middleware.name)) {
        return false;
    }
    if (!ui5Config.findCustomTask(ui5TSSupport.task.name)) {
        return false;
    }

    return true;
}

/**
 * Enable typescript in an existing valid UI5 project.
 *
 * @param basePath - the base path
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
async function enableTypescript(basePath: string, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const manifestPath = join(basePath, 'webapp/manifest.json');
    const ui5ConfigPath = join(basePath, 'ui5.yaml');
    if (!fs.exists(manifestPath)) {
        throw new Error(`Invalid project folder. Cannot find required file ${manifestPath}`);
    }
    if (!fs.exists(ui5ConfigPath)) {
        throw new Error(`Invalid project folder. Cannot find required file ${ui5ConfigPath}`);
    }
    const manifest = fs.readJSON(manifestPath) as any as Manifest;
    const ui5Config = await UI5Config.newInstance(fs.read(ui5ConfigPath));

    const tmplPath = join(__dirname, '..', 'templates');
    const ui5App = {
        app: manifest['sap.app'],
        ui5: {
            typesVersion: getEsmTypesVersion(manifest['sap.ui5']?.dependencies?.minUI5Version)
        }
    };
    enableTypescriptOption({ basePath, fs, ui5Configs: [ui5Config], tmplPath, ui5App }, true);

    fs.write(ui5ConfigPath, ui5Config.toString());

    return fs;
}

export { Ui5App, generate, enableTypescript, isTypescriptEnabled };
export { App, Package, UI5, AppOptions };
