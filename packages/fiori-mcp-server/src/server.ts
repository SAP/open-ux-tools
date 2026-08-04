#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    InitializeRequestSchema,
    ListToolsRequestSchema,
    SUPPORTED_PROTOCOL_VERSIONS,
    type CallToolResult
} from '@modelcontextprotocol/sdk/types.js';
import { PACKAGE_VERSION } from './package-info.js';
import {
    docSearch,
    listFioriApps,
    listFunctionalities,
    getFunctionalityDetails,
    executeFunctionality,
    listSapSystems,
    downloadODataServiceMetadata,
    generateFioriAppOData,
    generateFioriAppCap,
    tools
} from './tools/index.js';
import { TelemetryHelper, unknownTool, type TelemetryData } from './telemetry/index.js';
import { TELEMETRY_MCP_SERVER_INITIALIZED, TELEMETRY_MCP_LIST_TOOLS } from './constant.js';
import type {
    ExecuteFunctionalityInput,
    GetFunctionalityDetailsInput,
    DocSearchInput,
    ListFioriAppsInput,
    ListFunctionalitiesInput,
    DownloadODataServiceMetadataInput
} from './types/index.js';
import type { GeneratorConfigOData, GeneratorConfigCAP } from './tools/schemas/index.js';
import { logger } from './utils/logger.js';

type ToolArgs =
    | DocSearchInput
    | ListFioriAppsInput
    | ListFunctionalitiesInput
    | GetFunctionalityDetailsInput
    | ExecuteFunctionalityInput
    | DownloadODataServiceMetadataInput
    | GeneratorConfigOData
    | GeneratorConfigCAP
    | Record<string, unknown>;

const FALLBACK_PROTOCOL_VERSION = '2024-11-05';

function negotiateProtocolVersion(requested: string): string {
    if (SUPPORTED_PROTOCOL_VERSIONS.includes(requested)) {
        return requested;
    }
    if (SUPPORTED_PROTOCOL_VERSIONS.includes(FALLBACK_PROTOCOL_VERSION)) {
        return FALLBACK_PROTOCOL_VERSION;
    }
    // if FALLBACK_PROTOCOL_VERSION was removed from the SDK; return the newest available version
    // (last element, since the SDK lists versions oldest-first) for maximum forward-compatibility.
    return SUPPORTED_PROTOCOL_VERSIONS[SUPPORTED_PROTOCOL_VERSIONS.length - 1];
}

/**
 * Sets up and manages an MCP (Model Context Protocol) server that provides Fiori-related tools.
 */
export class FioriFunctionalityServer {
    private readonly server: Server;
    private mcpClientName = 'unknown-client';
    private mcpClientVersion = 'unknown-version';

