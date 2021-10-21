import { Ui5App } from '../types';
import { appDefaults, packageDefaults, mergeUi5 } from './defaults';

/**
 * Merges Ui5App instance with default properties.
 * Replaces undefined mandatory properties with defaul values.
 *
 * @param {Ui5App} ui5App - the Ui5App instance
 * @returns {Ui5App} - the updated Ui5App instance
 */
export function mergeWithDefaults(ui5App: Ui5App): Ui5App {
    ui5App.app = appDefaults(ui5App.app);
    ui5App.ui5 = mergeUi5(ui5App.ui5);
    ui5App.package = Object.assign(packageDefaults(ui5App.package.version, ui5App.app.description), ui5App.package);
    return ui5App;
}
