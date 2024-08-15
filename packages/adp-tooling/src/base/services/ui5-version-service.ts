import {
    SNAPSHOT_CDN_URL,
    UI5_CDN_URL,
    UI5_VERSIONS_CDN_URL,
    UI5_VERSIONS_NEO_CDN_URL,
    LATEST_VERSION,
    CURRENT_SYSTEM_VERSION,
    SNAPSHOT_VERSION,
    SNAPSHOT_UNTESTED_VERSION
} from '../constants';
import { t } from '../../i18n';
import type { UI5Version } from '../../types';
import { FlexLayer } from '../../types';

/**
 * Gets the official base URL for SAP UI5 resources based on the version information.
 * If the version includes 'snapshot', it returns a preview URL; otherwise, it returns the main SAP UI5 CDN URL.
 *
 * @param {string} version - The UI5 version string, which may include qualifiers like 'snapshot'.
 * @returns {string} The base URL for UI5 resources appropriate to the specified version.
 */
export function getOfficialBaseUI5VersionUrl(version: string): string {
    if (version.toLowerCase().includes('snapshot')) {
        return SNAPSHOT_CDN_URL;
    }
    return UI5_CDN_URL;
}

/**
 * Formats a UI5 version string by removing extraneous information and adjusting the format of snapshot versions.
 * Snapshot versions are reformatted from '1.96.0-snapshot' to 'snapshot-1.96'.
 *
 * @param {string} version - The original version string which may include additional descriptors like 'snapshot'.
 * @returns {string} A cleaned-up and, if applicable, restructured version string.
 */
export function getFormattedVersion(version: string): string {
    version = removeBracketsFromVersion(version);
    return version.toLowerCase().includes('-snapshot') ? `snapshot-${removeMicroPart(version)}` : version;
}

/**
 * Removes parenthetical information from a version string, typically used to clean up annotations such as "(latest)".
 *
 * @param {string} version - The version string which may include parenthetical information.
 * @returns {string} The version string without the parenthetical content.
 */
export function removeBracketsFromVersion(version: string): string {
    if (version.indexOf('(') !== -1) {
        const versionParts = version.split('(');
        return versionParts[0].trim();
    }
    return version;
}

/**
 * Removes the micro part of a version string, simplifying it to include only the major and minor version numbers.
 * For example, it transforms a version string from '1.87.3' to '1.87'.
 *
 * @param {string} version - The full version string that may include major, minor, and micro version numbers.
 * @returns {string} The version string consisting of only the major and minor version numbers.
 */
export function removeMicroPart(version: string): string {
    const versionParts = version.split('.');
    return `${versionParts[0]}.${versionParts[1]}`;
}

/**
 * Removes the timestamp part from a version string, typically used to clean up snapshot versions that include a timestamp.
 * Converts a version string like '1.95.0.34566363464' to '1.95.0'.
 *
 * @param {string} version - The version string that may include a timestamp as part of a snapshot version.
 * @returns {string} The version string without the timestamp, including only the major, minor, and micro version numbers.
 */
export function removeTimestampFromVersion(version: string): string {
    const versionParts = version.split('.');
    return `${versionParts[0]}.${versionParts[1]}.${versionParts[2]}`;
}

/**
 * Conditionally appends a '-snapshot' suffix to a version string if certain criteria are met.
 * The suffix is added only if the version string includes an unreleased snapshot version.
 * For example, it adds '-snapshot' if the version from the system includes a timestamp and differs from the latest released version.
 *
 * @param {string} version - The original version string that may include a timestamp.
 * @param {string} latestVersion - The most recently released version string, used for comparison.
 * @returns {string} The '-snapshot' suffix if applicable; otherwise, an empty string.
 */
export function addSnapshot(version: string, latestVersion: string): string {
    const versionParts = version.split('.');
    return versionParts[3] && removeTimestampFromVersion(version) != latestVersion ? '-snapshot' : '';
}

