import { jest } from '@jest/globals';
import { join } from 'node:path';
import { mockSpecificationReadApp } from '../../../utils.js';

// Mock @sap-ux/project-access with controllable functions
const actualProjectAccess = await import('@sap-ux/project-access');
const mockFindProjectRoot = jest.fn<any>();
const mockCreateApplicationAccess = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    findProjectRoot: mockFindProjectRoot,
    createApplicationAccess: mockCreateApplicationAccess
}));

// Mock project utils
const actualProjectUtils = await import('../../../../../src/page-editor-api/project.js');
const mockGetUI5Version = jest.fn<any>();
const mockGetManifest = jest.fn<any>();
jest.unstable_mockModule('../../../../../src/page-editor-api/project', () => ({
    ...actualProjectUtils,
    getUI5Version: mockGetUI5Version,
    getManifest: mockGetManifest
}));

// Mock utils
const actualUtils = await import('../../../../../src/utils/index.js');
const mockGetDefaultExtensionFolder = jest.fn<any>();
jest.unstable_mockModule('../../../../../src/utils', () => ({
    ...actualUtils,
    getDefaultExtensionFolder: mockGetDefaultExtensionFolder
}));

// Dynamic imports after mocks
const { CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY, createControllerExtensionHandlers } =
    await import('../../../../../src/tools/functionalities/controller-extension/index.js');

