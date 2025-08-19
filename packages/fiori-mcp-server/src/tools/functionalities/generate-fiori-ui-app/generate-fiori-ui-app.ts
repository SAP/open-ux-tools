import { command } from './command';
import { GENERATE_FIORI_UI_APP_ID, LATEST_UI5_VERSION } from '../../../constant';
import type {
    ExecuteFunctionalitiesInput,
    ExecuteFunctionalityOutput,
    FunctionalityHandlers,
    GetFunctionalityDetailsOutput
} from '../../../types';

export const GENERATE_FIORI_UI_APP: GetFunctionalityDetailsOutput = {
    id: GENERATE_FIORI_UI_APP_ID,
    name: 'Generate SAP Fiori UI Application',
    description: `Creates (generates) a new SAP Fiori UI application within an existing CAP project.
                Crucially, you must first construct the appGenConfig JSON argument.
                To do this, you **MUST** use the ***CDS MCP*** to search the model for service definitions, entities, associations, and UI annotations.
                As a fallback, only if no such tool is available, you should manually read and parse all .cds files in the projectPath to extract this information.
                The data obtained from either method must then be formatted into a JSON object and passed as the appGenConfig parameter.`,
    parameters: [
        {
            id: 'projectPath',
            type: 'string',
            description:
                'The path to the CAP project folder. By default the currently opened project folder should be used.',
            required: true
        },
        {
            id: 'appGenConfig',
            type: 'object',
            description: `The configuration that will be used for the Application UI generation.
                        The configuration **MUST** be a valid JSON object corresponding to the inputSchema of the tool.
                        The configuration **MUST** be based on the project files in the projectPath.`,
            parameters: [
                {
                    id: 'version',
                    type: 'string',
                    options: ['0.2'],
                    description: 'Config schema version.',
                    required: true
                },
                {
                    id: 'floorplan',
                    type: 'string',
                    options: ['FE_LROP', 'FE_FEOP', 'FE_FPM'],
                    description: 'SAP Fiori Elements floor plan type.',
                    required: true
                },
                {
                    id: 'projectType',
                    type: 'string',
                    options: ['LIST_REPORT_OBJECT_PAGE', 'FORM_ENTRY_OBJECT_PAGE', 'FLEXIBLE_PROGRAMMING_MODEL'],
                    description: 'Corresponds to the SAP Fiori Elements floor plan.',
                    required: true
                },
                {
                    id: 'project',
                    type: 'object',
                    parameters: [
                        {
                            id: 'name',
                            type: 'string',
                            description: "Must be lowercase with dashes, e.g., 'sales-order-management'.",
                            pattern: '^[a-z0-9-]+$',
                            required: true
                        },
                        {
                            id: 'title',
                            type: 'string',
                            required: false
                        },
                        {
                            id: 'description',
                            type: 'string',
                            required: true
                        },
                        {
                            id: 'targetFolder',
                            type: 'string',
                            description: 'Absolute path to the CAP project folder (projectPath).',
                            required: true
                        },
                        {
                            id: 'ui5Version',
                            type: 'string',
                            options: [LATEST_UI5_VERSION],
                            required: true
                        },
                        {
                            id: 'localUI5Version',
                            type: 'string',
                            options: ['1.82.2'],
                            required: true
                        },
                        {
                            id: 'sapux',
                            type: 'boolean',
                            defaultValue: true,
                            required: true
                        }
                    ],
                    required: true
                },
                {
                    id: 'service',
                    type: 'object',
                    parameters: [
                        {
                            id: 'servicePath',
                            type: 'string',
                            description: "e.g. 'service/servicename/'",
                            required: true
                        },
                        {
                            id: 'capService',
                            type: 'object',
                            parameters: [
                                {
                                    id: 'projectPath',
                                    type: 'string',
                                    required: true
                                },
                                {
                                    id: 'serviceName',
                                    type: 'string',
                                    required: true
                                },
                                {
                                    id: 'serviceCdsPath',
                                    type: 'string',
                                    description: "e.g. 'srv/service.cds'",
                                    required: true
                                }
                            ],
                            required: true
                        }
                    ],
                    required: true
                },
                {
                    id: 'entityConfig',
                    type: 'object',
                    parameters: [
                        {
                            id: 'mainEntity',
                            type: 'object',
                            parameters: [
                                {
                                    id: 'entityName',
                                    type: 'string',
                                    description: "e.g. 'SalesOrder'",
                                    required: true
                                }
                            ],
                            required: true
                        },
                        {
                            id: 'generateFormAnnotations',
                            type: 'boolean',
                            required: true
                        },
                        {
                            id: 'generateLROPAnnotations',
                            type: 'boolean',
                            required: true
                        }
                    ],
                    required: true
                },
                {
                    id: 'telemetryData',
                    type: 'object',
                    parameters: [
                        {
                            id: 'generationSourceName',
                            type: 'string',
                            options: ['AI Headless MCP'],
                            required: true
                        },
                        {
                            id: 'generationSourceVersion',
                            type: 'string',
                            options: ['1.0.0'],
                            required: true
                        }
                    ],
                    required: true
                }
            ],
            required: true
        }
    ],
    examples: [
        'Create an app that I can use to maintain bookings for my dog grooming business',
        'Create an app that I can use to maintain orders taken for dog equipment',
        'Create an app that I can use to add bookings for my dog grooming business',
        'Create an app that I can use to show bookings for my dog grooming business',
        'Create a fiori app to show top ten beautiful parks in the world.'
    ]
};

/**
 * Retrieves the details of the Generate SAP Fiori UI Application functionality.
 *
 * @returns A promise that resolves to the functionality details output.
 */
async function getFunctionalityDetails(): Promise<GetFunctionalityDetailsOutput> {
    return GENERATE_FIORI_UI_APP;
}

/**
 * Executes the Generate SAP Fiori UI Application functionality.
 *
 * @param params - The input parameters for executing the functionality.
 * @returns A promise that resolves to the execution output.
 */
async function executeFunctionality(params: ExecuteFunctionalitiesInput): Promise<ExecuteFunctionalityOutput> {
    return command(params);
}

export const generateFioriUIAppHandlers: FunctionalityHandlers = {
    getFunctionalityDetails,
    executeFunctionality
};
