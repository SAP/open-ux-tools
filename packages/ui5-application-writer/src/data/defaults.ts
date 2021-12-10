import { App, Package, UI5, UI5Framework } from '../types';
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
            '@ui5/cli': '^2.14.1',
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
export function mergeApp(app: App): App {
    // Return merged, does not update passed ref
    return Object.assign(
        {
            version: '0.0.1',
            title: `Title of ${app.id}`, //todo: localise
            description: `Description of ${app.id}`, //todo: localise
            baseComponent: 'sap/ui/core/UIComponent'
        },
        app
    ) as App;
}

export enum UI5_DEFAULT {
    DEFAULT_UI5_VERSION = '',
    DEFAULT_LOCAL_UI5_VERSION = '1.95.0',
    MIN_UI5_VERSION = '1.60',
    MIN_LOCAL_SAPUI5_VERSION = '1.76.0',
    MIN_LOCAL_OPENUI5_VERSION = '1.52.5',
    SAPUI5_CDN = 'https://ui5.sap.com',
    OPENUI5_CDN = 'https://openui5.hana.ondemand.com'
}

/**
 * Merges version properties with the provided UI5 instance.
 *
 * @param {UI5} [ui5] - the UI5 instance
 * @returns {UI5} the updated copy of UI5 instance (does not change `ui5`)
 */
export function mergeUi5(ui5: Partial<UI5>): UI5 {
    const version = ui5.version || UI5_DEFAULT.DEFAULT_UI5_VERSION; // no version indicates the latest available should be used
    const framework = ui5.framework || 'SAPUI5';

    const merged: Partial<UI5> & Pick<UI5, 'minUI5Version' | 'localVersion' | 'version'> = {
        minUI5Version: ui5.minUI5Version || UI5_DEFAULT.MIN_UI5_VERSION,
        localVersion: getLocalVersion({ framework, version, localVersion: ui5.localVersion }),
        version,
        framework
    };

    merged.frameworkUrl =
        ui5.frameworkUrl || merged.framework === 'SAPUI5' ? UI5_DEFAULT.SAPUI5_CDN : UI5_DEFAULT.OPENUI5_CDN;

    merged.descriptorVersion =
        ui5.descriptorVersion || (mappings as Record<string, string>)[merged.minUI5Version] || '1.12.0';
    merged.typesVersion = ui5.typesVersion || parseFloat(merged.localVersion) >= 1.76 ? merged.localVersion : '1.71.18';
    merged.ui5Theme = ui5?.ui5Theme || 'sap_fiori_3';
    merged.ui5Libs = ui5?.ui5Libs || [];

    return Object.assign({}, ui5, merged) as UI5;
}

// if a specific local version is provided, use it, otherwise, sync with version but keep minimum versions in mind
function getLocalVersion({
    framework,
    version,
    localVersion
}: {
    framework: UI5Framework;
    version: string;
    localVersion?: string;
}): string {
    let result = '';
    if (localVersion) {
        result = localVersion;
    } else {
        if (version === UI5_DEFAULT.DEFAULT_UI5_VERSION) {
            result = UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION;
        } else {
            result =
                framework === 'SAPUI5' ? UI5_DEFAULT.MIN_LOCAL_SAPUI5_VERSION : UI5_DEFAULT.MIN_LOCAL_OPENUI5_VERSION; // minimum version available as local libs
        }
        if (parseFloat(version) > parseFloat(result)) {
            result = version;
        }
    }
    return result;
}
