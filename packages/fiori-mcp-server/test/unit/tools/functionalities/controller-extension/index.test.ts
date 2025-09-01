import * as openUxProjectAccessDependency from '@sap-ux/project-access';
import {
    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY,
    createControllerExtensionHandlers
} from '../../../../../src/tools/functionalities/controller-extension';
import { mockSpecificationImport } from '../../../utils';
import * as toolUtils from '../../../../../src/tools/utils';
import * as projectUtils from '../../../../../src/page-editor-api/project';
import { join } from 'path';

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
                functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.id
            });
            expect(details).toEqual({
                description:
                    'Add new controller extension by creating javascript or typescript file and updates manifest.json with entry. Controller extensions allow users to extensiate default behaviour with custom controllers code.',
                id: 'create-controller-extension',
                name: 'Add new controller extension by creating javascript or typescript file and updates manifest.json with entry',
                parameters: [
                    {
                        defaultValue: 'ListReport',
                        description: 'Type of page',
                        id: 'pageType',
                        options: ['ListReport', 'ObjectPage'],
                        required: true,
                        type: 'string'
                    },
                    {
                        description: 'Name of new controller extension file',
                        id: 'controllerName',
                        required: true,
                        type: 'string'
                    },
                    {
                        description:
                            'If controller extenison should be assigned for specific page, then pageId should be provided',
                        id: 'pageId',
                        options: ['TravelList', 'TravelObjectPage'],
                        type: 'string'
                    }
                ]
            });
        });

        test('getFunctionalityDetails - unresolvable project', async () => {
            createApplicationAccessSpy.mockImplementation(() => {
                throw new Error('Test error');
            });
            mockSpecificationImport(importProjectMock);
            const details = await createControllerExtensionHandlers.getFunctionalityDetails({
                appPath: appPath,
                functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.id
            });
            expect(details).toEqual({
                ...CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY,
                parameters: [
                    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.parameters[0],
                    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.parameters[2]
                ]
            });
        });
    });

    describe('executeFunctionality', () => {
        test('create controller extension with pageType', async () => {
            mockSpecificationImport(importProjectMock);
            const details = await createControllerExtensionHandlers.executeFunctionality({
                appPath: appPath,
                functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.id,
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
                functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.id,
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

        test('create controller extension - no changes', async () => {
            memFsdumpMock.mockReturnValue({});
            mockSpecificationImport(importProjectMock);
            const details = await createControllerExtensionHandlers.executeFunctionality({
                appPath: appPath,
                functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.id,
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
                functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.id,
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
