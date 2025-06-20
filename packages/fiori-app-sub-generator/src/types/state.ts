import type { AuthenticationType } from '@sap-ux/store';
import type { Annotations } from '@sap-ux/axios-extension';
import type { CapServiceCdsInfo } from '@sap-ux/cap-config-writer';
import type { CdsUi5PluginInfo, UI5FlexLayer } from '@sap-ux/project-access';
import type { TableSelectionMode } from '@sap-ux/fiori-elements-writer';
import type {
    CapService,
    DatasourceType,
    EntityRelatedAnswers,
    OdataServiceAnswers,
    OdataVersion
} from '@sap-ux/odata-service-inquirer';
import type { ApiHubType, SapSystemSourceType } from '../types/constants';
import type { Script } from './common';
import type { AppGenInfo } from '@sap-ux/fiori-generator-shared';

export interface Project {
    targetFolder: string;
    addDeployConfig?: boolean;
    addFlpConfig?: boolean;
    name: string;
    namespace?: string;
    title: string;
    description: string;
    enableVirtualEndpoints?: boolean; // whether to use virtual endpoints for preview
    ui5Theme: string;
    ui5Version: string;
    ui5FrameworkUrl?: string; // URL providing ui5 libraries, set to default if not provided
    localUI5Version: string;
    sapux?: boolean;
    skipAnnotations?: boolean;
    enableCodeAssist?: boolean;
    enableEslint?: boolean;
    enableTypeScript?: boolean;
    formEntry?: boolean;
    flpAppId?: string; // Represents the concatentation of sematicObject and action to form a navigation intent as used in url http://some/path#<semanticObject>-<action>
    minSupportedUI5Version?: string; // min supported version based on floorplan and odata version
    manifestMinUI5Version?: string; // ui5 version for manifest.json minUI5Version,
}

export interface Credentials {
    username: string;
    password?: string;
}

/**
 * Fiori sub app generators internal representation of a service.
 * May be possible to replace this type with `@sap-ux/odata-service-inquirer` `service` type in future.
 *
 */
export interface Service {
    host?: string;
    client?: string;
    destinationName?: string;
    servicePath?: string; // url path of odata or cap service
    serviceId?: string; // id of the service
    edmx?: string; // Optional since Fiori Freestyle can be generated without datasource
    annotations?: Annotations[];
    version?: OdataVersion; // Not present for FF no datasource template flow
    /**
     * While the required type `CapServiceCdsInfo` mandates `cdsUi5PluginInfo` when writing to cap config, this information is not intially available.
     * So we make it optional here.
     */
    capService?: Omit<CapServiceCdsInfo, 'cdsUi5PluginInfo'> & { cdsUi5PluginInfo?: CdsUi5PluginInfo };
    source: DatasourceType;
    sapSystemSource?: SapSystemSourceType;
    localEdmxFilePath?: string;
    /**
     * Connected system information, used for preview settings and deploy configurations
     */
    connectedSystem?: OdataServiceAnswers['connectedSystem'];
    /**
     * Only used by adaptors to specify the authentication type, use `connectedSystem.destination.Authentication` instead
     */
    destinationAuthType?: string;
    apiHubConfig?: ApiHubConfig;
    ignoreCertError?: boolean;
    /**
     * Can be set by adaptors if preview settings have been determined
     */
    previewSettings?: {
        scp?: boolean;
        authenticationType?: AuthenticationType;
    };
}

/**
 * Defines the api hub service properties or enterprise and non-enterprise versions
 */
export interface ApiHubConfig {
    apiHubKey: string;
    apiHubType: ApiHubType;
}

// @deprecated Use { CapServiceCdsInfo } from '@sap-ux/cap-config-writer';
export interface CapServiceCdsInfoInternal extends CapService {
    capCdsInfo?: CdsUi5PluginInfo; // Has min @sap/cds version, NPM Workspces and cds plugin configured
}

/** package.json interface */
export interface PackageJson {
    name: string;
    description: string;
    startCommand: string;
    startLocalCommand: string;
    startNoFlpCommand: string;
    startVariantsCommand: string;
    addMockCommand?: boolean;
    sapClientParam?: string;
    flpAppId?: string; // Identifies the application in FLP => SemanticObject-Action
    devDependencies: {
        [key: string]: string;
    };
    ui5Dependencies: string[];
    sapux?: boolean;
    startFile?: string; // relative path to start html
    localStartFile?: string; // relative path to local start html
    runTasks?: Script[];
    enableEslint: boolean;
    sapuxLayer?: UI5FlexLayer;
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

// Union types to expose a single interface property for Floorplan
// This provides a layer of abstraction to isolate internal changes from external headless API consumers
// Since these keys are used as an external API definiton they need to be meaningful
// Note that ordering here determines rendering order
/**
 * Due to ts(18033) we cannot use the type values directly here:
 * FF_SIMPLE = FFTemplateType.Basic // Once https://github.com/microsoft/TypeScript/pull/59475 is merged we can remove the hardcoded values and directly use the template values
 */
export enum FloorplanFF {
    FF_SIMPLE = 'basic'
}
/**
 * Due to ts(18033) we cannot use the type values directly here:
 * Once https://github.com/microsoft/TypeScript/pull/59475 is merged we can remove hardcoded values and directly use the template values
 * FE_FPM = FETemplateType.FlexibleProgrammingModel,
 * FE_LROP = FETemplateType.ListReportObjectPage,
 * FE_OVP = FETemplateType.OverviewPage,
 * FE_ALP = FETemplateType.AnalyticalListPage,
 * FE_FEOP = FETemplateType.FormEntryObjectPage,
 * FE_WORKLIST = FETemplateType.Worklist
 */
export enum FloorplanFE {
    FE_FPM = 'fpm',
    FE_LROP = 'lrop',
    FE_OVP = 'ovp',
    FE_ALP = 'alp',
    FE_FEOP = 'feop',
    FE_WORKLIST = 'worklist',
    FE_ARIBA_LROP = 'aribaLrop'
}

// Used internally to join Floorplan types from multiple generators (until we have a merged type)
export type Floorplan = FloorplanFE | FloorplanFF;
