import { jest } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { FlexChangeLayer } from '@sap/ux-specification/dist/types/src';
import {
    ensureSpecificationLoaded,
    mockSpecificationReadApp,
    mockSpecificationReadAppWithModel,
    readAppWithModel
} from '../utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
const actualProjectUtils = await import('../../../src/page-editor-api/project.js');
const mockGetManifest = jest.fn<any>();
const mockGetFlexChangeLayer = jest.fn<any>();
const mockGetUI5Version = jest.fn<any>();
jest.unstable_mockModule('../../../src/page-editor-api/project', () => ({
    ...actualProjectUtils,
    getManifest: mockGetManifest,
    getFlexChangeLayer: mockGetFlexChangeLayer,
    getUI5Version: mockGetUI5Version
}));

// Mock flex utils
const actualFlexUtils = await import('../../../src/page-editor-api/flex.js');
const mockWriteFlexChanges = jest.fn<any>();
jest.unstable_mockModule('../../../src/page-editor-api/flex', () => ({
    ...actualFlexUtils,
    writeFlexChanges: mockWriteFlexChanges
}));

// Dynamic imports after mocks
const { executeFunctionality } = await import('../../../src/tools/index.js');
const addPageDependency = await import('../../../src/tools/functionalities/page/index.js');

const appPathLropV4 = join(__dirname, '../../test-data/original/lrop');
const fsEditor = create(createStorage());

