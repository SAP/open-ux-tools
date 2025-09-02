import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { FioriFunctionalityServer } from '../../src/server';
import * as tools from '../../src/tools';

const setRequestHandlerMock = jest.fn();
const connectMock = jest.fn();

// Mock the Server class
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => {
    return {
        Server: jest.fn().mockImplementation(() => {
            return {
                setRequestHandler: setRequestHandlerMock,
                connect: connectMock
            };
        })
    };
});

jest.mock('../../src/telemetry', () => {
    return {
        TelemetryHelper: {
            initTelemetrySettings: jest.fn(),
            markToolStartTime: jest.fn(),
            sendTelemetry: jest.fn()
        }
    };
});

describe('FioriFunctionalityServer', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        setRequestHandlerMock.mockReset();
    });

    // version cannot be hard coded as it will update on each new patch update
    test('Constructor', () => {
        new FioriFunctionalityServer();
        // Check initialization
        expect(Server).toHaveBeenCalledWith(
            { name: 'fiori-mcp', version: expect.any(String) },
            { capabilities: { tools: {} } }
        );
        expect(setRequestHandlerMock).toHaveBeenCalledTimes(2);
    });

    test('setup tools', async () => {
        new FioriFunctionalityServer();
        const setRequestHandlerCall = setRequestHandlerMock.mock.calls[0];
        const onRequestCB = setRequestHandlerCall[1];
        const result = await onRequestCB();
        expect(result.tools.map((tool: { name: string }) => tool.name)).toEqual([
            'list-fiori-apps',
            'list-functionality',
            'get-functionality-details',
            'execute-functionality'
        ]);
    });

    describe('FioriFunctionalityServer', () => {
        test('list-fiori-apps', async () => {
            const listFioriAppsSpy = jest.spyOn(tools, 'listFioriApps').mockResolvedValue({
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
            new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[1];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB({
                params: {
                    name: 'list-fiori-apps',
                    arguments: {
                        searchPath: []
                    }
                }
            });
            expect(listFioriAppsSpy).toHaveBeenCalledTimes(1);
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
        });

        test('list-functionality', async () => {
            const listFunctionalitiesSpy = jest.spyOn(tools, 'listFunctionalities').mockResolvedValue({
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
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[1];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB({
                params: {
                    name: 'list-functionality',
                    arguments: {
                        appPath: 'app1'
                    }
                }
            });
            expect(listFunctionalitiesSpy).toHaveBeenCalledTimes(1);
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
        });

        test('get-functionality-details', async () => {
            const getFunctionalityDetailsSpy = jest.spyOn(tools, 'getFunctionalityDetails').mockResolvedValue({
                functionalityId: 'add-page',
                description: 'Add page...',
                name: 'add-page',
                parameters: []
            });
            new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[1];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB({
                params: {
                    name: 'get-functionality-details',
                    arguments: {
                        appPath: 'app1',
                        functionalityId: 'add-page'
                    }
                }
            });
            expect(getFunctionalityDetailsSpy).toHaveBeenCalledTimes(1);
            const structuredContent = result.structuredContent;
            expect(structuredContent).toEqual({
                description: 'Add page...',
                functionalityId: 'add-page',
                name: 'add-page',
                parameters: []
            });
            expect(result.content).toEqual([
                {
                    text: JSON.stringify(structuredContent),
                    type: 'text'
                }
            ]);
        });

        test('execute-functionality', async () => {
            const executeFunctionalitySpy = jest.spyOn(tools, 'executeFunctionality').mockResolvedValue({
                functionalityId: 'add-page',
                status: 'ok',
                message: 'Page is added',
                appPath: 'app1',
                changes: [],
                parameters: [],
                timestamp: ''
            });
            new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[1];
            const onRequestCB = setRequestHandlerCall[1];
            const result = await onRequestCB({
                params: {
                    name: 'execute-functionality',
                    arguments: {
                        appPath: 'app1',
                        functionalityId: 'add-page',
                        parameters: {
                            name: 'dummy'
                        }
                    }
                }
            });
            expect(executeFunctionalitySpy).toHaveBeenCalledTimes(1);
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
        });

        test('Unknown tool', async () => {
            new FioriFunctionalityServer();
            const setRequestHandlerCall = setRequestHandlerMock.mock.calls[1];
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
                    text: 'Error: Unknown tool: unknown-tool-id. Try one of: list-fiori-apps, list-functionality, get-functionality-details, execute-functionality.',
                    type: 'text'
                }
            ]);
        });
    });

    describe('Run', () => {
        test('execute-functionality', async () => {
            const server = new FioriFunctionalityServer();
            await server.run();
            expect(connectMock).toHaveBeenCalledTimes(1);
        });
    });
});
