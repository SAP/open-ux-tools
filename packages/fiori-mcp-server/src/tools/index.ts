import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as zod from 'zod';
import * as Input from '../types/input';
import * as Output from '../types/output';

export { listFioriApps } from './list-fiori-apps';
export { listFunctionalities } from './list-functionalities';
export { getFunctionalityDetails } from './get-functionality-details';
export { executeFunctionality } from './execute-functionality';

export const tools = [
    {
        name: 'list-fiori-apps',
        description: `Scans a specified directory to find existing SAP Fiori applications that can be modified.
                    This is an optional, preliminary tool.
                    **Use this first ONLY if the target application's name or path is not already known.**
                    The output can be used to ask the user for clarification before starting the main 3-step workflow.`,
        inputSchema: zod.toJSONSchema(Input.ListFioriAppsInputSchema),
        outputSchema: zod.toJSONSchema(Output.ListFioriAppsOutputSchema)
    },
    {
        name: 'list-functionality',
        description: `**(Step 1 of 3)**
                    Gets the complete and exclusive list of supported functionalities to create a new or modify an existing SAP Fiori application.
                    This is the **first mandatory step** to begin the workflow and requires a valid absolute path to a SAP Fiori application as input.
                    You MUST use a functionalityId from this tool's output to request details to the functionality in 'get-functionality-details' (Step 2).
                    You MUST not use a functionalityId as name of a tool.
                    Do not guess, assume, or use any functionality not present in this list, as it is invalid and will cause the operation to fail.
                    **Note: If the target application is not known, use the list-fiori-apps tool first to identify it.**`,
        inputSchema: zod.toJSONSchema(Input.ListFunctionalitiesInputSchema),
        outputSchema: zod.toJSONSchema(Output.ListFunctionalitiesOutputSchema)
    },
    {
        name: 'get-functionality-details',
        description: `**(Step 2 of 3)**
                    Gets the required parameters and detailed information for a specific functionality to create a new or modify an existing SAP Fiori application.
                    You MUST provide a functionalityId obtained from 'list-functionality' (Step 1).
                    The output of this tool is required for the final step 'execute-functionality' (Step 3).`,
        inputSchema: zod.toJSONSchema(Input.GetFunctionalityDetailsInputSchema),
        outputSchema: zod.toJSONSchema(Output.GetFunctionalityDetailsOutputSchema)
    },
    {
        name: 'execute-functionality',
        description: `**(Step 3 of 3)**
                    Executes a specific functionality to create a new or modify an existing SAP Fiori application with provided parameters.
                    This is the **final step** of the workflow and performs the actual creation or modification.
                    You MUST provide the exact parameter information obtained from get-functionality-details (Step 2).`,
        inputSchema: zod.toJSONSchema(Input.ExecuteFunctionalityInputSchema),
        outputSchema: zod.toJSONSchema(Output.ExecuteFunctionalityOutputSchema)
    }
] as Tool[];
