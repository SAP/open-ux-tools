import { App, Package, UI5 } from './types';
import mappings from './version-to-descriptor-mapping.json'; // from https://github.com/SAP/ui5-manifest/blob/master/mapping.json
/**
 * Returns a package instance with default properties.
 *
 * @param {string} [version] - the package version
 * @returns {Partial<Package>} the package instance
 */
export function packageDefaults(version?: string): Partial<Package> {
    return {
        version: version || '0.9.0',
        description: '',
        devDependencies: {
            '@ui5/cli': '^2.8.1'
        },
        scripts: {
            start: 'ui5 serve --config=ui5.yaml --open index.html',
            build: 'ui5 build --config=ui5.yaml --clean-dest --dest dist'
        }
    };
}
/**
 * Returns an app instance with default properties.
 *
 * @param {string} appId - the appID of the application
 * @returns {Partial<App>} the App instance
 */
export function appDefaults(appId: string): Partial<App> {
    return {
        version: '0.9.0',
        uri: appId.replace('.', '/'),
        title: `Title of ${appId}`,
        description: `Description of ${appId}`,
        baseComponent: 'sap/ui/core/UIComponent'
    };
}
/**
 * Merges version properties with the provided UI5 instance.
 *
 * @param {UI5} [ui5] - the UI5 instance
 * @returns {UI5} the updated UI5 instance
 */
export function mergeUi5(ui5?: UI5): UI5 {
    const merged: Partial<UI5> = {
        minVersion: ui5?.minVersion || '1.60',
        version: ui5?.version || '1.84.0'
    };
    merged.descriptorVersion =
        ui5?.descriptorVersion || (mappings as Record<string, string>)[merged.minVersion as string] || '1.12.0';
    return merged as UI5;
}
