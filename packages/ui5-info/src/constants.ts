import type { UI5VersionOverview } from './types';

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