/**
 * Extracts a specific version pattern (major.minor.patch) from a given string.
 * This function is useful for normalizing version strings that may include additional text such as labels or descriptions.
 *
 * @param {string} version - The version string that potentially contains additional text alongside the version number.
 * @returns {string} A trimmed version string containing only the first matched major.minor.patch pattern if present;
 *                   otherwise, returns the original version string.
 * @example
 * // returns '1.84.6'
 * getTrimmedUI5Version('UI5 version 1.84.6 (system version)');
 * @example
 * // returns '1.99.2'
 * getTrimmedUI5Version('latest 1.99.2');
 * @example
 * // returns '2.10.3'
 * getTrimmedUI5Version('2.10.3');
 */
export function getTrimmedUI5Version(version: string): string {
    const regex = /\b\d+\.\d+\.\d+\b/g;
    const includesText = version.includes('(system version)') || version.includes('latest');

    let trimmedVersion: string | undefined = undefined;
    try {
        if (includesText) {
            trimmedVersion = version.match(regex)?.[0];
        }
    } catch (e) {
        return version;
    }

    return trimmedVersion ?? version;
}

/**
 * Function that parse the UI5 version. Returns NaN for snapshot or snapshot-untested. eturns x.xx for snapshot-x.xx.xx.
 *
 * @param version the UI5 version to parse
 * @returns The major, the minor and the patch version, e.g. 1.86.11
 */
export function parseUI5Version(version: string): { major: number; minor: number; patch: number } {
    const versionParts = version ? version.replace(/snapshot-untested|snapshot-|snapshot/, '').split('.') : [];
    const major = parseInt(versionParts[0], 10);
    const minor = parseInt(versionParts[1], 10);
    const patch = parseInt(versionParts[2], 10);

    return { major, minor, patch };
}

/**
 * Determines if a specific feature, introduced in a given version, is supported in the current or specified version.
 * This function checks if the provided version is greater than or equal to the feature introduction version.
 * It also handles edge cases where versions might include 'snapshot' or 'snapshot-untested' strings.
 *
 * @param {string} featureVersion - The version string from which the feature is available (e.g., "1.125.3").
 * @param {string} [version] - The current version string of the application; if not provided, the feature is assumed unsupported.
 * @returns {boolean} - Returns true if the current version supports the feature, false otherwise.
 */
export function isFeatureSupportedVersion(featureVersion: string, version?: string): boolean {
    if (!version || !featureVersion) {
        return false;
    }

    const {
        major: featMajorVersion,
        minor: featMinorVersion,
        patch: featPatchVersion
    } = parseUI5Version(featureVersion);
    const { major, minor, patch } = parseUI5Version(version);

    if (isNaN(major) && isNaN(minor) && isNaN(patch)) {
        return true;
    }

    if (major > featMajorVersion) {
        return true;
    } else if (minor < featMinorVersion) {
        return false;
    }

    return patch >= featPatchVersion;
}

/**
 * Service class for handling SAP UI5 version information.
 * This class provides methods to fetch and validate UI5 versions, retrieve public and internal versions,
 * and format or modify version strings as per specific requirements like snapshots.
 *
 * @class UI5VersionService
 */
export class UI5VersionService {
    public latestVersion: string;
    public publicVersions: UI5Version;
    public releasedVersions: string[];
    public detectedVersion: boolean;
    public systemVersion?: string;
    private isCustomerBase: boolean;

    /**
     * Initializes a new instance of the UI5VersionService class.
     *
     * @param {FlexLayer} layer UI5 Flex layer.
     */
    constructor(layer: FlexLayer) {
        this.isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;
    }

    /**
     * Retrieves the system relevant versions based on the provided version, if available.
     * Determines if the provided version follows the standard version format.
     *
     * @param {string | undefined} version - The version string to be checked.
     * @returns {Promise<string[]>} An array of relevant version strings.
     */
    public async getSystemRelevantVersions(version: string | undefined): Promise<string[]> {
        const pattern = /^[1-9]\.\d{1,3}\.\d{1,2}\.*/;

        if (version) {
            this.detectedVersion = pattern.test(version);
        }

        this.systemVersion = this.detectedVersion ? version : undefined;

        return this.getRelevantVersions(this.systemVersion);
    }

