import { coerce, gte } from "semver";
import type { UI5VersionOverview } from "./types";
import { supportState, ui5VersionFallbacks } from "./ui5VersionFallback";

export const enum UI5_VERSIONS_TYPE {
    official = 'officialVersions',
    snapshot = 'snapshotsVersions',
    overview = 'overview'
}

export const ui5VersionsCache: {
    [key in UI5_VERSIONS_TYPE.official | UI5_VERSIONS_TYPE.snapshot | UI5_VERSIONS_TYPE.overview]:
        | string[]
        | UI5VersionOverview[];
} = {
    officialVersions: [],
    snapshotsVersions: [],
    overview: []
};

export const UI5VersionRequestInfo = {
    OfficialUrl: 'https://ui5.sap.com',
    NeoAppFile: 'neo-app.json',
    VersionsFile: 'version.json?sap-ui-config-patches=true&sap-ui-config-showall=true',
    VersionsOverview: 'versionoverview.json',
    VersionExternalFile: 'version.json'
}

export const DEFAULT_MIN_UI5_VERSION = '1.65.0';
export const LatestVersionString = 'Latest';
export const DefaultVersion = LatestVersionString;

// Determine defaults from support fallback versions
const DEFAULT_UI5_VERSIONS = ui5VersionFallbacks.filter((supportVersion) => {
    if (supportVersion.support === supportState.maintenance && gte(coerce(supportVersion.version) ?? '0.0.0', DEFAULT_MIN_UI5_VERSION)) {
        return true;
    }
    return false;
}).map((maintainedVersion) => coerce(maintainedVersion.version)?.version ?? '0.0.0');
DEFAULT_UI5_VERSIONS.unshift(DefaultVersion);
export { DEFAULT_UI5_VERSIONS };
