import { coerce, gte } from 'semver';
import type { UI5VersionOverview } from './types';
import { supportState, ui5VersionFallbacks } from './ui5VersionFallback';

export const enum ui5VersionsType {
    official = 'officialVersions',
    snapshot = 'snapshotsVersions',
    overview = 'overview'
}

export const ui5VersionsCache: {
    [key in ui5VersionsType.official | ui5VersionsType.snapshot | ui5VersionsType.overview]:
        | string[]
        | UI5VersionOverview[];
} = {
    officialVersions: [],
    snapshotsVersions: [],
    overview: []
};

export const ui5VersionRequestInfo = {
    OfficialUrl: 'https://ui5.sap.com',
    NeoAppFile: 'neo-app.json',
    VersionsFile: 'version.json?sap-ui-config-patches=true&sap-ui-config-showall=true',
    VersionsOverview: 'versionoverview.json',
    VersionExternalFile: 'version.json'
};

export const defaultMinUi5Version = '1.65.0';
export const latestVersionString = 'Latest';
export const defaultVersion = latestVersionString;
export const minUi5VersionSupportingCodeAssist = '1.76.0';

// Determine defaults from support fallback versions
const defaultUi5Version = ui5VersionFallbacks
    .filter((supportVersion) => {
        if (
            supportVersion.support === supportState.maintenance &&
            gte(coerce(supportVersion.version) ?? '0.0.0', defaultMinUi5Version)
        ) {
            return true;
        }
        return false;
    })
    .map((maintainedVersion) => coerce(maintainedVersion.version)?.version ?? '0.0.0');
defaultUi5Version.unshift(defaultVersion);
export { defaultUi5Version as defaultUi5Versions };
