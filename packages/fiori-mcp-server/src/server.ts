#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import packageJson from '../package.json';
import { listFioriApps, listFunctionalities, getFunctionalityDetails, executeFunctionality, tools } from './tools';
import type {
    ExecuteFunctionalitiesInput,
    GetFunctionalityDetailsInput,
    ListFioriAppsInput,
    ListFunctionalitiesInput
} from './types';
import { TelemetryHelper, TelemetryData } from './telemetry';

type ToolArgs =
    | ListFioriAppsInput
    | ListFunctionalitiesInput
    | GetFunctionalityDetailsInput
    | ExecuteFunctionalitiesInput
    | Record<string, unknown>;

/**
 * Sets up and manages an MCP (Model Context Protocol) server that provides Fiori-related tools.
 */
export class FioriFunctionalityServer {
    private readonly server: Server;

    /**
     * Initializes a new instance of the FioriFunctionalityServer.
     * Sets up the MCP server with Fiori functionality tools and error handling.
     */
    constructor() {
        this.server = new Server(
            {
                name: 'fiori-mcp',
                version: packageJson.version
            },
            {
                capabilities: {
                    tools: {}
                }
            }
        );

        this.setupToolHandlers();
        this.setupErrorHandling();
        this.setupTelemetry();
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
     * Sets up telemetry.
     */
    private async setupTelemetry(): Promise<void> {
        await TelemetryHelper.initTelemetrySettings();
    }

    /**
     * Sets up handlers for various MCP tools.
     * Configures handlers for listing tools, and calling specific Fiori functionality tools.
     */
    private setupToolHandlers(): void {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params as { name: string; arguments: ToolArgs };

            try {
                let result;
                TelemetryHelper.markToolStartTime();

                switch (name) {
                    case 'list-fiori-apps':
                        result = await listFioriApps(args as ListFioriAppsInput);
                        break;
                    case 'list-functionality':
                        result = await listFunctionalities(args as ListFunctionalitiesInput);
                        break;
                    case 'get-functionality-details':
                        result = await getFunctionalityDetails(args as GetFunctionalityDetailsInput);
                        break;
                    case 'execute-functionality':
                        result = await executeFunctionality(args as ExecuteFunctionalitiesInput);
                        break;
                    default:
                        throw new Error(
                            `Unknown tool: ${name}. Try one of: list-fiori-apps, list-functionality, get-functionality-details, execute-functionality.`
                        );
                }
                const telemetryProperties: TelemetryData = {
                    tool: name,
                    functionalityId: (args as any)?.functionalityId
                };

                TelemetryHelper.sendTelemetry(name, telemetryProperties, (args as any)?.appPath);

                return this.convertResultToCallToolResult(result);
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
