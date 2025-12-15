import type { TargetKind, MetadataElement } from '@sap-ux/odata-annotation-core-types';

import { MetadataService } from '../src';

function createTestService() {
    const metadataService = new MetadataService();
    const metadataFileUri = 'DummyMetadataFileUri';
    const metadataElements: MetadataElement[] = [
        {
            kind: 'entity',
            path: 'IncidentService.SafetyIncidents',
            isEntityType: true,
            isCollectionValued: true,
            isComplexType: false,
            isAnnotatable: true,
            name: 'IncidentService.SafetyIncidents',
            originalName: 'IncidentService.SafetyIncidents',
            keys: ['ID'],
            content: [
                {
                    path: 'IncidentService.SafetyIncidents/ID',
                    kind: 'element',
                    isEntityType: false,
                    isCollectionValued: false,
                    isComplexType: false,
                    isAnnotatable: true,
                    name: 'ID',
                    originalName: 'scp.cloud.SafetyIncidents.ID',
                    edmPrimitiveType: 'Edm.Guid',
                    content: [],
                    targetKinds: ['Property']
                }
            ],
            targetKinds: ['EntityType']
        },
        {
            kind: 'entity',
            path: 'IncidentService.SafetyIncidents_texts',
            isEntityType: true,
            isCollectionValued: true,
            isComplexType: false,
            isAnnotatable: true,
            name: 'IncidentService.SafetyIncidents_texts',
            originalName: 'IncidentService.SafetyIncidents.texts',
            keys: ['code'],
            content: [
                {
                    path: 'IncidentService.SafetyIncidents_texts/code',
                    kind: 'element',
                    isEntityType: false,
                    isCollectionValued: false,
                    isComplexType: false,
                    isAnnotatable: true,
                    name: 'code',
                    originalName: 'scp.cloud.SafetyIncidents.texts.code',
                    edmPrimitiveType: 'Edm.Int',
                    content: [],
                    targetKinds: ['Property']
                }
            ],
            targetKinds: ['EntityType']
        }
    ];
    metadataService.import(metadataElements, metadataFileUri);
    return metadataService;
}

