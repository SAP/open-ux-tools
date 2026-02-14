import { console } from 'inspector';
import { MetadataService } from '../src';
import type { MetadataElement, ODataVersionType } from '@sap-ux/odata-annotation-core-types';

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
            path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department',
            name: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department',
            isCollectionValued: false,
            isComplexType: false,
            isEntityType: true,
            content: [
                {
                    path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Sector',
                    content: [],
                    isAnnotatable: true,
                    kind: 'Property',
                    name: 'Sector',
                    isCollectionValued: false,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.String',
                    targetKinds: ['Property']
                },
                {
                    path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department/ID',
                    content: [],
                    isAnnotatable: true,
                    kind: 'Property',
                    name: 'ID',
                    isCollectionValued: false,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.String',
                    targetKinds: ['Property']
                },
                {
                    path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Name',
                    isAnnotatable: true,
                    kind: 'Property',
                    name: 'Name',
                    isCollectionValued: false,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.String',
                    content: [],
                    targetKinds: ['Property']
                },
                {
                    path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department/MemberCount',
                    isAnnotatable: true,
                    kind: 'Property',
                    name: 'MemberCount',
                    isCollectionValued: false,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.Int32',
                    content: [],
                    targetKinds: ['Property']
                },
                {
                    path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department/ManagerID',
                    isAnnotatable: true,
                    kind: 'Property',
                    name: 'ManagerID',
                    isCollectionValued: false,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.String',
                    content: [],
                    targetKinds: ['Property']
                },
                {
                    path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Categories',
                    isAnnotatable: true,
                    kind: 'Property',
                    name: 'Categories',
                    isCollectionValued: true,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.String',
                    content: [],
                    targetKinds: ['Property', 'Collection']
                }
            ],
            targetKinds: ['EntityType']
        },
        // function overloads (function 'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment' with different signature)
        {
            isAnnotatable: true,
            kind: 'Function',
            path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)',
            name: 'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)',
            isCollectionValued: false,
            isComplexType: false,
            isEntityType: false,
            content: [
                {
                    path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)/DepartmentName',
                    isAnnotatable: true,
                    kind: 'Parameter',
                    name: 'DepartmentName',
                    isCollectionValued: false,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.String',
                    content: [],
                    targetKinds: ['Parameter']
                }
            ],
            targetKinds: ['Function']
        },
        {
            isAnnotatable: true,
            kind: 'Function',
            path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)',
            name: 'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)',
            isCollectionValued: false,
            isComplexType: false,
            isEntityType: false,
            content: [
                {
                    path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)/DepartmentID',
                    isAnnotatable: true,
                    kind: 'Parameter',
                    name: 'DepartmentID',
                    isCollectionValued: false,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.Int16',
                    content: [],
                    targetKinds: ['Parameter']
                }
            ],
            targetKinds: ['Function']
        }
    ];
    metadataService.import(metadataElements, metadataFileUri);
    return metadataService;
}

