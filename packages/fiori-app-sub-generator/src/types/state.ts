import type { AuthenticationType } from '@sap-ux/store';
import type { ExternalService } from '@sap-ux/axios-extension';
import type { CapServiceCdsInfo } from '@sap-ux/cap-config-writer';
import type { CdsUi5PluginInfo } from '@sap-ux/project-access';
import type { TableSelectionMode } from '@sap-ux/fiori-elements-writer';
import type {
    CapService,
    DatasourceType,
    EntityRelatedAnswers,
    OdataServiceAnswers,
    OdataVersion
} from '@sap-ux/odata-service-inquirer';
import type { SapSystemSourceType } from '../types/constants.js';
import type { AppGenInfo, BaseProject, BaseService, Floorplan } from '@sap-ux/fiori-generator-shared';

export interface Project extends BaseProject {
    enableVirtualEndpoints?: boolean; // whether to use virtual endpoints for preview
    addCdsUi5Plugin?: boolean; // add cds ui5 plugin to the project (will also enable npm workspaces)
}

/**
 * Fiori sub app generators internal representation of a service.
 * May be possible to replace this type with `@sap-ux/odata-service-inquirer` `service` type in future.
 *
 */
export interface Service extends BaseService {
    destinationName?: string;
    serviceId?: string; // id of the service
    version?: OdataVersion; // Not present for FF no datasource template flow
    /**
     * While the required type `CapServiceCdsInfo` mandates `cdsUi5PluginInfo` when writing to cap config, this information is not intially available.
     * So we make it optional here.
     */
    capService?: Omit<CapServiceCdsInfo, 'cdsUi5PluginInfo'> & { cdsUi5PluginInfo?: CdsUi5PluginInfo };
    source: DatasourceType;
    sapSystemSource?: SapSystemSourceType;
    /**
     * Connected system information, used for preview settings and deploy configurations
     */
    connectedSystem?: OdataServiceAnswers['connectedSystem'];
    /**
     * Only used by adaptors to specify the authentication type, use `connectedSystem.destination.Authentication` instead
     */
    destinationAuthType?: string;
    /**
     * Downloaded external service metadata including value helps with their metadata content.
     * Populated when user opts to download value help metadata during generation.
     */
    valueListMetadata?: ExternalService[];
    /**
     * Can be set by adaptors if preview settings have been determined
     */
    previewSettings?: {
        scp?: boolean;
        authenticationType?: AuthenticationType;
    };
}

// @deprecated Use { CapServiceCdsInfo } from '@sap-ux/cap-config-writer';
export interface CapServiceCdsInfoInternal extends CapService {
    capCdsInfo?: CdsUi5PluginInfo; // Has min @sap/cds version, NPM Workspces and cds plugin configured
}

export interface State {
    project: Project;
    service: Service;
    /**
     * Entity configuration for templates that require it
     */
    entityRelatedConfig?: EntityRelatedAnswers;
    /**
     * View name for templates that require it (e.g. freestyle)
     */
    viewName?: string;
    /**
     * The template selected by the user, maybe FE or FF
     */
    floorplan: Floorplan;
    /**
     * General information about the application - used for README and appGenInfo.json
     */
    appGenInfo?: Partial<AppGenInfo>;
}

/** Only used by headless */
export interface ALPOptions {
    qualifier: string;
    multiSelect: boolean;
    autoHide: boolean;
    smartVariantManagement: boolean;
    selectionMode: TableSelectionMode;
}
