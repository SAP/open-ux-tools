#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    type Tool,
    type CallToolResult
} from '@modelcontextprotocol/sdk/types.js';
import { listFioriApps, listFunctionalities, getFunctionalityDetails, executeFunctionality } from './tools';
import {
    listFioriAppsOutputSchema,
    listFunctionalityOutputSchema,
    getFunctionalityDetailsOutputSchema,
    executeFunctionalityOutputSchema
} from './tools/output-schema';
import {
    listFioriAppsInputSchema,
    listFunctionalityInputSchema,
    getFunctionalityDetailsInputSchema,
    executeFunctionalityInputSchema
} from './tools/input-schema';
import type {
    ExecuteFunctionalitiesInput,
    GetFunctionalityDetailsInput,
    ListFioriAppsInput,
    ListFunctionalitiesInput
} from './types';

type ToolArgs =
    | ListFioriAppsInput
    | ListFunctionalitiesInput
    | GetFunctionalityDetailsInput
    | ExecuteFunctionalitiesInput
    | Record<string, unknown>;

export class FioriFunctionalityServer {
    private server: Server;

    /**
     * Initializes a new instance of the FioriFunctionalityServer.
     * Sets up the MCP server with Fiori functionality tools and error handling.
     */
    constructor() {
        this.server = new Server(
            {
                name: 'fiori-mcp',
                version: '0.0.1'
            },
            {
                capabilities: {
                    tools: {}
                }
            }
        );

        this.setupToolHandlers();
        this.setupErrorHandling();
    }

    /**
     * Sets up error handling for the server.
     * Logs MCP errors and handles the SIGINT signal for graceful shutdown.
     */
    private setupErrorHandling(): void {
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }

    /**
     * Sets up handlers for various MCP tools.
     * Configures handlers for listing tools, and calling specific Fiori functionality tools.
     */
    private setupToolHandlers(): void {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'list-fiori-apps',
                        description: `Scans a specified directory to find existing SAP Fiori applications that can be modified.
                                    This is an optional, preliminary tool.
                                    **Use this first ONLY if the target application's name or path is not already known.**
                                    The output can be used to ask the user for clarification before starting the main 3-step workflow.`,
                        inputSchema: listFioriAppsInputSchema,
                        outputSchema: listFioriAppsOutputSchema
                    },
                    {
                        name: 'list-functionality',
                        description: `**(Step 1 of 3)**
                                    Gets the complete and exclusive list of supported functionalities to create a new or modify an existing SAP Fiori application.
                                    This is the **first mandatory step** to begin the workflow and requires a valid absolute path to a SAP Fiori application as input.
                                    You MUST use a functionality_id from this tool's output for Step 2.
                                    Do not guess, assume, or use any functionality not present in this list, as it is invalid and will cause the operation to fail.
                                    **Note: If the target application is not known, use the list-fiori-apps tool first to identify it.**`,
                        inputSchema: listFunctionalityInputSchema,
                        outputSchema: listFunctionalityOutputSchema
                    },
                    {
                        name: 'get-functionality-details',
                        description: `**(Step 2 of 3)**
                                    Gets the required parameters and detailed information for a specific functionality to create a new or modify an existing SAP Fiori application.
                                    You MUST provide a functionality_id obtained from 'list-functionality' (Step 1).
                                    The output of this tool is required for the final step.`,
                        inputSchema: getFunctionalityDetailsInputSchema,
                        outputSchema: getFunctionalityDetailsOutputSchema
                    },
                    {
                        name: 'execute-functionality',
                        description: `**(Step 3 of 3)**
                                    Executes a specific functionality to create a new or modify an existing SAP Fiori application with provided parameters.
                                    This is the **final step** of the workflow and performs the actual creation or modification.
                                    You MUST provide the exact parameter information obtained from get-functionality-details (Step 2).`,
                        inputSchema: executeFunctionalityInputSchema,
                        outputSchema: executeFunctionalityOutputSchema
                    }
                ] as Tool[]
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params as { name: string; arguments: ToolArgs };

            try {
                let result;
                switch (name) {
                    case 'list-fiori-apps':
                        result = await listFioriApps(args as ListFioriAppsInput);
                        return this.convertResultToCallToolResult(result);
                    case 'list-functionality':
                        result = await listFunctionalities(args as ListFunctionalitiesInput);
                        return this.convertResultToCallToolResult(result);
                    case 'get-functionality-details':
                        result = await getFunctionalityDetails(args as GetFunctionalityDetailsInput);
                        return this.convertResultToCallToolResult(result);
                    case 'execute-functionality':
                        result = await executeFunctionality(args as ExecuteFunctionalitiesInput);
                        return this.convertResultToCallToolResult(result);
                    default:
                        throw new Error(
                            `Unknown tool: ${name}. Try one of: list-fiori-apps, list-functionality, get-functionality-details, execute-functionality.`
                        );
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${errorMessage}`
                        }
                    ]
                };
            }
        });
    }

    /**
     * Converts the result of a tool execution to the CallToolResult format.
     *
     * @param result - The result to be converted.
     * @returns The converted result in CallToolResult format.
     */
    private convertResultToCallToolResult<T extends object>(result: T | string): CallToolResult {
        const convertedResult: CallToolResult = {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result)
                }
            ]
        };

        if (!Array.isArray(result)) {
            convertedResult.structuredContent = result as Record<string, unknown>;
        }

        return convertedResult;
    }

    /**
     * Starts the FioriFunctionalityServer.
     * Connects the server to a StdioServerTransport and begins listening for requests.
     */
    async run(): Promise<void> {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Fiori Functionality MCP Server running on stdio');
    }
}
