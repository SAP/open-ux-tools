import VersionInfo from 'sap/ui/VersionInfo';
import Log from 'sap/base/Log';

type SingleVersionInfo =
    | {
          name: string;
          version: string;
      }
    | undefined;

export type Ui5VersionInfo = {
    major: number;
    minor: number;
};

/**
 * Default minimal supported UI5 version
 */
const minVersionInfo = {
    major: 1,
    minor: 71
} as Readonly<Ui5VersionInfo>;

/**
 * Retrieve the UI5 version from sap.ui.core library
 *
 * @returns Ui5VersionInfo
 */
export async function getUi5Version(): Promise<Ui5VersionInfo> {
    let version = ((await VersionInfo.load({ library: 'sap.ui.core' })) as SingleVersionInfo)?.version;
    if (!version) {
        Log.error('Could not get UI5 version of application. Using 1.121.0 as fallback.');
        version = '1.121.0';
    }
    const [major, minor] = version.split('.').map(versionPart => parseInt(versionPart, 10));

    return {
        major: major,
        minor: minor
    } satisfies Ui5VersionInfo;
}

/**
 * Checks if the given version is lower than the required minimal version.
 * @param ui5VersionInfo to check
 * @param minUi5VersionInfo to check against (default is 1.71)
 *
 * @returns boolean
 */
export function isLowerThanMinimalUi5Version(
    ui5VersionInfo: Ui5VersionInfo,
    minUi5VersionInfo: Ui5VersionInfo = minVersionInfo
): boolean {
    if (!isNaN(ui5VersionInfo.major) && !isNaN(ui5VersionInfo.minor)) {
        if (ui5VersionInfo.major < minUi5VersionInfo.major) {
            return true;
        }
        if (
            ui5VersionInfo.major === minUi5VersionInfo.major &&
            ui5VersionInfo.minor < minUi5VersionInfo.minor
        ) {
            return true;
        }
    }
    return false;
}

/**
 * Get UI5 version validation message.
 * @param ui5VersionInfo to be mentioned in the message
 * @returns string with validation message.
 */
export function getUI5VersionValidationMessage(ui5VersionInfo: Ui5VersionInfo): string {
    return `The current SAPUI5 version set for this Adaptation project is ${ui5VersionInfo.major}.${ui5VersionInfo.minor}. The minimum version to use for SAPUI5 Adaptation Project and its SAPUI5 Visual Editor is ${minVersionInfo.major}.${minVersionInfo.minor}`;
}
