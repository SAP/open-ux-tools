import type { App, Package, UI5, UI5Framework } from '../types';
import versionToManifestDescMapping from './version-to-descriptor-mapping.json'; // from https://github.com/SAP/ui5-manifest/blob/master/mapping.json
import { getUI5Libs } from './ui5Libs';
import semVer from 'semver';
import type { SemVer } from 'semver';
import { t } from '../i18n';
import { mergeObjects } from 'json-merger';

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
 * Merges 2 package definitions. All properties from A and from B will be present.
 * Overlapping properties will be replaced from B. Arrays will be concatenated.
 * `ui5.dependencies` will be de-duped.
 *
 * @param packageA - a partial package definition
 * @param packageB - a partial package definition
 * @returns - a merged package defintion
 */
export function mergePackages(packageA: Partial<Package>, packageB: Partial<Package>): Package {
    const mergedPackage = mergeObjects([packageA, packageB], {
        defaultArrayMergeOperation: 'concat'
    });
    // de-dup package.ui5.dependencies
    if (mergedPackage.ui5?.dependencies) {
        mergedPackage.ui5.dependencies = Array.from(new Set(mergedPackage.ui5.dependencies));
    }
    return mergedPackage;
}
/**
 * Returns an app instance merged with default properties.
 *
 * @param {App} app - specifies the application properties
 * @returns {Partial<App>} the App instance
 */
export function mergeApp(app: App): App {
    return mergeObjects(
        [{
            version: '0.0.1',
            title: t('text.defaultAppTitle', { id: app.id }),
            description: t('text.defaultAppDescription', { id: app.id }),
            baseComponent: 'sap/ui/core/UIComponent',
            sourceTemplate: {
                id: app.sourceTemplate?.id ?? '',
                version: app.sourceTemplate?.version ?? '',
                toolsId: app.sourceTemplate?.toolsId
            }
        },
        app]
    ) as App;
}

export enum UI5_DEFAULT {
    DEFAULT_UI5_VERSION = '',
    DEFAULT_LOCAL_UI5_VERSION = '1.95.0',
    MIN_UI5_VERSION = '1.60.0',
    MIN_LOCAL_SAPUI5_VERSION = '1.76.0',
    MIN_LOCAL_OPENUI5_VERSION = '1.52.5',
    SAPUI5_CDN = 'https://ui5.sap.com',
    OPENUI5_CDN = 'https://openui5.hana.ondemand.com',
    TYPES_VERSION_SINCE = '1.76.0',
    TYPES_VERSION_PREVIOUS = '1.71.18',
    MANIFEST_VERSION = '1.12.0'
}

// Required default libs
export const defaultUI5Libs = ['sap.m', 'sap.ui.core'];

/**
 * Merges version properties with the provided UI5 instance.
 * Coerces provided UI5 versions to valid semantic versions.
 *
 * @param {UI5} [ui5] - the UI5 instance
 * @returns {UI5} the updated copy of UI5 instance (does not change `ui5`)
 */
export function mergeUi5(ui5: Partial<UI5>): UI5 {
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
    // typesVersion must be a valid npm semantic version, we know they cannot be null as already validated
    const localSemVer = semVer.valid(semVer.coerce(merged.localVersion))!;
    const typesVersion = semVer.gte(localSemVer, UI5_DEFAULT.TYPES_VERSION_SINCE)
        ? localSemVer
        : UI5_DEFAULT.TYPES_VERSION_PREVIOUS;

    merged.descriptorVersion = getManifestVersion(merged.minUI5Version, ui5.descriptorVersion);
    merged.typesVersion = ui5.typesVersion ?? typesVersion;
    merged.ui5Theme = ui5.ui5Theme ?? 'sap_fiori_3';
    merged.ui5Libs = getUI5Libs(ui5.ui5Libs);

    return Object.assign({}, ui5, merged) as UI5;
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
    const ui5SemVer = semVer.coerce(ui5Version)!;

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
                .map((verStr) => semVer.coerce(verStr))
                .sort((a, b) => semVer.rcompare(a!, b!));

            const latestUI5SemVer = sortedSemVers[0];
            // ui5 version is greater than the latest use the latest
            if (semVer.gt(version, latestUI5SemVer!)) {
                matchVersion = verToManifestVer[`${latestUI5SemVer!.major}.${latestUI5SemVer!.minor}`];
            } else {
                // Find the nearest lower
                const nearest = sortedSemVers.find((mapVer) => {
                    return semVer.gt(version, mapVer!);
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

    let result: string =
        framework === 'SAPUI5' ? UI5_DEFAULT.MIN_LOCAL_SAPUI5_VERSION : UI5_DEFAULT.MIN_LOCAL_OPENUI5_VERSION; // minimum version available as local libs

    // If the ui5 `version` is higher than the min framework version 'result' then use that as the local version instead
    // Update to a valid coerced version string e.g. snapshot-1.80 -> 1.80.0. Cannot be null as previously validated.
    const versionSemVer = semVer.coerce(version)!;
    if (semVer.gt(versionSemVer, semVer.coerce(result)!)) {
        result = semVer.valid(versionSemVer)!;
    }
    return result;
}
