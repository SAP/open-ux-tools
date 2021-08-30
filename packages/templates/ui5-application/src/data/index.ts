import { Ui5App } from './types';
import { appDefaults, packageDefaults, mergeUi5 } from './defaults';

export * from './types';
/*
 * Merges Ui5App instance with default properties.
 *
 * @param {Ui5App} data - the Ui5App instance
 * @returns {Ui5App} - the updated Ui5App instance
 */
/**
 * @param {Ui5App} data - the Ui5App instance
 */
export function mergeWithDefaults(data: Ui5App): void {
	data.app = Object.assign(appDefaults(data.app.id), data.app);
	data.ui5 = mergeUi5(data.ui5);
	data.package = Object.assign(packageDefaults(data.package.version), data.package);
}
