import type { ApplicationAccess } from '@sap-ux/project-access';

// Types for our Fiori functionality
// Input of 'list-fiori-apps'
export interface ListFioriAppsInput {
    searchPath: string[];
}
// Output of 'list-fiori-apps'
export interface ListFioriAppsOutput {
    applications: FioriApp[];
}

// Input of 'list-functionality'
export interface ListFunctionalitiesInput {
    appPath: string;
}

// Output of 'list-functionality'
export interface ListFunctionalitiesOutput {
    applicationPath: string;
    functionalities: Functionality[];
}

// Input of 'get-functionality-details'
export interface GetFunctionalityDetailsInput {
    appPath: string;
    functionalityId: string | string[];
}

// Output of 'get-functionality-details'
export interface GetFunctionalityDetailsOutput {
    id: string;
    name: string;
    description: string;
    technicalDescription?: string;
    parameters: Parameter[];
    prerequisites?: string[];
    impact?: string;
    examples?: string[];
    pageName?: string;
}

// Input of 'execute-functionality'
export interface ExecuteFunctionalitiesInput {
    functionalityId: string | string[];
    parameters: any;
    appPath: string;
}

// Output of 'execute-functionality'
export interface ExecuteFunctionalityOutput {
    functionalityId: string | string[];
    status: string;
    message: string;
    parameters: any;
    appPath: string;
    changes: string[];
    timestamp: string;
}

export interface FioriApp {
    name: string;
    path: string;
    type: 'list-report' | 'freestyle' | 'analytical' | 'overview-page';
    version: string;
}

export interface Functionality {
    id: Array<string | number> | string;
    description: string;
}

export interface Parameter {
    id: string;
    name?: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    description?: string;
    defaultValue?: any;
    options?: Array<string | number | boolean | undefined>;
    currentValue?: unknown;
    examples?: string[];
    /**
     * regex pattern to validate the value of this parameter.
     */
    pattern?: string;
    parameters?: Parameter[];
}
export interface FunctionalityHandlers {
    getFunctionalityDetails: (params: GetFunctionalityDetailsInput) => Promise<GetFunctionalityDetailsOutput>;
    executeFunctionality: (params: ExecuteFunctionalitiesInput) => Promise<ExecuteFunctionalityOutput>;
}
// Remove custom ToolResult interface - we'll use MCP's CallToolResult directly

export interface Appdetails {
    root: string;
    appId: string;
    applicationAccess?: ApplicationAccess;
}
