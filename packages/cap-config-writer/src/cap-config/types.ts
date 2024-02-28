export type CdsUi5PluginInfo = {
    /**
     * Convienience property. The CDS UI5 plugin is considered enabled if `hasCdsUi5Plugin`, `hasMinCdsVersion`, `isWorkspaceEnabled` are all true.
     */
    isCdsUi5PluginEnabled: boolean;
    /**
     * True if the CDS version satisfies the minimum supported CDS version
     */
    hasMinCdsVersion: boolean;
    /**
     * True if NPM workspaces are enabled at the root of a CAP project
     */
    isWorkspaceEnabled: boolean;
    /**
     * True if the CDS ui5 plugin is specified as a dependency
     */
    hasCdsUi5Plugin: boolean;
};