describe('MetadataService for XML', () => {
    test('import()', () => {
        // Prepare
        const callbackParameters: { element: MetadataElement }[] = [];
        const localMetadataService = createTestService();
        localMetadataService.visitMetadataElements((element: MetadataElement) => {
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
                "content": Array [
                  Object {
                    "content": Array [],
                    "edmPrimitiveType": "Edm.String",
                    "isAnnotatable": true,
                    "isCollectionValued": false,
                    "isComplexType": false,
                    "isEntityType": false,
                    "kind": "Property",
                    "name": "Sector",
                    "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Sector",
                    "targetKinds": Array [
                      "Property",
                    ],
                  },
                  Object {
                    "content": Array [],
                    "edmPrimitiveType": "Edm.String",
                    "isAnnotatable": true,
                    "isCollectionValued": false,
                    "isComplexType": false,
                    "isEntityType": false,
                    "kind": "Property",
                    "name": "ID",
                    "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/ID",
                    "targetKinds": Array [
                      "Property",
                    ],
                  },
                  Object {
                    "content": Array [],
                    "edmPrimitiveType": "Edm.String",
                    "isAnnotatable": true,
                    "isCollectionValued": false,
                    "isComplexType": false,
                    "isEntityType": false,
                    "kind": "Property",
                    "name": "Name",
                    "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Name",
                    "targetKinds": Array [
                      "Property",
                    ],
                  },
                  Object {
                    "content": Array [],
                    "edmPrimitiveType": "Edm.Int32",
                    "isAnnotatable": true,
                    "isCollectionValued": false,
                    "isComplexType": false,
                    "isEntityType": false,
                    "kind": "Property",
                    "name": "MemberCount",
                    "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/MemberCount",
                    "targetKinds": Array [
                      "Property",
                    ],
                  },
                  Object {
                    "content": Array [],
                    "edmPrimitiveType": "Edm.String",
                    "isAnnotatable": true,
                    "isCollectionValued": false,
                    "isComplexType": false,
                    "isEntityType": false,
                    "kind": "Property",
                    "name": "ManagerID",
                    "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/ManagerID",
                    "targetKinds": Array [
                      "Property",
                    ],
                  },
                  Object {
                    "content": Array [],
                    "edmPrimitiveType": "Edm.String",
                    "isAnnotatable": true,
                    "isCollectionValued": true,
                    "isComplexType": false,
                    "isEntityType": false,
                    "kind": "Property",
                    "name": "Categories",
                    "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Categories",
                    "targetKinds": Array [
                      "Property",
                      "Collection",
                    ],
                  },
                ],
                "isAnnotatable": true,
                "isCollectionValued": false,
                "isComplexType": false,
                "isEntityType": true,
                "kind": "EntityType",
                "location": Object {
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
                  "uri": "file://metadata.xml",
                },
                "name": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department",
                "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department",
                "targetKinds": Array [
                  "EntityType",
                ],
              },
              "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)" => Object {
                "content": Array [
                  Object {
                    "content": Array [],
                    "edmPrimitiveType": "Edm.String",
                    "isAnnotatable": true,
                    "isCollectionValued": false,
                    "isComplexType": false,
                    "isEntityType": false,
                    "kind": "Parameter",
                    "name": "DepartmentName",
                    "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)/DepartmentName",
                    "targetKinds": Array [
                      "Parameter",
                    ],
                  },
                ],
                "isAnnotatable": true,
                "isCollectionValued": false,
                "isComplexType": false,
                "isEntityType": false,
                "kind": "Function",
                "name": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)",
                "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)",
                "targetKinds": Array [
                  "Function",
                ],
              },
              "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)" => Object {
                "content": Array [
                  Object {
                    "content": Array [],
                    "edmPrimitiveType": "Edm.Int16",
                    "isAnnotatable": true,
                    "isCollectionValued": false,
                    "isComplexType": false,
                    "isEntityType": false,
                    "kind": "Parameter",
                    "name": "DepartmentID",
                    "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)/DepartmentID",
                    "targetKinds": Array [
                      "Parameter",
                    ],
                  },
                ],
                "isAnnotatable": true,
                "isCollectionValued": false,
                "isComplexType": false,
                "isEntityType": false,
                "kind": "Function",
                "name": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)",
                "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)",
                "targetKinds": Array [
                  "Function",
                ],
              },
            }
        `);
    });

    test('getMetadataElement()', () => {
        // Expect
        expect(createTestService().getMetadataElement('com.sap.gateway.default.iwbep.tea_busi.v0001.Department'))
            .toMatchInlineSnapshot(`
            Object {
              "content": Array [
                Object {
                  "content": Array [],
                  "edmPrimitiveType": "Edm.String",
                  "isAnnotatable": true,
                  "isCollectionValued": false,
                  "isComplexType": false,
                  "isEntityType": false,
                  "kind": "Property",
                  "name": "Sector",
                  "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Sector",
                  "targetKinds": Array [
                    "Property",
                  ],
                },
                Object {
                  "content": Array [],
                  "edmPrimitiveType": "Edm.String",
                  "isAnnotatable": true,
                  "isCollectionValued": false,
                  "isComplexType": false,
                  "isEntityType": false,
                  "kind": "Property",
                  "name": "ID",
                  "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/ID",
                  "targetKinds": Array [
                    "Property",
                  ],
                },
                Object {
                  "content": Array [],
                  "edmPrimitiveType": "Edm.String",
                  "isAnnotatable": true,
                  "isCollectionValued": false,
                  "isComplexType": false,
                  "isEntityType": false,
                  "kind": "Property",
                  "name": "Name",
                  "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Name",
                  "targetKinds": Array [
                    "Property",
                  ],
                },
                Object {
                  "content": Array [],
                  "edmPrimitiveType": "Edm.Int32",
                  "isAnnotatable": true,
                  "isCollectionValued": false,
                  "isComplexType": false,
                  "isEntityType": false,
                  "kind": "Property",
                  "name": "MemberCount",
                  "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/MemberCount",
                  "targetKinds": Array [
                    "Property",
                  ],
                },
                Object {
                  "content": Array [],
                  "edmPrimitiveType": "Edm.String",
                  "isAnnotatable": true,
                  "isCollectionValued": false,
                  "isComplexType": false,
                  "isEntityType": false,
                  "kind": "Property",
                  "name": "ManagerID",
                  "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/ManagerID",
                  "targetKinds": Array [
                    "Property",
                  ],
                },
                Object {
                  "content": Array [],
                  "edmPrimitiveType": "Edm.String",
                  "isAnnotatable": true,
                  "isCollectionValued": true,
                  "isComplexType": false,
                  "isEntityType": false,
                  "kind": "Property",
                  "name": "Categories",
                  "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Categories",
                  "targetKinds": Array [
                    "Property",
                    "Collection",
                  ],
                },
              ],
              "isAnnotatable": true,
              "isCollectionValued": false,
              "isComplexType": false,
              "isEntityType": true,
              "kind": "EntityType",
              "location": Object {
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
                "uri": "file://metadata.xml",
              },
              "name": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department",
              "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department",
              "targetKinds": Array [
                "EntityType",
              ],
            }
        `);
    });

    test('getMetadataElement() for property', () => {
        // Expect
        expect(
            createTestService().getMetadataElement('com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Categories')
        ).toMatchInlineSnapshot(`
            Object {
              "content": Array [],
              "edmPrimitiveType": "Edm.String",
              "isAnnotatable": true,
              "isCollectionValued": true,
              "isComplexType": false,
              "isEntityType": false,
              "kind": "Property",
              "name": "Categories",
              "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Categories",
              "targetKinds": Array [
                "Property",
                "Collection",
              ],
            }
        `);
    });

    test('getMetadataElement() for function', () => {
        // Expect
        expect(createTestService().getMetadataElement('com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment'))
            .toMatchInlineSnapshot(`
            Object {
              "content": Array [
                Object {
                  "content": Array [],
                  "edmPrimitiveType": "Edm.String",
                  "isAnnotatable": true,
                  "isCollectionValued": false,
                  "isComplexType": false,
                  "isEntityType": false,
                  "kind": "Parameter",
                  "name": "DepartmentName",
                  "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)/DepartmentName",
                  "targetKinds": Array [
                    "Parameter",
                  ],
                },
              ],
              "isAnnotatable": true,
              "isCollectionValued": false,
              "isComplexType": false,
              "isEntityType": false,
              "kind": "Function",
              "name": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)",
              "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)",
              "targetKinds": Array [
                "Function",
              ],
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
              "content": Array [],
              "edmPrimitiveType": "Edm.Int16",
              "isAnnotatable": true,
              "isCollectionValued": false,
              "isComplexType": false,
              "isEntityType": false,
              "kind": "Parameter",
              "name": "DepartmentID",
              "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)/DepartmentID",
              "targetKinds": Array [
                "Parameter",
              ],
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
              "content": Array [
                Object {
                  "content": Array [],
                  "edmPrimitiveType": "Edm.Int16",
                  "isAnnotatable": true,
                  "isCollectionValued": false,
                  "isComplexType": false,
                  "isEntityType": false,
                  "kind": "Parameter",
                  "name": "DepartmentID",
                  "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)/DepartmentID",
                  "targetKinds": Array [
                    "Parameter",
                  ],
                },
              ],
              "isAnnotatable": true,
              "isCollectionValued": false,
              "isComplexType": false,
              "isEntityType": false,
              "kind": "Function",
              "name": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)",
              "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)",
              "targetKinds": Array [
                "Function",
              ],
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
              "content": Array [],
              "edmPrimitiveType": "Edm.Int16",
              "isAnnotatable": true,
              "isCollectionValued": false,
              "isComplexType": false,
              "isEntityType": false,
              "kind": "Parameter",
              "name": "DepartmentID",
              "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.Int16)/DepartmentID",
              "targetKinds": Array [
                "Parameter",
              ],
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
                "uri": "file://metadata.xml",
              },
            ]
        `);
    });

    test('getMetadataElementLocations() for Function name', () => {
        expect(
            createTestService().getMetadataElementLocations(
                'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment'
            )
        ).toMatchInlineSnapshot(`Array []`);
    });

    test('getMetadataElementLocations() for Function overload', () => {
        expect(
            createTestService().getMetadataElementLocations(
                'com.sap.gateway.default.iwbep.tea_busi.v0001.GetDepartment(Edm.String)'
            )
        ).toMatchInlineSnapshot(`Array []`);
    });

    test('getEdmTargetKinds() for function import V2', () => {
        // Arrange
        const metadataService = createTestService();
        const metadataElement: MetadataElement = {
            isAnnotatable: true,
            kind: 'FunctionImport',
            name: 'ProjectActivation',
            isCollectionValued: false,
            isComplexType: false,
            isEntityType: false,
            path: 'PROJECT_SERVICE.PROJECT_SERVICE_Entities/ProjectActivation',
            content: [],
            targetKinds: ['FunctionImport', 'Action']
        };
        jest.spyOn(metadataService, 'getMetadataElement').mockReturnValue(metadataElement);
        const path = 'PROJECT_SERVICE.PROJECT_SERVICE_Entities/ProjectActivation';

        // Act
        const result = metadataService.getEdmTargetKinds(path);

        // Expect
        expect(result).toMatchObject(['FunctionImport', 'Action']);
    });
});

describe('MetadataService for XML - external services', () => {
    test('import', () => {
        const srv = new MetadataService({ ODataVersion: '4.0' });
        srv.import(
            [
                {
                    location: {
                        uri: 'file://metadata.xml',
                        range: { start: { line: 1, character: 1 }, end: { line: 5, character: 5 } }
                    },
                    isAnnotatable: true,
                    kind: 'EntityType',
                    content: [],
                    name: 'namespace1.dummyEntity',
                    path: 'namespace1.dummyEntity',
                    targetKinds: ['EntityType']
                }
            ],
            'dummyUri'
        );
        srv.importServiceMetadata(
            [
                {
                    location: {
                        uri: 'file://metadata.xml',
                        range: { start: { line: 1, character: 1 }, end: { line: 5, character: 5 } }
                    },
                    isAnnotatable: true,
                    kind: 'EntityType',
                    content: [],
                    name: 'namespace2.dummyEntity1',
                    path: 'namespace2.dummyEntity1',
                    targetKinds: ['EntityType']
                }
            ],
            'dummyExternalUri',
            'externalService1'
        );

        const getExternalMetadataElement = (path: string) => {
            using ms = srv.useService('externalService1');
            return ms.getMetadataElement(path);
        };

        const getExternalNamespaces = () => {
            using ms = srv.useService('externalService1');
            return ms.getNamespaces();
        };

        expect(getExternalMetadataElement('namespace2.dummyEntity1')?.name).toBe('namespace2.dummyEntity1');
        expect([...getExternalNamespaces().values()]).toStrictEqual(['namespace2']);
        expect(srv.getMetadataElement('namespace1.dummyEntity')?.name).toBe('namespace1.dummyEntity');
        expect(srv.getMetadataElement('namespace2.dummyEntity1')).toBeUndefined();
        expect([...srv.getNamespaces().values()]).toStrictEqual(['namespace1']);
    });

    test('service keys', () => {
        const srv = new MetadataService({ ODataVersion: '4.0' });
        srv.importServiceMetadata(
            [
                {
                    location: {
                        uri: 'file://metadata.xml',
                        range: { start: { line: 1, character: 1 }, end: { line: 5, character: 5 } }
                    },
                    isAnnotatable: true,
                    kind: 'EntityType',
                    content: [],
                    name: 'namespace1.dummyEntity1',
                    path: 'namespace1.dummyEntity1',
                    targetKinds: ['EntityType']
                }
            ],
            'dummyExternalUri',
            'externalService1'
        );
        srv.importServiceMetadata(
            [
                {
                    location: {
                        uri: 'file://metadata.xml',
                        range: { start: { line: 1, character: 1 }, end: { line: 5, character: 5 } }
                    },
                    isAnnotatable: true,
                    kind: 'EntityType',
                    content: [],
                    name: 'namespace2.dummyEntity2',
                    path: 'namespace2.dummyEntity2',
                    targetKinds: ['EntityType']
                },
                {
                    location: {
                        uri: 'file://metadata.xml',
                        range: { start: { line: 1, character: 1 }, end: { line: 5, character: 5 } }
                    },
                    isAnnotatable: true,
                    kind: 'EntityType',
                    content: [],
                    name: 'namespace3.dummyEntity3',
                    path: 'namespace3.dummyEntity3',
                    targetKinds: ['EntityType']
                }
            ],
            'dummyExternalUri2',
            'externalService2'
        );
        expect(srv.getServiceIds()).toMatchInlineSnapshot(`
            Array [
              "",
              "externalService1",
              "externalService2",
            ]
        `);
        expect(srv.getServiceKeyByNamespace('namespace1')).toBe('externalService1');
        expect(srv.getServiceKeyByNamespace('namespace2')).toBe('externalService2');
        expect(srv.getServiceKeyByNamespace('namespace3')).toBe('externalService2');
        srv.useService('externalService1');
        expect(srv.getNamespaces()).toMatchInlineSnapshot(`
            Set {
              "namespace1",
            }
        `);
        srv.useService('externalService2');
        expect(srv.getNamespaces()).toMatchInlineSnapshot(`
            Set {
              "namespace2",
              "namespace3",
            }
        `);
        srv.useService('');
        expect(srv.getNamespaces()).toMatchInlineSnapshot(`Set {}`);
    });
});
