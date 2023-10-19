import cmp from 'semver-compare';
import { coerce, major, minor, valid } from 'semver';
import type { Logger, UI5VersionFilterOptions, UI5VersionOverview, UI5VersionsResponse, UI5Version } from './types';
import { UI5Info, FioriElementsVersion } from './types';
import { CommandRunner } from './commandRunner';
import axios from 'axios';

export const MIN_UI5_VERSION = '1.65.0';

const MIN_UI5_VERSION_V2_TEMPLATE = '1.76.0';
const MIN_UI5_VERSION_V4_TEMPLATE = '1.84.0';

export const DEFAULT_UI5_VERSIONS = [
    UI5Info.DefaultVersion,
    '1.104.0',
    '1.103.0',
    '1.102.0',
    '1.101.0',
    '1.100.0',
    '1.99.0',
    '1.98.0',
    '1.97.0',
    '1.96.0',
    '1.95.0',
    '1.94.0',
    '1.93.0',
    '1.92.0',
    '1.91.0',
    '1.90.0',
    '1.89.0',
    '1.88.0',
    '1.87.0',
    '1.86.0',
    '1.85.0',
    '1.84.0',
    '1.82.0',
    '1.81.0',
    '1.80.0',
    '1.79.0',
    '1.78.0',
    '1.77.0',
    '1.76.0',
    '1.75.0',
    '1.74.0',
    '1.73.0',
    '1.72.0',
    '1.71.0',
    '1.70.0',
    '1.69.0',
    '1.68.0',
    '1.67.0',
    '1.66.0',
    MIN_UI5_VERSION
];
// Updated Oct-18-2023
const VERSION_OVERVIEW_FALLBACK: UI5VersionOverview[] = [
    {
        version: '1.119.*',
        support: 'Maintenance'
    },
    {
        version: '1.118.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.117.*',
        support: 'Maintenance'
    },
    {
        version: '1.116.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.115.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.114.*',
        support: 'Maintenance'
    },
    {
        version: '1.113.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.112.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.111.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.110.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.109.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.108.*',
        support: 'Maintenance'
    },
    {
        version: '1.107.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.106.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.105.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.104.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.103.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.102.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.101.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.100.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.99.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.98.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.97.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.96.*',
        support: 'Maintenance'
    },
    {
        version: '1.95.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.94.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.93.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.92.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.91.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.90.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.89.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.88.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.87.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.86.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.85.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.84.*',
        support: 'Maintenance'
    },
    {
        version: '1.83.*',
        support: 'Skipped'
    },
    {
        version: '1.82.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.81.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.80.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.79.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.78.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.77.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.76.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.75.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.74.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.73.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.72.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.71.*',
        support: 'Maintenance'
    },
    {
        version: '1.70.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.69.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.68.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.67.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.66.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.65.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.64.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.63.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.62.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.61.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.60.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.58.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.56.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.54.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.52.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.50.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.48.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.46.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.44.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.42.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.40.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.38.*',
        support: 'Maintenance'
    },
    {
        version: '1.36.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.34.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.32.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.30.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.28.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.26.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.24.*',
        support: 'Out of maintenance'
    },
    {
        version: '1.22.*',
        support: 'Out of maintenance'
    },
    {
        version: '*',
        support: 'Out of maintenance'
    }
];

const consoleLogger = {
    warning: (message: string): void => {
        console.warn(message);
    },
    error: (message: string): void => {
        console.error(message);
    }
};
const PASS_THROUGH_STRINGS = new Set(['snapshot', 'snapshot-untested', UI5Info.LatestVersionString]);

// This one holds the actual version, not 'Latest'
let latestUI5Version: string;

export const enum UI5_VERSIONS_TYPE {
    official = 'officialVersions',
    snapshot = 'snapshotsVersions',
    overview = 'overview'
}

export const ui5VersionsCache: {
    [key in UI5_VERSIONS_TYPE.official | UI5_VERSIONS_TYPE.snapshot | UI5_VERSIONS_TYPE.overview]:
        | string[]
        | UI5VersionOverview[];
} = {
    officialVersions: [],
    snapshotsVersions: [],
    overview: []
};

/**
 * Sort function for snapshot versions.
 *
 * @param a - The first element for comparison.
 * @param b - The first element for comparison.
 * @returns 0, 1 or -1
 */
