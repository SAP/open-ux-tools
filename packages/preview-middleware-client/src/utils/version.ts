import VersionInfo from 'sap/ui/VersionInfo';
import Log from 'sap/base/Log';
import { sendInfoCenterMessage } from './info-center-message';
import { MessageBarType } from '@sap-ux-private/control-property-editor-common';
import type { Manifest } from '@sap-ux/project-access';
import type { LibraryInfo } from 'sap/ui/core/Core';

type UI5VersionDetails = {
    /**
     * Contains either
     * - the name of the distribution or
     * - the id of the application in case the UI5 sources have beeng loaded from npmjs.
     */
    // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents, @typescript-eslint/no-redundant-type-constituents
    name: 'SAPUI5 Distribution' | Manifest['sap.app']['id'];
    /**
     * Contains either
     * - the version of the UI5 framework or
     * - the version of the application in case the UI5 sources have been loaded from npmjs.
     */
    // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents, @typescript-eslint/no-redundant-type-constituents
    version: string | Manifest['sap.app']['applicationVersion']['version'];
    libraries: LibraryInfo[]
};

export type Ui5VersionInfo = {
    major: number;
    minor: number;
    patch?: number;
    label?: string;
    /**
     * Indicates if the UI5 version is served from CDN.
     */
    isCdn?: boolean;
};

/**
 * Default minimal supported UI5 version
 */
export const minVersionInfo = {
    major: 1,
    minor: 71
} as Readonly<Ui5VersionInfo>;

/**
 * Check if the given version info is valid.
 *
 * @param versionInfo to check
 * @throws Error if the version info is invalid
 */
function checkVersionInfo(versionInfo: Ui5VersionInfo): void {
    if (Number.isNaN(versionInfo.major) || Number.isNaN(versionInfo.minor) || Number.isNaN(versionInfo.patch ?? 0)) {
        void sendInfoCenterMessage({
            title: { key: 'FLP_UI_VERSION_RETRIEVAL_FAILURE_TITLE' },
            description: { key: 'FLP_UI_INVALID_UI5_VERSION_DESCRIPTION' },
            type: MessageBarType.error
        });
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
    const versionInfo = await VersionInfo.load() as UI5VersionDetails | undefined;
    let version = versionInfo?.libraries.find((lib) => lib.name === library)?.version;
    const isCdn = versionInfo?.name === 'SAPUI5 Distribution';
    if (!version) {
        Log.error('Could not get UI5 version of application. Using version: 1.130.9 as fallback.');
        version = '1.130.9';
        await sendInfoCenterMessage({
            title: { key: 'FLP_UI_VERSION_RETRIEVAL_FAILURE_TITLE' },
            description: { key: 'FLP_UI_VERSION_RETRIEVAL_FAILURE_DESCRIPTION', params: [version] },
            type: MessageBarType.error
        });
    }
    const [major, minor, patch] = version.split('.').map((versionPart) => Number.parseInt(versionPart, 10));
    const label = version.split(/-(.*)/s)?.[1];

    return {
        major,
        minor,
        patch,
        label,
        isCdn
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
 * Returns the fully qualified UI5 version string - major and minor version concatenated.
 *
 * @param {Ui5VersionInfo} ui5VersionInfo - The ui5 version info object containing major and minor version.
 * @returns {string} The fully qualified UI5 version string.
 */
export function getFullyQualifiedUi5Version(ui5VersionInfo: Ui5VersionInfo): string {
    return `${ui5VersionInfo.major}.${ui5VersionInfo.minor}`;
}

/** Retrieve the SAPUI5 delivered namespaces for the current UI5 version.
 *
 * @returns Promise of a Set of SAPUI5 delivered namespaces
 */
export const getUI5Libs = (() => {
    let cachedLibs: Set<string> | undefined;
    return async function (): Promise<Set<string>> {
        if (!cachedLibs) {
            const versionInfo = await VersionInfo.load() as UI5VersionDetails | undefined;
            const libNames = versionInfo?.libraries.map(lib => lib.name).filter((name): name is string => !!name);
            if (libNames) {
                cachedLibs = new Set(libNames);
            }
        }
        if (!cachedLibs) {
            Log.error('Could not get UI5 libraries of application. Using fallback libraries from UI5 version 1.130.9.');
            cachedLibs = UI5_LIBS_1_130_9;
        }
        return cachedLibs;
    };
})();

const UI5_LIBS_1_130_9 = new Set([
    'sap.f',
    'sap.fileviewer',
    'sap.gantt',
    'sap.m',
    'sap.ndc',
    'sap.suite.ui.commons',
    'sap.tnt',
    'sap.ui.comp',
    'sap.ui.core',
    'sap.ui.documentation',
    'sap.ui.dt',
    'sap.ui.fl',
    'sap.ui.integration',
    'sap.ui.layout',
    'sap.ui.mdc',
    'sap.ui.rta',
    'sap.ui.suite',
    'sap.ui.table',
    'sap.ui.unified',
    'sap.ui.ux3',
    'sap.uxap',
    'themelib_sap_belize',
    'themelib_sap_bluecrystal',
    'themelib_sap_fiori_3',
    'themelib_sap_horizon',
    'themelib_sap_hcb',
    'themelib_sap_hcw',
    'themelib_sap_quartz'
]);