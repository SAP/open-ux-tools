import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as Input from '../types/input.js';
import * as Output from '../types/output.js';
import { convertToSchema } from '../utils/index.js';
import { generatorConfigODataJson, generatorConfigCAPJson } from './schemas/index.js';

export { docSearch } from './hybrid-search.js';
export type { SearchResponseData } from './hybrid-search.js';
export { listFioriApps } from './list-fiori-apps.js';
export { listFunctionalities } from './list-functionalities.js';
export { getFunctionalityDetails } from './get-functionality-details.js';
export { executeFunctionality } from './execute-functionality.js';
export { listSapSystems } from './list-sap-systems.js';
export { downloadODataServiceMetadata } from './download-odata-service-metadata.js';
export { generateFioriAppOData } from './generate-fiori-app-odata.js';
export { generateFioriAppCap } from './generate-fiori-app-cap.js';

export const tools = [
    {
        name: 'search_docs',
        description:
            "Searches code snippets of Fiori Elements, Annotations, SAPUI5, Fiori tools documentation for the given query. You MUST use this tool if you're unsure about Fiori APIs. Optionally returns only code blocks.",
        annotations: {
            title: 'Search in Fiori Documentation',
            readOnlyHint: true,
            idempotentHint: true,
            openWorldHint: true
        },
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query'
                },
                maxResults: {
                    type: 'number',
                    description: 'Maximum number of results to return',
                    default: 10
                }
            },
            required: ['query']
        }
    },
    {
        name: 'list_fiori_apps',
        description: `Scans a specified directory to find existing SAP Fiori applications that can be modified.
                    This is an optional, preliminary tool.
                    **Use this first ONLY if the target application's name or path is not already known.**
                    The output can be used to ask the user for clarification before starting the main 3-step workflow.`,
        annotations: {
            title: 'List Fiori Applications',
            readOnlyHint: true,
            idempotentHint: true,
            openWorldHint: false
        },
        inputSchema: convertToSchema(Input.ListFioriAppsInputSchema),
        outputSchema: convertToSchema(Output.ListFioriAppsOutputSchema)
    },
    {
        name: 'list_sap_systems',
        description: `Lists all SAP systems from the user's environment. This will be SAP Fiori tools system store on VSCode or destinations on Business Application.
                    Also use this tool when the user asks to 'list destinations', 'list systems', 'list backends', or any equivalent phrasing.
                    Use this tool when the user references a SAP system by name or when you need to discover available systems
                    before calling 'download_odata_service_metadata' or generating a Fiori application.`,
        annotations: {
            title: 'List SAP Systems',
            readOnlyHint: true,
            idempotentHint: true,
            openWorldHint: false
        },
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'download_odata_service_metadata',
        description: `Downloads the metadata (EDMX) of a specific OData service from a SAP system and saves it as metadata.xml.
                    Also known as 'fetch-service-metadata' (previous name, kept for backwards compatibility).
                    Use this before calling 'generate_fiori_app_odata' when the user provides a SAP system reference or service URL.
                    - If the user provides a system name or host, use 'list_sap_systems' first to resolve it.
                    - Pass the full URL as sapSystemQuery if a full URL is provided; pass only the path as servicePath.
                    - Returns host, servicePath, client, metadataFilePath and destination (on SAP Business Application Studio) inside the result's parameters object.
                    - Pass ALL returned fields directly into the service config of 'generate_fiori_app_odata'. On BAS, destination is mandatory and must be included.
                    **IMPORTANT**: On VSCode, if the service requires authentication and the system is not already stored, ask the user to store it first. Do not ask for credentials directly.`,
        annotations: {
            title: 'Download OData Service Metadata',
            readOnlyHint: false,
            idempotentHint: false,
            openWorldHint: true
        },
        inputSchema: convertToSchema(Input.DownloadODataServiceMetadataInputSchema),
        outputSchema: convertToSchema(Output.FetchServiceMetadataOutputSchema)
    },
    {
        name: 'generate_fiori_app_odata',
        description: `Creates (generates) a new SAP Fiori UI application within an existing project (RAP or other non-CAP).

        Steps:
        1. Construct the appGenConfig JSON argument.
           - If the user provided a SAP system reference or URL, you **MUST** first call 'download_odata_service_metadata'
             to retrieve the metadata. Use ALL fields it returns (host, servicePath, client, destination, metadataFilePath) directly in the service config.
           - In SAP Business Application Studio, 'download_odata_service_metadata' returns both host and destination — both **MUST** be passed in the service config.
           - On VSCode, 'download_odata_service_metadata' returns a host URL — pass it as service.host. If the host is not provided, you **MUST** ask for it.
           - **IMPORTANT**: On VSCode, if the service requires authentication and is not already stored, ask the user to store it first. Never ask for credentials directly.

        2. Parse the metadata.xml to understand the data model (entities, associations).

        3. Generate the application once the config is complete and valid.`,
        annotations: {
            title: 'Generate SAP Fiori App (OData / non-CAP)',
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: false,
            openWorldHint: false
        },
        inputSchema: generatorConfigODataJson
    },
    {
        name: 'generate_fiori_app_cap',
        description: `Creates (generates) a new SAP Fiori UI application within an existing CAP project.
                    To populate parameters, you **MUST** use the ***CDS MCP*** to search the model for service definitions, entities, associations, and UI annotations.
                    As a fallback, only if no such tool is available, manually read and parse all .cds files in the projectPath.
                    The configuration **MUST** be a valid JSON object matching the tool's inputSchema and based on the project files.`,
        annotations: {
            title: 'Generate SAP Fiori App (CAP)',
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: false,
            openWorldHint: false
        },
        inputSchema: generatorConfigCAPJson
    },
    {
        name: 'list_functionality',
        description: `**(Step 1 of 3) — Use this to modify an existing SAP Fiori application.**
                    Returns the complete list of supported modification operations for a given application, including:
                    adding or deleting pages, creating controller extensions, and changing any Fiori Elements manifest property.
                    This is the **first mandatory step** for modifying an existing app and requires a valid absolute path to a SAP Fiori application.
                    You MUST use a functionalityId from this tool's output in 'get_functionality_details' (Step 2).
                    You MUST NOT use a functionalityId as a tool name.
                    Do not guess or assume functionalityIds — only use what this tool returns.
                    **Note: If the target application is not known, use 'list_fiori_apps' first.**
                    **Note: To generate a new app, use 'generate_fiori_app_odata' or 'generate_fiori_app_cap' instead.**
                    If the functionality list does not cover your goal, use 'search_docs' as a fallback.`,
        annotations: {
            title: 'List Supported Fiori Modification Functionalities',
            readOnlyHint: true,
            idempotentHint: true,
            openWorldHint: false
        },
        inputSchema: convertToSchema(Input.ListFunctionalitiesInputSchema),
        outputSchema: convertToSchema(Output.ListFunctionalitiesOutputSchema)
    },
    {
        name: 'get_functionality_details',
        description: `**(Step 2 of 3)**
                    Gets the required parameters and detailed information for a specific functionality to modify an existing SAP Fiori application.
                    You MUST provide a functionalityId obtained from 'list_functionality' (Step 1).
                    The output of this tool is required for the final step 'execute_functionality' (Step 3).`,
        annotations: {
            title: 'Get Fiori Functionality Details',
            readOnlyHint: true,
            idempotentHint: true,
            openWorldHint: false
        },
        inputSchema: convertToSchema(Input.GetFunctionalityDetailsInputSchema),
        outputSchema: convertToSchema(Output.GetFunctionalityDetailsOutputSchema)
    },
    {
        name: 'execute_functionality',
        description: `**(Step 3 of 3)**
                    Executes a specific functionality to modify an existing SAP Fiori application with provided parameters.
                    This is the **final step** of the workflow and performs the actual modification.
                    You MUST provide the exact parameter information obtained from get_functionality_details (Step 2).`,
        annotations: {
            title: 'Execute Fiori Functionality',
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: false,
            openWorldHint: true
        },
        inputSchema: convertToSchema(Input.ExecuteFunctionalityInputSchema),
        outputSchema: convertToSchema(Output.ExecuteFunctionalityOutputSchema)
    }
] as Tool[];
