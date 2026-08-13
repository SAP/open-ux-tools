import { jest } from '@jest/globals';
import * as mcpTypes from '@modelcontextprotocol/sdk/types.js';
import { TELEMETRY_MCP_SERVER_INITIALIZED, TELEMETRY_MCP_LIST_TOOLS } from '../../src/constant.js';

const setRequestHandlerMock = jest.fn();
const connectMock = jest.fn();

// Mock the Server class
jest.unstable_mockModule('@modelcontextprotocol/sdk/server/index.js', () => ({
    Server: jest.fn().mockImplementation(() => ({
        setRequestHandler: setRequestHandlerMock,
        connect: connectMock
    }))
}));

// Mock StdioServerTransport to prevent open handles
jest.unstable_mockModule('@modelcontextprotocol/sdk/server/stdio.js', () => ({
    StdioServerTransport: jest.fn().mockImplementation(() => ({
        start: jest.fn()
    }))
}));

jest.unstable_mockModule('../../src/telemetry', () => ({
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        initSessionId: jest.fn(),
        markToolStartTime: jest.fn(),
        sendTelemetry: jest.fn()
    },
    unknownTool: 'unknown-tool'
}));

// Mock tools module so we can spy on individual functions
const mockListFioriApps = jest.fn<any>();
const mockListFunctionalities = jest.fn<any>();
const mockGetFunctionalityDetails = jest.fn<any>();
const mockExecuteFunctionality = jest.fn<any>();
const mockDocSearch = jest.fn<any>();
const mockListSapSystems = jest.fn<any>();
const mockDownloadODataServiceMetadata = jest.fn<any>();
const mockGenerateFioriAppOData = jest.fn<any>();
const mockGenerateFioriAppCap = jest.fn<any>();
const actualTools = await import('../../src/tools/index.js');
jest.unstable_mockModule('../../src/tools', () => ({
    ...actualTools,
    listFioriApps: mockListFioriApps,
    listFunctionalities: mockListFunctionalities,
    getFunctionalityDetails: mockGetFunctionalityDetails,
    executeFunctionality: mockExecuteFunctionality,
    docSearch: mockDocSearch,
    listSapSystems: mockListSapSystems,
    downloadODataServiceMetadata: mockDownloadODataServiceMetadata,
    generateFioriAppOData: mockGenerateFioriAppOData,
    generateFioriAppCap: mockGenerateFioriAppCap
}));

// Dynamic imports after mocks
const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
const { FioriFunctionalityServer } = await import('../../src/server.js');
const { TelemetryHelper, unknownTool } = await import('../../src/telemetry/index.js');
const tools = await import('../../src/tools/index.js');

