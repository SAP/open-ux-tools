import { major, minor, valid, maxSatisfying } from 'semver';
import type { UI5VersionFilterOptions, UI5VersionsResponse, UI5VersionSupport, UI5Version } from './types';
import { executeNpmUI5VersionsCmd } from './commands';
import axios from 'axios';
import type { Logger } from '@sap-ux/logger';
import { ToolsLogger } from '@sap-ux/logger';
import { defaultUi5Versions, supportedUi5VersionFallbacks } from './ui5-version-fallback';
import {
    defaultMinUi5Version,
    defaultVersion,
    latestVersionString,
    ui5VersionRequestInfo,
    ui5VersionsType,
    ui5VersionsCache
} from './constants';

// Semantic version equivalent of 'Latest'
let latestUI5Version: string;
const passThroughStrings = new Set(['snapshot', 'snapshot-untested', latestVersionString]);

const ui5VersionStrCmp = (a: string, b: string) => {
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
};

/**
 * Sorts UI5 version strings.
 *
 * @param ui5Versions - versions to be sorted
 * @returns sorted versions
 */
function sortUI5Versions(ui5Versions: string[]): string[] {
    return ui5Versions.filter(Boolean).sort(ui5VersionStrCmp).reverse(); // Safety check to always ensure the list is sorted
}

/**
 * Sort function for snapshot versions.
 *
 * @param a - The first element for comparison.
 * @param b - The second element for comparison.
 * @returns 0, 1 or -1
 */
function snapshotSort(a: string, b: string): number {
    a = a.replace('snapshot-', '');
    b = b.replace('snapshot-', '');
    const versions = [defaultVersion, 'snapshot', 'untested'];
    // Sort 'Latest', 'snapshot' and 'snapshot-untested' in order
    if (versions.indexOf(a) > -1 && versions.indexOf(b) > -1) {
        return a.localeCompare(b);
    }
    // Sort 'Latest', 'snapshot' and 'snapshot-untested' to the top of the UI5 version list
    if (versions.indexOf(a) > -1 || versions.indexOf(b) > -1) {
        return ui5VersionStrCmp(a, b);
    }
    // Ensure snapshot is sorted to top of patch versions
    return ui5VersionStrCmp(b + '.999', a + '.999');
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
        if (passThroughStrings.has(version)) {
            return true;
        } else if (version.startsWith('snapshot-')) {
            version = version.replace('snapshot-', '');
        }
        return ui5VersionStrCmp(version, minVersion) >= 0;
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
    host: string = ui5VersionRequestInfo.OfficialUrl,
    pathname = `/${
        host === ui5VersionRequestInfo.OfficialUrl
            ? ui5VersionRequestInfo.VersionsFile
            : ui5VersionRequestInfo.NeoAppFile
    }`
): Promise<T> {
    const response = await axios.get(new URL(pathname, host).toString(), { responseType: 'json' });
    return response.data;
}

/**
 * Returns the list of UI5 version strings and metadata information for Major.Minor UI5 versions.
 *
 * @param url optional, url from which to request the UI5 versions
 * @returns ui5 version strings and metadata information
 */
async function parseUI5VersionsAndSupport(
    url = ui5VersionRequestInfo.OfficialUrl.toString()
): Promise<{ versions: string[]; support: UI5VersionSupport[] }> {
    const response = await requestUI5Versions<UI5VersionsResponse>(url);
    let versionStrings: string[] = [];
    const supportInfo: UI5VersionSupport[] = [];

    if (Array.isArray(response.routes)) {
        versionStrings = response.routes.map((route: { path: string; target: { version: string } }) => {
            if (route.path === '/') {
                latestUI5Version = route.target.version;
            }
            return route.path === '/' ? defaultVersion : route.target.version;
        });
    } else {
        latestUI5Version = response['latest'].version;
        Object.values(response).forEach(({ version, support, patches = [] }) => {
            versionStrings.push(...patches);
            supportInfo.push({ version: version, support: support });
        });
    }

    return { versions: versionStrings, support: supportInfo };
}

/**
 * Returns ui5 versions from cache object.
 *
 * @param type 'officialVersions', 'snapshotsVersions or 'support'
 * @param useCache - will not make a network call but use pre-cached versions
 * @param snapshotUrl - the url from which snapshot UI5 versions may be requested
 * @returns Array of UI5 versions or UI5VersionSupport objects
 */
