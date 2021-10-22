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
            'start-local': 'ui5 serve --config=ui5-local.yaml --open index.html',
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

export const CONST = {
    DEFAULT_UI5_VERSION: '',
    DEFAULT_LOCAL_UI5_VERSION: '1.95.0',
    MIN_LOCAL_SAPUI5_VERSION: '1.76.0',
    MIN_LOCAL_OPENUI5_VERSION: '1.52.5'
};

/**
 * Merges version properties with the provided UI5 instance.
 *
 * @param {UI5} [ui5] - the UI5 instance
 * @returns {UI5} the updated UI5 instance
 */
export function mergeUi5(ui5?: UI5): UI5 {
    const merged: Partial<UI5> = {
        minUI5Version: ui5?.minUI5Version || '1.60',
        version: ui5?.version || CONST.DEFAULT_UI5_VERSION // no version indicates the latest available should be used
    };
    merged.framework = ui5?.framework || 'SAPUI5';
    // if a specific local version is provided, use it, otherwise, sync with version but keep minimum versions in mind
    if (ui5?.localVersion) {
        merged.localVersion = ui5.localVersion;
    } else {
        merged.localVersion =
            merged.version === CONST.DEFAULT_UI5_VERSION
                ? CONST.DEFAULT_LOCAL_UI5_VERSION
                : merged.framework === 'SAPUI5'
                ? CONST.MIN_LOCAL_SAPUI5_VERSION
                : CONST.MIN_LOCAL_OPENUI5_VERSION; // minimum version available as local libs
        if (parseFloat(merged.version!) > parseFloat(merged.localVersion)) {
            merged.localVersion = merged.version!;
        }
    }

    merged.descriptorVersion =
        ui5?.descriptorVersion || (mappings as Record<string, string>)[merged.minUI5Version!] || '1.12.0';
    merged.typesVersion =
        ui5?.typesVersion || parseFloat(merged.localVersion!) >= 1.76 ? merged.localVersion : '1.71.18';
    merged.ui5Theme = ui5?.ui5Theme || 'sap_fiori_3';
    // Return merged, does not update passed ref
    return Object.assign({}, ui5, merged) as UI5;
}