describe('create-controller-extension', () => {
    const appPath = join('root', 'app1');
    let readAppMock: jest.Mock;
    let generateCustomExtensionMock: jest.Mock;
    const memFsdumpMock = jest.fn<any>();

    beforeEach(async () => {
        readAppMock = jest.fn<any>().mockResolvedValue({
            files: []
        });
        memFsdumpMock.mockReturnValue({
            'manifest.json': {}
        });
        generateCustomExtensionMock = jest.fn<any>().mockResolvedValue({
            commit: jest.fn(),
            dump: memFsdumpMock
        });
        mockGetDefaultExtensionFolder.mockReturnValue('controllerFolder');
        mockFindProjectRoot.mockImplementation(async (path: string): Promise<string> => path);
        mockGetUI5Version.mockResolvedValue('1.108.1');
        mockGetManifest.mockResolvedValue({});
        mockCreateApplicationAccess.mockImplementation((rootPath) => {
            return {
                getAppId: () => 'app1',
                app: {
                    changes: 'changes'
                },
                project: {
                    apps: {
                        ['app1']: {}
                    },
                    root: 'root'
                },
                getSpecification: () => ({
                    readApp: readAppMock,
                    generateCustomExtension: generateCustomExtensionMock,
                    getApiVersion: () => ({ version: '99' })
                })
            };
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('getFunctionalityDetails', () => {
        test('getFunctionalityDetails', async () => {
            mockSpecificationReadApp(readAppMock);
            const details = await createControllerExtensionHandlers.getFunctionalityDetails({
                appPath: appPath,
                functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.functionalityId
            });
            expect(details).toMatchSnapshot();
        });

        test('getFunctionalityDetails - unresolvable project', async () => {
            mockCreateApplicationAccess.mockImplementation(() => {
                throw new Error('Test error');
            });
            mockSpecificationReadApp(readAppMock);
            await expect(
                createControllerExtensionHandlers.getFunctionalityDetails({
                    appPath: appPath,
                    functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.functionalityId
                })
            ).rejects.toThrow('Invalid Project Root or Application Path');
        });
    });

    describe('executeFunctionality', () => {
        test('create controller extension with pageType', async () => {
            mockSpecificationReadApp(readAppMock);
            const details = await createControllerExtensionHandlers.executeFunctionality({
                appPath: appPath,
                functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.functionalityId,
                parameters: {
                    pageType: 'ListReport',
                    controllerName: 'Dummy'
                }
            });
            expect(generateCustomExtensionMock).toHaveBeenCalledTimes(1);
            expect(generateCustomExtensionMock).toHaveBeenCalledWith({
                basePath: appPath,
                customExtension: 'ControllerExtension',
                data: {
                    extension: {
                        pageId: undefined,
                        pageType: 'ListReport'
                    },
                    folder: 'controllerFolder',
                    minUI5Version: '1.108.1',
                    name: 'Dummy'
                }
            });
            expect(details).toEqual(
                expect.objectContaining({
                    appPath: appPath,
                    changes: ['manifest.json'],
                    functionalityId: 'create-controller-extension',
                    message: 'Controller extension is created',
                    parameters: {
                        pageType: 'ListReport',
                        controllerName: 'Dummy'
                    },
                    status: 'success'
                })
            );
        });

        test('create controller extension with pageId', async () => {
            mockSpecificationReadApp(readAppMock);
            const details = await createControllerExtensionHandlers.executeFunctionality({
                appPath: appPath,
                functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.functionalityId,
                parameters: {
                    pageId: 'TravelObjectPage',
                    controllerName: 'Dummy'
                }
            });
            expect(generateCustomExtensionMock).toHaveBeenCalledTimes(1);
            expect(generateCustomExtensionMock).toHaveBeenCalledWith({
                basePath: appPath,
                customExtension: 'ControllerExtension',
                data: {
                    extension: {
                        pageId: 'TravelObjectPage',
                        pageType: 'ObjectPage'
                    },
                    folder: 'controllerFolder',
                    minUI5Version: '1.108.1',
                    name: 'Dummy'
                }
            });
            expect(details).toEqual(
                expect.objectContaining({
                    appPath: appPath,
                    changes: ['manifest.json'],
                    functionalityId: 'create-controller-extension',
                    message: 'Controller extension is created',
                    parameters: {
                        pageId: 'TravelObjectPage',
                        controllerName: 'Dummy'
                    },
                    status: 'success'
                })
            );
        });

        test('create controller extension - validate "pageType", invalid floorplan', async () => {
            memFsdumpMock.mockReturnValue({});
            mockSpecificationReadApp(readAppMock);
            await expect(
                createControllerExtensionHandlers.executeFunctionality({
                    appPath: appPath,
                    functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.functionalityId,
                    parameters: {
                        pageType: 'CustomPage',
                        controllerName: 'dummy'
                    }
                })
            ).rejects.toThrowErrorMatchingInlineSnapshot(`
                "Missing required fields in parameters. [
                    {
                        \\"code\\": \\"invalid_value\\",
                        \\"values\\": [
                            \\"ListReport\\",
                            \\"ObjectPage\\"
                        ],
                        \\"path\\": [
                            \\"pageType\\"
                        ],
                        \\"message\\": \\"Invalid option: expected one of \\\\\\"ListReport\\\\\\"|\\\\\\"ObjectPage\\\\\\"\\"
                    }
                ]"
            `);
        });

        test('create controller extension - validate "controllerName", missing value', async () => {
            memFsdumpMock.mockReturnValue({});
            mockSpecificationReadApp(readAppMock);
            await expect(
                createControllerExtensionHandlers.executeFunctionality({
                    appPath: appPath,
                    functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.functionalityId,
                    parameters: {
                        pageType: 'ListReport'
                    }
                })
            ).rejects.toThrowErrorMatchingInlineSnapshot(`
                "Missing required fields in parameters. [
                    {
                        \\"expected\\": \\"string\\",
                        \\"code\\": \\"invalid_type\\",
                        \\"path\\": [
                            \\"controllerName\\"
                        ],
                        \\"message\\": \\"Invalid input: expected string, received undefined\\"
                    }
                ]"
            `);
        });

        test('create controller extension - validate "controllerName", invalid extension name', async () => {
            memFsdumpMock.mockReturnValue({});
            mockSpecificationReadApp(readAppMock);
            await expect(
                createControllerExtensionHandlers.executeFunctionality({
                    appPath: appPath,
                    functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.functionalityId,
                    parameters: {
                        pageType: 'ListReport',
                        controllerName: '1_nvalidName'
                    }
                })
            ).rejects.toThrowErrorMatchingInlineSnapshot(`
                "Missing required fields in parameters. [
                    {
                        \\"origin\\": \\"string\\",
                        \\"code\\": \\"invalid_format\\",
                        \\"format\\": \\"regex\\",
                        \\"pattern\\": \\"/^[A-Za-z][A-Za-z0-9_-]*$/\\",
                        \\"path\\": [
                            \\"controllerName\\"
                        ],
                        \\"message\\": \\"Invalid string: must match pattern /^[A-Za-z][A-Za-z0-9_-]*$/\\"
                    }
                ]"
            `);
        });

        test('create controller extension - no changes', async () => {
            memFsdumpMock.mockReturnValue({});
            mockSpecificationReadApp(readAppMock);
            const details = await createControllerExtensionHandlers.executeFunctionality({
                appPath: appPath,
                functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.functionalityId,
                parameters: {
                    pageId: 'TravelObjectPage',
                    controllerName: 'Dummy'
                }
            });
            expect(generateCustomExtensionMock).toHaveBeenCalledTimes(1);
            expect(details).toEqual(
                expect.objectContaining({
                    appPath: appPath,
                    changes: [],
                    functionalityId: 'create-controller-extension',
                    message: 'Controller extension is not created',
                    parameters: {
                        pageId: 'TravelObjectPage',
                        controllerName: 'Dummy'
                    },
                    status: 'skipped'
                })
            );
        });

        test('create controller extension - unresolvable project', async () => {
            mockCreateApplicationAccess.mockImplementation(() => {
                throw new Error('Test error');
            });
            mockSpecificationReadApp(readAppMock);
            const details = await createControllerExtensionHandlers.executeFunctionality({
                appPath: appPath,
                functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.functionalityId,
                parameters: {
                    pageId: 'TravelObjectPage',
                    controllerName: 'Dummy'
                }
            });
            expect(generateCustomExtensionMock).toHaveBeenCalledTimes(0);
            expect(details).toEqual(
                expect.objectContaining({
                    appPath: appPath,
                    changes: [],
                    functionalityId: 'create-controller-extension',
                    message: 'Controller extension is not created',
                    parameters: {
                        pageId: 'TravelObjectPage',
                        controllerName: 'Dummy'
                    },
                    status: 'skipped'
                })
            );
        });
    });
});