const retrieveUI5VersionsCache = async (
    type: ui5VersionsType.official | ui5VersionsType.snapshot | ui5VersionsType.support,
    useCache = false,
    snapshotUrl?: string
): Promise<string[] | UI5VersionSupport[]> => {
    let versions: string[] = [];
    let support: UI5VersionSupport[] = [];

    if (!useCache) {
        switch (type) {
            case ui5VersionsType.official:
            case ui5VersionsType.support:
                ({ versions, support } = await parseUI5VersionsAndSupport());
                return type === ui5VersionsType.official ? versions : support;
            case ui5VersionsType.snapshot:
                if (snapshotUrl) {
                    ({ versions } = await parseUI5VersionsAndSupport(snapshotUrl));
                    return versions;
                }
                break;
            default:
        }
    }

    if (ui5VersionsCache[type].length === 0) {
        switch (type) {
            case ui5VersionsType.official:
            case ui5VersionsType.support:
                ({ versions, support } = await parseUI5VersionsAndSupport());
                ui5VersionsCache.officialVersions = versions;
                ui5VersionsCache.support = support;
                break;
            case ui5VersionsType.snapshot:
                if (snapshotUrl) {
                    ({ versions } = await parseUI5VersionsAndSupport(snapshotUrl));
                    ui5VersionsCache.snapshotsVersions = versions;
                }
                break;
            default:
        }
    }
    return ui5VersionsCache[type];
};

/**
 * Return a list of UI5 versions.
 *
 * @param filterOptions - see {@link UI5VersionFilterOptions}  def for filter options explantion
 * @param logger - logger
 * @returns UI5 version strings
 */
async function retrieveUI5Versions(
    filterOptions?: UI5VersionFilterOptions,
    logger: Logger = new ToolsLogger()
): Promise<string[]> {
    let officialVersions: string[] = [];
    let snapshotVersions: string[] = [];

    try {
        const minUI5Version = filterOptions?.minSupportedUI5Version ?? defaultMinUi5Version;
        officialVersions = filterOptions?.onlyNpmVersion
            ? await retrieveNpmUI5Versions(filterOptions.ui5SelectedVersion, minUI5Version)
            : ((await retrieveUI5VersionsCache(ui5VersionsType.official, filterOptions?.useCache)) as string[]);
    } catch (error) {
        logger.warn(
            `Request to '${ui5VersionRequestInfo.OfficialUrl}' failed. Error was: '${error.message}'. Fallback to default UI5 versions`
        );
        officialVersions = defaultUi5Versions.slice();
    }

    if (filterOptions?.snapshotVersionsHost) {
        try {
            snapshotVersions = (await retrieveUI5VersionsCache(
                ui5VersionsType.snapshot,
                filterOptions?.useCache,
                filterOptions?.snapshotVersionsHost
            )) as string[];
        } catch (error) {
            logger.error(`Request to '${filterOptions.snapshotVersionsHost}' failed.  Error was: '${error.message}'`);
        }
    }

    let versions = [...officialVersions, ...snapshotVersions].sort(snapshotSort);

    // Dont return versions older than the default min version
    versions = filterNewerEqual(versions, filterOptions?.minSupportedUI5Version ?? defaultMinUi5Version);

    if (filterOptions?.onlyVersionNumbers) {
        if (versions[0].toLocaleLowerCase().includes(latestVersionString.toLocaleLowerCase())) {
            versions[0] = latestUI5Version;
        }
        versions = versions.filter((ele) => ele && /^\d+(\.\d+)*$/.test(ele));
    }

    if (filterOptions?.onlyLatestPatchVersion) {
        versions = retrieveLatestPatchVersions(versions);
    }

    // Remove duplicates, as they may be returned from some UI5 version APIs
    return [...new Set(versions)];
}

/**
 * Retrieve a list of versions filtered by latest patch version.
 *
 * @param versions - list of all versions
 * @returns list of latest patch versions
 */
function retrieveLatestPatchVersions(versions: string[]): string[] {
    const latestPatchVersions: string[] = [];
    versions.forEach((version) => {
        const minorKey: any = `${major(version)}.${minor(version)}`;
        const latestPatchVersion = maxSatisfying(versions, minorKey);
        if (latestPatchVersion && !latestPatchVersions.includes(latestPatchVersion)) {
            latestPatchVersions.push(latestPatchVersion);
        }
    });
    return latestPatchVersions;
}

/**
 * Retrieve a list of versions based on the odata version i.e. v2 | v4. If a known version is passed in and is a supported version, then only that version is returned.
 *
 * @param ui5SelectedVersion - selected version i.e. 1.80.0 | latest | ''
 * @param minUI5Version - the minimum ui5 version to return
 * @returns promise resolved with UI5 versions available from npm
 */