describe('MetadataService for CDS', () => {
    test('getMetadataElement', () => {
        // prepare
        const path = 'IncidentService.SafetyIncidents';

        // Act
        const element = createTestService().getMetadataElement(path);

        // Expect
        const expectedResult = {
            kind: 'entity',
            path: 'IncidentService.SafetyIncidents',
            isEntityType: true,
            isCollectionValued: true,
            isComplexType: false,
            isAnnotatable: true,
            name: 'IncidentService.SafetyIncidents',
            originalName: 'IncidentService.SafetyIncidents',
            keys: ['ID'],
            content: [
                {
                    path: 'IncidentService.SafetyIncidents/ID',
                    kind: 'element',
                    isEntityType: false,
                    isCollectionValued: false,
                    isComplexType: false,
                    isAnnotatable: true,
                    name: 'ID',
                    originalName: 'scp.cloud.SafetyIncidents.ID',
                    edmPrimitiveType: 'Edm.Guid',
                    content: [],
                    targetKinds: ['Property']
                }
            ],
            targetKinds: ['EntityType']
        };
        expect(element).toEqual(expectedResult);
    });

    test('getEdmTargetKinds - for entity type', () => {
        //prepare
        const metadataService = createTestService();
        const path = 'IncidentService.SafetyIncidents';
        const element: MetadataElement = {
            kind: 'entity',
            isEntityType: true,
            isCollectionValued: true,
            isComplexType: false,
            isAnnotatable: true,
            name: 'IncidentService.SafetyIncidents',
            originalName: 'IncidentService.SafetyIncidents',
            keys: ['ID'],
            path: 'IncidentService.SafetyIncidents',
            content: [],
            targetKinds: ['EntityType', 'EntitySet', 'Collection']
        };
        jest.spyOn(metadataService, 'getMetadataElement').mockImplementation((): MetadataElement => {
            return element;
        });

        // Act
        const targetKinds: TargetKind[] = metadataService.getEdmTargetKinds(path);

        // Expect
        expect(targetKinds).toMatchObject(['EntityType', 'EntitySet', 'Collection']);
    });

    test('getEdmTargetKinds - for view', () => {
        //prepare
        const metadataService = createTestService();
        const path = 'IncidentService.SafetyIncidents';
        const element: MetadataElement = {
            kind: 'view',
            isEntityType: true,
            isCollectionValued: true,
            isComplexType: false,
            isAnnotatable: true,
            name: 'IncidentService.SafetyIncidents',
            path: 'IncidentService.SafetyIncidents',
            content: [],
            targetKinds: ['EntityType', 'EntitySet', 'Collection']
        };
        jest.spyOn(metadataService, 'getMetadataElement').mockImplementation((): MetadataElement => {
            return element;
        });

        // Act
        const targetKinds: TargetKind[] = metadataService.getEdmTargetKinds(path);

        // Expect
        expect(targetKinds).toMatchObject(['EntityType', 'EntitySet', 'Collection']);
    });

    test('getEdmTargetKinds - for entity type property', () => {
        //prepare
        const metadataService = createTestService();
        const path = 'IncidentService.SafetyIncidents';
        const element: MetadataElement = {
            kind: 'element',
            isEntityType: false,
            isCollectionValued: false,
            isComplexType: false,
            isAnnotatable: true,
            name: 'processStep',
            originalName: 'scp.cloud.IncidentFlow.processStep',
            edmPrimitiveType: 'Edm.String',
            path: 'scp.cloud.IncidentFlow/processStep',
            content: [],
            targetKinds: ['Property']
        };
        jest.spyOn(metadataService, 'getMetadataElement').mockImplementation((): MetadataElement => {
            return element;
        });

        // Act
        const targetKinds: TargetKind[] = metadataService.getEdmTargetKinds(path);

        // Expect
        expect(targetKinds).toMatchObject(['Property']);
    });

    test('getEdmTargetKinds - for action', () => {
        //prepare
        const metadataService = createTestService();
        const path = 'IncidentService.SafetyIncidentsEditAction';
        const element: MetadataElement = {
            kind: 'action',
            isEntityType: false,
            isCollectionValued: true,
            isComplexType: false,
            isAnnotatable: true,
            name: 'IncidentService.SafetyIncidentsEditAction',
            originalName: 'IncidentService.SafetyIncidentsEditAction',
            keys: ['ID'],
            path: 'IncidentService.SafetyIncidentsEditAction',
            content: [],
            targetKinds: ['Action', 'ActionImport', 'Collection']
        };
        jest.spyOn(metadataService, 'getMetadataElement').mockImplementation((): MetadataElement => {
            return element;
        });

        // Act
        const targetKinds: TargetKind[] = metadataService.getEdmTargetKinds(path);

        // Expect
        expect(targetKinds).toMatchObject(['Action', 'ActionImport', 'Collection']);
    });

    test('getEdmTargetKinds - for function', () => {
        //prepare
        const metadataService = createTestService();
        const path = 'IncidentService.SafetyIncidentsAverage';
        const element: MetadataElement = {
            kind: 'function',
            isEntityType: false,
            isCollectionValued: true,
            isComplexType: false,
            isAnnotatable: true,
            name: 'IncidentService.SafetyIncidentsAverage',
            originalName: 'IncidentService.SafetyIncidentsAverage',
            keys: ['ID'],
            path: 'IncidentService.SafetyIncidentsAverage',
            content: [],
            targetKinds: ['Function', 'FunctionImport', 'Collection']
        };
        jest.spyOn(metadataService, 'getMetadataElement').mockImplementation((): MetadataElement => {
            return element;
        });

        // Act
        const targetKinds: TargetKind[] = metadataService.getEdmTargetKinds(path);

        // Expect
        expect(targetKinds).toMatchObject(['Function', 'FunctionImport', 'Collection']);
    });

    test('getEdmTargetKinds - for parameter', () => {
        //prepare
        const metadataService = createTestService();
        const path = 'IncidentService.SafetyIncidentsAverageID';
        const element: MetadataElement = {
            kind: 'param',
            isEntityType: false,
            isCollectionValued: true,
            isComplexType: false,
            isAnnotatable: true,
            name: 'IncidentService.SafetyIncidentsAverageID',
            originalName: 'IncidentService.SafetyIncidentsAverageID',
            keys: ['ID'],
            path: 'IncidentService.SafetyIncidentsAverageID',
            content: [],
            targetKinds: ['Parameter', 'Collection']
        };
        jest.spyOn(metadataService, 'getMetadataElement').mockImplementation((): MetadataElement => {
            return element;
        });

        // Act
        const targetKinds: TargetKind[] = metadataService.getEdmTargetKinds(path);

        // Expect
        expect(targetKinds).toMatchObject(['Parameter', 'Collection']);
    });

    test('getEdmTargetKinds - for type', () => {
        //prepare
        const metadataService = createTestService();
        const path = 'IncidentService.SafetyIncidentsType';
        const element: MetadataElement = {
            kind: 'type',
            isEntityType: false,
            isCollectionValued: true,
            isComplexType: false,
            isAnnotatable: true,
            name: 'IncidentService.SafetyIncidentsAverageType',
            originalName: 'IncidentService.SafetyIncidentsAverageType',
            keys: ['ID'],
            path: 'IncidentService.SafetyIncidentsAverageType',
            content: [],
            targetKinds: ['TypeDefinition', 'Property', 'Parameter', 'Collection']
        };
        jest.spyOn(metadataService, 'getMetadataElement').mockImplementation((): MetadataElement => {
            return element;
        });

        // Act
        const targetKinds: TargetKind[] = metadataService.getEdmTargetKinds(path);

        // Expect
        expect(targetKinds).toMatchObject(['TypeDefinition', 'Property', 'Parameter', 'Collection']);
    });

    test('getEdmTargetKinds - for complex property', () => {
        //prepare
        const metadataService = createTestService();
        const path = 'IncidentService.SafetyIncidents';
        const element: MetadataElement = {
            kind: 'element',
            isEntityType: false,
            isCollectionValued: false,
            isComplexType: true,
            isAnnotatable: true,
            name: 'processStep',
            originalName: 'scp.cloud.IncidentFlow.processStep',
            structuredType: 'scp.cloud.IncidentStatus',
            path: 'scp.cloud.IncidentFlow/processStep',
            content: [],
            targetKinds: ['Property']
        };
        jest.spyOn(metadataService, 'getMetadataElement').mockImplementation((): MetadataElement => {
            return element;
        });

        // Act
        const targetKinds: TargetKind[] = metadataService.getEdmTargetKinds(path);

        // Expect
        expect(targetKinds).toMatchObject(['Property']);
    });

    test('getEdmTargetKinds - for navigation property', () => {
        //prepare
        const metadataService = createTestService();
        const path = 'IncidentService.SafetyIncidents/incidentStatus';
        const element: MetadataElement = {
            kind: 'element',
            isEntityType: true,
            isCollectionValued: false,
            isComplexType: false,
            isAnnotatable: true,
            name: 'incidentStatus',
            structuredType: 'scp.cloud.IncidentStatus',
            path: 'IncidentService.SafetyIncidents/incidentStatus',
            content: [],
            targetKinds: ['NavigationProperty', 'Property']
        };
        jest.spyOn(metadataService, 'getMetadataElement').mockImplementation((): MetadataElement => {
            return element;
        });

        // Act
        const targetKinds: TargetKind[] = metadataService.getEdmTargetKinds(path);

        // Expect
        expect(targetKinds).toMatchObject(['NavigationProperty', 'Property']);
    });
});
function createTestServiceForNodeModule() {
    const metadataService = new MetadataService();
    const metadataFileUri = 'file://test/node_modules/common.cds';
    const metadataElements: MetadataElement[] = [
        {
            location: {
                uri: metadataFileUri,
                range: { start: { line: 1, character: 1 }, end: { line: 5, character: 5 } }
            },
            kind: 'entity',
            path: 'Managed.Language',
            isEntityType: true,
            isCollectionValued: true,
            isComplexType: false,
            isAnnotatable: true,
            name: '',
            originalName: 'Managed.Language',
            keys: ['ID'],
            content: [],
            targetKinds: ['EntityType']
        }
    ];
    metadataService.import(metadataElements, metadataFileUri);
    return metadataService;
}
describe('MetadataService for CDS ', () => {
    test('getMetadataElement', () => {
        // prepare
        const path = 'Managed.Language';

        // Act
        const locs = createTestServiceForNodeModule().getMetadataElementLocations(path);

        // Expect
        expect(locs).toMatchInlineSnapshot(`
            Array [
              Object {
                "range": Object {
                  "end": Object {
                    "character": 5,
                    "line": 5,
                  },
                  "start": Object {
                    "character": 1,
                    "line": 1,
                  },
                },
                "uri": "file://test/node_modules/common.cds",
              },
            ]
        `);
    });
});
