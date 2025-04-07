import { FlexLayer } from '../types';
import type { UI5Version } from '../types';
import { fetchInternalVersions, fetchPublicVersions } from './fetch';
import { isFeatureSupportedVersion, removeTimestampFromVersion, addSnapshot, buildSystemVersionLabel } from './format';
import { CURRENT_SYSTEM_VERSION, LATEST_VERSION, SNAPSHOT_UNTESTED_VERSION, SNAPSHOT_VERSION } from '../base/constants';

interface VersionLabels {
    formattedVersion: string;
    systemSnapshotLabel: string;
    systemLatestLabel: string;
}

/**
 * Service class for handling SAP UI5 version information.
 * This class provides methods to fetch and validate UI5 versions, retrieve public and internal versions,
 * and format or modify version strings as per specific requirements like snapshots.
 *
 * @class UI5VersionInfo
 */
export class UI5VersionInfo {
    /** Singleton instance */
    private static instance: UI5VersionInfo;

    /** Public UI5 version data fetched from CDN */
    private publicVersions: UI5Version;

    /** All available internal UI5 versions (fetched once and cached) */
    private releasedVersions: string[];

    /** Indicates if a valid UI5 version was detected on the system */
    public isVersionDetected: boolean;

    /** System-detected UI5 version */
    public systemVersion?: string;

    /** Whether the project is CUSTOMER_BASE layer */
    private readonly isCustomerBase: boolean;

    /**
     * Private constructor to enforce singleton pattern.
     *
     * @param {FlexLayer} layer - Flex layer (used once to configure instance).
     */
    private constructor(layer: FlexLayer) {
        this.isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;
    }

    /**
     * Returns the singleton instance of UI5VersionManager.
     *
     * @param {FlexLayer} layer - Used only during first initialization.
     * @returns {UI5VersionManager} Instance.
     */
    public static getInstance(layer: FlexLayer): UI5VersionInfo {
        if (!UI5VersionInfo.instance) {
            UI5VersionInfo.instance = new UI5VersionInfo(layer);
        }
        return UI5VersionInfo.instance;
    }

    /**
     * Retrieves the latest version from the available public versions.
     *
     * @returns The latest available version.
     */
    public getLatestVersion(): string {
        return this.publicVersions?.latest?.version;
    }

    /**
     * Fetches public versions from the UI5 CDN.
     *
     * @returns {Promise<UI5Version>} An object containing version details fetched from the UI5 CDN.
     */
    public async getPublicVersions(): Promise<UI5Version> {
        if (!this.publicVersions) {
            this.publicVersions = await fetchPublicVersions();
        }
        return this.publicVersions;
    }

    /**
     * Retrieves and filters internal UI5 versions.
     *
     * If the versions have not been cached, it calls fetchInternalVersions() to retrieve and cache them.
     * It then filters the versions based on the minimum supported version.
     *
     * @param {string} latestVersion - The latest available version.
     * @returns {Promise<string[]>} A promise that resolves to an array of supported internal UI5 version strings.
     */
    private async getInternalVersions(latestVersion: string): Promise<string[]> {
        if (!this.releasedVersions) {
            this.releasedVersions = await fetchInternalVersions(latestVersion);
        }
        return this.releasedVersions.filter(isFeatureSupportedVersion.bind(this, '1.71.0'));
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
            return this.getLatestVersion();
        }

        return version;
    }

    /**
     * Computes version labels based on the provided version.
     *
     * @param {string} version - The original version string.
     * @returns {VersionLabels} An object with the formatted version, snapshot label, and latest label.
     */
    private getVersionLabels(version?: string): VersionLabels {
        let formattedVersion: string = '';
        let systemSnapshotLabel: string = '';
        let systemLatestLabel: string = '';

        if (version) {
            const latestVersion = this.getLatestVersion();
            formattedVersion = removeTimestampFromVersion(version);
            this.systemVersion = formattedVersion;
            systemSnapshotLabel = addSnapshot(version, latestVersion);
            systemLatestLabel = formattedVersion === latestVersion ? LATEST_VERSION : '';
        }

        return { formattedVersion, systemSnapshotLabel, systemLatestLabel };
    }

    /**
     * Determines if the provided version follows the standard version format.
     *
     * @param {string | undefined} version - The version string to be checked.
     * @returns {string | undefined} A system version or undefined.
     */
    private checkSystemVersionPattern(version: string | undefined): string | undefined {
        const pattern = /^[1-9]\.\d{1,3}\.\d{1,2}\.*/;
        if (version) {
            this.isVersionDetected = pattern.test(version);
        }
        this.systemVersion = this.isVersionDetected ? version : undefined;

        return this.systemVersion;
    }

    /**
     * Gets versions relevant based on the system or user type.
     * For internal users, all available versions are returned.
     * For external users, only versions higher than the current system version are shown.
     *
     * @param {string} [systemVersion] - The current system version.
     * @returns {Promise<string[]>} An array of relevant version strings.
     * If the version is not detected, returns the latest released version.
     */
    public async getRelevantVersions(systemVersion?: string): Promise<string[]> {
        const version = this.checkSystemVersionPattern(systemVersion);
        const publicVersions = await this.getPublicVersions();
        const latestVersion = publicVersions?.latest?.version;

        let versions: string[];

        const { formattedVersion, systemSnapshotLabel, systemLatestLabel } = this.getVersionLabels(version);

        if (!this.isCustomerBase) {
            versions = await this.getInternalVersions(latestVersion);
            if (version) {
                const regex = new RegExp(`${formattedVersion} `, 'g');
                versions = versions.map((v) =>
                    v.replace(regex, `${formattedVersion}${systemSnapshotLabel} ${CURRENT_SYSTEM_VERSION}`)
                );
                versions.unshift(buildSystemVersionLabel(formattedVersion, systemSnapshotLabel, systemLatestLabel));
            }
            versions.unshift(SNAPSHOT_VERSION, SNAPSHOT_UNTESTED_VERSION);
        } else if (version && systemSnapshotLabel === '') {
            versions = await this.getHigherVersions(formattedVersion);
            versions.unshift(buildSystemVersionLabel(formattedVersion, systemSnapshotLabel, systemLatestLabel));
        } else {
            versions = [`${latestVersion} ${LATEST_VERSION}`];
        }
        return [...new Set(versions)];
    }

    /**
     * Fetches versions that are higher than a specified version.
     *
     * @param {string} version - The baseline version to compare against.
     * @returns {Promise<string[]>} An array of versions higher than the specified version.
     */
    private async getHigherVersions(version: string): Promise<string[]> {
        const publicVersions = await this.getPublicVersions();
        const latestVersion = publicVersions?.latest?.version;
        const radix = 10;

        const [_, baselineMinor, baselineMicro] = version.split('.').map((part) => parseInt(part, radix));

        const higherVersions = Object.keys(publicVersions)
            .filter((key) => key !== 'latest') // Exclude 'latest' key from the iteration
            .map((key) => publicVersions[key]['version'])
            .filter((ver: string) => {
                const [, minor, micro] = ver.split('.').map((part) => parseInt(part, radix));
                return minor > baselineMinor || (minor === baselineMinor && micro > baselineMicro);
            });

        const result = higherVersions
            .map((ver) => (ver === latestVersion ? `${ver} ${LATEST_VERSION}` : ver))
            .reverse();

        return result;
    }
}
