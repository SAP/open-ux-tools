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
    patch?: number;
    label?: string;
};

/**
 * Default minimal supported UI5 version
 */
const minVersionInfo = {
    major: 1,
    minor: 71
} as Readonly<Ui5VersionInfo>;

/**
 * Check if the given version info is valid.
 * @param versionInfo to check
 * @throws Error if the version info is invalid
 */
function checkVersionInfo(versionInfo: Ui5VersionInfo): void {
    if(isNaN(versionInfo.major) ||
       isNaN(versionInfo.minor) ||
       isNaN(versionInfo.patch ?? 0)) {
        throw new Error('Invalid version info');
    }
}

/**
 * Retrieve the UI5 version.
 * If no library is given, the version from 'sap.ui.core' will be retrieved.
 * Note that the patch version of actual SAPUI5 version might differ from the lib that has been used for the version request (e.g. SAPUI5 1.96.38 contains sap.ui.core 1.96.36).
 * For details see the patch info of the respective SAPUI5 version (e.g. https://ui5.sap.com/1.96.38/patchinfo.html).
 *
 * @param library - (optional) specific library name to get the version from, e.g. 'sap.m'
 * @returns Ui5VersionInfo
 */
export async function getUi5Version(library: string = 'sap.ui.core'): Promise<Ui5VersionInfo> {
    let version = ((await VersionInfo.load({ library })) as SingleVersionInfo)?.version;
    if (!version) {
        Log.error('Could not get UI5 version of application. Using 1.121.0 as fallback.');
        version = '1.121.0';
    }
    const [major, minor, patch] = version.split('.').map((versionPart) => parseInt(versionPart, 10));
    const label = version.split(/-(.*)/s)?.[1];

    return {
        major,
        minor,
        patch,
        label
    } satisfies Ui5VersionInfo;
}

/**
 * Checks if the given version is lower than the required minimal version.
 * Note that the patch version of actual SAPUI5 version might differ from the lib that has been used for the version request (e.g. SAPUI5 1.96.38 contains sap.ui.core 1.96.36).
 * For details see the patch info of the respective SAPUI5 version (e.g. https://ui5.sap.com/1.96.38/patchinfo.html).
 *
 * @param ui5VersionInfo to check
 * @param minUi5VersionInfo to check against (default is 1.71)
 * @throws Error if the version info is invalid
 *
 * @returns boolean
 */
export function isLowerThanMinimalUi5Version(
    ui5VersionInfo: Ui5VersionInfo,
    minUi5VersionInfo: Ui5VersionInfo = minVersionInfo
): boolean {
    checkVersionInfo(ui5VersionInfo);
    checkVersionInfo(minUi5VersionInfo);
    return (
        ui5VersionInfo.major < minUi5VersionInfo.major ||
        (ui5VersionInfo.major === minUi5VersionInfo.major && ui5VersionInfo.minor < minUi5VersionInfo.minor) ||
        (ui5VersionInfo.major === minUi5VersionInfo.major &&
        ui5VersionInfo.minor === minUi5VersionInfo.minor &&
        (ui5VersionInfo?.patch ?? 0) < (minUi5VersionInfo?.patch ?? 0))
    );
}

/**
 * Checks if the given version is equal to the specified version.
 * Note that the patch version of actual SAPUI5 version might differ from the lib that has been used for the version request (e.g. SAPUI5 1.96.38 contains sap.ui.core 1.96.36).
 * For details see the patch info of the respective SAPUI5 version (e.g. https://ui5.sap.com/1.96.38/patchinfo.html).
 *
 * @param ui5VersionInfo to check
 * @param targetUi5VersionInfo to check against (default is 1.71)
 * @throws Error if the version info is invalid
 *
 * @returns boolean
 */
export function isVersionEqualOrHasNewerPatch(
    ui5VersionInfo: Ui5VersionInfo,
    targetUi5VersionInfo: Ui5VersionInfo = minVersionInfo
): boolean {
    checkVersionInfo(ui5VersionInfo);
    checkVersionInfo(targetUi5VersionInfo);
    return (
        ui5VersionInfo.major === targetUi5VersionInfo.major &&
        ui5VersionInfo.minor === targetUi5VersionInfo.minor &&
        (ui5VersionInfo?.patch ?? 0) >= (targetUi5VersionInfo?.patch ?? 0)
    );
}

/**
 * Get UI5 version validation message.
 * @param ui5VersionInfo to be mentioned in the message
 * @returns string with validation message.
 */
export function getUI5VersionValidationMessage(ui5VersionInfo: Ui5VersionInfo): string {
    return `The current SAPUI5 version set for this Adaptation project is ${ui5VersionInfo.major}.${ui5VersionInfo.minor}. The minimum version to use for SAPUI5 Adaptation Project and its SAPUI5 Visual Editor is ${minVersionInfo.major}.${minVersionInfo.minor}`;
}
