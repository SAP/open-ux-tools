import type { UI5Version } from '../types';
import { fetchInternalVersions } from './fetch';
import {
    isFeatureSupportedVersion,
    removeTimestampFromVersion,
    addSnapshot,
    buildSystemVersionLabel,
    removeSnapshotFromVersion
} from './format';
import { CURRENT_SYSTEM_VERSION, LATEST_VERSION, SNAPSHOT_UNTESTED_VERSION, SNAPSHOT_VERSION } from '../base/constants';

export interface VersionLabels {
    formattedVersion: string;
    systemSnapshotLabel: string;
    systemLatestLabel: string;
}

/**
 * Returns the latest version string from the fetched public versions.
 *
 * @param {UI5Version} publicVersions - The public UI5 version data fetched from the CDN.
 * @returns {string} The latest version string.
 */
export function getLatestVersion(publicVersions: UI5Version): string {
    return publicVersions?.latest?.version;
}

/**
 * Retrieves the minimum SAP UI5 version to be specified in the application manifest.
 * If the system version does not contain 'snapshot', the system version itself is used;
 * otherwise, the latest stable version is used as the minimum version.
 *
 * @param {UI5Version} publicVersions - The public UI5 version data.
 * @param {string} [systemVersion] - The version on the system.
 * @returns {string} The SAP UI5 version string to be set in the manifest, which can be either
 *         the current system version or the latest stable version, depending on the presence of 'snapshot'.
 */
export function getMinUI5VersionForManifest(publicVersions: UI5Version, systemVersion?: string): string {
    if (!systemVersion || systemVersion?.includes('snapshot')) {
        return getLatestVersion(publicVersions);
    }
    return systemVersion;
}

/**
 * Determines whether the minimum SAP UI5 version should be set for the application manifest.
 *
 * @param {string} [systemVersion] - The version on the system.
 * @returns {boolean} True if the minimum UI5 version should be set (i.e., the detected version is
 *         available and the minor version is 90 or higher); otherwise, false.
 */
export function shouldSetMinUI5Version(systemVersion?: string): boolean {
    if (!systemVersion) {
        return false;
    }

    const versionParts = systemVersion.split('.');
    const minorVersion = versionParts.length > 1 ? Number.parseInt(versionParts[1], 10) : NaN;
    return !Number.isNaN(minorVersion) && minorVersion >= 90;
}

/**
 * Determines the appropriate UI5 version to use based on the given version string and the customer base flag.
 *
 * @param {string} version - The current version string, which may include qualifiers like 'snapshot'.
 * @param {boolean} isCustomerBase - Indicates whether the current mode is based on a customer base.
 * @param {UI5Version} publicVersions - The public UI5 version data.
 * @returns {string} The version string to be used.
 */
export function getVersionToBeUsed(version: string, isCustomerBase: boolean, publicVersions: UI5Version): string {
    if (!version || (isCustomerBase && version.includes('snapshot'))) {
        return getLatestVersion(publicVersions);
    }
    return version;
}

/**
 * Computes version labels based on the provided version string.
 *
 * @param {string} version - The original version string.
 * @param {UI5Version} publicVersions - The public UI5 version data.
 * @returns {VersionLabels} An object containing:
 *   - formattedVersion: the version with any timestamp removed,
 *   - systemSnapshotLabel: the snapshot label (if applicable),
 *   - systemLatestLabel: a label if the version equals the latest version.
 */
export function getVersionLabels(version: string | undefined, publicVersions: UI5Version): VersionLabels {
    let formattedVersion = '';
    let systemSnapshotLabel = '';
    let systemLatestLabel = '';
    if (version) {
        const latestVersion = getLatestVersion(publicVersions);
        formattedVersion = removeTimestampFromVersion(version);
        systemSnapshotLabel = addSnapshot(version, latestVersion);
        systemLatestLabel = formattedVersion === latestVersion ? LATEST_VERSION : '';
    }
    return { formattedVersion, systemSnapshotLabel, systemLatestLabel };
}

/**
 * Checks whether the provided version string follows the expected format.
 *
 * @param version - The version string to be checked.
 * @returns The version string if it matches the standard format, or undefined otherwise.
 */
