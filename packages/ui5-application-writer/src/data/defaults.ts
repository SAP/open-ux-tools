import type { App, AppOptions, Package, UI5, UI5Framework } from '../types';
import versionToManifestDescMapping from './version-to-descriptor-mapping.json'; // from https://github.com/SAP/ui5-manifest/blob/master/mapping.json
import { getUI5Libs } from './ui5Libs';
import semVer from 'semver';
import type { SemVer } from 'semver';
import { t } from '../i18n';
import merge from 'lodash/mergeWith';

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
 * Merges two objects. All properties from base and from extension will be present.
 * Overlapping properties will be used from extension. Arrays will be concatenated and de-duped.
 *
 * @param base - any object definition
 * @param extension - another object definition
 * @returns - a merged package defintion
 */
export function mergeObjects<B, E>(base: B, extension: E): B & E {
    return merge({}, base, extension, (objValue: unknown, srcValue: unknown) => {
        // merge and de-dup arrays
        if (objValue instanceof Array && srcValue instanceof Array) {
            return [...new Set([...objValue, ...srcValue])];
        } else {
            return undefined;
        }
    });
}

export const enum UI5_DEFAULT {
    DEFAULT_UI5_VERSION = '',
    DEFAULT_LOCAL_UI5_VERSION = '1.95.0',
    MIN_UI5_VERSION = '1.60.0',
    MIN_LOCAL_SAPUI5_VERSION = '1.76.0',
    MIN_LOCAL_OPENUI5_VERSION = '1.52.5',
    SAPUI5_CDN = 'https://ui5.sap.com',
    OPENUI5_CDN = 'https://openui5.hana.ondemand.com',
    TYPES_VERSION_SINCE = '1.76.0',
    TYPES_VERSION_PREVIOUS = '1.71.18',
    TYPES_VERSION_BEST = '1.108.0',
    ESM_TYPES_VERSION_SINCE = '1.90.0',
    MANIFEST_VERSION = '1.12.0',
    BASE_COMPONENT = 'sap/ui/core/UIComponent'
}

/**
 * Returns an app instance merged with default properties.
 *
 * @param {App} app - specifies the application properties
 * @returns {Partial<App>} the App instance
 */
export function mergeApp(app: App): App {
    return merge(
        {
            version: '0.0.1',
            title: t('text.defaultAppTitle', { id: app.id }),
            description: t('text.defaultAppDescription', { id: app.id }),
            baseComponent: UI5_DEFAULT.BASE_COMPONENT,
            sourceTemplate: {
                id: app.sourceTemplate?.id ?? '',
                version: app.sourceTemplate?.version ?? '',
                toolsId: app.sourceTemplate?.toolsId
            }
        },
        app
    );
}

// Required default libs
export const defaultUI5Libs = ['sap.m', 'sap.ui.core'];

/**
 * Merges version properties with the provided UI5 instance.
 * Coerces provided UI5 versions to valid semantic versions.
 *
 * @param {UI5} [ui5] - the UI5 instance
 * @param options - application options
 * @returns {UI5} the updated copy of UI5 instance (does not change `ui5`)
 */
export function mergeUi5(ui5: Partial<UI5>, options?: Partial<AppOptions>): UI5 {
    const version = ui5.version ?? UI5_DEFAULT.DEFAULT_UI5_VERSION; // Undefined or null indicates the latest available should be used
    const framework = ui5.framework ?? 'SAPUI5';
    const defaultFrameworkUrl = framework === 'SAPUI5' ? UI5_DEFAULT.SAPUI5_CDN : UI5_DEFAULT.OPENUI5_CDN;
    const merged: Partial<UI5> & Pick<UI5, 'minUI5Version' | 'localVersion' | 'version'> = {
        minUI5Version: getMinUI5Version(version, ui5.minUI5Version),
        localVersion: getLocalVersion({ framework, version, localVersion: ui5.localVersion }),
        version,
        framework,
        frameworkUrl: ui5.frameworkUrl ?? defaultFrameworkUrl
    };

    merged.descriptorVersion = getManifestVersion(merged.minUI5Version, ui5.descriptorVersion);
    merged.typesVersion =
        ui5.typesVersion ?? (options?.typescript ? getEsmTypesVersion : getTypesVersion)(merged.minUI5Version);
    merged.ui5Theme = ui5.ui5Theme ?? 'sap_fiori_3';
    merged.ui5Libs = getUI5Libs(ui5.ui5Libs);

    return Object.assign({}, ui5, merged) as UI5;
}

/**
 * Get the best types version for the given minUI5Version for https://www.npmjs.com/package/@sapui5/ts-types where specific versions are missing.
 *
 * @param minUI5Version the minimum UI5 version that needs to be supported
 * @returns semantic version representing the types version.
 */
export function getTypesVersion(minUI5Version?: string) {
    const version = semVer.coerce(minUI5Version);
    if (!version) {
        return `~${UI5_DEFAULT.TYPES_VERSION_BEST}`;
    } else if (semVer.gte(version, UI5_DEFAULT.TYPES_VERSION_BEST)) {
        return `~${UI5_DEFAULT.TYPES_VERSION_BEST}`;
    } else {
        return semVer.gte(version, UI5_DEFAULT.TYPES_VERSION_SINCE)
            ? `~${semVer.major(version)}.${semVer.minor(version)}.${semVer.patch(version)}`
            : UI5_DEFAULT.TYPES_VERSION_PREVIOUS;
    }
}

/**
 * Get the best types version for the given minUI5Version within a selective range, starting at 1.90.0 for https://www.npmjs.com/package/@sapui5/ts-types-esm
 * For the latest versions the LTS S/4 on-premise version (1.102.x) is used, for anything before we match the versions as far back as available.
 *
 * @param minUI5Version the minimum UI5 version that needs to be supported
 * @returns semantic version representing the types version.
 */
