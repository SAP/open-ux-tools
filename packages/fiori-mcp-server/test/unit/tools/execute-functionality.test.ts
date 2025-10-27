import * as openUxProjectAccessDependency from '@sap-ux/project-access';
import { readFile } from 'node:fs/promises';
import { executeFunctionality } from '../../../src/tools';
import { mockSpecificationImport } from '../utils';
import * as addPageDependency from '../../../src/tools/functionalities/page';
import * as projectUtils from '../../../src/page-editor-api/project';
import * as flexUtils from '../../../src/page-editor-api/flex';
import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/project-access') as object)
}));

describe('executeFunctionality', () => {
    const appPath = 'testApplicationPath';
    let importProjectMock = jest.fn();
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
    let getManifestSpy: jest.SpyInstance;
    let createApplicationAccessSpy: jest.SpyInstance;
    let writeFlexChangesSpy: jest.SpyInstance;
    beforeEach(async () => {
        getManifestSpy = jest
            .spyOn(projectUtils, 'getManifest')
            .mockResolvedValue({} as openUxProjectAccessDependency.Manifest);
        findProjectRootSpy = jest
            .spyOn(openUxProjectAccessDependency, 'findProjectRoot')
            .mockImplementation(async (path: string): Promise<string> => path);
        writeFlexChangesSpy = jest.spyOn(flexUtils, 'writeFlexChanges');
        importProjectMock = jest.fn().mockResolvedValue([]);
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
                        importProject: importProjectMock,
                        exportConfig: exportProjectMock
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
        mockSpecificationImport(importProjectMock);
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
        const modifiedConfig = exportProjectMock.mock.calls[0][0].v4.Application.application;
        expect(modifiedConfig.settings.title).toEqual('new title');
        expect(updateManifestJSONMock).toHaveBeenCalledTimes(1);
        expect(updateManifestJSONMock).toHaveBeenCalledWith(updatedManifest);
    });

    test('Change page property', async () => {
        const updatedManifest = { changed: true };
        mockSpecificationImport(importProjectMock);
        mockSpecificationExport(updatedManifest);
        const details = await executeFunctionality({
            appPath,
            functionalityId: [
                'TravelObjectPage',
                'sections',
                'GroupSection',
                'subsections',
                'CustomSubSection',
                'title'
            ],
            parameters: {
                title: 'dumme title'
            }
        });
        expect(details).toEqual(
            expect.objectContaining({
                appPath: 'testApplicationPath',
                changes: ['Modified webapp/manifest.json'],
                functionalityId: [
                    'TravelObjectPage',
                    'sections',
                    'GroupSection',
                    'subsections',
                    'CustomSubSection',
                    'title'
                ],
                message: "Successfully executed 'Change property'",
                parameters: {
                    title: 'dumme title'
                },
                status: 'success'
            })
        );
        expect(exportProjectMock).toHaveBeenCalledTimes(1);
        const modifiedConfig = exportProjectMock.mock.calls[0][0].v4.ObjectPage.page.config;
        expect(modifiedConfig.sections.GroupSection.subsections.CustomSubSection.title).toEqual('dumme title');
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
        mockSpecificationImport(importProjectMock);
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
        mockSpecificationImport(importProjectMock);
        mockSpecificationExport(updatedManifest);
        const parameters = {
            controls: {},
            title: 'test1',
            id: 'dummy',
            fragmentName: 'project1.ext.fragment.CustomSubSection'
        };
        const details = await executeFunctionality({
            appPath,
            functionalityId: ['TravelObjectPage', 'sections', 'GroupSection', 'subsections', 'CustomSubSection'],
            parameters
        });
        expect(details).toEqual(
            expect.objectContaining({
                appPath: 'testApplicationPath',
                changes: ['Modified webapp/manifest.json'],
                functionalityId: ['TravelObjectPage', 'sections', 'GroupSection', 'subsections', 'CustomSubSection'],
                message: "Successfully executed 'Change property'",
                parameters,
                status: 'success'
            })
        );
        expect(exportProjectMock).toHaveBeenCalledTimes(1);
        const modifiedConfig = exportProjectMock.mock.calls[0][0].v4.ObjectPage.page.config;
        expect(modifiedConfig.sections.GroupSection.subsections.CustomSubSection).toEqual({
            controls: {},
            fragmentName: 'project1.ext.fragment.CustomSubSection',
            title: 'test1',
            id: 'dummy'
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
        const fsEditor = create(createStorage());
        const commitSpy = jest.spyOn(fsEditor, 'commit');
        jest.spyOn(fsEditor, 'dump').mockReturnValue({
            [flexChangeFileName]: {
                contents: '',
                state: 'modified'
            }
        });
        writeFlexChangesSpy.mockResolvedValue(fsEditor);
        const file = await readFile(
            join(__dirname, '../page-editor-api/test-data/flex-changes', flexChangeFileName),
            'utf8'
        );
        mockSpecificationImport(importProjectMock);
        mockSpecificationExport(undefined, 'NoChange', [file]);
        const details = await executeFunctionality({
            appPath,
            functionalityId: [
                'TravelObjectPage',
                'sections',
                'GroupSection',
                'subsections',
                'CustomSubSection',
                'title'
            ],
            parameters: {
                title: 'dummy title'
            }
        });
        // Check executions
        expect(exportProjectMock).toHaveBeenCalledTimes(1);
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
                functionalityId: [
                    'TravelObjectPage',
                    'sections',
                    'GroupSection',
                    'subsections',
                    'CustomSubSection',
                    'title'
                ],
                message: "Successfully executed 'Change property'",
                parameters: {
                    title: 'dummy title'
                },
                status: 'success'
            })
        );
    });
});