describe('FioriFunctionalityServer', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        setRequestHandlerMock.mockReset();
        mockListFioriApps.mockReset();
        mockListFunctionalities.mockReset();
        mockGetFunctionalityDetails.mockReset();
        mockExecuteFunctionality.mockReset();
        mockDocSearch.mockReset();
        mockListSapSystems.mockReset();
        mockDownloadODataServiceMetadata.mockReset();
        mockGenerateFioriAppOData.mockReset();
        mockGenerateFioriAppCap.mockReset();
    });

    // version cannot be hard coded as it will update on each new patch update
    test('Constructor', () => {
        // eslint-disable-next-line no-new
        new FioriFunctionalityServer();
        // Check initialization
        expect(Server).toHaveBeenCalledWith(
            { name: 'fiori-mcp', version: expect.any(String), title: expect.any(String), icons: expect.any(Array) },
            { capabilities: { tools: {} } }
        );
        expect(setRequestHandlerMock).toHaveBeenCalledTimes(3);
    });

    test('setup tools', async () => {
        // eslint-disable-next-line no-new
        new FioriFunctionalityServer();
        const setRequestHandlerCall = setRequestHandlerMock.mock.calls[1];
        const onRequestCB = setRequestHandlerCall[1];
        const result = await onRequestCB();
        expect(result.tools.map((tool: { name: string }) => tool.name)).toEqual([
            'search_docs',
            'list_fiori_apps',
            'list_sap_systems',
            'download_odata_service_metadata',
            'generate_fiori_app_odata',
            'generate_fiori_app_cap',
            'list_functionality',
            'get_functionality_details',
            'execute_functionality'
        ]);
    });

    describe('InitializeRequestSchema handler', () => {
        test('should set client info and return correct initialization response', async () => {
            const server = new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[0];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB({
                params: {
                    clientInfo: {
                        name: 'test-client',
                        version: '1.2.3'
                    }
                }
            });

            // Verify the response structure
            expect(result).toEqual({
                protocolVersion: expect.any(String),
                capabilities: {
                    tools: {}
                },
                serverInfo: {
                    name: 'fiori-mcp',
                    version: expect.any(String)
                },
                instructions: expect.any(String)
            });
            expect(result.protocolVersion).toBeTruthy();
            expect(result.instructions).toMatchSnapshot();
        });

        test('should use default values when clientInfo is not provided', async () => {
            const server = new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[0];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB({
                params: {}
            });

            // Verify the response structure
            expect(result).toEqual({
                protocolVersion: expect.any(String),
                capabilities: {
                    tools: {}
                },
                serverInfo: {
                    name: 'fiori-mcp',
                    version: expect.any(String)
                },
                instructions: expect.any(String)
            });
            expect(result.protocolVersion).toBeTruthy();
            expect(result.instructions).toMatchSnapshot();
        });

        test('should use default values when clientInfo.name is missing', async () => {
            const server = new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[0];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB({
                params: {
                    clientInfo: {
                        version: '1.2.3'
                    }
                }
            });

            expect(result.serverInfo.name).toBe('fiori-mcp');
            expect(result.serverInfo.version).toBeDefined();
        });

        test('should use default values when clientInfo.version is missing', async () => {
            const server = new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[0];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB({
                params: {
                    clientInfo: {
                        name: 'test-client'
                    }
                }
            });

            expect(result.serverInfo.name).toBe('fiori-mcp');
            expect(result.serverInfo.version).toBeDefined();
        });

        test('should track client info for telemetry in subsequent tool calls', async () => {
            const sendTelemetryMock = jest.spyOn(TelemetryHelper, 'sendTelemetry').mockImplementation(jest.fn() as any);
            mockListFioriApps.mockResolvedValue({
                applications: []
            });

            const server = new FioriFunctionalityServer();

            // First, call the initialize handler with client info
            const initHandlerCall = setRequestHandlerMock.mock.calls[0];
            const initCallback = initHandlerCall[1];
            await initCallback({
                params: {
                    clientInfo: {
                        name: 'my-custom-client',
                        version: '2.0.0'
                    }
                }
            });

            // Then call a tool to verify telemetry includes the client info
            const toolHandlerCall = setRequestHandlerMock.mock.calls[2];
            const toolCallback = toolHandlerCall[1];
            await toolCallback({
                params: {
                    name: 'list_fiori_apps',
                    arguments: {
                        projectPath: '/test/path'
                    }
                }
            });

            expect(sendTelemetryMock).toHaveBeenCalledWith(
                'list_fiori_apps',
                expect.objectContaining({
                    tool: 'list_fiori_apps',
                    mcpClientName: 'my-custom-client',
                    mcpClientVersion: '2.0.0'
                }),
                undefined
            );

            mockListFioriApps.mockReset();
            sendTelemetryMock.mockRestore();
        });

        test('should send telemetry when Initialize is called', async () => {
            const sendTelemetryMock = jest.spyOn(TelemetryHelper, 'sendTelemetry').mockImplementation(jest.fn() as any);

            const server = new FioriFunctionalityServer();

            const initHandlerCall = setRequestHandlerMock.mock.calls[0];
            const initCallback = initHandlerCall[1];
            await initCallback({
                params: {
                    clientInfo: {
                        name: 'testClient',
                        version: '1.0.0'
                    }
                }
            });

            expect(sendTelemetryMock).toHaveBeenCalledWith(TELEMETRY_MCP_SERVER_INITIALIZED, {
                mcpClientName: 'testClient',
                mcpClientVersion: '1.0.0'
            });

            sendTelemetryMock.mockRestore();
        });

        test('should use default client info when Initialize is called without clientInfo', async () => {
            const sendTelemetryMock = jest.spyOn(TelemetryHelper, 'sendTelemetry').mockImplementation(jest.fn() as any);

            const server = new FioriFunctionalityServer();

            const initHandlerCall = setRequestHandlerMock.mock.calls[0];
            const initCallback = initHandlerCall[1];
            await initCallback({
                params: {}
            });

            expect(sendTelemetryMock).toHaveBeenCalledWith(TELEMETRY_MCP_SERVER_INITIALIZED, {
                mcpClientName: 'unknown-client',
                mcpClientVersion: 'unknown-version'
            });

            sendTelemetryMock.mockRestore();
        });

        test('should return fallback protocol version when requested version is unsupported', async () => {
            const server = new FioriFunctionalityServer();
            const initHandlerCall = setRequestHandlerMock.mock.calls[0];
            const initCallback = initHandlerCall[1];
            const result = await initCallback({
                params: {
                    protocolVersion: '1999-01-01',
                    clientInfo: { name: 'old-client', version: '0.1.0' }
                }
            });
            expect(result.protocolVersion).toBe('2024-11-05');
        });

        test('should return exact requested protocol version when it is supported', async () => {
            const server = new FioriFunctionalityServer();
            const initHandlerCall = setRequestHandlerMock.mock.calls[0];
            const initCallback = initHandlerCall[1];
            const supportedVersion = mcpTypes.SUPPORTED_PROTOCOL_VERSIONS[0];
            const result = await initCallback({
                params: {
                    protocolVersion: supportedVersion,
                    clientInfo: { name: 'test-client', version: '1.0.0' }
                }
            });
            expect(result.protocolVersion).toBe(supportedVersion);
        });

        test('should return last supported version when both requested and fallback versions are unsupported', async () => {
            // Temporarily remove '2024-11-05' from the supported versions array to test branch C
            const idx = mcpTypes.SUPPORTED_PROTOCOL_VERSIONS.indexOf('2024-11-05');
            mcpTypes.SUPPORTED_PROTOCOL_VERSIONS.splice(idx, 1);

            try {
                const server = new FioriFunctionalityServer();
                const initHandlerCall = setRequestHandlerMock.mock.calls[0];
                const initCallback = initHandlerCall[1];
                const result = await initCallback({
                    params: {
                        protocolVersion: '1999-01-01',
                        clientInfo: { name: 'old-client', version: '0.1.0' }
                    }
                });
                const expected = mcpTypes.SUPPORTED_PROTOCOL_VERSIONS[mcpTypes.SUPPORTED_PROTOCOL_VERSIONS.length - 1];
                expect(result.protocolVersion).toBe(expected);
            } finally {
                // Restore the removed version
                mcpTypes.SUPPORTED_PROTOCOL_VERSIONS.splice(idx, 0, '2024-11-05');
            }
        });
    });

    describe('ListToolsRequestSchema handler', () => {
        test('should return list of tools', async () => {
            const server = new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[1];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB();

            expect(result).toHaveProperty('tools');
            expect(Array.isArray(result.tools)).toBe(true);
            expect(result.tools.length).toBeGreaterThan(0);
            expect(result.tools.map((tool: { name: string }) => tool.name)).toEqual([
                'search_docs',
                'list_fiori_apps',
                'list_sap_systems',
                'download_odata_service_metadata',
                'generate_fiori_app_odata',
                'generate_fiori_app_cap',
                'list_functionality',
                'get_functionality_details',
                'execute_functionality'
            ]);
        });

        test('should send telemetry when ListTools is called', async () => {
            const sendTelemetryMock = jest.spyOn(TelemetryHelper, 'sendTelemetry').mockImplementation(jest.fn() as any);

            const server = new FioriFunctionalityServer();

            const initHandlerCall = setRequestHandlerMock.mock.calls[0];
            const initCallback = initHandlerCall[1];
            await initCallback({
                params: {
                    clientInfo: {
                        name: 'test-client',
                        version: '1.0.0'
                    }
                }
            });

            sendTelemetryMock.mockClear();

            const listToolsHandlerCall = setRequestHandlerMock.mock.calls[1];
            const listToolsCallback = listToolsHandlerCall[1];
            await listToolsCallback();

            expect(sendTelemetryMock).toHaveBeenCalledWith(TELEMETRY_MCP_LIST_TOOLS, {
                mcpClientName: 'test-client',
                mcpClientVersion: '1.0.0'
            });

            sendTelemetryMock.mockRestore();
        });

        test('should use default client info when ListTools is called before initialization', async () => {
            const sendTelemetryMock = jest.spyOn(TelemetryHelper, 'sendTelemetry').mockImplementation(jest.fn() as any);

            const server = new FioriFunctionalityServer();

            const listToolsHandlerCall = setRequestHandlerMock.mock.calls[1];
            const listToolsCallback = listToolsHandlerCall[1];
            await listToolsCallback();

            expect(sendTelemetryMock).toHaveBeenCalledWith(TELEMETRY_MCP_LIST_TOOLS, {
                mcpClientName: 'unknown-client',
                mcpClientVersion: 'unknown-version'
            });

            sendTelemetryMock.mockRestore();
        });
    });

    describe('FioriFunctionalityServer', () => {
        const sendTelemetryMock = jest.spyOn(TelemetryHelper, 'sendTelemetry').mockImplementation(jest.fn() as any);

        test('list_fiori_apps', async () => {
            mockListFioriApps.mockResolvedValue({
                applications: [
                    {
                        name: 'app1',
                        appPath: 'appPath1',
                        projectType: 'EDMXBackend',
                        projectPath: 'appPath1',
                        odataVersion: '4.0'
                    },
                    {
                        name: 'app2',
                        appPath: 'appPath2',
                        projectType: 'EDMXBackend',
                        projectPath: 'appPath2',
                        odataVersion: '4.0'
                    }
                ]
            });
            // eslint-disable-next-line no-new
            new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[2];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB({
                params: {
                    name: 'list_fiori_apps',
                    arguments: {
                        searchPath: []
                    }
                }
            });
            expect(mockListFioriApps).toHaveBeenCalledTimes(1);
            const structuredContent = result.structuredContent;
            expect(structuredContent).toEqual({
                applications: [
                    {
                        name: 'app1',
                        appPath: 'appPath1',
                        projectType: 'EDMXBackend',
                        projectPath: 'appPath1',
                        odataVersion: '4.0'
                    },
                    {
                        name: 'app2',
                        appPath: 'appPath2',
                        projectType: 'EDMXBackend',
                        projectPath: 'appPath2',
                        odataVersion: '4.0'
                    }
                ]
            });
            expect(result.content).toEqual([
                {
                    text: JSON.stringify(structuredContent),
                    type: 'text'
                }
            ]);

            expect(sendTelemetryMock).toHaveBeenLastCalledWith(
                'list_fiori_apps',
                {
                    tool: 'list_fiori_apps',
                    mcpClientName: 'unknown-client',
                    mcpClientVersion: 'unknown-version'
                },
                undefined
            );
        });

        test('list_sap_systems', async () => {
            mockListSapSystems.mockResolvedValue({
                systems: [{ name: 'SysA', url: 'https://sys-a.example.com', client: '100' }]
            });
            new FioriFunctionalityServer();
            const onRequestCB = setRequestHandlerMock.mock.calls[2][1];
            const result = await onRequestCB({ params: { name: 'list_sap_systems', arguments: {} } });
            expect(mockListSapSystems).toHaveBeenCalledTimes(1);
            expect(result.structuredContent).toEqual({
                systems: [{ name: 'SysA', url: 'https://sys-a.example.com', client: '100' }]
            });
            expect(sendTelemetryMock).toHaveBeenLastCalledWith(
                'list_sap_systems',
                { tool: 'list_sap_systems', mcpClientName: 'unknown-client', mcpClientVersion: 'unknown-version' },
                undefined
            );
        });

        test('download_odata_service_metadata', async () => {
            const mockResult = {
                status: 'Success',
                message: 'Service metadata downloaded successfully.',
                changes: [],
                parameters: {
                    host: 'https://example.com',
                    servicePath: '/sap/opu/',
                    client: '100',
                    metadataFilePath: '/project/metadata.xml'
                },
                appPath: '/project',
                timestamp: '2024-01-01T00:00:00.000Z'
            };
            mockDownloadODataServiceMetadata.mockResolvedValue(mockResult);
            new FioriFunctionalityServer();
            const onRequestCB = setRequestHandlerMock.mock.calls[2][1];
            const result = await onRequestCB({
                params: {
                    name: 'download_odata_service_metadata',
                    arguments: { sapSystemQuery: 'SysA', servicePath: '/sap/opu/', appPath: '/project' }
                }
            });
            expect(mockDownloadODataServiceMetadata).toHaveBeenCalledTimes(1);
            expect(result.structuredContent).toEqual(mockResult);
            expect(sendTelemetryMock).toHaveBeenLastCalledWith(
                'download_odata_service_metadata',
                {
                    tool: 'download_odata_service_metadata',
                    mcpClientName: 'unknown-client',
                    mcpClientVersion: 'unknown-version'
                },
                '/project'
            );
        });

        test('generate_fiori_app_odata', async () => {
            const mockResult = {
                status: 'Success',
                message: 'Generation completed successfully.',
                parameters: {},
                appPath: '/project/myapp',
                changes: [],
                timestamp: '2024-01-01T00:00:00.000Z'
            };
            mockGenerateFioriAppOData.mockResolvedValue(mockResult);
            new FioriFunctionalityServer();
            const onRequestCB = setRequestHandlerMock.mock.calls[2][1];
            const result = await onRequestCB({
                params: {
                    name: 'generate_fiori_app_odata',
                    arguments: {
                        floorplan: 'FE_LROP',
                        project: { name: 'myapp', description: 'Test', targetFolder: '/project' }
                    }
                }
            });
            expect(mockGenerateFioriAppOData).toHaveBeenCalledTimes(1);
            expect(result.structuredContent).toEqual(mockResult);
            expect(sendTelemetryMock).toHaveBeenLastCalledWith(
                'generate_fiori_app_odata',
                {
                    tool: 'generate_fiori_app_odata',
                    mcpClientName: 'unknown-client',
                    mcpClientVersion: 'unknown-version'
                },
                undefined
            );
        });

        test('generate_fiori_app_cap', async () => {
            const mockResult = {
                status: 'Success',
                message: 'Generation completed successfully.',
                parameters: {},
                appPath: '/cap-project/app/myapp',
                changes: [],
                timestamp: '2024-01-01T00:00:00.000Z'
            };
            mockGenerateFioriAppCap.mockResolvedValue(mockResult);
            new FioriFunctionalityServer();
            const onRequestCB = setRequestHandlerMock.mock.calls[2][1];
            const result = await onRequestCB({
                params: {
                    name: 'generate_fiori_app_cap',
                    arguments: {
                        floorplan: 'FE_LROP',
                        project: { name: 'myapp', description: 'Test', targetFolder: '/cap-project' }
                    }
                }
            });
            expect(mockGenerateFioriAppCap).toHaveBeenCalledTimes(1);
            expect(result.structuredContent).toEqual(mockResult);
            expect(sendTelemetryMock).toHaveBeenLastCalledWith(
                'generate_fiori_app_cap',
                {
                    tool: 'generate_fiori_app_cap',
                    mcpClientName: 'unknown-client',
                    mcpClientVersion: 'unknown-version'
                },
                undefined
            );
        });

        test('list_functionality', async () => {
            mockListFunctionalities.mockResolvedValue({
                applicationPath: 'app1',
                functionalities: [
                    {
                        functionalityId: 'add-page',
                        description: 'Add page...'
                    },
                    {
                        functionalityId: 'delete-page',
                        description: 'Delete page...'
                    }
                ]
            });
            new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[2];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB({
                params: {
                    name: 'list_functionality',
                    arguments: {
                        appPath: 'app1'
                    }
                }
            });
            expect(mockListFunctionalities).toHaveBeenCalledTimes(1);
            const structuredContent = result.structuredContent;
            expect(structuredContent).toEqual({
                applicationPath: 'app1',
                functionalities: [
                    {
                        description: 'Add page...',
                        functionalityId: 'add-page'
                    },
                    {
                        description: 'Delete page...',
                        functionalityId: 'delete-page'
                    }
                ]
            });
            expect(result.content).toEqual([
                {
                    text: JSON.stringify(structuredContent),
                    type: 'text'
                }
            ]);
            expect(sendTelemetryMock).toHaveBeenLastCalledWith(
                'list_functionality',
                {
                    tool: 'list_functionality',
                    mcpClientName: 'unknown-client',
                    mcpClientVersion: 'unknown-version'
                },
                'app1'
            );
        });

        test('get_functionality_details', async () => {
            mockGetFunctionalityDetails.mockResolvedValue({
                functionalityId: 'add-page',
                description: 'Add page...',
                name: 'add-page',
                parameters: {}
            });
            // eslint-disable-next-line no-new
            new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[2];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB({
                params: {
                    name: 'get_functionality_details',
                    arguments: {
                        appPath: 'app1',
                        functionalityId: 'add-page'
                    }
                }
            });
            expect(mockGetFunctionalityDetails).toHaveBeenCalledTimes(1);
            const structuredContent = result.structuredContent;
            expect(structuredContent).toEqual({
                description: 'Add page...',
                functionalityId: 'add-page',
                name: 'add-page',
                parameters: {}
            });
            expect(result.content).toEqual([
                {
                    text: JSON.stringify(structuredContent),
                    type: 'text'
                }
            ]);
            expect(sendTelemetryMock).toHaveBeenLastCalledWith(
                'get_functionality_details',
                {
                    tool: 'get_functionality_details',
                    functionalityId: 'add-page',
                    mcpClientName: 'unknown-client',
                    mcpClientVersion: 'unknown-version'
                },
                'app1'
            );
        });

        test('execute_functionality', async () => {
            mockExecuteFunctionality.mockResolvedValue({
                functionalityId: 'add-page',
                status: 'ok',
                message: 'Page is added',
                appPath: 'app1',
                changes: [],
                parameters: [],
                timestamp: ''
            });
            // eslint-disable-next-line no-new
            new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[2];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB({
                params: {
                    name: 'execute_functionality',
                    arguments: {
                        appPath: 'app1',
                        functionalityId: 'add-page',
                        parameters: {
                            name: 'dummy'
                        }
                    }
                }
            });
            expect(mockExecuteFunctionality).toHaveBeenCalledTimes(1);
            const structuredContent = result.structuredContent;
            expect(structuredContent).toEqual({
                appPath: 'app1',
                changes: [],
                functionalityId: 'add-page',
                message: 'Page is added',
                parameters: [],
                status: 'ok',
                timestamp: ''
            });
            expect(result.content).toEqual([
                {
                    text: JSON.stringify(structuredContent),
                    type: 'text'
                }
            ]);
            expect(sendTelemetryMock).toHaveBeenLastCalledWith(
                'execute_functionality',
                {
                    tool: 'execute_functionality',
                    functionalityId: 'add-page',
                    mcpClientName: 'unknown-client',
                    mcpClientVersion: 'unknown-version'
                },
                'app1'
            );
        });

        test('Unknown tool', async () => {
            // eslint-disable-next-line no-new
            new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[2];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB({
                params: {
                    name: 'unknown-tool-id',
                    arguments: {
                        searchPath: []
                    }
                }
            });
            expect(result.content).toEqual([
                {
                    text: 'Error: Unknown tool: unknown-tool-id. Try one of: search_docs, list_fiori_apps, list_sap_systems, download_odata_service_metadata, generate_fiori_app_odata, generate_fiori_app_cap, list_functionality, get_functionality_details, execute_functionality.',
                    type: 'text'
                }
            ]);
            expect(sendTelemetryMock).toHaveBeenLastCalledWith(unknownTool, {}, undefined);
        });
        test('Unknown tool - valid characters in functionalityId', async () => {
            // eslint-disable-next-line no-new
            new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[2];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB({
                params: {
                    name: 'unknown-tool-id2',
                    arguments: {
                        functionalityId: 'f1'
                    }
                }
            });
            expect(result.content).toEqual([
                {
                    text: 'Error: Unknown tool: unknown-tool-id2. Try one of: search_docs, list_fiori_apps, list_sap_systems, download_odata_service_metadata, generate_fiori_app_odata, generate_fiori_app_cap, list_functionality, get_functionality_details, execute_functionality.',
                    type: 'text'
                }
            ]);
            expect(sendTelemetryMock).toHaveBeenLastCalledWith(unknownTool, {}, undefined);
        });

        test('Unknown tool - invalid characters in functionalityId', async () => {
            // eslint-disable-next-line no-new
            new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[2];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB({
                params: {
                    name: 'unknown-tool-id2',
                    arguments: {
                        functionalityId: '<script>alert(1)</script>'
                    }
                }
            });
            expect(result.content).toEqual([
                {
                    text: 'Error: Unknown tool: unknown-tool-id2. Try one of: search_docs, list_fiori_apps, list_sap_systems, download_odata_service_metadata, generate_fiori_app_odata, generate_fiori_app_cap, list_functionality, get_functionality_details, execute_functionality.',
                    type: 'text'
                }
            ]);
            expect(sendTelemetryMock).toHaveBeenLastCalledWith(unknownTool, {}, undefined);
        });
    });

    describe('functionalityId telemetry', () => {
        const sendTelemetryMock = jest.spyOn(TelemetryHelper, 'sendTelemetry').mockImplementation(jest.fn() as any);

        afterEach(() => {
            sendTelemetryMock.mockClear();
        });

        test('functionalityId as string - should use value as-is', async () => {
            mockExecuteFunctionality.mockResolvedValue({
                functionalityId: 'add-page',
                status: 'ok',
                message: 'Page added',
                appPath: 'app1',
                changes: [],
                parameters: [],
                timestamp: ''
            });
            // eslint-disable-next-line no-new
            new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[2];
            const onRequestCB = setRequestHandlerCall[1];
            await onRequestCB({
                params: {
                    name: 'execute_functionality',
                    arguments: {
                        appPath: 'app1',
                        functionalityId: 'add-page',
                        parameters: {
                            name: 'TestPage'
                        }
                    }
                }
            });
            expect(mockExecuteFunctionality).toHaveBeenCalledTimes(1);
            expect(sendTelemetryMock).toHaveBeenLastCalledWith(
                'execute_functionality',
                {
                    tool: 'execute_functionality',
                    functionalityId: 'add-page',
                    mcpClientName: 'unknown-client',
                    mcpClientVersion: 'unknown-version'
                },
                'app1'
            );
            mockExecuteFunctionality.mockReset();
        });

        test('functionalityId as array with single element - should use property-change prefix', async () => {
            mockExecuteFunctionality.mockResolvedValue({
                functionalityId: ['useIconTabBar'],
                status: 'ok',
                message: 'Property changed',
                appPath: 'app1',
                changes: [],
                parameters: [],
                timestamp: ''
            });
            // eslint-disable-next-line no-new
            new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[2];
            const onRequestCB = setRequestHandlerCall[1];
            await onRequestCB({
                params: {
                    name: 'execute_functionality',
                    arguments: {
                        appPath: 'app1',
                        functionalityId: ['useIconTabBar'],
                        parameters: {
                            value: true
                        }
                    }
                }
            });
            expect(mockExecuteFunctionality).toHaveBeenCalledTimes(1);
            expect(sendTelemetryMock).toHaveBeenLastCalledWith(
                'execute_functionality',
                {
                    tool: 'execute_functionality',
                    functionalityId: 'property-change:useIconTabBar',
                    mcpClientName: 'unknown-client',
                    mcpClientVersion: 'unknown-version'
                },
                'app1'
            );
            mockExecuteFunctionality.mockReset();
        });

        test('functionalityId as array with multiple elements - should use last element with property-change prefix', async () => {
            mockExecuteFunctionality.mockResolvedValue({
                functionalityId: [
                    'TravelObjectPage',
                    'sections',
                    '_Booking::@com.sap.vocabularies.UI.v1.LineItem',
                    'table',
                    'creationMode'
                ],
                status: 'ok',
                message: 'Property changed',
                appPath: 'app1',
                changes: [],
                parameters: [],
                timestamp: ''
            });
            // eslint-disable-next-line no-new
            new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[2];
            const onRequestCB = setRequestHandlerCall[1];
            await onRequestCB({
                params: {
                    name: 'execute_functionality',
                    arguments: {
                        appPath: 'app1',
                        functionalityId: [
                            'TravelObjectPage',
                            'sections',
                            '_Booking::@com.sap.vocabularies.UI.v1.LineItem',
                            'table',
                            'creationMode'
                        ],
                        parameters: {
                            value: 'NewRow'
                        }
                    }
                }
            });
            expect(mockExecuteFunctionality).toHaveBeenCalledTimes(1);
            expect(sendTelemetryMock).toHaveBeenLastCalledWith(
                'execute_functionality',
                {
                    tool: 'execute_functionality',
                    functionalityId: 'property-change:creationMode',
                    mcpClientName: 'unknown-client',
                    mcpClientVersion: 'unknown-version'
                },
                'app1'
            );
            mockExecuteFunctionality.mockReset();
        });

        test('functionalityId as empty array - should not set functionalityId', async () => {
            mockExecuteFunctionality.mockResolvedValue({
                functionalityId: [],
                status: 'ok',
                message: 'Done',
                appPath: 'app1',
                changes: [],
                parameters: [],
                timestamp: ''
            });
            // eslint-disable-next-line no-new
            new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[2];
            const onRequestCB = setRequestHandlerCall[1];
            await onRequestCB({
                params: {
                    name: 'execute_functionality',
                    arguments: {
                        appPath: 'app1',
                        functionalityId: [],
                        parameters: {}
                    }
                }
            });
            expect(mockExecuteFunctionality).toHaveBeenCalledTimes(1);
            expect(sendTelemetryMock).toHaveBeenLastCalledWith(
                'execute_functionality',
                {
                    tool: 'execute_functionality',
                    functionalityId: [],
                    mcpClientName: 'unknown-client',
                    mcpClientVersion: 'unknown-version'
                },
                'app1'
            );
            mockExecuteFunctionality.mockReset();
        });
    });

    describe('Run', () => {
        test('execute_functionality', async () => {
            const server = new FioriFunctionalityServer();
            await server.run();
            expect(connectMock).toHaveBeenCalledTimes(1);
        });

        test('should call initSessionId before transport.connect', async () => {
            const callOrder: string[] = [];
            jest.spyOn(TelemetryHelper, 'initSessionId').mockImplementation(() => {
                callOrder.push('initSessionId');
            });
            connectMock.mockImplementation(() => {
                callOrder.push('connect');
                return Promise.resolve();
            });

            const server = new FioriFunctionalityServer();
            await server.run();

            expect(callOrder).toEqual(['initSessionId', 'connect']);
        });

        test('should log error message when setupTelemetry rejects with an Error instance', async () => {
            const loggerModule = await import('../../src/utils/logger.js');
            const loggerErrorSpy = jest.spyOn(loggerModule.logger, 'error').mockImplementation(jest.fn());
            jest.spyOn(TelemetryHelper, 'initTelemetrySettings').mockRejectedValue(new Error('telemetry failed'));

            const server = new FioriFunctionalityServer();
            await server.run();
            await Promise.resolve();

            expect(loggerErrorSpy).toHaveBeenCalledWith('Telemetry init error: telemetry failed');
            loggerErrorSpy.mockRestore();
        });

        test('should log error message when setupTelemetry rejects with a non-Error value', async () => {
            const loggerModule = await import('../../src/utils/logger.js');
            const loggerErrorSpy = jest.spyOn(loggerModule.logger, 'error').mockImplementation(jest.fn());
            jest.spyOn(TelemetryHelper, 'initTelemetrySettings').mockRejectedValue('string error');

            const server = new FioriFunctionalityServer();
            await server.run();
            await Promise.resolve();

            expect(loggerErrorSpy).toHaveBeenCalledWith('Telemetry init error: string error');
            loggerErrorSpy.mockRestore();
        });
    });
});
