import { MetadataService } from '../src/metadataService';
import type { MetadataElement, ODataVersionType } from '../src/types';

function createTestService() {
    const ODataVersion: ODataVersionType = '2.0';
    const metadataService = new MetadataService({ ODataVersion });

    const metadataFileUri = 'file://metadata.xml';
    const metadataElements: MetadataElement[] = [
        {
            location: {
                uri: metadataFileUri,
                range: { start: { line: 1, character: 1 }, end: { line: 5, character: 5 } }
            },
            isAnnotatable: true,
            kind: 'EntityType',
            path: '/com.sap.gateway.default.iwbep.tea_busi.v0001.Department',
            name: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department',
            isCollectionValued: false,
            isComplexType: false,
            isEntityType: true,
            content: [
                {
                    path: '/com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Sector',
                    content: [],
                    isAnnotatable: true,
                    kind: 'Property',
                    name: 'Sector',
                    isCollectionValued: false,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.String'
                },
                {
                    path: '/com.sap.gateway.default.iwbep.tea_busi.v0001.Department/ID',
                    content: [],
                    isAnnotatable: true,
                    kind: 'Property',
                    name: 'ID',
                    isCollectionValued: false,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.String'
                },
                {
                    path: '/com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Name',
                    isAnnotatable: true,
                    kind: 'Property',
                    name: 'Name',
                    isCollectionValued: false,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.String'
                },
                {
                    path: '/com.sap.gateway.default.iwbep.tea_busi.v0001.Department/MemberCount',
                    isAnnotatable: true,
                    kind: 'Property',
                    name: 'MemberCount',
                    isCollectionValued: false,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.Int32'
                },
                {
                    path: '/com.sap.gateway.default.iwbep.tea_busi.v0001.Department/ManagerID',
                    isAnnotatable: true,
                    kind: 'Property',
                    name: 'ManagerID',
                    isCollectionValued: false,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.String'
                },
                {
                    path: '/com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Categories',
                    isAnnotatable: true,
                    kind: 'Property',
                    name: 'Categories',
                    isCollectionValued: true,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.String'
                }
            ]
        },
        // function overloads (function 'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment' with different signature)
        {
            isAnnotatable: true,
            kind: 'Function',
            path: '/com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)',
            name: 'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)',
            isCollectionValued: false,
            isComplexType: false,
            isEntityType: false,
            content: [
                {
                    path: '/com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)/DepartmentName',
                    isAnnotatable: true,
                    kind: 'Parameter',
                    name: 'DepartmentName',
                    isCollectionValued: false,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.String'
                }
            ]
        },
        {
            isAnnotatable: true,
            kind: 'Function',
            path: '/com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)',
            name: 'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)',
            isCollectionValued: false,
            isComplexType: false,
            isEntityType: false,
            content: [
                {
                    path: '/com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)/DepartmentID',
                    isAnnotatable: true,
                    kind: 'Parameter',
                    name: 'DepartmentID',
                    isCollectionValued: false,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.Int16'
                }
            ]
        }
    ];
    metadataService.import(metadataElements);
    return metadataService;
}