    /**
     * Determines the appropriate UI5 version to use based on the provided version string and customer base status.
     * This function handles scenarios where a 'snapshot' version might be in use while in external mode,
     * or when the environment specifically requires using the latest public version, such as for S4HANA Cloud.
     *
     * @param {string} version - The current version string, which may include qualifiers like 'snapshot'.
     * @param {boolean} isCustomerBase - Flag indicating whether the current mode is based on a customer base.
     * @returns {string} The version string to be used.
     * @example
     * // returns '1.80.2'
     * getVersionToBeUsed('1.80.2', false);
     * @example
     * // returns 'latestVersion' property value from class if 'version' contains 'snapshot'
     * getVersionToBeUsed('1.84.6 snapshot', true);
     */
    public getVersionToBeUsed(version: string, isCustomerBase: boolean): string {
        if (!version || (isCustomerBase && version.includes('snapshot'))) {
            return this.latestVersion;
        }

        return version;
    }

    /**
     * Fetches public versions from the UI5 CDN.
     *
     * @returns {Promise<UI5Version>} An object containing version details fetched from the UI5 CDN.
     */
    public async getPublicVersions(): Promise<UI5Version> {
        if (this.publicVersions) {
            return this.publicVersions;
        }

        const response = await fetch(UI5_VERSIONS_CDN_URL);
        const data = await response.json();

        this.publicVersions = data;
        this.latestVersion = data['latest']['version'];

        return this.publicVersions;
    }

    /**
     * Determines whether the minimum SAP UI5 version should be set for the application manifest.
     *
     * @returns {boolean} True if the minimum UI5 version should be set (i.e., the detected version is
     *         available and the minor version is 90 or higher); otherwise, false.
     */
    public shouldSetMinUI5Version(): boolean {
        if (!this.detectedVersion) {
            return false;
        }

        const versionParts = this.systemVersion?.split('.') ?? [];
        return parseInt(versionParts[1], 10) >= 90;
    }

    /**
     * Retrieves the minimum SAP UI5 version to be specified in the application manifest.
     * If the system version does not contain 'snapshot', the system version itself is used;
     * otherwise, the latest stable version is used as the minimum version.
     *
     * @returns {string} The SAP UI5 version string to be set in the manifest, which can be either
     *         the current system version or the latest stable version, depending on the presence of 'snapshot'.
     */
    public getMinUI5VersionForManifest(): string {
        return this.systemVersion?.indexOf('snapshot') === -1 ? this.systemVersion : this.latestVersion;
    }

    /**
     * Retrieves versions available to internal users, filtered by certain criteria.
     *
     * @returns {Promise<string[]>} An array of version strings available to internal users.
     */
    private async getInternalVersions(): Promise<string[]> {
        if (!this.releasedVersions) {
            const response = await fetch(UI5_VERSIONS_NEO_CDN_URL);
            const data = await response.json();

            this.releasedVersions = data.routes.map((route: { target: { version: string } }) => {
                const version =
                    route.target.version === this.latestVersion
                        ? `${route.target.version} ${LATEST_VERSION}`
                        : route.target.version;
                return version;
            });
        }
        return this.releasedVersions.filter(isFeatureSupportedVersion.bind(this, '1.71.0'));
    }

