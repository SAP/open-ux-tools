import type { Annotations, ServiceProvider } from '@sap-ux/axios-extension';
import type { Destination } from '@sap-ux/btp-utils';
import type { CommonPromptOptions, YUIQuestion } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import type { CdsVersionInfo } from '@sap-ux/project-access';
import type { BackendSystem } from '@sap-ux/store';
import type { ListChoiceOptions } from 'inquirer';
import type { EntityAnswer, NavigationEntityAnswer } from './prompts/edmx/entity-helper';
import type { TableSelectionMode, TableType } from '@sap-ux/fiori-elements-writer';

/**
 * This file contains types that are exported by the module and are needed for consumers using the APIs `prompt` and `getPrompts`.
 */
export enum DatasourceType {
    sapSystem = 'sapSystem',
    capProject = 'capProject',
    odataServiceUrl = 'odataServiceUrl',
    none = 'none',
    metadataFile = 'metadataFile',
    // @deprecated
    projectSpecificDestination = 'projectSpecificDestination',
    // @deprecated
    businessHub = 'businessHub'
}

export const SapSystemTypes = {
    abapOnPrem: 'abapOnPrem',
    abapOnBtp: 'abapOnBtp'
} as const;

export type SapSystemType = keyof typeof SapSystemTypes;

/**
 * Answers returned by the OdataServiceInquirer prompt API.
 * These values may be used to write an OData service and may be derived from the user's input rather than direct answers.
 */
export interface OdataServiceAnswers {
    /**
     * The data source type answer.
     */
    datasourceType: DatasourceType;

    /**
     * The odata service metadata (edmx) document.
     */
    metadata?: string;

    /**
     * The annotations document for the service.
     */
    annotations?: Annotations[];

    /**
     * The selected CAP service.
     */
    capService?: CapService;

    /**
     * The odata version of the selected service.
     */
    odataVersion?: OdataVersion;

    /**
     * The url origin (scheme, domain and port) of the service.
     */
    origin?: string;

    /**
     * The relative url path of the selected service. This coupled with the origin forms the full service url.
     */
    servicePath?: string;

    /**
     * The 'sap-client' value for the service.
     */
    sapClient?: string;

    /**
     * Metadata file path
     */
    metadataFilePath?: string;

    /**
     * The connected system will allow downstream consumers to access the connected system without creating new connections.
     *
     */
    connectedSystem?: {
        /**
         * Convienence property to pass the connected system
         */
        serviceProvider: ServiceProvider;

        /**
         * The persistable backend system representation of the connected service provider
         * `newOrUpdated` is set to true if the system was newly created or updated during the connection validation process and should be considered for storage.
         */
        backendSystem?: BackendSystem & { newOrUpdated?: boolean };

        /**
         * The destination information for the connected system
         */
        destination?: Destination;
    };
}

/**
 * Enumeration of prompt names used by OdataServiceInquirerPromptOptions
 */
export enum promptNames {
    /**
     * Data source type
     */
    datasourceType = 'datasourceType',
    /**
     * Metadata file path
     */
    metadataFilePath = 'metadataFilePath',
    /**
     * Cap project
     */
    capProject = 'capProject',
    /**
     * Cap service
     */
    capService = 'capService',
    /**
     * Odata service URL
     */
    serviceUrl = 'serviceUrl',
    /**
     * password
     */
    serviceUrlPassword = 'serviceUrlPassword',
    /**
     * Service selection
     */
    serviceSelection = 'serviceSelection',
    /**
     * Newly created systems can be named for storage
     */
    userSystemName = 'userSystemName',
    /**
     * System selection
     */
    systemSelection = 'systemSelection'
}

export const EntityPromptNames = {
    mainEntity: 'mainEntity',
    navigationEntity: 'navigationEntity',
    filterEntityType: 'filterEntityType',
    tableType: 'tableType',
    hierarchyQualifier: 'hierarchyQualifier',
    generateFEOPAnnotations: 'generateFEOPAnnotations',
    generateLROPAnnotations: 'generateLROPAnnotations',
    presentationQualifier: 'presentationQualifier',
    tableSelectionMode: 'tableSelectionMode',
    tableMultiSelect: 'tableMultiSelect',
    tableAutoHide: 'tableAutoHide',
    smartVariantManagement: 'smartVariantManagement'
} as const;
export type EntityPromptNames = (typeof EntityPromptNames)[keyof typeof EntityPromptNames];

