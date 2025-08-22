import type { ApplicationAccess } from '@sap-ux/project-access';

/**
 * Types for Fiori functionality
 */

/**
 * Input interface for the 'list-fiori-apps' functionality
 */
export interface ListFioriAppsInput {
    /** Array of paths to search for Fiori applications */
    searchPath: string[];
}
/**
 * Output interface for the 'list-fiori-apps' functionality
 */
export interface ListFioriAppsOutput {
    /** Array of found Fiori applications */
    applications: FioriApp[];
}

/**
 * Input interface for the 'list-functionality' functionality
 */
export interface ListFunctionalitiesInput {
    /** Path to the Fiori application */
    appPath: string;
}

/**
 * Output interface for the 'list-functionality' functionality
 */
export interface ListFunctionalitiesOutput {
    /** Path to the Fiori application */
    applicationPath: string;
    /** Array of available functionalities */
    functionalities: Functionality[];
}

/**
 * Input interface for the 'get-functionality-details' functionality
 */
export interface GetFunctionalityDetailsInput {
    /** Path to the Fiori application */
    appPath: string;
    /** ID or array of IDs of the functionality(ies) */
    functionalityId: string | string[];
}

/**
 * Output interface for the 'get-functionality-details' functionality
 */
export interface GetFunctionalityDetailsOutput {
    /** ID of the functionality */
    id: string;
    /** Name of the functionality */
    name: string;
    /** Description of the functionality */
    description: string;
    /** Technical description of the functionality */
    technicalDescription?: string;
    /** Array of parameters for the functionality */
    parameters: Parameter[];
    /** Array of prerequisites for the functionality */
    prerequisites?: string[];
    /** Impact of the functionality */
    impact?: string;
    /** Array of examples for the functionality */
    examples?: string[];
    /** Name of the page associated with the functionality */
    pageName?: string;
}

/**
 * Input interface for the 'execute-functionality' functionality
 */
export interface ExecuteFunctionalitiesInput {
    /** ID or array of IDs of the functionality(ies) to execute */
    functionalityId: string | string[];
    /** Parameters for the functionality execution */
    parameters: any;
    /** Path to the Fiori application */
    appPath: string;
}

/**
 * Output interface for the 'execute-functionality' functionality
 */
export interface ExecuteFunctionalityOutput {
    /** ID or array of IDs of the executed functionality(ies) */
    functionalityId: string | string[];
    /** Status of the execution */
    status: string;
    /** Message describing the execution result */
    message: string;
    /** Parameters used in the execution */
    parameters: any;
    /** Path to the Fiori application */
    appPath: string;
    /** Array of changes made during the execution */
    changes: string[];
    /** Timestamp of the execution */
    timestamp: string;
}

/**
 * Interface representing a Fiori application
 */
export interface FioriApp {
    /** Name of the Fiori application */
    name: string;
    /** Path to the Fiori application */
    path: string;
    /** Type of the Fiori application */
    type: 'list-report' | 'freestyle' | 'analytical' | 'overview-page';
    /** Version of the Fiori application */
    version: string;
}

/**
 * Interface representing a functionality
 */
export interface Functionality {
    /** ID or array of IDs for the functionality */
    id: Array<string | number> | string;
    /** Description of the functionality */
    description: string;
}

/**
 * Interface representing a parameter
 */
export interface Parameter {
    /** ID of the parameter */
    id: string;
    /** Name of the parameter */
    name?: string;
    /** Type of the parameter */
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    /** Whether the parameter is required */
    required?: boolean;
    /** Description of the parameter */
    description?: string;
    /** Default value of the parameter */
    defaultValue?: unknown;
    /** Possible options for the parameter */
    options?: Array<string | number | boolean | undefined>;
    /** Current value of the parameter */
    currentValue?: unknown;
    /** Examples for the parameter */
    examples?: string[];
    /** Regex pattern to validate the value of this parameter */
    pattern?: string;
    /** Nested parameters (for 'object' type) */
    parameters?: Parameter[];
}

/**
 * Interface for functionality handlers
 */
export interface FunctionalityHandlers {
    /** Handler for getting functionality details */
    getFunctionalityDetails: (params: GetFunctionalityDetailsInput) => Promise<GetFunctionalityDetailsOutput>;
    /** Handler for executing functionality */
    executeFunctionality: (params: ExecuteFunctionalitiesInput) => Promise<ExecuteFunctionalityOutput>;
}

/**
 * Interface representing application details
 */
export interface Appdetails {
    /** Root path of the application */
    root: string;
    /** ID of the application */
    appId: string;
    /** Access details for the application */
    applicationAccess?: ApplicationAccess;
}
