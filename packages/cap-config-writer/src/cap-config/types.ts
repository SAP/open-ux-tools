import type { CapService } from '@sap-ux/odata-service-inquirer';

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

    /**
     * True if the @sap/cds is specified as a dependency
     */
    hasCdsModule?: boolean;
};

export interface CapServiceCdsInfo extends CapService {
    cdsUi5PluginInfo: CdsUi5PluginInfo;
}

export interface CapProjectSettings {
    appRoot: string;
    packageName: string;
    appId: string;
    sapux?: boolean;
    enableNPMWorkspaces?: boolean;
    enableCdsUi5Plugin?: boolean;
    enableTypescript?: boolean;
}
