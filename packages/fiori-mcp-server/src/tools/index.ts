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
        description: `Lists all SAP systems from the user's environment. This tool should only be used if the Service Center MCP tool list systems is unavailable. 
                    **ALWAYS** use the Service Center MCP tool 'list_systems' first if it is available. This tool is a fallback for environments where the Service Center MCP tool is not available.
                    Also use this tool when the user asks to 'list systems', 'list backends', or any equivalent phrasing.
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
        },
        outputSchema: convertToSchema(Output.ListSapSystemsOutputSchema)
    },
    {
        name: 'download_odata_service_metadata',
        description: `Downloads the metadata (EDMX) of a specific OData service URL from a SAP system and saves it as metadata.xml.
                    Note: this tool replaces the old 'fetch-service-metadata' functionality that was previously available via the 'execute_functionality' workflow — use this tool directly instead.

                    Usage guidelines:
                    - Use this before calling 'generate_fiori_app_odata' when the user provides a SAP system reference and a service path. 
                    - If a service name or technical id is provided instead of a service path DO NOT USE THIS TOOL. Instead use the Service Center MCP server tool to retrieve the service metadata and then pass it to 'generate_fiori_app_odata'.
                    - If a service path is provided by the user, use it directly via servicePath parameter.
                    - If the user provides a system name or host, use 'list_sap_systems' first to resolve it.
                    - Pass the full URL as sapSystemQuery.
                    - Returns host, servicePath, client, and metadataFilePath inside the result's parameters object.
                    - Pass ALL returned fields directly into the service config of 'generate_fiori_app_odata'. Map the returned properties to the app config service property input to 'generate_fiori_app_odata'.
                    - **Note:** This tool is only supported in VSCode. For SAP Business Application Studio, use the Service Center MCP server tool to retrieve the service metadata instead.
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
        description: `Creates (generates) a new SAP Fiori UI application either within an existing CAP project or standalone. ALWAYS read ALL of the following instructions carefully before calling this tool.

        🚨 CRITICAL - READ SCHEMA FIRST 🚨
        Before calling this tool, you MUST:
        1. Examine the inputSchema below to understand the EXACT structure required
        2. The input MUST match the schema type 'GeneratorConfigOData' with these TOP-LEVEL properties:
           - floorplan (must be: 'FE_LROP', 'FE_OVP', 'FE_ALP', 'FE_WORKLIST', 'FE_FEOP', 'FE_FPM', 'FF_SIMPLE', required)
           - project (object, required)
           - service (object, optional)
           - entityConfig (object, optional)
        3. DO NOT create properties like "config", or any other structure - use ONLY the properties defined in inputSchema

        Steps:
        1. Construct the tool arguments.
           - **IMPORTANT** ALWAYS use the app config schema defined by the type 'GeneratorConfigOData' to create the input structure. NEVER create an input in any other format.
           - The input MUST use the exact property names defined in the inputSchema: floorplan, project, service, entityConfig.
           - **ONLY** if the Service Center MCP is NOT available and the user provided a SAP system reference or URL with a **service path**, you **MUST** first call 'download_odata_service_metadata'.
           - If the Service Center MCP is available and the user provided a **service name or technical service id**, you **MUST** call the Service Center MCP server tool to retrieve the metadata and properties required for the service property of the input. 
           - Use the data returned to provide the required values (host, servicePath, client, destination, metadataFilePath) directly in the service property of the input.
           - If the Service Center MCP was used both host and destination **MUST** be passed in the service property of the input.
           - If Fiori MCP 'download_odata_service_metadata' was used and returns a host URL — pass it as service.host. If the host is not provided, you **MUST** ask for it.
           - **IMPORTANT**: On VSCode, if the service requires authentication and is not already stored, ask the user to store it first. Never ask for credentials directly.

        2. Parse the metadata.xml to understand the data model (entities, associations).

        3. Generate the application once the config is complete and valid.

        Example of CORRECT input structure:
        {
          "floorplan": "FE_LROP",
          "project": {
            "name": "my-travel-app",
            "title": "My Travel App",
            "description": "Travel management application",
            "targetFolder": "/home/user/projects",
            "ui5Version": "1.136.7"
          },
          "service": {
            "host": "https://my-system.example.com",
            "servicePath": "<full-odata-service-path>",
            "client": "000",
            "metadataFilePath": "/home/user/projects/metadata.xml",
            "destination": "MY_DESTINATION"
          },
          "entityConfig": {
            "mainEntity": { "entityName": "Travel" },
            "generateFormAnnotations": true,
            "generateLROPAnnotations": true
          }
        }`,
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