describe('executeFunctionality', () => {
    const appPath = 'testApplicationPath';
    let readAppMock = jest.fn<any>();
    let exportProjectMock = jest.fn<any>();
    let updateManifestJSONMock = jest.fn<any>();
    const mockSpecificationExport = (
        manifest = {},
        manifestChangeIndicator = 'Updated',
        flexChanges: undefined | string[] = undefined
    ) => {
        exportProjectMock.mockReturnValue({
            manifest,
            manifestChangeIndicator,
            flexChanges
        });
    };
    const applications: { [key: string]: actualProjectAccess.ApplicationAccess } = {};
    beforeAll(async () => {
        // Create application access can take more time on slower machines
        applications[appPathLropV4] = await actualProjectAccess.createApplicationAccess(appPathLropV4);
        // Ensure spec is loaded - first import is most costly
        await ensureSpecificationLoaded();
    }, 10000);
    beforeEach(async () => {
        mockGetManifest.mockResolvedValue({} as actualProjectAccess.Manifest);
        mockGetFlexChangeLayer.mockResolvedValue(FlexChangeLayer.Customer);
        mockGetUI5Version.mockResolvedValue('1.141.3');
        mockFindProjectRoot.mockImplementation(async (path: string): Promise<string> => path);
        mockWriteFlexChanges.mockResolvedValue(fsEditor);
        readAppMock = jest.fn<any>().mockResolvedValue({
            files: []
        });
        exportProjectMock = jest.fn<any>();
        updateManifestJSONMock = jest.fn<any>();
        mockSpecificationExport();
        mockCreateApplicationAccess.mockImplementation(
            async (rootPath: string): Promise<actualProjectAccess.ApplicationAccess> => {
                return {
                    getAppId: () => 'dummy-id',
                    app: {
                        changes: 'changes'
                    },
                    project: {
                        root: 'root',
                        apps: {
                            ['dummy-id']: {}
                        }
                    },
                    updateManifestJSON: updateManifestJSONMock,
                    getSpecification: () => ({
                        readApp: readAppMock,
                        exportConfig: exportProjectMock,
                        getApiVersion: () => ({ version: '99' })
                    })
                } as unknown as actualProjectAccess.ApplicationAccess;
            }
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test('call static functionality', async () => {
        const result = {
            appPath: 'testApplicationPath',
            changes: [],
            functionalityId: 'add-page',
            message: 'Test message',
            parameters: {},
            status: 'success',
            timestamp: '000'
        };
        const executeFunctionalitySpy = jest.spyOn(addPageDependency.addPageHandlers, 'executeFunctionality');
        executeFunctionalitySpy.mockResolvedValue(result);
        const details = await executeFunctionality({
            appPath,
            functionalityId: 'add-page',
            parameters: {}
        });
        expect(details).toEqual(result);
    });

    test('Change app property', async () => {
        const updatedManifest = { changed: true };
        mockSpecificationReadAppWithModel(readAppMock, appPathLropV4, applications);
        mockSpecificationExport(updatedManifest);
        const details = await executeFunctionality({
            appPath,
            functionalityId: ['settings', 'title'],
            parameters: {
                value: 'new title'
            }
        });
        expect(details).toEqual(
            expect.objectContaining({
                appPath: 'testApplicationPath',
                changes: ['Modified webapp/manifest.json'],
                functionalityId: ['settings', 'title'],
                message: "Successfully executed 'Change property'",
                parameters: {
                    value: 'new title'
                },
                status: 'success'
            })
        );
        expect(exportProjectMock).toHaveBeenCalledTimes(1);
        const exportParams = exportProjectMock.mock.calls[0][0];
        const modifiedConfig = exportParams.v4.Application.application;
        expect(modifiedConfig.settings.title).toEqual('new title');
        expect(exportParams.ui5Version).toEqual('1.141.3');
        expect(exportParams.layer).toEqual(FlexChangeLayer.Customer);
        expect(exportParams.v4.Application.logger).toBeDefined();
        expect(updateManifestJSONMock).toHaveBeenCalledTimes(1);
        expect(updateManifestJSONMock).toHaveBeenCalledWith(updatedManifest);
    });

    test('Change page property', async () => {
        const updatedManifest = { changed: true };
        mockSpecificationReadAppWithModel(readAppMock, appPathLropV4, applications);
        mockSpecificationExport(updatedManifest);
        const details = await executeFunctionality({
            appPath,
            functionalityId: ['TravelObjectPage', 'header', 'actions', 'RelatedApps', 'showRelatedApps'],
            parameters: {
                showRelatedApps: 'dummy value'
            }
        });
        expect(details).toEqual(
            expect.objectContaining({
                appPath: 'testApplicationPath',
                changes: ['Modified webapp/manifest.json'],
                functionalityId: ['TravelObjectPage', 'header', 'actions', 'RelatedApps', 'showRelatedApps'],
                message: "Successfully executed 'Change property'",
                parameters: {
                    showRelatedApps: 'dummy value'
                },
                status: 'success'
            })
        );
        expect(exportProjectMock).toHaveBeenCalledTimes(1);
        const exportParams = exportProjectMock.mock.calls[0][0];
        const modifiedConfig = exportParams.v4.ObjectPage.page.config;
        expect(modifiedConfig.header.actions.RelatedApps.showRelatedApps).toEqual('dummy value');
        expect(exportParams.v4.ObjectPage.logger).toBeDefined();
        expect(updateManifestJSONMock).toHaveBeenCalledTimes(1);
        expect(updateManifestJSONMock).toHaveBeenCalledWith(updatedManifest);
    });

    const objectUpdateTestCases = [
        {
            name: 'Parameter values as properties',
            parameters: {
                defaultTwoColumnLayoutType: 'ThreeColumnsEndExpanded',
                defaultThreeColumnLayoutType: 'ThreeColumnsMidExpandedEndHidden'
            },
            expectedResult: {
                defaultTwoColumnLayoutType: 'ThreeColumnsEndExpanded',
                defaultThreeColumnLayoutType: 'ThreeColumnsMidExpandedEndHidden'
            }
        },
        {
            name: 'Parameter value as object',
            parameters: {
                flexibleColumnLayout: {
                    defaultTwoColumnLayoutType: 'ThreeColumnsEndExpanded',
                    defaultThreeColumnLayoutType: 'ThreeColumnsMidExpandedEndHidden'
                }
            },
            expectedResult: {
                defaultTwoColumnLayoutType: 'ThreeColumnsEndExpanded',
                defaultThreeColumnLayoutType: 'ThreeColumnsMidExpandedEndHidden'
            }
        }
    ];
    test.each(objectUpdateTestCases)('$name', async ({ parameters, expectedResult }) => {
        const updatedManifest = { changed: true };
        mockSpecificationReadAppWithModel(readAppMock, appPathLropV4, applications);
        mockSpecificationExport(updatedManifest);
        const details = await executeFunctionality({
            appPath,
            functionalityId: ['settings', 'flexibleColumnLayout'],
            parameters
        });
        expect(details).toEqual(
            expect.objectContaining({
                appPath: 'testApplicationPath',
                changes: ['Modified webapp/manifest.json'],
                functionalityId: ['settings', 'flexibleColumnLayout'],
                message: "Successfully executed 'Change property'",
                parameters,
                status: 'success'
            })
        );
        expect(exportProjectMock).toHaveBeenCalledTimes(1);
        const modifiedConfig = exportProjectMock.mock.calls[0][0].v4.Application.application;
        expect(modifiedConfig.settings.flexibleColumnLayout).toEqual(expectedResult);
        expect(updateManifestJSONMock).toHaveBeenCalledTimes(1);
        expect(updateManifestJSONMock).toHaveBeenCalledWith(updatedManifest);
    });

    test('Property change is received through node', async () => {
        const updatedManifest = { changed: true };
        mockSpecificationReadAppWithModel(readAppMock, appPathLropV4, applications);
        mockSpecificationExport(updatedManifest);
        const parameters = {
            showRelatedApps: 'test value'
        };
        const details = await executeFunctionality({
            appPath,
            functionalityId: ['TravelObjectPage', 'header', 'actions', 'RelatedApps'],
            parameters
        });
        expect(details).toEqual(
            expect.objectContaining({
                appPath: 'testApplicationPath',
                changes: ['Modified webapp/manifest.json'],
                functionalityId: ['TravelObjectPage', 'header', 'actions', 'RelatedApps'],
                message: "Successfully executed 'Change property'",
                parameters,
                status: 'success'
            })
        );
        expect(exportProjectMock).toHaveBeenCalledTimes(1);
        const modifiedConfig = exportProjectMock.mock.calls[0][0].v4.ObjectPage.page.config;
        expect(modifiedConfig.header.actions.RelatedApps).toEqual({
            showRelatedApps: 'test value'
        });
        expect(updateManifestJSONMock).toHaveBeenCalledTimes(1);
        expect(updateManifestJSONMock).toHaveBeenCalledWith(updatedManifest);
    });

    test('Without appPath', async () => {
        await expect(
            executeFunctionality({
                appPath: '',
                functionalityId: 'add-page',
                parameters: {}
            })
        ).rejects.toThrow('appPath parameter is required');
    });

    test('Without functionalityId', async () => {
        await expect(
            executeFunctionality({
                appPath,
                functionalityId: '',
                parameters: {}
            })
        ).rejects.toThrow('functionalityId parameter is required');
    });

    test('Change page property - flex change', async () => {
        const flexChangeFileName = 'id_1761320220775_2_propertyChange.change';
        const commitSpy = jest.spyOn(fsEditor, 'commit');
        jest.spyOn(fsEditor, 'dump').mockReturnValue({
            [flexChangeFileName]: {
                contents: '',
                state: 'modified'
            }
        });
        const file = await readFile(
            join(__dirname, '../page-editor-api/test-data/flex-changes', flexChangeFileName),
            'utf8'
        );
        mockSpecificationReadAppWithModel(readAppMock, appPathLropV4, applications);
        mockSpecificationExport(undefined, 'NoChange', [file]);
        mockGetFlexChangeLayer.mockResolvedValue(FlexChangeLayer.Vendor);
        const details = await executeFunctionality({
            appPath,
            functionalityId: ['TravelObjectPage', 'header', 'actions', 'RelatedApps', 'showRelatedApps'],
            parameters: {
                title: 'dummy title'
            }
        });
        // Check executions
        expect(exportProjectMock).toHaveBeenCalledTimes(1);
        expect(exportProjectMock).toHaveBeenCalledTimes(1);
        expect(exportProjectMock.mock.calls[0][0].layer).toEqual(FlexChangeLayer.Vendor);
        expect(mockWriteFlexChanges).toHaveBeenCalledTimes(1);
        expect(mockWriteFlexChanges).toHaveBeenCalledWith('changes', {
            [join('changes', 'id_1761320220775_34_propertyChange.change')]: JSON.parse(file)
        });
        expect(commitSpy).toHaveBeenCalledTimes(1);
        // Check details
        expect(details).toEqual(
            expect.objectContaining({
                appPath: 'testApplicationPath',
                changes: [`Modified ${flexChangeFileName}`],
                functionalityId: ['TravelObjectPage', 'header', 'actions', 'RelatedApps', 'showRelatedApps'],
                message: "Successfully executed 'Change property'",
                parameters: {
                    title: 'dummy title'
                },
                status: 'success'
            })
        );
    });
});
