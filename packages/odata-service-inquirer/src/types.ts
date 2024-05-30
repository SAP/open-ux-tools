import type { IValidationLink } from '@sap-devx/yeoman-ui-types';
import type { Annotations } from '@sap-ux/axios-extension';
import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ListChoiceOptions } from 'inquirer';

/**
 * This file contains types that are exported by the module and are needed for consumers using the APIs `prompt` and `getPrompts`.
 */

export enum DatasourceType {
    sapSystem = 'sapSystem',
    businessHub = 'businessHub',
    capProject = 'capProject',
    odataServiceUrl = 'odataServiceUrl',
    none = 'none',
    metadataFile = 'metadataFile',
    projectSpecificDestination = 'projectSpecificDestination'
}

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
     * User name for the service where basic authentication is required.
     */
    username?: string;

    /**
     * Password for the service where basic authentication is required.
     */
    password?: string;

    /**
     * Metadata file path
     */
    metadataFilePath?: string;
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
    serviceUrl = 'serviceUrl'
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
     * Include the no datasource option in the datasource type prompt
     */
    includeNone?: boolean;
    /**
     * Include the `projectSpecificDestination` option in the datasource type prompt
     */
    includeProjectSpecificDest?: boolean;
};

export type MetadataPromptOptions = {
    /**
     * Used to validate the metadata file contains the required odata version edmx
     */
    requiredOdataVersion?: OdataVersion;
};

export type OdataServiceUrlPromptOptions = {
    /**
     * Used to validate the service specified by the url is of the required odata version edmx
     */
    requiredOdataVersion?: OdataVersion;
};

/**
 * Provide the correct type checking for prompt options
 */
type odataServiceInquirerPromptOptions = Record<promptNames.datasourceType, DatasourceTypePromptOptions> &
    Record<promptNames.metadataFilePath, MetadataPromptOptions> &
    Record<promptNames.capProject, CapProjectPromptOptions> &
    Record<promptNames.capService, CapServicePromptOptions> &
    Record<promptNames.serviceUrl, OdataServiceUrlPromptOptions>;

export type OdataServiceQuestion = YUIQuestion<OdataServiceAnswers>;

export type OdataServicePromptOptions = Partial<odataServiceInquirerPromptOptions>;

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

export const hostEnvironment = {
    vscode: {
        name: 'Visual Studio Code',
        technical: 'VSCode'
    },
    bas: {
        name: 'SAP Business Application Studio',
        technical: 'SBAS'
    },
    cli: {
        name: 'CLI',
        technical: 'CLI'
    }
};

export const SAP_CLIENT_KEY = 'sap-client';