export interface EntitySelectionAnswers {
    mainEntity?: EntityAnswer;
    navigationEntity?: NavigationEntityAnswer;
    filterEntityType?: EntityAnswer;
}

export interface TableConfigAnswers {
    tableType: TableType;
    hierarchyQualifier: string;
}

export interface AnnotationGenerationAnswers {
    // todo: consolidate, it cant be both
    addFEOPAnnotations?: boolean;
    addLROPAnnotations?: boolean;
}

export interface AlpTableConfigAnswers {
    qualifier: string;
    multiSelect: boolean;
    autoHide: boolean;
    smartVariantManagement: boolean;
    selectionMode: TableSelectionMode;
}

/**
 * Convienience type for the entity related answers
 *
 */
export type EntityRelatedAnswers = EntitySelectionAnswers &
    TableConfigAnswers &
    AnnotationGenerationAnswers &
    AlpTableConfigAnswers;

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

export interface CapServiceChoice extends ListChoiceOptions {
    value: CapService;
}

export type CapProjectPromptOptions = {
    /**
     * The search paths for the CAP projects, this is a mandatory option as searching the entire file system is not recommended.
     */
    capSearchPaths: string[];
    /**
     * The default selected CAP project choice, this is used to pre-select a CAP project based on the CAP project path.
     */
    defaultChoice?: string;
};

export type CapServicePromptOptions = {
    /**
     * The default selected CAP service choice, this is used to pre-select a CAP service based on the specified CAP service name.
     */
    defaultChoice?: Pick<CapService, 'serviceName' | 'projectPath'>;
};

export type DatasourceTypePromptOptions = {
    /**
     * Default datasource type
     */
    default?: DatasourceType;
    /**
     * Include the no datasource option in the datasource type prompt
     */
    includeNone?: boolean;
    /**
     * Limit the offered datasource types to the specified types. Note that if `default` is also provided and not included in the choices, the default will be ignored.
     * If `includeNone` is set to true, the `none` option will always be included.
     *
     */
    choices?: DatasourceType[];
};

export type DestinationFilters = {
    /**
     * 'WebIDEUsage' property is defined and includes the value 'odata_abap'. If this matches, the destination will be included regardless of other matches.
     */
    odata_abap: boolean;
    /**
     * 'WebIDEUsage' property is defined and includes the value 'odata_gen' and does not includes the value 'odata_abap'. If this matches, the destination will be included regardless of other matches.
     */
    odata_generic: boolean;
    /**
     * 'WebIDEAdditionalData' property is defined and includes the value 'full_url' and
     * 'WebIDEUsage' property is defined and includes the value 'odata_gen' and does not includes the value 'odata_abap'. If this matches, the destination will be included regardless of other matches.
     */
    full_service_url: boolean;
    /**
     * 'WebIDEAdditionalData' property is defined and does not include the value 'full_url' and
     * 'WebIDEUsage' property is defined and includes the value 'odata_gen' and does not includes the value 'odata_abap'. If this matches, the destination will be included regardless of other matches.
     */
    partial_service_url: boolean;
};

