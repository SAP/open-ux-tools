import {
    CURRENT_SYSTEM_VERSION,
    LATEST_VERSION,
    SNAPSHOT_UNTESTED_VERSION,
    SNAPSHOT_VERSION,
    UI5_VERSIONS_CDN_URL,
    UI5_VERSIONS_NEO_CDN_URL
} from '../base/constants';
import { t } from '../i18n';
import {
    isFeatureSupportedVersion,
    removeTimestampFromVersion,
    addSnapshot,
    getOfficialBaseUI5VersionUrl,
    getFormattedVersion
} from './utils';
import type { UI5Version } from '../types';
import { FlexLayer } from '../types';

/**
 * Service class for handling SAP UI5 version information.
 * This class provides methods to fetch and validate UI5 versions, retrieve public and internal versions,
 * and format or modify version strings as per specific requirements like snapshots.
 *
 * @class UI5VersionManager
 */
export class UI5VersionManager {
    /** Latest public UI5 version */
    public latestVersion: string;

    /** Public UI5 version data fetched from CDN */
    public publicVersions: UI5Version;

    /** All available internal UI5 versions (fetched once and cached) */
    public releasedVersions: string[];

    /** Indicates if a valid UI5 version was detected on the system */
    public isVersionDetected: boolean;

    /** System-detected UI5 version */
    public systemVersion?: string;

    /** Whether the project is CUSTOMER_BASE layer */
    private isCustomerBase: boolean;

    /**
     * Initializes a new instance of the UI5VersionManager class.
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
            this.isVersionDetected = pattern.test(version);
        }

        this.systemVersion = this.isVersionDetected ? version : undefined;

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
        if (!this.isVersionDetected) {
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
