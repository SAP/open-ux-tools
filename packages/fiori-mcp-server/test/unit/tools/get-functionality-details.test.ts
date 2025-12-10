import * as openUxProjectAccessDependency from '@sap-ux/project-access';
import { getFunctionalityDetails } from '../../../src/tools';
import { mockSpecificationReadAppWithModel } from '../utils';
import * as addPageDependency from '../../../src/tools/functionalities/page';
import * as projectUtils from '../../../src/page-editor-api/project';
import { join } from 'node:path';

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/project-access') as object)
}));

const appPathLropV4 = join(__dirname, '../../test-data/original/lrop');

describe('getFunctionalityDetails', () => {
    const appPath = 'testApplicationPath';
    let readAppMock = jest.fn();
    const findProjectRootSpy: jest.SpyInstance = jest.spyOn(openUxProjectAccessDependency, 'findProjectRoot');
    const getManifestSpy: jest.SpyInstance = jest.spyOn(projectUtils, 'getManifest');
    const createApplicationAccessSpy: jest.SpyInstance = jest.spyOn(
        openUxProjectAccessDependency,
        'createApplicationAccess'
    );
    const applications: { [key: string]: openUxProjectAccessDependency.ApplicationAccess } = {};
    beforeAll(async () => {
        // Create application access can take more time on slower machines
        applications[appPathLropV4] = await openUxProjectAccessDependency.createApplicationAccess(appPathLropV4);
    }, 10000);
    beforeEach(async () => {
        readAppMock = jest.fn().mockResolvedValue({ files: [] });
        getManifestSpy.mockResolvedValue({});
        findProjectRootSpy.mockImplementation(async (path: string): Promise<string> => path);
        createApplicationAccessSpy.mockImplementation((rootPath: string) => {
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
                getSpecification: () => ({
                    readApp: readAppMock,
                    getApiVersion: () => ({ version: '99' })
                })
            };
        });
    });

    test('call static functionality', async () => {
        const getFunctionalityDetailsSpy = jest.spyOn(addPageDependency.addPageHandlers, 'getFunctionalityDetails');
        getFunctionalityDetailsSpy.mockResolvedValue(addPageDependency.ADD_PAGE_FUNCTIONALITY);
        const details = await getFunctionalityDetails({
            appPath,
            functionalityId: 'add-page'
        });
        expect(details).toEqual({ ...addPageDependency.ADD_PAGE_FUNCTIONALITY });
    });

    test('call atomic property', async () => {
        mockSpecificationReadAppWithModel(readAppMock, appPathLropV4, applications);
        const details = await getFunctionalityDetails({
            appPath,
            functionalityId: ['settings', 'flexEnabled']
        });
        expect(details).toEqual({
            description:
                "Change a property. To reset, remove, or restore it to its default value, set the value to null. If the property's description does not specify how to disable the related feature, setting it to null is typically the appropriate way to disable or clear it.",
            functionalityId: ['settings', 'flexEnabled'],
            name: 'Change property',
            parameters: {
                type: 'object',
                properties: {
                    flexEnabled: {
                        description: 'Enables key user adaptation for an application.',
                        descriptionSrcURL: 'https://ui5.sap.com/sdk/#/topic/ccd45ba3f0b446a0901b2c9d42b8ad53',
                        type: 'boolean'
                    }
                }
            }
        });
    });

    test('Get page property', async () => {
        mockSpecificationReadAppWithModel(readAppMock, appPathLropV4, applications);
        const details = await getFunctionalityDetails({
            appPath,
            functionalityId: ['TravelObjectPage', 'header', 'actions', 'RelatedApps', 'showRelatedApps']
        });
        expect(details).toEqual({
            'description':
                "Change a property. To reset, remove, or restore it to its default value, set the value to null. If the property's description does not specify how to disable the related feature, setting it to null is typically the appropriate way to disable or clear it.",
            'functionalityId': ['TravelObjectPage', 'header', 'actions', 'RelatedApps', 'showRelatedApps'],
            'name': 'Change property',
            'pageName': 'TravelObjectPage',
            'parameters': {
                'properties': {
                    'showRelatedApps': {
                        'artifactType': 'Manifest',
                        'description': 'Set showRelatedApps to true to show the navigation button for related apps.',
                        'type': 'boolean'
                    }
                },
                'type': 'object'
            }
        });
    });

    test('Get page node properties', async () => {
        mockSpecificationReadAppWithModel(readAppMock, appPathLropV4, applications);
        const details = await getFunctionalityDetails({
            appPath,
            functionalityId: ['TravelObjectPage', 'header', 'actions', 'DeleteAction']
        });
        expect(details).toEqual({
            'description':
                "Change a property. To reset, remove, or restore it to its default value, set the value to null. If the property's description does not specify how to disable the related feature, setting it to null is typically the appropriate way to disable or clear it.",
            'functionalityId': ['TravelObjectPage', 'header', 'actions', 'DeleteAction'],
            'name': 'Change property',
            'pageName': 'TravelObjectPage',
            'parameters': {
                'properties': {
                    'DeleteAction': {
                        'actionType': 'Standard',
                        'additionalProperties': true,
                        'annotationPath':
                            '/com.sap.gateway.srvd.dmo.ui_travel_uuid_um.v0001.Container/Travel/@com.sap.vocabularies.UI.v1.DeleteHidden',
                        'description': 'Delete',
                        'isViewNode': true,
                        'keys': [
                            {
                                'name': 'Action',
                                'value': 'Delete'
                            }
                        ],
                        'properties': {
                            'group': {
                                'artifactType': 'Manifest',
                                'description':
                                    "Defines a group of actions. When there's not enough space to display all grouped actions, they are moved together into overflow.",
                                'descriptionSrcURL': 'https://ui5.sap.com/#/topic/cbf16c599f2d4b8796e3702f7d4aae6c',
                                'type': 'string'
                            }
                        },
                        'propertyIndex': 1,
                        'type': 'object'
                    }
                },
                'type': 'object'
            }
        });
    });

    test('Get application complex property details', async () => {
        mockSpecificationReadAppWithModel(readAppMock, appPathLropV4, applications);
        const details = await getFunctionalityDetails({
            appPath,
            functionalityId: ['settings', 'flexibleColumnLayout']
        });
        expect(details).toEqual({
            description:
                "Change a property. To reset, remove, or restore it to its default value, set the value to null. If the property's description does not specify how to disable the related feature, setting it to null is typically the appropriate way to disable or clear it.",
            functionalityId: ['settings', 'flexibleColumnLayout'],
            name: 'Change property',
            parameters: {
                type: 'object',
                properties: {
                    flexibleColumnLayout: {
                        additionalProperties: false,
                        description:
                            'The flexible column layout allows users to see more details on the page, and to expand and collapse the screen areas.',
                        descriptionSrcURL: 'https://ui5.sap.com/sdk/#/topic/e762257125b34513b0859faa1610b09e',
                        properties: {
                            defaultThreeColumnLayoutType: {
                                enum: [
                                    'EndColumnFullScreen',
                                    'MidColumnFullScreen',
                                    'OneColumn',
                                    'ThreeColumnsBeginExpandedEndHidden',
                                    'ThreeColumnsEndExpanded',
                                    'ThreeColumnsMidExpanded',
                                    'ThreeColumnsMidExpandedEndHidden',
                                    'TwoColumnsBeginExpanded',
                                    'TwoColumnsMidExpanded'
                                ],
                                type: 'string'
                            },
                            defaultTwoColumnLayoutType: {
                                enum: [
                                    'EndColumnFullScreen',
                                    'MidColumnFullScreen',
                                    'OneColumn',
                                    'ThreeColumnsBeginExpandedEndHidden',
                                    'ThreeColumnsEndExpanded',
                                    'ThreeColumnsMidExpanded',
                                    'ThreeColumnsMidExpandedEndHidden',
                                    'TwoColumnsBeginExpanded',
                                    'TwoColumnsMidExpanded'
                                ],
                                type: 'string'
                            },
                            limitFCLToTwoColumns: {
                                description:
                                    'Determines whether the Flexible Column Layout is limited to two columns. If set to true, the third level will be displayed in full screen mode rather than a third column.',
                                type: 'boolean'
                            }
                        },
                        type: 'object'
                    }
                }
            }
        });
    });

    test('Without appPath', async () => {
        await expect(
            getFunctionalityDetails({
                appPath: '',
                functionalityId: 'add-page'
            })
        ).rejects.toThrow('appPath parameter is required');
    });

    test('Without functionalityId', async () => {
        await expect(
            getFunctionalityDetails({
                appPath: 'app1',
                functionalityId: ''
            })
        ).rejects.toThrow('functionalityId parameter is required');
    });

    test('Unknown functionality', async () => {
        await expect(
            getFunctionalityDetails({
                appPath: 'app',
                functionalityId: ['dummy']
            })
        ).rejects.toThrow('functionalityId was not resolved');
    });

    test('functionalityId as unparsable path', async () => {
        await expect(
            getFunctionalityDetails({
                appPath: 'app',
                functionalityId: 'dummy'
            })
        ).rejects.toThrow('Invalid format of functionalityId parameter');
    });
});
