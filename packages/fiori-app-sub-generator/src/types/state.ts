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
import type {
    AppGenInfo,
    BasePackageJsonConfig,
    BaseProjectConfig,
    BaseServiceConfig,
    Floorplan
} from '@sap-ux/fiori-generator-shared';

// Re-export ApiHubConfig from BaseServiceConfig for backward compatibility
export type { ApiHubConfig } from '@sap-ux/fiori-generator-shared';

/**
 * Project configuration for Fiori app generation.
 *
 * Extends BaseProjectConfig with app-generator-specific properties.
 */
export interface Project extends BaseProjectConfig {
    /** Whether to use virtual endpoints for preview */
    enableVirtualEndpoints?: boolean;

    /** Whether to enable ESLint (optional for app generation) */
    enableEslint?: boolean;

    /** Whether to enable TypeScript (optional for app generation) */
    enableTypeScript?: boolean;

    /** Whether to add cds ui5 plugin to the project (will also enable npm workspaces) */
    addCdsUi5Plugin?: boolean;
}

export interface Credentials {
    username: string;
    password?: string;
}

/**
 * Fiori sub app generators internal representation of a service.
 *
 * Extends BaseServiceConfig with app-generation-specific properties.
 * May be possible to replace this type with `@sap-ux/odata-service-inquirer` `service` type in future.
 */
export interface Service extends Omit<BaseServiceConfig, 'version' | 'source'> {
    /** Service host URL (optional for app generation) */
    host?: string;

    /** Destination name for the service */
    destinationName?: string;

    /** Service ID */
    serviceId?: string;

    /** EDMX metadata (optional since Fiori Freestyle can be generated without datasource) */
    edmx?: string;

    /** OData version - uses OdataVersion from odata-service-inquirer */
    version?: OdataVersion;

    /**
     * CAP service information.
     * While the required type `CapServiceCdsInfo` mandates `cdsUi5PluginInfo` when writing to cap config,
     * this information is not initially available, so we make it optional here.
     */
    capService?: Omit<CapServiceCdsInfo, 'cdsUi5PluginInfo'> & { cdsUi5PluginInfo?: CdsUi5PluginInfo };

    /** Data source type - uses DatasourceType enum from odata-service-inquirer */
    source: DatasourceType;

    /**
     * Connected system information, used for preview settings and deploy configurations
     */
    connectedSystem?: OdataServiceAnswers['connectedSystem'];

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

/**
 * Package.json configuration for app generation.
 *
 * Extends BasePackageJsonConfig. Note: app-sub-generator requires all start commands (non-optional)
 * while migration-writer allows them to be optional.
 */
export interface PackageJson extends Omit<
    BasePackageJsonConfig,
    'startCommand' | 'startLocalCommand' | 'startNoFlpCommand' | 'startVariantsCommand'
> {
    /** NPM script command to start the application (required for app generation) */
    startCommand: string;

    /** NPM script command to start the application locally (required for app generation) */
    startLocalCommand: string;

    /** NPM script command to start without FLP (required for app generation) */
    startNoFlpCommand: string;

    /** NPM script command to start with variants management (required for app generation) */
    startVariantsCommand: string;
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