export function getEsmTypesVersion(minUI5Version?: string) {
    const version = semVer.coerce(minUI5Version);
    if (!version || semVer.gte(version, UI5_DEFAULT.TYPES_VERSION_BEST)) {
        return `~${UI5_DEFAULT.TYPES_VERSION_BEST}`;
    } else {
        return semVer.gte(version, UI5_DEFAULT.ESM_TYPES_VERSION_SINCE)
            ? `~${semVer.major(version)}.${semVer.minor(version)}.0`
            : `~${UI5_DEFAULT.ESM_TYPES_VERSION_SINCE}`;
    }
}

/**
 * Gets the miminum UI5 version based on the specified version.
 *
 * @param ui5Version - the ui5 version
 * @param minUI5Version - optional minimum ui5 version
 * @returns minimum UI5 version for manifest
 */
function getMinUI5Version(ui5Version: string, minUI5Version?: string) {
    return minUI5Version ?? (ui5Version ? ui5Version : UI5_DEFAULT.MIN_UI5_VERSION);
}

/**
 * Get the manifest descriptor version from the specified UI5 version.
 * Snapshots are handled by coercion to proper versions. If the version does not exist as an exact match
 * the nearest version lower will be used.
 *
 * @param ui5Version - the ui5 version to be used to map to the manifest descriptor version
 * @param manifestVersion - optional manifest descriptor version to be used if provided
 * @returns - the manifest descriptor version
 */
function getManifestVersion(ui5Version: string, manifestVersion?: string): string {
    const ui5SemVer = semVer.coerce(ui5Version) as SemVer;

    /**
     * Finds the closest manifest version for the specified ui5 version. This is determined
     * by finding the closest lower ui5 version and returning its corresponding manifest version.
     *
     * @example For a version to manifest json containing :
     * ```
     * ...
     * "1.90": "1.33.0",
     * "1.88": "1.32.0"
     * ...
     * ```
     * Specifiying version as `1.89.0` will return manifest version `1.32.0`
     * @param version the ui5 version used to determine the closest manifest version
     * @returns closest matching manifest version or undefined, if none found (below lowest value)
     */
    const getClosestManifestVersion = (version: SemVer) => {
        const verToManifestVer = versionToManifestDescMapping as Record<string, string>;

        let matchVersion = verToManifestVer[`${semVer.major(version)}.${semVer.minor(version)}`];
        if (!matchVersion) {
            const sortedSemVers = Object.keys(verToManifestVer)
                .filter((ver) => ver !== 'latest')
                .map((verStr) => semVer.coerce(verStr) as SemVer)
                .sort((a, b) => semVer.rcompare(a, b));

            const latestUI5SemVer = sortedSemVers[0];
            // ui5 version is greater than the latest use the latest
            if (semVer.gt(version, latestUI5SemVer)) {
                matchVersion = verToManifestVer[`${latestUI5SemVer.major}.${latestUI5SemVer.minor}`];
            } else {
                // Find the nearest lower
                const nearest = sortedSemVers.find((mapVer) => {
                    return semVer.gt(version, mapVer);
                });
                if (nearest) {
                    matchVersion = verToManifestVer[`${nearest.major}.${nearest.minor}`];
                }
            }
        }
        return matchVersion;
    };
    return manifestVersion ?? (ui5SemVer && getClosestManifestVersion(ui5SemVer)) ?? UI5_DEFAULT.MANIFEST_VERSION;
}

/**
 * If a specific local version is provided, use it, otherwise, sync with version but keep minimum versions in mind.
 *
 * @param inputObj input object
 * @param inputObj.framework UI framework
 * @param inputObj.version UI version
 * @param inputObj.localVersion local UI version
 * @returns {string} of the local UI5 version
 */
function getLocalVersion({
    framework,
    version,
    localVersion
}: {
    framework: UI5Framework;
    version: string;
    localVersion?: string;
}): string {
    // If explictly provided use, we deliberately do not coerce
    if (localVersion) {
        return localVersion;
    } else if (version === UI5_DEFAULT.DEFAULT_UI5_VERSION) {
        return UI5_DEFAULT.DEFAULT_LOCAL_UI5_VERSION;
    }

    // minimum version available as local libs
    const minVersion =
        framework === 'SAPUI5' ? UI5_DEFAULT.MIN_LOCAL_SAPUI5_VERSION : UI5_DEFAULT.MIN_LOCAL_OPENUI5_VERSION;

    // If the ui5 `version` is higher than the min framework version 'result' then use that as the local version instead
    // Update to a valid coerced version string e.g. snapshot-1.80 -> 1.80.0. Cannot be null as previously validated.
    const versionSemVer = semVer.coerce(version);
    const minSemVer = semVer.coerce(minVersion);
    if (versionSemVer && minSemVer && semVer.gt(versionSemVer, minSemVer)) {
        return semVer.valid(versionSemVer) as string;
    } else {
        return minVersion;
    }
}

/**
 * Retrieve the tag version of the @sap/ux-specification based on the given version.
 *
 * @param ui5Version UI5 version used in the project
 * @returns version tag
 */
export function getSpecTagVersion(ui5Version: string | undefined): string {
    if (ui5Version) {
        if (semVer.valid(ui5Version)) {
            return `UI5-${semVer.major(ui5Version)}.${semVer.minor(ui5Version)}`;
        } else if (ui5Version.includes('snapshot') && ui5Version.includes('.')) {
            const snaphotVersion = ui5Version.split('snapshot-')[1];
            return `UI5-${snaphotVersion}`;
        }
    }
    return 'latest';
}
