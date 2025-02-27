import type { UI5Version } from './types';

export const enum ui5VersionsType {
    official = 'officialVersions',
    snapshot = 'snapshotsVersions',
    support = 'support'
}

export const ui5VersionsCache: {
    [key in ui5VersionsType.official | ui5VersionsType.snapshot | ui5VersionsType.support]: string[] | UI5Version[];
} = {
    officialVersions: [],
    snapshotsVersions: [],
    support: []
};

export const ui5VersionRequestInfo = {
    OfficialUrl: 'https://ui5.sap.com',
    NeoAppFile: 'neo-app.json',
    VersionsFile: 'version.json?sap-ui-config-patches=true&sap-ui-config-showall=true',
    VersionExternalFile: 'version.json'
};

export const defaultMinUi5Version = '1.65.0';
export const latestVersionString = 'Latest';
export const defaultVersion = latestVersionString;
export const minUi5VersionSupportingCodeAssist = '1.76.0';
export const minUi5VersionV4Template = '1.84.0';
export const minUI5VersionForLocalDev = '1.79.0';
