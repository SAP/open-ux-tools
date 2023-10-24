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

export interface UI5VersionFilterOptions {
    /**
     * If provided will determine the lowest UI5 version to return based on the minimum support version
     */
    fioriElementsVersion?: FioriElementsVersion;
    /**
     * The host from which snapshot version may be fetched. If provided snapshots will be included.
     */
    snapshotVersionsHost?: string;
    /**
     * Removes non-numeric versions, for example: 'snapshot-1.120' or 'Latest' (in the case where fallbacks are used)
     *
     * If `includeSnapshots` is specified `onlyVersionNumbers` takes precedence
     */
    onlyVersionNumbers?: boolean;
    /**
     * Includes only versions published to npmjs - if none are available the default minimum supported ui5 version will be returned
     */
    onlyNpmVersion?: boolean;
    /**
     * Set this version as the first entry but only if it would be returned based on other filter options
     */
    ui5SelectedVersion?: string;
    /**
     * Sets the minimum UI5 version to return. If `fioriElementsVersion` is also specified then the minimum ui5
     * version that is supported will take precedence if it is higher
     */
    minSupportedUI5Version?: string;
    /**
     * Will use the cached versions from previous network calls if available otherwise will make network calls and populate cache
     */
    useCache?: boolean;
    /**
     * Some UI5 version services can return duplicates, set this option to make versions unique
     */
    removeDuplicateVersions?: boolean;
    /**
     * Includes the optional property `maintained` to indicate the UI5 version support level
     */
    includeMaintained?: boolean;
    /**
     * Adds the property `default` to the default ui5 version
     */
    includeDefault?: boolean;
}

export interface UI5Version {
    /**
     * UI5 semantic version
     */
    version: string;
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