function snapshotSort(a: string, b: string): number {
    a = a.replace('snapshot-', '');
    b = b.replace('snapshot-', '');
    const versions = [UI5Info.DefaultVersion, 'snapshot', 'untested'];
    // Sort 'Latest', 'snapshot' and 'snapshot-untested' in order
    if (versions.indexOf(a) > -1 && versions.indexOf(b) > -1) {
        return a.localeCompare(b);
    }
    // Sort 'Latest', 'snapshot' and 'snapshot-untested' to the top of the UI5 version list
    if (versions.indexOf(a) > -1 || versions.indexOf(b) > -1) {
        return cmp(a, b);
    }
    // Ensure snapshot is sorted to top of patch versions
    return cmp(b + '.999', a + '.999');
}

/**
 * Filters an array of versions and returns versions that are equal or higher minVersion.
 *
 * @param versions - array of versions
 * @param minVersion - minimum version to filter
 * @returns verions that match the minimum version criteria
 */
function filterNewerEqual(versions: string[], minVersion: string): string[] {
    return versions.filter((version) => {
        if (PASS_THROUGH_STRINGS.has(version)) {
            return true;
        } else if (version.startsWith('snapshot-')) {
            version = version.replace('snapshot-', '');
        }
        return cmp(version, minVersion) >= 0;
    });
}

/**
 * Makes a call to UI5 Versions APIs.
 *
 * @param host - if provided, the host name for the ui5 version request
 * @param pathname - if provided, an initial '/' followed by the path of the URL to UI5 version info
 * @returns ui5 versions in json format as defined by the generic type
 */
async function requestUI5Versions<T>(
    host: string = UI5Info.OfficialUrl,
    pathname = `/${UI5Info.VersionsFile}`
): Promise<T> {
    const response = await axios.get(new URL(pathname, host).toString(), { responseType: 'json' });
    return response.data;
}

/**
 * Return the list of UI5 version strings for a given URL.
 *
 * @param url - optional, url from which to request the UI5 versions
 * @returns ui5 version strings
 */
async function parseUI5Versions(url = UI5Info.OfficialUrl.toString()): Promise<string[]> {
    const response = await requestUI5Versions<UI5VersionsResponse>(url);
    let result: string[] = [];
    if (Array.isArray(response.routes)) {
        result = response.routes.map((route: { path: string; target: { version: string } }) => {
            if (route.path === '/') {
                latestUI5Version = route.target.version;
            }
            return route.path === '/' ? UI5Info.DefaultVersion : route.target.version;
        });
    } else {
        latestUI5Version = response['latest'].version;
        Object.values(response).forEach(({ patches = [] }) => result.push(...patches));
    }
    return result;
}

/**
 * Returns metadata information for Major.Minor UI5 versions.
 *
 * @returns ui5 versions
 */
async function parseUI5VersionsOverview(): Promise<UI5VersionOverview[]> {
    let result: UI5VersionOverview[] = [];
    let versions: UI5VersionOverview[] = [];
    try {
        const response = await requestUI5Versions<{ versions: UI5VersionOverview[] }>(
            UI5Info.OfficialUrl,
            `/${UI5Info.VersionsOverview}`
        );
        versions = response.versions;
    } catch (error) {
        console.warn(
            `Request to '${UI5Info.OfficialUrl}' failed. Error was: '${error.message}'. Fallback to default UI5 versions`
        );
        versions = VERSION_OVERVIEW_FALLBACK;
    }
    result = versions.map((ver: any) => {
        const parsedVersion = coerce(ver.version)?.version;
        if (parsedVersion !== undefined) {
            return {
                version: parsedVersion,
                support: ver.support
            };
        }
    }) as UI5VersionOverview[];

    return result;
}

/**
 * Returns ui5 versions from cache object.
 *
 * @param type 'officialVersions' or 'snapshotsVersions
 * @param useCache - will not make a network call but use pre-cached versions
 * @param snapshotUrl - the url from which snapshot UI% versions may be requested
 * @returns Array of UI5 versions
 */
