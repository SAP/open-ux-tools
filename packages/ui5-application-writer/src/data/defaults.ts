import { App, Package, UI5 } from '../types';
import mappings from './version-to-descriptor-mapping.json'; // from https://github.com/SAP/ui5-manifest/blob/master/mapping.json
/**
 * Returns a package instance with default properties.
 *
 * @param {string} [version] - the package version
 * @param {string} [description] - the package description
 * @returns {Partial<Package>} the package instance
 */
export function packageDefaults(version?: string, description?: string): Partial<Package> {
    return {
        version: version || '0.0.1',
        description: description || '',
        devDependencies: {
            '@ui5/cli': '^2.12.0',
            '@sap/ux-ui5-tooling': '1'
        },
        scripts: {
            start: 'ui5 serve --config=ui5.yaml --open index.html',
            build: 'ui5 build --config=ui5.yaml --clean-dest --dest dist'
        },
        ui5: {
            dependencies: ['@sap/ux-ui5-tooling']
        }
    };
}
/**
 * Returns an app instance with default properties. Every property must have a value for templating to succeed.
 *
 * @param {App} app - specifies the application properties
 * @returns {Partial<App>} the App instance
 */
export function appDefaults(app: App): App {
    return {
        version: app.version || '0.0.1',
        id: app.id,
        uri: app.id.replace('.', '/'), // todo: remove if unused
        title: app.title || `Title of ${app.id}`, //todo: localise
        description: app.description || `Description of ${app.id}`, //todo: localise
        baseComponent: app.baseComponent || 'sap/ui/core/UIComponent',
        flpAppId: app.flpAppId || `${app.id.replace(/[-_.]/g, '')}-tile`
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
        minUI5Version: ui5?.minUI5Version || '1.60',
        version: ui5?.version || '1.84.0'
    };
    merged.descriptorVersion =
        ui5?.descriptorVersion || (mappings as Record<string, string>)[merged.minUI5Version!] || '1.12.0';
    merged.typesVersion = ui5?.typesVersion || parseFloat(merged.version!) >= 1.76 ? merged.version : '1.71.18';
    merged.ui5Theme = ui5?.ui5Theme || 'sap_fiori_3';
    // Return merged, does not update passed ref
    return Object.assign({}, ui5, merged) as UI5;
}