async function retrieveNpmUI5Versions(
    ui5SelectedVersion: string | undefined = undefined,
    minUI5Version?: string
): Promise<string[]> {
    const defaultMinVersion: string = minUI5Version ?? defaultMinUi5Version;
    let results: string[] = [];
    try {
        results = await executeNpmUI5VersionsCmd();
    } catch (e) {
        results = defaultUi5Versions.slice();
    }
    const sortedUI5Versions = sortUI5Versions(results);

    const versions = filterNewerEqual(sortedUI5Versions, defaultMinVersion);
    let latestVersions = versions.length
        ? versions.filter((ele: string) => ele && /^\d+(\.\d+)*$/.test(ele))
        : [defaultMinVersion];

    if (ui5SelectedVersion?.length) {
        const latestMinIdx = latestVersions.findIndex((v: string) => v === ui5SelectedVersion);

        if (latestMinIdx === -1) {
            if (
                ui5VersionStrCmp(ui5SelectedVersion, latestVersions.slice(-1)[0]) > 0 ||
                ui5SelectedVersion === latestVersionString ||
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
 * Get the UI5 versions filtered by the specified options.
 *
 * @param filterOptions - filter the UI5 versions returned. See {@link UI5VersionFilterOptions} for more information.
 * @returns array of UI5 versions of type {@link UI5Version}.
 */
export async function getUI5Versions(filterOptions?: UI5VersionFilterOptions): Promise<UI5Version[]> {
    let filteredUI5Versions;
    try {
        filteredUI5Versions = await retrieveUI5Versions(filterOptions);
    } catch (error) {
        new ToolsLogger().warn(
            `Request to '${ui5VersionRequestInfo.OfficialUrl}' failed. Error was: '${error.message}'. Fallback to default UI5 versions`
        );
        filteredUI5Versions = defaultUi5Versions.slice();
    }

    const defaultUI5Version = filteredUI5Versions[0];
    let ui5VersionsOverview: UI5VersionSupport[];
    let finalDefaultUI5Version = defaultUI5Version;

    // Retrieve UI5 versions overview if maintained versions are to be included, note: overview and official versions are not the same
    if (filterOptions?.includeMaintained) {
        try {
            ui5VersionsOverview = (await retrieveUI5VersionsCache(
                ui5VersionsType.support,
                filterOptions.useCache
            )) as UI5Version[];
        } catch (error) {
            new ToolsLogger().warn(
                `Request to '${ui5VersionRequestInfo.OfficialUrl}' for supported info on UI5 versions failed. Error was: '${error.message}'. Fallback to default supported UI5 versions`
            );
            ui5VersionsOverview = supportedUi5VersionFallbacks;
        }
    }

    // Semantically filter the UI5 version, based on the support (maintained or not) and default version
    const isMaintained = (ui5: string) =>
        ui5VersionsOverview?.some(
            (v) =>
                v &&
                `${major(v.version)}.${minor(v.version)}` === `${major(ui5)}.${minor(ui5)}` &&
                v.support === 'Maintenance'
        ) ?? false;

    // If the default version is not maintained, then fallback to the semantically latest maintained version
    if (filterOptions?.includeDefault && filterOptions.includeMaintained && !isMaintained(defaultUI5Version)) {
        const maintainedVersion = filteredUI5Versions.find(isMaintained);
        finalDefaultUI5Version = maintainedVersion ?? defaultUI5Version;
    }
    // Map the UI5 versions to the UI5Version type, respecting the filter options
    return filteredUI5Versions.map((ui5): UI5Version => {
        const ui5Version: UI5Version = {
            version: ui5
        };
        if (filterOptions?.includeDefault) {
            ui5Version.default = ui5 === finalDefaultUI5Version;
        }
        if (filterOptions?.includeMaintained) {
            ui5Version.maintained = isMaintained(ui5);
        }
        return ui5Version;
    });
}

/**
 * Method retrieves latest SAPUI5 version by sending HTTP GET request to "https://ui5.sap.com/version.json'".
 *
 * @returns Latest version of SAPUI5.
 */
export async function getLatestUI5Version(): Promise<string | undefined> {
    let version: string | undefined;
    try {
        const ui5Versions = await requestUI5Versions<UI5VersionsResponse>();
        version = ui5Versions?.latest?.version;
    } catch {
        // HTTP request most likely failed
        version = undefined;
    }

    return version;
}