export function checkSystemVersionPattern(version: string | undefined): string | undefined {
    const pattern = /^[1-9]\.\d{1,3}\.\d{1,2}\.*/;
    if (!version || !pattern.test(version)) {
        return undefined;
    }

    let normalizedVersion = removeTimestampFromVersion(version);
    normalizedVersion = removeSnapshotFromVersion(normalizedVersion);
    return normalizedVersion;
}

/**
 * Retrieves and filters internal UI5 versions.
 *
 * This function fetches internal versions using the provided latest version
 * and then filters them based on a minimum supported version (in this case '1.71.0').
 *
 * @param {string} latestVersion - The latest public version string.
 * @returns {Promise<string[]>} A promise that resolves to an array of internal version strings.
 */
export async function getInternalVersions(latestVersion: string): Promise<string[]> {
    const releasedVersions = await fetchInternalVersions(latestVersion);
    return releasedVersions.filter((version) => isFeatureSupportedVersion('1.71.0', version));
}

/**
 * Fetches versions that are higher than the specified version.
 *
 * @param {string} version - The baseline version to compare against.
 * @param {UI5Version} publicVersions - The public UI5 version data.
 * @returns {Promise<string[]>} A promise that resolves to an array of versions higher than the specified version.
 */
export async function getHigherVersions(version: string, publicVersions: UI5Version): Promise<string[]> {
    const latestVersion = publicVersions?.latest?.version;
    const radix = 10;
    const [_, baselineMinor, baselineMicro] = version.split('.').map((part) => Number.parseInt(part, radix));

    const higherVersions = Object.keys(publicVersions)
        .filter((key) => key !== 'latest')
        .map((key) => publicVersions[key]['version'])
        .filter((ver: string) => {
            const [, minor, micro] = ver.split('.').map((part) => Number.parseInt(part, radix));
            return minor > baselineMinor || (minor === baselineMinor && micro > baselineMicro);
        });

    const result = higherVersions.map((ver) => (ver === latestVersion ? `${ver} ${LATEST_VERSION}` : ver)).reverse();

    return result;
}

/**
 * Gets relevant UI5 versions based on the system version and customer base flag.
 *
 * For external users (non-customer base), this function fetches internal versions,
 * adjusts them based on snapshot labels, and adds standard snapshot constants.
 * For customer base users, if there’s no snapshot label, it returns only higher versions.
 * Otherwise, it returns the latest public version.
 *
 * @param {string | undefined} systemVersion - The current system version (can be undefined).
 * @param {boolean} isCustomerBase - Indicates if the project is customer based.
 * @param {UI5Version} publicVersions - The public UI5 version data.
 * @returns {Promise<string[]>} A promise that resolves to an array of relevant version strings.
 */
export async function getRelevantVersions(
    systemVersion: string | undefined,
    isCustomerBase: boolean,
    publicVersions: UI5Version
): Promise<string[]> {
    const version = checkSystemVersionPattern(systemVersion);
    const latestPublicVersion = publicVersions?.latest?.version;
    let versions: string[] = [];
    const { formattedVersion, systemSnapshotLabel, systemLatestLabel } = getVersionLabels(version, publicVersions);

    if (!isCustomerBase) {
        versions = await getInternalVersions(latestPublicVersion);
        if (version) {
            const regex = new RegExp(`${formattedVersion} `, 'g');
            versions = versions.map((v) =>
                v.replace(regex, `${formattedVersion}${systemSnapshotLabel} ${CURRENT_SYSTEM_VERSION}`)
            );
            versions.unshift(buildSystemVersionLabel(formattedVersion, systemSnapshotLabel, systemLatestLabel));
        }
        versions.unshift(SNAPSHOT_VERSION, SNAPSHOT_UNTESTED_VERSION);
    } else if (version && systemSnapshotLabel === '') {
        versions = await getHigherVersions(formattedVersion, publicVersions);
        versions.unshift(buildSystemVersionLabel(formattedVersion, systemSnapshotLabel, systemLatestLabel));
    } else {
        versions = [`${latestPublicVersion} ${LATEST_VERSION}`];
    }
    return [...new Set(versions)];
}