export type SystemSelectionPromptOptions = {
    /**
     * Set the specific filter option(s) to true to include only the destinatons that have matching configuration attributes.
     * If no filter is set, all destinations will be included. If multiple filters are set, the destination will be included if it matches any of the filters.
     * i.e. if both `abap_cloud` and `abap_on_premise` are set to true, the destination will be included if it has either 'abap_cloud' or 'abap_on_premise' matching configuration.
     */
    destinationFilters?: Partial<DestinationFilters>;
    /**
     * Determines if the system selection prompt should use auto complete prompt for system names.
     * Note that the auto-complete module must be registered with the inquirer instance to use this feature.
     */
    useAutoComplete?: boolean;
    /**
     * Include the Cloud Foundry Abap environments service in the system selection prompt, note this option is only supported on Business Application Studio.
     * Even if this option is set to true, the choice will only be included if the prompts are executed in the Business Application Studio.
     * Note that there is no implementation for this option in this module and handling of the prompt optin and subsequent prompting must be implemented by the consumer.
     */
    includeCloudFoundryAbapEnvChoice?: boolean;
    /**
     * Provide a default choice for the system selection prompt, this is used to pre-select a system based on the system name.
     * Set as string literal types `NewSystemChoice` or `CfAbapEnvServiceChoice` to specify the default choice to create a new system connection config in VSCode
     * or to select the Cloud Foundry Abap environments service discovery choice in BAS respectively.
     *
     */
    defaultChoice?: string;
    /**
     * Only show the default choice in the system selection prompt, this is used to skip the system selection prompt if the default choice is already known.
     * If the `defaultChoice` value is not found in the systems choices, or the `defaultChoice` option is not specified,
     * this option will not be applied and the full list of choices will be presented to the user.
     */
    onlyShowDefaultChoice?: boolean;
};

export type MetadataPromptOptions = {
    /**
     * Used to validate the metadata file contains the required odata version edmx
     */
    requiredOdataVersion?: OdataVersion;
};

export type ServiceSelectionPromptOptions = {
    /**
     * Determines if the service selection prompt should use auto complete prompt for service names.
     * Note that the auto-complete module must be registered with the inquirer instance to use this feature.
     */
    useAutoComplete?: boolean;
    /**
     * Used to validate the selected service is of the required odata version
     */
    requiredOdataVersion?: OdataVersion;
    /**
     * This allows the prompt to be excluded where consuming generators only require the system connection functionality.
     * If the service selection prompt is hidden then the odata service related answer properties will not be returned.
     */
    hide?: boolean;
} & Pick<CommonPromptOptions, 'additionalMessages'>; // Service selection prompts allow extension with additional messages;

export type SystemNamePromptOptions = {
    /**
     * This option allows the prompt to be excluded where later storage of the system with the provided name is not required.
     * If this propmt is not included then a BackendSystem will not be returned for the connected system.
     */
    hide?: boolean;
};

export type OdataServiceUrlPromptOptions = {
    /**
     * Used to validate the service specified by the url is of the required odata version edmx
     */
    requiredOdataVersion?: OdataVersion;
} & Pick<CommonPromptOptions, 'additionalMessages'>; // Service URL prompts allow extension with additional messages

export type OdataServiceUrlPasswordOptions = Pick<CommonPromptOptions, 'additionalMessages'>; // Service URL password prompts allow extension with additional messages

/**
 * Provide the correct type checking for prompt options
 */
type odataServiceInquirerPromptOptions = Record<promptNames.datasourceType, DatasourceTypePromptOptions> &
    Record<promptNames.metadataFilePath, MetadataPromptOptions> &
    Record<promptNames.capProject, CapProjectPromptOptions> &
    Record<promptNames.capService, CapServicePromptOptions> &
    Record<promptNames.serviceUrl, OdataServiceUrlPromptOptions> &
    Record<promptNames.serviceUrlPassword, OdataServiceUrlPasswordOptions> &
    Record<promptNames.serviceSelection, ServiceSelectionPromptOptions> &
    Record<promptNames.userSystemName, SystemNamePromptOptions> &
    Record<promptNames.systemSelection, SystemSelectionPromptOptions>;

export type OdataServiceQuestion = YUIQuestion<OdataServiceAnswers>;

export type OdataServicePromptOptions = Partial<odataServiceInquirerPromptOptions>;

// todo: add implementation
export type EntityPromptOptions = {
    /**
     * Determines if entity related prompts should use auto complete on user input.
     * Note that the auto-complete module must be registered with the inquirer instance to use this feature.
     */
    useAutoComplete?: boolean;
    /**
     * Provide an entity name that will be preselected as the default option for the prompt.
     */
    defaultMainEntityName?: string;
    /**
     * Hides the table layout related prompts when true, default is false.
     */
    hideTableLayoutPrompts?: boolean;
};

export const SAP_CLIENT_KEY = 'sap-client';
