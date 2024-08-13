import type { SingleVersionInfo } from '../../types/global';
import VersionInfo from 'sap/ui/VersionInfo';
import Log from 'sap/base/Log';

export type Ui5VersionInfo = {
    majorUi5Version: number;
    minorUi5Version: number;
    version: string;
};

/**
 * Lowest supported UI5 version
 */
const minVersionInfo = {
    majorUi5Version: 1,
    minorUi5Version: 71,
    version: '1.71'
} as Ui5VersionInfo;

/**
 * Retrieve the UI5 version from sap.ui.core library
 *
 * @returns Ui5VersionInfo
 */
export async function getUi5Version() {
    let version = ((await VersionInfo.load({ library: 'sap.ui.core' })) as SingleVersionInfo)?.version;
    if (!version) {
        Log.error('Could not get UI5 version of application. Using 1.121.0 as fallback.');
        version = '1.121.0';
    }
    const versionParts = version.replace(/snapshot-untested|snapshot-|snapshot/, '').split('.');

    return {
        majorUi5Version: Number(versionParts[0]),
        minorUi5Version: Number(versionParts[1]),
        version
    } as Ui5VersionInfo;
}

/**
 * Checks if the given version is lower than the required minimal version.
 * @param ui5VersionInfo to check
 * @param minUi5VersionInfo to check against (default is 1.71)
 *
 * @returns boolean
 */
export function isLowerThanMinimalUi5Version(ui5VersionInfo: Ui5VersionInfo, minUi5VersionInfo = minVersionInfo): boolean {
    if (!isNaN(ui5VersionInfo.majorUi5Version) && !isNaN(ui5VersionInfo.minorUi5Version)) {
        if (ui5VersionInfo.majorUi5Version < minUi5VersionInfo.majorUi5Version) {
            return true;
        }
        if (ui5VersionInfo.majorUi5Version === minUi5VersionInfo.majorUi5Version && ui5VersionInfo.minorUi5Version < minUi5VersionInfo.minorUi5Version) {
            return true;
        }
    }
    return false;
}

/**
 * Get UI5 version validation message.
 * @param ui5Version to be mentioned in the message
 * @returns string with validation message.
 */
export function getUI5VersionValidationMessage(ui5Version: string): string {
    return `The current SAPUI5 version set for this Adaptation project is ${ui5Version}. The minimum version to use for SAPUI5 Adaptation Project and its SAPUI5 Visual Editor is ${minVersionInfo.version}`;
}