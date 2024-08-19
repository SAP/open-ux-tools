import type { ui5ThemeIds } from './ui5-theme-info';

export interface UI5VersionFilterOptions {
    /**
     * The host from which snapshot version may be fetched. If provided snapshots will be included.
     */
    snapshotVersionsHost?: string;
    /**
     * Removes non-numeric versions, for example: 'snapshot-1.120' or 'Latest' (in the case where fallbacks are used)
     *
     * If `snapshotVersionsHost` is specified `onlyVersionNumbers` takes precedence.
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
     * Sets the minimum UI5 version to return.
     */
    minSupportedUI5Version?: string;
    /**
     * Will use the cached versions from previous network calls if available otherwise will make network calls and populate cache
     */
    useCache?: boolean;
    /**
     * Includes the optional property `maintained` to indicate the UI5 version support level. With `includeDefault`, finds next maintained version if default is out of maintenance
     */
    includeMaintained?: boolean;
    /**
     * Adds the property `default` to the default ui5 version. With `includeMaintained`, finds next maintained version if default is out of maintenance
     */
    includeDefault?: boolean;
    /**
     * Includes only versions filtered by latest patch.
     */
    onlyLatestPatchVersion?: boolean;
}

export interface UI5Version {
    /**
     * UI5 semantic version
     */
    version: string;
    default?: boolean;
    maintained?: boolean;
}

export interface UI5VersionSupport extends UI5Version {
    support?: string;
    lts?: string;
}

export interface UI5VersionsResponse {
    [key: string]: {
        patches?: string[];
    } & UI5VersionSupport;
}

export interface UI5Theme {
    /**
     * The technical theme identifier
     */
    id: ui5ThemeIds;
    /**
     * The official end-user theme name
     */
    label: string;
    /**
     * The UI5 minimum UI5 version that supports this theme
     */
    sinceVersion?: string;
}
