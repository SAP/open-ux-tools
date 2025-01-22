import type { CdsVersionInfo } from '@sap-ux/project-access';

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


export type CapRuntime = 'Node.js' | 'Java';

export interface CapService {
    /**
     * The path to the CAP project.
     */
    projectPath: string;
    /**
     * The CDS info for the Cds instance that was used to compile the project when determining the service.
     */
    cdsVersionInfo?: CdsVersionInfo;
    /**
     * The name of the CAP service as identified by the cds model.
     */
    serviceName: string;
    /**
     * The URL path to the service, as specfied in the manifest.json of generated apps
     * This is also provided as `OdataServicePromptAnswers` property `servicePath`
     */
    urlPath?: string;
    /**
     * The relative path (from the `projectPath`) to the service cds file.
     */
    serviceCdsPath?: string;
    /**
     * The runtime of the Cds instance that was used to compile the project when determining the service.
     */
    capType?: CapRuntime;
    /**
     * The relative path (from the `projectPath`) to the app folder
     */
    appPath?: string;
}

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
