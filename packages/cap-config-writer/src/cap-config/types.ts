import type { CapRuntime } from '@sap-ux/fiori-generator-shared';
import type { CdsVersionInfo, CdsUi5PluginInfo } from '@sap-ux/project-access';

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
    /**
     * Indicates if NPM workspaces should be enabled, cds-ui5-plugin will also be added if this is true.
     * Default is true.
     */
    enableNPMWorkspaces?: boolean;
    /**
     * @deprecated
     * Indicates if the CDS UI5 plugin should be added.
     * Default is true and will be removed in future versions.
     */
    enableCdsUi5Plugin?: boolean;
    enableTypescript?: boolean;
}