const retrieveUI5VersionsCache = async (
    type: UI5_VERSIONS_TYPE.official | UI5_VERSIONS_TYPE.snapshot | UI5_VERSIONS_TYPE.overview,
    useCache = false,
    snapshotUrl?: string
): Promise<string[] | UI5VersionOverview[]> => {
    if (!useCache) {
        switch (type) {
            case UI5_VERSIONS_TYPE.official:
                return parseUI5Versions(UI5Info.OfficialUrl);
            case UI5_VERSIONS_TYPE.snapshot:
                if (snapshotUrl) {
                    return parseUI5Versions(snapshotUrl);
                }
                break;
            case UI5_VERSIONS_TYPE.overview:
                return parseUI5VersionsOverview();
            default:
        }
    }

    if (ui5VersionsCache[type].length === 0) {
        switch (type) {
            case UI5_VERSIONS_TYPE.official:
                ui5VersionsCache[type] = await parseUI5Versions(UI5Info.OfficialUrl);
                break;
            case UI5_VERSIONS_TYPE.snapshot:
                if (snapshotUrl) {
                    ui5VersionsCache[type] = await parseUI5Versions(snapshotUrl);
                }
                break;
            case UI5_VERSIONS_TYPE.overview:
                ui5VersionsCache[type] = await parseUI5VersionsOverview();
                break;
            default:
        }
    }
    return ui5VersionsCache[type];
};

/**
 * Return a list of UI5 versions.
 *
 * @param filterOptions - filter the UI5 versions returned
 * @param logger - logger
 * @param returnLatestValue - returns the actual value of 'Latest'
 * @returns UI5 version strings
 */
async function retrieveUI5Versions(
    filterOptions?: UI5VersionFilterOptions,
    logger: Logger = consoleLogger,
    returnLatestValue?: boolean
): Promise<string[]> {
    let officialVersions: string[] = [];
    let snapshotVersions: string[] = [];

    try {
        officialVersions = filterOptions?.onlyNpmVersion
            ? await retrieveNpmUI5Versions(
                  filterOptions.fioriElementsVersion || FioriElementsVersion.v2,
                  filterOptions.ui5SelectedVersion
              )
            : ((await retrieveUI5VersionsCache(UI5_VERSIONS_TYPE.official, filterOptions?.useCache)) as string[]);
    } catch (error) {
        logger.warning(
            `Request to '${UI5Info.OfficialUrl}' failed. Error was: '${error.message}'. Fallback to default UI5 versions`
        );
        officialVersions = DEFAULT_UI5_VERSIONS.slice();
    }

    if (filterOptions?.includeSnapshots) {
        try {
            snapshotVersions = (await retrieveUI5VersionsCache(
                UI5_VERSIONS_TYPE.snapshot,
                filterOptions?.useCache
            )) as string[];
        } catch (error) {
            logger.error(`Request to '${filterOptions.includeSnapshots.url}' failed.  Error was: '${error.message}'`);
        }
    }

    let versions = [...officialVersions, ...snapshotVersions].sort(snapshotSort);

    if (filterOptions?.minSupportedUI5Version) {
        versions = filterNewerEqual(versions, filterOptions?.minSupportedUI5Version);
    } else if (filterOptions?.fioriElementsVersion && filterOptions.fioriElementsVersion === FioriElementsVersion.v4) {
        versions = filterNewerEqual(versions, MIN_UI5_VERSION_V4_TEMPLATE);
    } else {
        versions = filterNewerEqual(versions, MIN_UI5_VERSION);
    }

    if (filterOptions?.onlyVersionNumbers) {
        versions = versions.filter((ele) => ele && /^\d+(\.\d+)*$/.test(ele));
    }

    if (returnLatestValue && versions[0].includes(UI5Info.LatestVersionString)) {
        versions[0] = latestUI5Version;
    }

    return filterOptions?.removeDuplicateVersions === true ? [...new Set(versions)] : versions;
}

/**
 * Sorts UI5 versions.
 *
 * @param ui5Versions - versions to be sorted
 * @returns sorted versions
 */
function sortUI5Versions(ui5Versions: string[]): string[] {
    return ui5Versions
        .filter(Boolean)
        .sort((a: string, b: string) => {
            const a1 = a.split('.');
            const b1 = b.split('.');
            const len = Math.max(a1.length, b1.length);

            for (let i = 0; i < len; i++) {
                const _a = +a1[i] || 0;
                const _b = +b1[i] || 0;
                if (_a === _b) {
                    continue;
                } else {
                    return _a > _b ? 1 : -1;
                }
            }
            return 0;
        })
        .reverse(); // Safety check to always ensure the list is sorted
}

