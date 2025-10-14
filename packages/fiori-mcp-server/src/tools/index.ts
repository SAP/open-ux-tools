import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as Input from '../types/input';
import * as Output from '../types/output';
import { convertToSchema } from './utils';

export { docSearch } from './hybrid-search';
export type { SearchResponseData } from './hybrid-search';
export { listFioriApps } from './list-fiori-apps';
export { listFunctionalities } from './list-functionalities';
export { getFunctionalityDetails } from './get-functionality-details';
export { executeFunctionality } from './execute-functionality';

export const tools = [
    {
        name: 'search_docs',
        title: 'Search in Fiori Documentation',
        description:
            "Searches code snippets of Fiori Elements, Annotations, SAPUI5, Fiori tools documentation for the given query. You MUST use this tool if you're unsure about Fiori APIs. Optionally returns only code blocks.",
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
                    default: 25
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
        inputSchema: convertToSchema(Input.ListFioriAppsInputSchema),
        outputSchema: convertToSchema(Output.ListFioriAppsOutputSchema)
    },
    {
        name: 'list_functionality',
        description: `**(Step 1 of 3)**
                    Gets the complete and exclusive list of supported functionalities to create a new or modify an existing SAP Fiori application.
                    This is the **first mandatory step** to begin the workflow and requires a valid absolute path to a SAP Fiori application as input.
                    You MUST use a functionalityId from this tool's output to request details to the functionality in 'get_functionality_details' (Step 2).
                    You MUST not use a functionalityId as name of a tool.
                    Do not guess, assume, or use any functionality not present in this list, as it is invalid and will cause the operation to fail.
                    **Note: If the target application is not known, use the list_fiori_apps tool first to identify it.**
                    if the functionality list does not include a functionality to support the current goal, then try using the search_docs tool as a fallback.`,
        inputSchema: convertToSchema(Input.ListFunctionalitiesInputSchema),
        outputSchema: convertToSchema(Output.ListFunctionalitiesOutputSchema)
    },
    {
        name: 'get_functionality_details',
        description: `**(Step 2 of 3)**
                    Gets the required parameters and detailed information for a specific functionality to create a new or modify an existing SAP Fiori application.
                    You MUST provide a functionalityId obtained from 'list_functionality' (Step 1).
                    The output of this tool is required for the final step 'execute_functionality' (Step 3).`,
        inputSchema: convertToSchema(Input.GetFunctionalityDetailsInputSchema),
        outputSchema: convertToSchema(Output.GetFunctionalityDetailsOutputSchema)
    },
    {
        name: 'execute_functionality',
        description: `**(Step 3 of 3)**
                    Executes a specific functionality to create a new or modify an existing SAP Fiori application with provided parameters.
                    This is the **final step** of the workflow and performs the actual creation or modification.
                    You MUST provide the exact parameter information obtained from get_functionality_details (Step 2).`,
        inputSchema: convertToSchema(Input.ExecuteFunctionalityInputSchema),
        outputSchema: convertToSchema(Output.ExecuteFunctionalityOutputSchema)
    }
] as Tool[];
