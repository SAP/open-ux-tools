import * as openUxProjectAccessDependency from '@sap-ux/project-access';
import { readFile } from 'node:fs/promises';
import { executeFunctionality } from '../../../src/tools';
import {
    ensureSpecificationLoaded,
    mockSpecificationReadApp,
    mockSpecificationReadAppWithModel,
    readAppWithModel
} from '../utils';
import * as addPageDependency from '../../../src/tools/functionalities/page';
import * as projectUtils from '../../../src/page-editor-api/project';
import * as flexUtils from '../../../src/page-editor-api/flex';
import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { FlexChangeLayer } from '@sap/ux-specification/dist/types/src';

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true,

    ...(jest.requireActual('@sap-ux/project-access') as object)
}));

const appPathLropV4 = join(__dirname, '../../test-data/original/lrop');

describe('executeFunctionality', () => {
    const appPath = 'testApplicationPath';
    let readAppMock = jest.fn();
    let exportProjectMock = jest.fn();
    let updateManifestJSONMock = jest.fn();
    let findProjectRootSpy: jest.SpyInstance;
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
    const fsEditor = create(createStorage());
    let getManifestSpy: jest.SpyInstance;
    let getFlexChangeLayerSpy: jest.SpyInstance;
    let createApplicationAccessSpy: jest.SpyInstance;
    let writeFlexChangesSpy: jest.SpyInstance;
    let getUI5VersionSpy: jest.SpyInstance;
    const applications: { [key: string]: openUxProjectAccessDependency.ApplicationAccess } = {};
    beforeAll(async () => {
        // Create application access can take more time on slower machines
        applications[appPathLropV4] = await openUxProjectAccessDependency.createApplicationAccess(appPathLropV4);
        // Ensure spec is loaded - first import is most costly
        await ensureSpecificationLoaded();
    }, 10000);
    beforeEach(async () => {
        getManifestSpy = jest
            .spyOn(projectUtils, 'getManifest')
            .mockResolvedValue({} as openUxProjectAccessDependency.Manifest);
        getFlexChangeLayerSpy = jest
            .spyOn(projectUtils, 'getFlexChangeLayer')
            .mockResolvedValue(FlexChangeLayer.Customer);
        getUI5VersionSpy = jest.spyOn(projectUtils, 'getUI5Version').mockResolvedValue('1.141.3');
        findProjectRootSpy = jest
            .spyOn(openUxProjectAccessDependency, 'findProjectRoot')
            .mockImplementation(async (path: string): Promise<string> => path);
        writeFlexChangesSpy = jest.spyOn(flexUtils, 'writeFlexChanges').mockResolvedValue(fsEditor);
        readAppMock = jest.fn().mockResolvedValue({
            files: []
        });
        exportProjectMock = jest.fn();
        updateManifestJSONMock = jest.fn();
        mockSpecificationExport();
        createApplicationAccessSpy = jest
            .spyOn(openUxProjectAccessDependency, 'createApplicationAccess')
            .mockImplementation(async (rootPath: string): Promise<openUxProjectAccessDependency.ApplicationAccess> => {
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
                } as unknown as openUxProjectAccessDependency.ApplicationAccess;
            });
    });

    afterEach(() => {
        jest.restoreAllMocks();
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
        const getFunctionalityDetailsSpy = jest.spyOn(addPageDependency.addPageHandlers, 'executeFunctionality');
        getFunctionalityDetailsSpy.mockResolvedValue(result);
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
        const modifiedConfig = exportProjectMock.mock.calls[0][0].v4.ObjectPage.page.config;
        expect(modifiedConfig.header.actions.RelatedApps.showRelatedApps).toEqual('dummy value');
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
        getFlexChangeLayerSpy.mockResolvedValue(FlexChangeLayer.Vendor);
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
        expect(writeFlexChangesSpy).toHaveBeenCalledTimes(1);
        expect(writeFlexChangesSpy).toHaveBeenCalledWith('changes', {
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