/**
 * Retrieve a list of versions based on the odata version i.e. v2 | v4. If a known version is passed in and is a supported version, then only that version is returned.
 *
 * @param {FioriElementsVersion} fioriElementsVersion - OData Service v2 | v4
 * @param {string|undefined} ui5SelectedVersion - selected version i.e. 1.80.0 | latest | ''
 * @returns promise resolved with UI5 versions available from npm
 */
async function retrieveNpmUI5Versions(
    fioriElementsVersion: FioriElementsVersion,
    ui5SelectedVersion: string | undefined = undefined
): Promise<string[]> {
    const defaultMinVersion: string =
        fioriElementsVersion === FioriElementsVersion.v2 ? MIN_UI5_VERSION_V2_TEMPLATE : MIN_UI5_VERSION_V4_TEMPLATE;
    let results: string[] = [];
    try {
        const runner = new CommandRunner();
        const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const npmVersions = await runner.run(npm, ['show', '@sapui5/distribution-metadata', 'versions', '--no-color']);
        results = npmVersions
            .replace(/[\r?\n|\r[\] ']/g, '') // Remove all chars, new lines and empty space
            .trim()
            .split(',');
    } catch (e) {
        results = DEFAULT_UI5_VERSIONS.slice();
    }
    const sortedUI5Versions = sortUI5Versions(results);

    const versions = filterNewerEqual(sortedUI5Versions, defaultMinVersion);
    let latestVersions = versions.length
        ? versions.filter((ele: string) => ele && /^\d+(\.\d+)*$/.test(ele))
        : [defaultMinVersion];

    if (ui5SelectedVersion && ui5SelectedVersion.length) {
        const latestMinIdx = latestVersions.findIndex((v: string) => v === ui5SelectedVersion);

        if (latestMinIdx === -1) {
            if (
                cmp(ui5SelectedVersion, latestVersions.slice(-1)[0]) > 0 ||
                ui5SelectedVersion === UI5Info.LatestVersionString ||
                !valid(ui5SelectedVersion)
            ) {
                // Return latest supported version if selected version is not available yet or is 'Latest' or not valid
                latestVersions = latestVersions.slice(0);
            } else {
                // Return lowest supported version if selected version is lower
                latestVersions = latestVersions.slice(-1);
            }
        } else {
            // Return the selected version as the top item as its supported!
            latestVersions = latestVersions.slice(latestMinIdx);
        }
    }
    return latestVersions;
}

/**
 * Retreive the UI5 Versions.
 *
 * @param filterOptions - filter the UI5 versions returned
 * @returns returns array of UI5 versions.
 */
export async function getUI5Versions(filterOptions?: UI5VersionFilterOptions): Promise<UI5Version[]> {
    let filteredUI5Versions;
    try {
        filteredUI5Versions = await retrieveUI5Versions(filterOptions, undefined, true);
    } catch (error) {
        console.warn(
            `Request to '${UI5Info.OfficialUrl}' failed. Error was: '${error.message}'. Fallback to default UI5 versions`
        );
        filteredUI5Versions = DEFAULT_UI5_VERSIONS.slice();
    }
    const defaultUI5Version = filteredUI5Versions[0];

    let ui5VersionsOverview: UI5VersionOverview[] | undefined;
    if (filterOptions?.groupUI5Versions === true) {
        ui5VersionsOverview = (await retrieveUI5VersionsCache(
            UI5_VERSIONS_TYPE.overview,
            filterOptions?.useCache
        )) as UI5VersionOverview[];
    }

    return filteredUI5Versions.map((ui5: string) => {
        const ui5Version: UI5Version = {
            semantic: ui5,
            default: defaultUI5Version === ui5
        };
        if (filterOptions?.groupUI5Versions === true && ui5VersionsOverview !== undefined) {
            ui5Version.maintained = ui5VersionsOverview.some((v) => {
                if (v !== undefined) {
                    return (
                        `${major(v.version)}.${minor(v.version)}` === `${major(ui5)}.${minor(ui5)}` &&
                        v.support === 'Maintenance'
                    );
                }
            });
        }
        return ui5Version;
    });
}
