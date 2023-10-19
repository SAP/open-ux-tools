export const enum UI5Info {
    OfficialUrl = 'https://ui5.sap.com',
    //SnapshotUrl = 'https://sapui5preview-sapui5.dispatcher.int.sap.eu2.hana.ondemand.com',
    NeoAppFile = 'neo-app.json',
    VersionsFile = 'version.json?sap-ui-config-patches=true&sap-ui-config-showall=true',
    DefaultVersion = 'Latest',
    LatestVersionString = 'Latest',
    VersionsOverview = 'versionoverview.json',
    VersionExternalFile = 'version.json'
}

export const enum FioriElementsVersion {
    v2 = 'v2',
    v4 = 'v4'
}

export const minUI5VersionForLocalDev = '1.79.0';

export interface UI5VersionFilterOptions {
    fioriElementsVersion?: FioriElementsVersion;
    /**
     * Snapshot url must have been provided to retrieve
     */
    includeSnapshots?: {
        url: string;
    };
    onlyVersionNumbers?: boolean;
    onlyNpmVersion?: boolean;
    ui5SelectedVersion?: string;
    minSupportedUI5Version?: string;
    useCache?: boolean;
    removeDuplicateVersions?: boolean;
    groupUI5Versions?: boolean;
}

export interface Logger {
    warning: (message: string) => void;
    error: (message: string) => void;
}

export interface UI5Version {
    semantic: string;
    default?: boolean;
    maintained?: boolean;
}

export interface UI5VersionOverview {
    version: string;
    support: string;
    lts?: string;
}

export interface UI5VersionsResponse {
    [key: string]: {
        patches?: string[];
    } & UI5VersionOverview;
}
