import type { PromptSeverityMessage, validate } from '@sap-ux/inquirer-common';
import type { OdataVersion, ServiceType } from '@sap-ux/odata-service-writer';
import type { AsyncDynamicQuestionProperty } from 'inquirer';

export enum DatasourceType {
    SAP_SYSTEM = 'SAP_SYSTEM',
    BUSINESS_HUB = 'BUSINESS_HUB',
    CAP_PROJECT = 'CAP_PROJECT',
    ODATA_SERVICE_URL = 'ODATA_SERVICE_URL',
    NONE = 'NONE',
    METADATA_FILE = 'METADATA_FILE',
    PROJECT_SPECIFIC_DESTINATION = 'PROJECT_SPECIFIC_DESTINATION'
}

export interface OdataServiceAnswers {
    /**
     * The data source type answer.
     */
    datasourceType: DatasourceType;
    /**
     * The base URL of the OData service. Typically the host and port of the service url.
     */
    baseUrl?: string;
    /**
     * The SAP client code
     */
    sapClient?: string;
    destination?: {
        /**
         * If the service is provided via a BTP destination, this is the destination name.
         */
        name: string;
        /**
         * Is this the instance name???
         */
        instance?: string;
    };
    /**
     *
     */
    type?: ServiceType;
    /**
     * The path to the OData service. Typically the path to the service endpoint.
     */
    path?: string;
    /**
     * The OData version of the service.
     */
    odataVersion: OdataVersion;
    /**
     * The name of the data source as would be written to the manifest.json.
     */
    name?: string;
    /**
     * The `sap.ui5.model` name as would be written to the manifest.json.
     */
    model?: string;
    /**
     * The odata service metadata edmx.
     */
    metadata?: string;
    /**
     * An annotations defintion.
     */
    annotations?: {
        name?: string;
        technicalName: string;
        xml: string;
    };
    /**
     * The local annotations file name?
     */
    localAnnotationsName?: string;
    //previewSettings?: Partial<ProxyBackend>;
}

/**
 * Enumeration of prompt names used by OdataServiceInquirerPromptOptions
 *
 */
export enum promptNames {
    /**
     * Data source type
     */
    datasourceType = 'datasourceType'
}

export type DatasourceTypePromptOptions = {
    /**
     * Default datasource type
     */
    default?: DatasourceType;
    /**
     * Include the `NONE` option in the datasource type prompt
     */
    includeNone?: boolean;
    /**
     * Include the `PROJECT_SPECIFIC_DESTINATION` option in the datasource type prompt
     */
    includeProjectSpecificDest?: boolean;
};

/**
 * These are boolean value prompt option keys
 */
/* type booleanPromptKeys =
    | 'addDeployConfig'
    | 'addFlpConfig'
    | 'enableEslint'
    | 'skipAnnotations'
    | 'enableTypeScript'
    | 'enableCodeAssist'
    | 'showAdvanced'
    | 'enableNPMWorkspaces'; */

//type stringValuePrompts = stringValuePromptType[keyof typeof promptNames];

// Creates a general type for all boolean value prompt options
/* type booleanValuePromptType = Pick<typeof promptNames, booleanPromptKeys>;
type booleanValuePrompts = booleanValuePromptType[keyof booleanValuePromptType]; */

// Prompt options that can be assigned a default
//type DefaultValueInputPrompts = promptNames.datasourceType;

// Default value type for input prompt options
export type PromptDefaultValue<T> = {
    default?: AsyncDynamicQuestionProperty<T>;
};

/**
 * Defines prompt/question default values and/or whether or not they should be shown.
 */
export type CommonPromptOptions = {
    hide?: boolean;
    validate?: validate<OdataServiceAnswers>;
    additionalMessages?: PromptSeverityMessage;
};

/**
 * Provide the correct type checking for string value prompts and `ui5Version` options
 *
 */
type objectValuePromptOptions =
    /* Record<stringValuePrompts, CommonPromptOptions> & */
    Record<promptNames.datasourceType, DatasourceTypePromptOptions>;

/* &
    Record<DefaultValueConfirmPrompts, PromptDefaultValue<boolean>> */ /* export type UI5ApplicationQuestion = YUIQuestion<OdataServiceAnswers> &
    Partial<Pick<AutocompleteQuestionOptions, 'source'>>; */

export type OdataServicePromptOptions = Partial<objectValuePromptOptions>;
