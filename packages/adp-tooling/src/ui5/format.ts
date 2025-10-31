import { supportedUi5VersionFallbacks } from '@sap-ux/ui5-info';

import type { UI5Version, VersionDetail } from '../types';
import { CURRENT_SYSTEM_VERSION, SNAPSHOT_CDN_URL, UI5_CDN_URL } from '../base/constants';

/**
 * Type alias for a single version entry from the fallback list.
 */
type SupportedUi5VersionEntry = (typeof supportedUi5VersionFallbacks)[number];

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
 * Constructs a string representing the current system version with appropriate labels.
 *
 * @param {string} formattedVersion - The version string with timestamps removed.
 * @param {string} snapshotLabel - The snapshot label computed for the version.
 * @param {string} latestLabel - The label for the latest version if applicable.
 * @returns {string} The constructed version string.
 */
export function buildSystemVersionLabel(formattedVersion: string, snapshotLabel: string, latestLabel: string): string {
    return `${formattedVersion}${snapshotLabel} ${CURRENT_SYSTEM_VERSION}${latestLabel}`;
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
 * Removes the '-snapshot' suffix from a version string's patch number.
 * Converts version strings like '1.96.0-snapshot' to '1.96.0' by cleaning
 * the patch part of any snapshot designation.
 *
 * @param {string} version - The version string that may include '-snapshot' in the patch number.
 * @returns {string} The version string with the snapshot suffix removed from the patch number.
 * @example
 * ```typescript
 * removeSnapshotFromVersion('1.96.0-snapshot'); // Returns '1.96.0'
 * removeSnapshotFromVersion('1.87.3-SNAPSHOT'); // Returns '1.87.3' (case-insensitive)
 * removeSnapshotFromVersion('1.120.1');         // Returns '1.120.1' (no change)
 * ```
 */
export function removeSnapshotFromVersion(version: string): string {
    const versionParts = version.split('.');
    const patchNumber = versionParts[2].toLowerCase().replace('-snapshot', '');
    return `${versionParts[0]}.${versionParts[1]}.${patchNumber}`;
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
    return versionParts[2] && removeTimestampFromVersion(version) != latestVersion ? '-snapshot' : '';
}

/**
 * Function that parse the UI5 version. Returns NaN for snapshot or snapshot-untested. eturns x.xx for snapshot-x.xx.xx.
 *
 * @param {string} version the UI5 version to parse
 * @returns The major, the minor and the patch version, e.g. 1.86.11
 */
export function parseUI5Version(version: string): { major: number; minor: number; patch: number } {
    const versionParts = version ? version.replace(/snapshot-untested|snapshot-|snapshot/, '').split('.') : [];
    const major = Number.parseInt(versionParts[0], 10);
    const minor = Number.parseInt(versionParts[1], 10);
    const patch = Number.parseInt(versionParts[2], 10);

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

    if (Number.isNaN(major) && Number.isNaN(minor) && Number.isNaN(patch)) {
        return true;
    }

    if (major !== featMajorVersion) {
        return major > featMajorVersion;
    }

    if (minor !== featMinorVersion) {
        return minor > featMinorVersion;
    }

    return patch >= featPatchVersion;
}

/**
 * Convert a supported UI5 version entry to a `VersionDetail`.
 *
 * @param {SupportedUi5VersionEntry} entry - An entry from the supported fallback list.
 * @returns {VersionDetail} A normalized version detail object.
 */
function toVersionDetail(entry: SupportedUi5VersionEntry): VersionDetail {
    return {
        version: entry.version,
        support: entry.support ?? '',
        lts: !!entry.lts
    };
}

/**
 * Build a `UI5Version` from the curated fallback list
 * that ships with **@sap-ux/ui5-info**.
 *
 * @returns {UI5Version} An object whose keys are the version strings (e.g. `"1.135.0"`).
 */
export function buildFallbackMap(): UI5Version {
    const latest = toVersionDetail(supportedUi5VersionFallbacks[0]);
    return supportedUi5VersionFallbacks.reduce<UI5Version>(
        (acc, entry) => {
            acc[entry.version] = toVersionDetail(entry);
            return acc;
        },
        { latest }
    );
}