describe('MetadataService for XML', () => {
    test('import()', () => {
        // Prepare
        const callbackParameters: { element: MetadataElement }[] = [];
        const localMetadataService = createTestService();
        localMetadataService.visitMetadataElements(function (element: MetadataElement) {
            callbackParameters.push({ element });
        });
        // Expect
        expect(callbackParameters).toMatchSnapshot();
    });

    test('getNamespaces()', () => {
        // Expect
        expect(createTestService().getNamespaces()).toMatchInlineSnapshot(`
            Set {
              "com.sap.gateway.default.iwbep.tea_busi.v0001",
            }
        `);
    });

    test('getRootMetadataElements()', () => {
        // Expect
        expect(createTestService().getRootMetadataElements()).toMatchInlineSnapshot(`
            Map {
              "com.sap.gateway.default.iwbep.tea_busi.v0001.Department" => Object {
                "fileUri": "someAbsoluteFileUri",
                "isAnnotatable": true,
                "isCollectionValued": false,
                "isComplexType": false,
                "isEntityType": true,
                "kind": "EntityType",
                "name": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department",
                "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department",
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
                "subElementNames": Set {
                  "Sector",
                  "ID",
                  "Name",
                  "MemberCount",
                  "ManagerID",
                  "Categories",
                },
              },
              "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)" => Object {
                "fileUri": "someAbsoluteFileUri",
                "isAnnotatable": true,
                "isCollectionValued": false,
                "isComplexType": false,
                "isEntityType": false,
                "kind": "Function",
                "name": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)",
                "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)",
                "range": Object {
                  "end": Object {
                    "character": 1,
                    "line": 8,
                  },
                  "start": Object {
                    "character": 1,
                    "line": 6,
                  },
                },
                "subElementNames": Set {
                  "DepartmentName",
                },
              },
              "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)" => Object {
                "fileUri": "someAbsoluteFileUri",
                "isAnnotatable": true,
                "isCollectionValued": false,
                "isComplexType": false,
                "isEntityType": false,
                "kind": "Function",
                "name": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)",
                "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)",
                "range": Object {
                  "end": Object {
                    "character": 1,
                    "line": 11,
                  },
                  "start": Object {
                    "character": 1,
                    "line": 9,
                  },
                },
                "subElementNames": Set {
                  "DepartmentID",
                },
              },
            }
        `);
    });

    test('getMetadataElement()', () => {
        // Expect
        expect(createTestService().getMetadataElement('com.sap.gateway.default.iwbep.tea_busi.v0001.Department'))
            .toMatchInlineSnapshot(`
            Object {
              "fileUri": "someAbsoluteFileUri",
              "isAnnotatable": true,
              "isCollectionValued": false,
              "isComplexType": false,
              "isEntityType": true,
              "kind": "EntityType",
              "name": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department",
              "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department",
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
              "subElementNames": Set {
                "Sector",
                "ID",
                "Name",
                "MemberCount",
                "ManagerID",
                "Categories",
              },
            }
        `);
    });

    test('getMetadataElement() for property', () => {
        // Expect
        expect(
            createTestService().getMetadataElement('com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Categories')
        ).toMatchInlineSnapshot(`
            Object {
              "edmPrimitiveType": "Edm.String",
              "isAnnotatable": true,
              "isCollectionValued": true,
              "isComplexType": false,
              "isEntityType": false,
              "kind": "Property",
              "name": "Categories",
              "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Categories",
              "range": undefined,
              "subElementNames": Set {},
            }
        `);
    });

    test('getMetadataElement() for function', () => {
        // Expect
        expect(createTestService().getMetadataElement('com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment'))
            .toMatchInlineSnapshot(`
            Object {
              "fileUri": "someAbsoluteFileUri",
              "isAnnotatable": true,
              "isCollectionValued": false,
              "isComplexType": false,
              "isEntityType": false,
              "kind": "Function",
              "name": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)",
              "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)",
              "range": Object {
                "end": Object {
                  "character": 1,
                  "line": 8,
                },
                "start": Object {
                  "character": 1,
                  "line": 6,
                },
              },
              "subElementNames": Set {
                "DepartmentName",
              },
            }
        `);
    });

    test('getMetadataElement() for parameter of function', () => {
        // Expect
        expect(
            createTestService().getMetadataElement(
                'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment/DepartmentID'
            )
        ).toMatchInlineSnapshot(`
            Object {
              "edmPrimitiveType": "Edm.Int16",
              "isAnnotatable": true,
              "isCollectionValued": false,
              "isComplexType": false,
              "isEntityType": false,
              "kind": "Parameter",
              "name": "DepartmentID",
              "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)/DepartmentID",
              "range": undefined,
              "subElementNames": Set {},
            }
        `);
    });

    test('getMetadataElement() for specific function overload', () => {
        // Expect
        expect(
            createTestService().getMetadataElement(
                'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)'
            )
        ).toMatchInlineSnapshot(`
            Object {
              "fileUri": "someAbsoluteFileUri",
              "isAnnotatable": true,
              "isCollectionValued": false,
              "isComplexType": false,
              "isEntityType": false,
              "kind": "Function",
              "name": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)",
              "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)",
              "range": Object {
                "end": Object {
                  "character": 1,
                  "line": 11,
                },
                "start": Object {
                  "character": 1,
                  "line": 9,
                },
              },
              "subElementNames": Set {
                "DepartmentID",
              },
            }
        `);
    });

    test('getMetadataElement() for parameter of specific function overload', () => {
        // Expect
        expect(
            createTestService().getMetadataElement(
                'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)/DepartmentID'
            )
        ).toMatchInlineSnapshot(`
            Object {
              "edmPrimitiveType": "Edm.Int16",
              "isAnnotatable": true,
              "isCollectionValued": false,
              "isComplexType": false,
              "isEntityType": false,
              "kind": "Parameter",
              "name": "DepartmentID",
              "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)/DepartmentID",
              "range": undefined,
              "subElementNames": Set {},
            }
        `);
    });

    test('getEdmTargetKinds()', () => {
        // Expect
        expect(createTestService().getEdmTargetKinds('com.sap.gateway.default.iwbep.tea_busi.v0001.Department'))
            .toMatchInlineSnapshot(`
            Array [
              "EntityType",
            ]
        `);
    });

    test('getEdmTargetKinds() for collection valued property', () => {
        // Expect
        expect(
            createTestService().getEdmTargetKinds('com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Categories')
        ).toMatchInlineSnapshot(`
                      Array [
                        "Property",
                        "Collection",
                      ]
              `);
    });

    test('getMetadataElementLocations() for EntityType', () => {
        expect(
            createTestService().getMetadataElementLocations('com.sap.gateway.default.iwbep.tea_busi.v0001.Department')
        ).toMatchInlineSnapshot(`
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
              "uri": "someAbsoluteFileUri",
            }
        `);
    });

    test('getMetadataElementLocations() for Function name', () => {
        expect(
            createTestService().getMetadataElementLocations(
                'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment'
            )
        ).toMatchInlineSnapshot(`
            Array [
              Object {
                "range": Object {
                  "end": Object {
                    "character": 1,
                    "line": 8,
                  },
                  "start": Object {
                    "character": 1,
                    "line": 6,
                  },
                },
                "uri": "someAbsoluteFileUri",
              },
              Object {
                "range": Object {
                  "end": Object {
                    "character": 1,
                    "line": 11,
                  },
                  "start": Object {
                    "character": 1,
                    "line": 9,
                  },
                },
                "uri": "someAbsoluteFileUri",
              },
            ]
        `);
    });

    test('getMetadataElementLocations() for Function overload', () => {
        expect(
            createTestService().getMetadataElementLocations(
                'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)'
            )
        ).toMatchInlineSnapshot(`
            Object {
              "range": Object {
                "end": Object {
                  "character": 1,
                  "line": 8,
                },
                "start": Object {
                  "character": 1,
                  "line": 6,
                },
              },
              "uri": "someAbsoluteFileUri",
            }
        `);
    });

    test('getEdmTargetKinds() for function import V2', () => {
        // Arrange
        const metadataService = createTestService();
        const metadataElement = {
            isAnnotatable: true,
            kind: 'FunctionImport',
            name: 'ProjectActivation',
            isCollectionValued: false,
            isComplexType: false,
            isEntityType: false,
            path: 'PROJECT_SERVICE.PROJECT_SERVICE_Entities/ProjectActivation',
            subElementNames: new Set([''])
        };
        jest.spyOn(metadataService, 'getMetadataElement').mockReturnValue(metadataElement);
        const path = 'PROJECT_SERVICE.PROJECT_SERVICE_Entities/ProjectActivation';

        // Act
        const result = metadataService.getEdmTargetKinds(path);

        // Expect
        expect(result).toMatchObject(['FunctionImport', 'Action']);
    });
});
