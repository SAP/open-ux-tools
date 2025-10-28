import * as openUxProjectAccessDependency from '@sap-ux/project-access';
import { getFunctionalityDetails } from '../../../src/tools';
import { mockSpecificationImport } from '../utils';
import applicationConfig from '../page-editor-api/test-data/config/App.json';
import * as addPageDependency from '../../../src/tools/functionalities/page';
import * as projectUtils from '../../../src/page-editor-api/project';

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true,

    ...(jest.requireActual('@sap-ux/project-access') as object)
}));

describe('getFunctionalityDetails', () => {
    const appPath = 'testApplicationPath';
    let importProjectMock = jest.fn();
    const findProjectRootSpy: jest.SpyInstance = jest.spyOn(openUxProjectAccessDependency, 'findProjectRoot');
    const getManifestSpy: jest.SpyInstance = jest.spyOn(projectUtils, 'getManifest');
    const createApplicationAccessSpy: jest.SpyInstance = jest.spyOn(
        openUxProjectAccessDependency,
        'createApplicationAccess'
    );
    beforeEach(async () => {
        importProjectMock = jest.fn().mockResolvedValue([]);
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
                    importProject: importProjectMock
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
        mockSpecificationImport(importProjectMock);
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
        mockSpecificationImport(importProjectMock);
        const details = await getFunctionalityDetails({
            appPath,
            functionalityId: [
                'TravelObjectPage',
                'sections',
                'GroupSection',
                'subsections',
                'CustomSubSection',
                'title'
            ]
        });
        expect(details).toEqual({
            description:
                "Change a property. To reset, remove, or restore it to its default value, set the value to null. If the property's description does not specify how to disable the related feature, setting it to null is typically the appropriate way to disable or clear it.",
            functionalityId: [
                'TravelObjectPage',
                'sections',
                'GroupSection',
                'subsections',
                'CustomSubSection',
                'title'
            ],
            name: 'Change property',
            pageName: 'TravelObjectPage',
            parameters: {
                type: 'object',
                properties: {
                    title: {
                        artifactType: 'Manifest',
                        description: 'The label of a custom section, preferably as an i18n key.',
                        i18nClassification: 'TIT: Custom section title',
                        type: 'string'
                    }
                }
            }
        });
    });

    test('Get page node properties', async () => {
        mockSpecificationImport(importProjectMock);
        const details = await getFunctionalityDetails({
            appPath,
            functionalityId: ['TravelObjectPage', 'sections', 'GroupSection', 'subsections', 'CustomSubSection']
        });
        expect(details).toEqual({
            description:
                "Change a property. To reset, remove, or restore it to its default value, set the value to null. If the property's description does not specify how to disable the related feature, setting it to null is typically the appropriate way to disable or clear it.",
            functionalityId: ['TravelObjectPage', 'sections', 'GroupSection', 'subsections', 'CustomSubSection'],
            name: 'Change property',
            pageName: 'TravelObjectPage',
            parameters: {
                type: 'object',
                properties: {
                    CustomSubSection: {
                        actionType: 'Custom',
                        additionalProperties: false,
                        description: 'Custom Sub Section',
                        isViewNode: true,
                        keys: [
                            {
                                name: 'Key',
                                value: 'CustomSubSection'
                            }
                        ],
                        properties: {
                            controls: {
                                type: 'object'
                            },
                            fragmentName: {
                                artifactType: 'Manifest',
                                description: 'The path to the XML template containing the section control.',
                                type: 'string'
                            },
                            relatedFacet: {
                                artifactType: 'Manifest',
                                description: 'Use the key of another section as a placement anchor.',
                                displayName: 'Anchor',
                                oneOf: [
                                    {
                                        bundle: 'ui5',
                                        const: 'SubSection1',
                                        description: 'Sub Section 1',
                                        hidden: true
                                    },
                                    {
                                        bundle: 'ui5',
                                        const: 'CustomSubSection',
                                        custom: true,
                                        description: 'Custom Sub Section'
                                    }
                                ],
                                type: 'string'
                            },
                            relativePosition: {
                                displayName: 'Placement',
                                enum: ['After', 'Before'],
                                type: 'string',
                                artifactType: 'Manifest',
                                description: 'Define the placement, either before or after the anchor section.'
                            },
                            title: {
                                artifactType: 'Manifest',
                                description: 'The label of a custom section, preferably as an i18n key.',
                                i18nClassification: 'TIT: Custom section title',
                                type: 'string'
                            }
                        },
                        propertyIndex: 1,
                        required: ['fragmentName', 'title'],
                        type: 'object'
                    }
                }
            }
        });
    });

    test('Get application complex property details', async () => {
        // Mock data with value to test how "currentValue" is resolved
        const appConfigTemp = JSON.parse(JSON.stringify(applicationConfig));
        appConfigTemp.settings.flexibleColumnLayout = {
            defaultTwoColumnLayoutType: 'ThreeColumnsBeginExpandedEndHidden'
        };
        mockSpecificationImport(importProjectMock, [
            { dataSourceUri: 'app.json', fileContent: JSON.stringify(appConfigTemp) }
        ]);
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
