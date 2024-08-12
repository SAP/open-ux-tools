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
 * @param versionInfo to check
 *
 * @returns boolean
 */
export function isLowerThanMinimalUi5Version(versionInfo: Ui5VersionInfo): boolean {
    if (!isNaN(versionInfo.majorUi5Version) && !isNaN(versionInfo.minorUi5Version)) {
        if (versionInfo.majorUi5Version < minVersionInfo.majorUi5Version) {
            return true;
        }
        if (versionInfo.majorUi5Version === minVersionInfo.majorUi5Version && versionInfo.minorUi5Version < minVersionInfo.minorUi5Version) {
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