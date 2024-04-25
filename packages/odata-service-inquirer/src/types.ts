import type { IValidationLink } from '@sap-devx/yeoman-ui-types';
import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { OdataVersion, ServiceType } from '@sap-ux/odata-service-writer';
import type { CapCustomPaths } from '@sap-ux/project-access';
import type { ListChoiceOptions } from 'inquirer';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';

export enum DatasourceType {
    sap_system = 'sap_system',
    business_hub = 'business_hub',
    cap_project = 'cap_project',
    odata_service_url = 'odata_service_url',
    none = 'none',
    metadata_file = 'metadata_file',
    project_specific_destination = 'project_specific_destination'
}

/**
 * Answers returned by the OdataServiceInquirer prompt API,
 * these answers are used to generate the OData service and may be derived from the user's input rather than direct answers.
 *
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
     * The selected CAP service.
     */
    capService?: CapService;

    /**
     * The odata version of the selected service.
     */
    odataVersion?: OdataVersion;

    /**
     * The service path of the selected service.
     */
    servicePath?: string;

    /**
     * Metadata file path
     */
    metadataFilePath?: string;
}

/**
 * Enumeration of prompt names used by OdataServiceInquirerPromptOptions
 *
 */
export enum promptNames {
    /**
     * Data source type
     */
    datasourceType = 'datasourceType',
    metadataFilePath = 'metadataFilePath',
    capProject = 'capProject',
    capService = 'capService'
}

/**
 * Enumeration of internal prompt names used internally and not supported for modification using OdataServiceInquirerPromptOptions
 *
 */
export enum internalPromptNames {
    capProjectPath = 'capProjectPath',
    capCliStateSetter = 'capCliStateSetter'
}

/**
 * Answers to CAP service prompts
 *
 */
export interface CapServiceAnswers extends CapService {
    [promptNames.capProject]: CapProjectChoice['value'];
    [internalPromptNames.capProjectPath]: string;
    [promptNames.capService]: CapServiceChoice['value'];
}

export interface OdataServicePromptAnswers extends CapServiceAnswers {
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
    odataVersion?: OdataVersion;
    /**
     * The name of the data source as would be written to the manifest.json.
     */
    name?: string;
    /**
     * The `sap.ui5.model` name as would be written to the manifest.json.
     */
    model?: string;
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
    version?: OdataVersion;
}

export type CapProjectRootPath = {
    folderName: string;
    path: string;
};

export type CapProjectPaths = CapProjectRootPath & CapCustomPaths;

export interface CapProjectChoice extends ListChoiceOptions {
    value: CapProjectPaths | string;
}

export type CapRuntime = 'Node.js' | 'Java';

export interface CapService {
    /**
     * The path to the CAP project.
     */
    projectPath: string;
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
     * The runtime of the CAP service.
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
     * Include the `NONE` option in the datasource type prompt
     */
    includeNone?: boolean;
    /**
     * Include the `PROJECT_SPECIFIC_DESTINATION` option in the datasource type prompt
     */
    includeProjectSpecificDest?: boolean;
};

export type MetadataPromptOptions = {
    /**
     * Used to validate the metadata file contains the required odata version edmx
     */
    requiredOdataVersion?: OdataVersion;
};

/**
 * Provide the correct type checking for object value prompt options
 */
type odataServiceInquirerPromptOptions = Record<promptNames.datasourceType, DatasourceTypePromptOptions> &
    Record<promptNames.metadataFilePath, MetadataPromptOptions> &
    Record<promptNames.capProject, CapProjectPromptOptions> &
    Record<promptNames.capService, CapServicePromptOptions>;

export type OdataServiceQuestion = YUIQuestion<OdataServiceAnswers> &
    Partial<Pick<AutocompleteQuestionOptions, 'source'>>;

export type OdataServicePromptOptions = Partial<odataServiceInquirerPromptOptions>;

export const PLATFORMS = {
    VSCODE: {
        name: 'Visual Studio Code',
        technical: 'VSCode'
    },
    SBAS: {
        name: 'SAP Business Application Studio',
        technical: 'SBAS'
    },
    CLI: {
        name: 'CLI',
        technical: 'CLI'
    }
};

/**
 * Implementation of IValidationLink interface.
 * Provides a toString() for serialization on CLI since IValidationLink rendering is only supported by YeomanUI.
 */
export class ValidationLink implements IValidationLink {
    // Having to redeclare properties from an interface should not be required see: https://github.com/Microsoft/TypeScript/issues/5326
    message: IValidationLink['message'];
    link: IValidationLink['link'];

    /**
     * Constructor for ValidationLink.
     *
     * @param validationLink The validation link object to be used for serialization
     */
    constructor(validationLink: IValidationLink) {
        Object.assign(this, validationLink);
    }

    /**
     * Serialize the validation link object to a string.
     *
     * @returns The validation link object as a string
     */
    public toString(): string {
        return `${this.message} ${this.link.text}${this.link.url ? ' : ' + this.link.url : ''}`;
    }
}
