import { Ui5App } from './types';
import { appDefaults, packageDefaults, mergeUi5 } from './defaults';

export * from './types';

export function mergeWithDefaults(data: Ui5App): void {
    data.app = Object.assign(appDefaults(data.app.id), data.app);
    data.ui5 = mergeUi5(data.ui5);
    data.package = Object.assign(packageDefaults(data.app.version), data.package)
}
