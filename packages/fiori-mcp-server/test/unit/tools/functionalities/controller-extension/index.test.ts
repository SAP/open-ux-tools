import * as openUxProjectAccessDependency from '@sap-ux/project-access';
import {
    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY,
    createControllerExtensionHandlers
} from '../../../../../src/tools/functionalities/controller-extension';
import { mockSpecificationImport } from '../../../utils';
import * as toolUtils from '../../../../../src/utils';
import * as projectUtils from '../../../../../src/page-editor-api/project';
import { join } from 'node:path';

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/project-access') as object)
}));

describe('create-controller-extension', () => {
    const appPath = join('root', 'app1');
    let importProjectMock = jest.fn();
    let generateCustomExtensionMock = jest.fn();
    const findProjectRootSpy: jest.SpyInstance = jest.spyOn(openUxProjectAccessDependency, 'findProjectRoot');
    const getDefaultExtensionFolderSpy: jest.SpyInstance = jest.spyOn(toolUtils, 'getDefaultExtensionFolder');
    const getUI5VersionSpy: jest.SpyInstance = jest.spyOn(projectUtils, 'getUI5Version');
    const getManifestSpy: jest.SpyInstance = jest.spyOn(projectUtils, 'getManifest');
    const createApplicationAccessSpy: jest.SpyInstance = jest.spyOn(
        openUxProjectAccessDependency,
        'createApplicationAccess'
    );
    const memFsdumpMock = jest.fn();
    beforeEach(async () => {
        importProjectMock = jest.fn().mockResolvedValue([]);
        memFsdumpMock.mockReturnValue({
            'manifest.json': {}
        });
        generateCustomExtensionMock = jest.fn().mockResolvedValue({
            commit: jest.fn(),
            dump: memFsdumpMock
        });
        getDefaultExtensionFolderSpy.mockReturnValue('controllerFolder');
        findProjectRootSpy.mockImplementation(async (path: string): Promise<string> => path);
        getUI5VersionSpy.mockResolvedValue('1.108.1');
        getManifestSpy.mockResolvedValue({});
        createApplicationAccessSpy.mockImplementation((rootPath: string) => {
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
                    importProject: importProjectMock,
                    generateCustomExtension: generateCustomExtensionMock
                })
            };
        });
    });

    describe('getFunctionalityDetails', () => {
        test('getFunctionalityDetails', async () => {
            mockSpecificationImport(importProjectMock);
            const details = await createControllerExtensionHandlers.getFunctionalityDetails({
                appPath: appPath,
                functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.functionalityId
            });
            expect(details).toMatchSnapshot();
        });

        test('getFunctionalityDetails - unresolvable project', async () => {
            createApplicationAccessSpy.mockImplementation(() => {
                throw new Error('Test error');
            });
            mockSpecificationImport(importProjectMock);
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
            mockSpecificationImport(importProjectMock);
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
            mockSpecificationImport(importProjectMock);
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
            mockSpecificationImport(importProjectMock);
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
            mockSpecificationImport(importProjectMock);
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
            mockSpecificationImport(importProjectMock);
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
            mockSpecificationImport(importProjectMock);
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
            createApplicationAccessSpy.mockImplementation(() => {
                throw new Error('Test error');
            });
            mockSpecificationImport(importProjectMock);
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