    /**
     * Initializes a new instance of the FioriFunctionalityServer.
     * Sets up the MCP server with Fiori functionality tools and error handling.
     */
    constructor() {
        this.server = new Server(
            {
                name: 'fiori-mcp',
                version: PACKAGE_VERSION,
                icons: [
                    {
                        src: 'https://raw.githubusercontent.com/SAP/open-ux-tools/main/packages/fiori-mcp-server/assets/icon.svg',
                        mimeType: 'image/svg+xml'
                    },
                    {
                        src: 'https://raw.githubusercontent.com/SAP/open-ux-tools/main/packages/fiori-mcp-server/assets/icon.png',
                        mimeType: 'image/png'
                    }
                ],
                title: 'MCP Server for SAP Fiori'
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
        this.server.onerror = (error): void => logger.error(`[MCP Error] ${error}`);
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
        this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
            this.mcpClientName = request.params.clientInfo?.name || 'unknown-client';
            this.mcpClientVersion = request.params.clientInfo?.version || 'unknown-version';
            logger.info(`MCP Client connected: ${this.mcpClientName} v${this.mcpClientVersion}`);

            const telemetryProperties: TelemetryData = {
                mcpClientName: this.mcpClientName,
                mcpClientVersion: this.mcpClientVersion
            };
            await TelemetryHelper.sendTelemetry(TELEMETRY_MCP_SERVER_INITIALIZED, telemetryProperties);

            return {
                // Echo back the client's requested version if supported; fall back to 2024-11-05
                // (the first broadly-adopted version) as the safest baseline for unknown clients.
                // If that version is ever removed from the SDK, we fall back to the oldest available.
                protocolVersion: negotiateProtocolVersion(request.params.protocolVersion),
                capabilities: {
                    tools: {}
                },
                serverInfo: {
                    name: 'fiori-mcp',
                    version: PACKAGE_VERSION
                },
                instructions: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨🚨🚨 STOP - READ THIS BEFORE CALLING ANY TOOLS 🚨🚨🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOU ARE CONNECTED TO: SAP Fiori MCP Server

MANDATORY PROTOCOL - NO EXCEPTIONS:
1. Call tools/list FIRST in every session
2. Read the inputSchema for EVERY tool before calling it
3. Use ONLY the properties defined in inputSchema
4. DO NOT add extra properties, notes, or wrapper objects

IF YOU SKIP THESE STEPS:
❌ Your tool call will FAIL
❌ User's task will FAIL
❌ You will waste tokens and time
❌ You are violating the MCP protocol

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## CORRECT Tool Call Workflow

✅ Step 1: Call tools/list
✅ Step 2: Examine inputSchema of the tool you need
✅ Step 3: Construct parameters using ONLY properties from inputSchema
✅ Step 4: Call the tool

## INCORRECT Workflow (DO NOT DO THIS)

❌ Assume you know the schema from training data
❌ Skip reading inputSchema
❌ Add properties not in inputSchema
❌ Wrap parameters in extra objects

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Modifying an existing SAP Fiori application (3-step workflow)

When the user wants to modify an existing Fiori app, you MUST follow these steps in order:

1. **list_functionality** (Step 1) — Call with the absolute path to the Fiori app. Returns all supported modification operations and their functionalityIds.
2. **get_functionality_details** (Step 2) — Call with a functionalityId from Step 1. Returns the exact parameters required for the modification.
3. **execute_functionality** (Step 3) — Call with the parameters from Step 2 to apply the modification.

Never skip steps or guess functionalityIds. Never use a functionalityId as a tool name.

## Generating a new SAP Fiori application

- For OData/non-CAP projects: use \`generate_fiori_app_odata\`
  - BEFORE CALLING: Read its inputSchema from tools/list
  - REQUIRED top-level properties: floorplan, project
  - OPTIONAL top-level properties: service, entityConfig
  - DO NOT add: config, metadata, NOTE, or any other properties

- For CAP projects: use \`generate_fiori_app_cap\`
  - BEFORE CALLING: Read its inputSchema from tools/list

- If a SAP system or service URL is involved, call \`download_odata_service_metadata\` first and pass ALL fields it returns into the generator config.

## Other available tools

- \`list_sap_systems\` — list available SAP backends/destinations
- \`list_fiori_apps\` — discover existing Fiori apps in a directory
- \`search_docs\` — search Fiori Elements, SAPUI5, and annotation documentation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
            };
        });

        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            const telemetryProperties: TelemetryData = {
                mcpClientName: this.mcpClientName,
                mcpClientVersion: this.mcpClientVersion
            };
            await TelemetryHelper.sendTelemetry(TELEMETRY_MCP_LIST_TOOLS, telemetryProperties);

            return {
                tools
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params as { name: string; arguments: ToolArgs };

            try {
                let result;
                TelemetryHelper.markToolStartTime();
                const telemetryProperties: TelemetryData = {
                    tool: name,
                    mcpClientName: this.mcpClientName,
                    mcpClientVersion: this.mcpClientVersion
                };
                if (args && 'functionalityId' in args) {
                    const { functionalityId } = args;
                    const shouldPrefixWithPropertyChange =
                        Array.isArray(functionalityId) && functionalityId.length >= 1;
                    if (shouldPrefixWithPropertyChange) {
                        telemetryProperties.functionalityId = `property-change:${functionalityId.at(-1)}`;
                    } else {
                        telemetryProperties.functionalityId = functionalityId as string;
                    }
                }

                logger.debug(`Executing tool: ${name} with arguments: ${JSON.stringify(args)}`);

                switch (name) {
                    case 'search_docs':
                        result = await docSearch(args as DocSearchInput, true);
                        break;
                    case 'list_fiori_apps':
                        result = await listFioriApps(args as ListFioriAppsInput);
                        break;
                    case 'list_sap_systems':
                        result = await listSapSystems();
                        break;
                    case 'download_odata_service_metadata':
                        result = await downloadODataServiceMetadata(args as DownloadODataServiceMetadataInput);
                        break;
                    case 'generate_fiori_app_odata':
                        result = await generateFioriAppOData(args as GeneratorConfigOData);
                        break;
                    case 'generate_fiori_app_cap':
                        result = await generateFioriAppCap(args as GeneratorConfigCAP);
                        break;
                    case 'list_functionality':
                        result = await listFunctionalities(args as ListFunctionalitiesInput);
                        break;
                    case 'get_functionality_details':
                        result = await getFunctionalityDetails(args as GetFunctionalityDetailsInput);
                        break;
                    case 'execute_functionality':
                        result = await executeFunctionality(args as ExecuteFunctionalityInput);
                        break;
                    default:
                        // Do not pass telemetryProperties to unknownTool
                        await TelemetryHelper.sendTelemetry(unknownTool, {}, (args as any)?.appPath);
                        throw new Error(
                            `Unknown tool: ${name}. Try one of: search_docs, list_fiori_apps, list_sap_systems, download_odata_service_metadata, generate_fiori_app_odata, generate_fiori_app_cap, list_functionality, get_functionality_details, execute_functionality.`
                        );
                }
                await TelemetryHelper.sendTelemetry(name, telemetryProperties, (args as any)?.appPath);
                const convertedResult = this.convertResultToCallToolResult(result);
                logger.debug(`Tool ${name} executed successfully with result:`);
                logger.debug(convertedResult);
                return convertedResult;
            } catch (error) {
                logger.error(`Error executing tool ${name}: ${error}`);
                logger.debug(error);
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
    private convertResultToCallToolResult<T extends object | string>(result: T | string): CallToolResult {
        // Handle string results - return them as plain text content
        if (typeof result === 'string' || result instanceof String) {
            return {
                content: [
                    {
                        type: 'text',
                        text: result.toString()
                    }
                ]
            };
        }

        // Handle object results - return as JSON with structured content
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
     * Starts the Fiori MCP server.
     * Connects the server to a StdioServerTransport and begins listening for requests.
     */
    async run(): Promise<void> {
        // Generate the session ID synchronously before connecting so that it is available
        // when the InitializeRequest handler fires and calls sendTelemetry for the first time.
        TelemetryHelper.initSessionId();
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        logger.info(
            `SAP Fiori - Model Context Protocol (MCP) server (@sap-ux/fiori-mcp-server@${PACKAGE_VERSION}) running on stdio`
        );
        // The remaining (slow) telemetry init runs fire-and-forget after transport.connect() so it
        // never blocks the MCP handshake. This is required for Claude Desktop's built-in Node runner,
        // where a blocking await here causes the process to crash before the client receives the
        // initialize response.
        this.setupTelemetry().catch((error) =>
            logger.error(`Telemetry init error: ${error instanceof Error ? error.message : String(error)}`)
        );
    }
}
