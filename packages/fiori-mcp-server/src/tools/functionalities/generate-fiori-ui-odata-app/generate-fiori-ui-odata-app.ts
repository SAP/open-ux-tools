import { command } from './command';
import { GENERATE_FIORI_UI_ODATA_APP_ID, LATEST_UI5_VERSION } from '../../../constant';
import type {
    ExecuteFunctionalityInput,
    ExecuteFunctionalityOutput,
    FunctionalityHandlers,
    GetFunctionalityDetailsOutput
} from '../../../types';

export const GENERATE_FIORI_UI_ODATA_APP: GetFunctionalityDetailsOutput = {
    functionalityId: GENERATE_FIORI_UI_ODATA_APP_ID,
    name: 'Generate SAP Fiori UI Application for non-CAP Projects',
    description: `Creates (generates) a new SAP Fiori UI application within an existing project (RAP or other non-CAP).
                Crucially, you must first construct the appGenConfig JSON argument.
                If not provided - you **MUST** ask the user for the servicePath and host of the OData service they want to use.
                Then, you **MUST** query the service metadata endpoint to retrieve the list of available entities.
                (**IMPORTANT**: service metadata endpoint URL must end with "$metadata". If the provided servicePath does not end with "$metadata", you **MUST** append it.)
                Lastly, using the service $metadata response xml, figure out the data model structure, entities, and associations.`,
    parameters: [
        {
            id: 'projectPath',
            type: 'string',
            description:
                'The path to the non-CAP project folder. By default the currently opened project folder should be used.',
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
                            description: 'Absolute path to the non-CAP project folder (projectPath).',
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
                            examples: [
                                'odata/v4/<servicename>/',
                                'odata/v4/MyRiskService/',
                                'odata/v2/MyOdataV2Service/',
                                'odata/v4/MyOdataV4Service/',
                                "odata/v4/<relative '@path' annotation from service cds file>/",
                                "<absolute '@path' annotation from service cds file>/",
                                'myAbsolutePathFromServiceCdsFile/'
                            ],
                            description:
                                'The odata endpoint as provided by the cds mcp. If the parameter is not provided, the agent should ask the user for it.',
                            required: true
                        },
                        {
                            id: 'host',
                            type: 'string',
                            description:
                                'The host of the OData service. Must be an HTTPS endpoint. If the parameter is not provided, the agent should ask the user for it.',
                            required: true
                        },
                        {
                            id: 'edmx',
                            type: 'string',
                            description:
                                'The service metadata in the stringified XML format. Response from querying the $metadata endpoint of the OData service.',
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
                                    examples: ["'SalesOrder'", "'PurchaseOrderHeader'", "'MyEntity'"],
                                    description: "The name of the main entity, e.g. 'SalesOrder'",
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
    ]
};

/**
 * Retrieves the details of the Generate SAP Fiori UI Application functionality.
 *
 * @returns A promise that resolves to the functionality details output.
 */
async function getFunctionalityDetails(): Promise<GetFunctionalityDetailsOutput> {
    return GENERATE_FIORI_UI_ODATA_APP;
}

/**
 * Executes the Generate SAP Fiori UI Application functionality.
 *
 * @param params - The input parameters for executing the functionality.
 * @returns A promise that resolves to the execution output.
 */
async function executeFunctionality(params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    return command(params);
}

export const generateFioriUIodataAppHandlers: FunctionalityHandlers = {
    getFunctionalityDetails,
    executeFunctionality
};
