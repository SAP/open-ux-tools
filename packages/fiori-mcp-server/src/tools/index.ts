import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as Input from '../types/input';
import * as Output from '../types/output';
import { convertToSchema } from '../utils';
import { generatorConfigODataJson, generatorConfigCAPJson } from './schemas';

export { docSearch } from './hybrid-search';
export type { SearchResponseData } from './hybrid-search';
export { listFioriApps } from './list-fiori-apps';
export { listFunctionalities } from './list-functionalities';
export { getFunctionalityDetails } from './get-functionality-details';
export { executeFunctionality } from './execute-functionality';
export { listSapSystems } from './list-sap-systems';
export { downloadODataServiceMetadata } from './download-odata-service-metadata';
export { generateFioriAppOData } from './generate-fiori-app-odata';
export { generateFioriAppCap } from './generate-fiori-app-cap';
export { generateAdaptationProject } from './generate-adaptation-project';
export { openAdaptationEditor } from './open-adaptation-editor';
export { adpControllerExtension } from './adp-controller-extension';
export { listLibrariesFromSystem } from './get-libraries';
export { readODataMetadataAdp } from './get-adp-odata-metada';
export { listODataServices } from './get-odata-services';

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
        description: `Lists all SAP systems stored in the user's environment (e.g. SAP Fiori tools system store).
                    Use this tool when the user references a SAP system by name or when you need to discover available systems
                    before calling 'download_odata_service_metadata', 'generate_adaptation_project', or generating a Fiori application.`,
        annotations: {
            title: 'List SAP Systems',
            readOnlyHint: true,
            idempotentHint: true,
            openWorldHint: false
        },
        inputSchema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'download_odata_service_metadata',
        description: `Downloads the metadata (EDMX) of a specific OData service from a SAP system and saves it as metadata.xml.
                    Use this before calling 'generate_fiori_app_odata' when the user provides a SAP system reference or service URL.
                    - If the user provides a system name or host, use 'list_sap_systems' first to resolve it.
                    - Pass the full URL as sapSystemQuery if a full URL is provided; pass only the path as servicePath.
                    - Returns host, servicePath, client and metadataFilePath needed for 'generate_fiori_app_odata'.
                    **IMPORTANT**: If the service requires authentication and the system is not already stored, ask the user to store it first. Do not ask for credentials directly.`,
        annotations: {
            title: 'Download OData Service Metadata',
            readOnlyHint: false,
            idempotentHint: false,
            openWorldHint: true
        },
        inputSchema: convertToSchema(Input.DownloadODataServiceMetadataInputSchema)
    },
    {
        name: 'generate_fiori_app_odata',
        description: `Creates (generates) a new SAP Fiori UI application within an existing project (RAP or other non-CAP).

        Steps:
        1. Construct the appGenConfig JSON argument.
           - If the user has not provided a valid servicePath and host (URL), you **MUST** ask for it.
           - If the user provided a SAP system reference or URL, you **MUST** first call 'download_odata_service_metadata'
             to retrieve the metadata and get the host, servicePath, client and metadataFilePath for the config.
           - **IMPORTANT**: If the service requires authentication and is not already stored, ask the user to store it first. Never ask for credentials directly.

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
        name: 'generate_adaptation_project',
        description: `Generates a new SAP Fiori adaptation project by calling the @sap-ux/adp generator.

        This tool requires:
        - system: The name of the SAP system (from list_sap_systems)
        - application: The application ID to adapt

        Optional parameters: targetFolder, projectName, namespace, applicationTitle, client, username, password.

        Use 'list_sap_systems' first to discover available systems.
        The generator will be executed with the provided JSON configuration.`,
        annotations: {
            title: 'Generate Adaptation Project',
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: false,
            openWorldHint: false
        },
        inputSchema: convertToSchema(Input.GenerateAdaptationProjectInputSchema)
    },
    {
        name: 'open_adaptation_editor',
        description: `Starts the adaptation editor server by running 'npx fiori run /test/adaptation-editor.html' in the adaptation project directory.

        This tool:
        - Spawns the editor server process in the background
        - Extracts the server URL and editor path from the command output
        - Returns the full editor URL and process ID
        - Provides instructions on how to stop the editor process

        The editor server will run independently in the background. Use the returned process ID or port to stop it if needed.`,
        annotations: {
            title: 'Open Adaptation Editor',
            readOnlyHint: false,
            idempotentHint: false,
            openWorldHint: false
        },
        inputSchema: convertToSchema(Input.OpenAdaptationEditorInputSchema)
    },
    {
        name: 'adp_controller_extension',
        description: `Processes AI-generated controller extensions and fragments for SAPUI5 Adaptation Projects.

        This tool:
        - Validates that the project is an adaptation project (has manifest.appdescr_variant)
        - Reads manifest.appdescr_variant to determine layer and namespace requirements
        - Extracts files from the AI response (markdown code blocks with **Path:** markers)
        - Writes controller extension files, fragments, and other code files
        - Does NOT write change files (.change) - these are handled separately

        CRITICAL: The 'aiResponse' parameter must contain pre-generated code with markdown code blocks,
        each preceded by "**Path:** fullFilePath" on its own line.
        Call this tool first without 'aiResponse' to receive detailed generation rules and project context.`,
        annotations: {
            title: 'ADP Controller Extension',
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: false,
            openWorldHint: false
        },
        inputSchema: convertToSchema(Input.AdpControllerExtensionInputSchema)
    },
    {
        name: 'list_libraries_from_system',
        description: `Lists all available libraries from the specified SAP system.

        This tool:
        - Reads the SAP system connection details from the provided appPath (using ui5.yaml configuration)
        - Connects to the SAP system and retrieves the list of available UI5 libraries with descriptors
        - Returns an array of library objects with details such as name, version, and description

        Use this tool when you need to discover which UI5 libraries are available in the connected SAP system, for adding an OData Service to the manifest.`,
        annotations: {
            title: 'List Libraries from SAP System',
            readOnlyHint: true,
            idempotentHint: true,
            openWorldHint: false
        },
        inputSchema: convertToSchema(Input.ListFunctionalitiesInputSchema)
    },
    {
        name: 'list_odata_services_from_system',
        description: `Lists all available OData services from the specified SAP system.

        This tool:
        - Reads the SAP system connection details from the provided appPath (using ui5.yaml configuration)
        - Connects to the SAP system and retrieves the list of available OData services
        - Returns an array of OData service objects with details such as name, version, and description

        Use this tool when you need to discover which OData services are available in the connected SAP system, for adding an OData Service to the manifest.`,
        annotations: {
            title: 'List OData Services from SAP System',
            readOnlyHint: true,
            idempotentHint: true,
            openWorldHint: false
        },
        inputSchema: convertToSchema(Input.ODataServiceInputSchema)
    },
    {
        name: 'read_odata_metadata_adp',
        description: `Reads the OData metadata for the specified Adaptation Project.

        This tool:
        - Reads the SAP system connection details from the provided appPath (using ui5.yaml configuration)
        - Connects to the SAP system and retrieves the OData metadata
        - Returns the OData metadata of the merged app descriptor for the Adaptation Project

        Use this tool when you need to read the OData metadata for an Adaptation Project.`,
        annotations: {
            title: 'Read OData Metadata for Adaptation Project',
            readOnlyHint: true,
            idempotentHint: true,
            openWorldHint: false
        },
        inputSchema: convertToSchema(Input.AdpMetadataInputSchema)
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
