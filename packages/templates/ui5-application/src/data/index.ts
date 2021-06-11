import { Ui5App } from './types';
import { appDefaults, packageDefaults, mergeUi5 } from './defaults';

export * from './types';

export function mergeWithDefaults(data: Ui5App): Ui5App {
    return {
        app: Object.assign(appDefaults(data.app.id), data.app),
        ui5: mergeUi5(data.ui5),
        package: Object.assign(packageDefaults(data.app.version), data.package)
    };
}
