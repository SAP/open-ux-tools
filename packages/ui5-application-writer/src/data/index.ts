import { App, UI5, AppOptions, Package, Ui5App } from '../types';
import { mergeApp, packageDefaults, mergeUi5 } from './defaults';
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
    ui5App.ui5 = mergeUi5(ui5App.ui5 || {});
    ui5App.package = Object.assign(packageDefaults(ui5App.package.version, ui5App.app.description), ui5App.package);

    return ui5App as {
        app: App;
        appOptions: Partial<AppOptions>;
        ui5: UI5;
        package: Package;
    };
}
