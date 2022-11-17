import type { App, UI5, AppOptions, Package, Ui5App } from '../types';
import { mergeApp, packageDefaults, mergeUi5, mergeObjects, getSpecTagVersion } from './defaults';
import { validate } from './validators';

/**
 * Merges Ui5App instance with default properties.
 * Replaces undefined mandatory properties with default values.
 *
 * @param {Ui5App} ui5App - the Ui5App instance
 * @returns {Ui5App} - a new Ui5App instance with all required defaults set
 */
export function mergeWithDefaults(ui5App: Ui5App): {
    app: App;
    appOptions: Partial<AppOptions>;
    ui5: UI5;
    package: Package;
} {
    validate(ui5App);
    ui5App.app = mergeApp(ui5App.app);
    ui5App.appOptions = ui5App.appOptions || {};
    // if typescript and codeAssist is enabled disable codeAssist
    if (ui5App.appOptions.typescript && ui5App.appOptions.codeAssist) {
        ui5App.appOptions.codeAssist = false;
    }
    ui5App.ui5 = mergeUi5(ui5App.ui5 || {}, ui5App.appOptions);
    ui5App.package = mergeObjects(packageDefaults(ui5App.package.version, ui5App.app.description), ui5App.package);

    if (ui5App.appOptions.sapux) {
        ui5App.package.devDependencies = ui5App.package.devDependencies || {};
        ui5App.package.devDependencies['@sap/ux-specification'] = getSpecTagVersion(ui5App.ui5.version);
    }

    return ui5App as {
        app: App;
        appOptions: Partial<AppOptions>;
        ui5: UI5;
        package: Package;
    };
}