    /**
     * Gets versions relevant based on the system or user type.
     * For internal users, all available versions are returned.
     * For external users, only versions higher than the current system version are shown.
     *
     * @param {string} [version] - The current system version.
     * @returns {Promise<string[]>} An array of relevant version strings.
     * If the version is not detected, returns the latest released version.
     */
    public async getRelevantVersions(version?: string): Promise<string[]> {
        const allPublicVersions = await this.getPublicVersions();

        let relevantVersions: string[];
        let formattedVersion: string = '';
        let systemSnapshotVersion: string = '';
        let systemLatestVersion: string = '';

        if (version) {
            formattedVersion = removeTimestampFromVersion(version);
            this.systemVersion = formattedVersion;
            systemSnapshotVersion = addSnapshot(version, this.latestVersion);
            systemLatestVersion = formattedVersion === allPublicVersions['latest']['version'] ? LATEST_VERSION : '';
        }

        if (!this.isCustomerBase) {
            relevantVersions = await this.getInternalVersions();
            if (version) {
                let relevantVersionsAsString = relevantVersions.join();
                const formattedVersionRegex = new RegExp(formattedVersion + ' ', 'g');
                relevantVersionsAsString = relevantVersionsAsString.replace(
                    formattedVersionRegex,
                    `${formattedVersion}${systemSnapshotVersion} ${CURRENT_SYSTEM_VERSION}`
                );
                relevantVersions = relevantVersionsAsString.split(',');
                relevantVersions.unshift(
                    `${formattedVersion}${systemSnapshotVersion} ${CURRENT_SYSTEM_VERSION + systemLatestVersion}`
                );
            }
            relevantVersions.unshift(SNAPSHOT_VERSION);
            relevantVersions.unshift(SNAPSHOT_UNTESTED_VERSION);
        } else if (version && systemSnapshotVersion === '') {
            relevantVersions = await this.getHigherVersions(formattedVersion);
            relevantVersions.unshift(
                `${formattedVersion}${systemSnapshotVersion} ${CURRENT_SYSTEM_VERSION + systemLatestVersion}`
            );
        } else {
            relevantVersions = [`${allPublicVersions['latest']['version']} ${LATEST_VERSION}`];
        }
        return [...new Set(relevantVersions)];
    }

    /**
     * Fetches versions that are higher than a specified version.
     *
     * @param {string} version - The baseline version to compare against.
     * @returns {Promise<string[]>} An array of versions higher than the specified version.
     */
    private async getHigherVersions(version: string): Promise<string[]> {
        const allPublicVersions = await this.getPublicVersions();
        const radix = 10;

        const versionParts = version.split('.');
        const minorVersion = parseInt(versionParts[1], radix);
        const microVersion = parseInt(versionParts[2], radix);

        let versions = '';

        Object.keys(allPublicVersions).forEach((publicVersionKey) => {
            const versionArr = allPublicVersions[publicVersionKey]['version'].split('.');
            if (
                parseInt(versionArr[1], radix) > minorVersion ||
                (parseInt(versionArr[1], radix) == minorVersion && parseInt(versionArr[2], radix) > microVersion)
            ) {
                versions += allPublicVersions[publicVersionKey]['version'] + ',';
            }
        });

        const latestVersionRegex = new RegExp(allPublicVersions['latest']['version'], 'g');
        const versionsLatest = versions.replace(
            latestVersionRegex,
            `${allPublicVersions['latest']['version']} ${LATEST_VERSION}`
        );
        const result = versionsLatest.split(',');
        result.pop();

        return result.reverse();
    }

    /**
     * Validates a specified UI5 version by checking its availability on the SAP CDN.
     *
     * @param {string} [version] - The version to validate.
     * @returns {Promise<string | boolean>} True if the version is valid, a string message if not, or if an error occurs.
     */
    public async validateUI5Version(version?: string): Promise<string | boolean> {
        if (version) {
            const selectedVersionURL = getOfficialBaseUI5VersionUrl(version);
            const resource = version.includes('snapshot') ? 'neo-app.json' : getFormattedVersion(version);

            try {
                await fetch(`${selectedVersionURL}/${resource}`);
                return true;
            } catch (e) {
                if (version.includes('snapshot')) {
                    const message = t('validators.ui5VersionNotReachableError');
                    return `${message.replace('<URL>', selectedVersionURL)}`;
                }
                if (e.response.status === 400 || e.response.status === 404) {
                    return t('validators.ui5VersionOutdatedError');
                }
                return `Error on validating UI5 Version: ${e.message}`;
            }
        }
        return t('validators.ui5VersionCannotBeEmpty');
    }
}
