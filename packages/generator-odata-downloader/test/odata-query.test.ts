import type { EntityType } from '@sap-ux/vocabularies-types';
import {
    buildNavPropHierarchyQuery,
    createQueryFromEntities,
    fetchData,
    getExpands
} from '../src/data-download/odata-query';
import type { ODataService } from '@sap-ux/axios-extension';
import type { ReferencedEntities, HierarchyEntity } from '../src/data-download/types';
import type { SelectedEntityAnswer } from '../src/data-download/prompts/prompts';

describe('Test odata query builder', () => {
    const testEntities1 = [
        {
            entityPath: 'a',
            entityType: {} as EntityType,
            entitySetName: 'aSetName',
            navPropEntities: [
                {
                    entityPath: 'a.1',
                    entityType: {} as EntityType,
                    entitySetName: 'a1SetName',
                    navPropEntities: [
                        {
                            entityPath: 'a.1.1',
                            entityType: {} as EntityType,
                            entitySetName: 'a11SetName',
                            navPropEntities: []
                        }
                    ]
                },
                {
                    entityPath: 'a.2',
                    entityType: {} as EntityType,
                    entitySetName: 'a2SetName',
                    navPropEntities: [
                        {
                            entityPath: 'a.2.1',
                            entityType: {} as EntityType,
                            entitySetName: 'a21SetName',
                            navPropEntities: []
                        },
                        {
                            entityPath: 'a.2.2',
                            entityType: {} as EntityType,
                            entitySetName: 'a22SetName',
                            navPropEntities: []
                        }
                    ]
                }
            ]
        },
        {
            entityPath: 'b',
            entityType: {} as EntityType,
            entitySetName: 'bSetName',
            navPropEntities: []
        },
        {
            entityPath: 'c',
            entityType: {} as EntityType,
            entitySetName: 'cSetName',
            navPropEntities: [
                {
                    entityPath: 'c.1',
                    entityType: {} as EntityType,
                    entitySetName: 'c1SetName',
                    navPropEntities: []
                }
            ]
        }
    ];

    test('`getExpands` should build an expand config based on specified entity list', () => {
        const entities = [
            {
                entityPath: 'a',
                entitySetName: 'aSetName'
            }
        ];
        let expands = getExpands(entities);

        expect(expands.expands).toEqual({
            expand: {
                a: {}
            }
        });

        entities.push({
            entityPath: 'a/a.1',
            entitySetName: 'a1SetName'
        });
        expands = getExpands(entities);
        expect(expands.expands).toEqual({
            expand: {
                a: {
                    expand: {
                        'a.1': {}
                    }
                }
            }
        });

        entities.push({
            entityPath: 'b/b.1/b.1.1',
            entitySetName: 'b1SetName'
        });
        expands = getExpands(entities);
        expect(expands.expands).toEqual({
            expand: {
                a: {
                    expand: {
                        'a.1': {}
                    }
                },
                b: {
                    expand: {
                        'b.1': {
                            expand: {
                                'b.1.1': {}
                            }
                        }
                    }
                }
            }
        });
    });

    test('`createQueryFromEntities` should create an odata filter query for list entity', () => {
        const listEntity: ReferencedEntities['listEntity'] = {
            entitySetName: 'ListEntity1',
            semanticKeys: [],
            navPropEntities: testEntities1,
            entityPath: 'root',
            entityType: {} as EntityType
        };

        // No selected entities, basic root entity query
        let query = createQueryFromEntities(listEntity, []);
        expect(query.query).toEqual('ListEntity1?$top=1');

        query = createQueryFromEntities(
            { ...listEntity, semanticKeys: [{ name: 'Prop1', value: 'abc123', type: 'Edm.String' }] },
            []
        );
        expect(query.query).toEqual("ListEntity1?$filter=Prop1 eq 'abc123'&$count=true");

        // Multiple filter keys
        query = createQueryFromEntities(
            {
                ...listEntity,
                semanticKeys: [
                    { name: 'Prop1', value: 'abc123', type: 'Edm.String' },
                    { name: 'Prop2', value: '456', type: 'Edm.Int32' },
                    { name: 'Prop3', value: 'xyz', type: 'Edm.String' }
                ]
            },
            []
        );
        expect(query.query).toEqual(
            "ListEntity1?$filter=Prop1 eq 'abc123' and Prop2 eq '456' and Prop3 eq 'xyz'&$count=true"
        );
    });

    test('`getExpands` should create an odata query for the selected entities', () => {
        const listEntity: ReferencedEntities['listEntity'] = {
            entitySetName: 'ListEntity1',
            semanticKeys: [],
            navPropEntities: testEntities1,
            entityPath: 'root',
            entityType: {} as EntityType
        };
        const selectedEntities: SelectedEntityAnswer[] = [
            {
                fullPath: 'a',
                entity: {
                    entitySetName: 'aSetName',
                    entityPath: 'a'
                }
            },
            {
                fullPath: 'a/a.1',
                entity: {
                    entitySetName: 'a1SetName',
                    entityPath: 'a.1'
                }
            },
            {
                fullPath: 'a/a.1/a.1.1',
                entity: {
                    entitySetName: 'a11SetName',
                    entityPath: 'a.1.1'
                }
            },
            {
                fullPath: 'a/a.2',
                entity: {
                    entitySetName: 'a2SetName',
                    entityPath: 'a.2'
                }
            },
            {
                fullPath: 'a/a.2/a.2.1',
                entity: {
                    entitySetName: 'a21SetName',
                    entityPath: 'a.2.1'
                }
            },
            {
                fullPath: 'a/a.2/a.2.2',
                entity: {
                    entitySetName: 'a22SetName',
                    entityPath: 'a.2.2'
                }
            },
            {
                fullPath: 'b',
                entity: {
                    entitySetName: 'bSetName',
                    entityPath: 'b'
                }
            },
            {
                fullPath: 'c',
                entity: {
                    entitySetName: 'cSetName',
                    entityPath: 'c'
                }
            },
            {
                fullPath: 'c/c.1',
                entity: {
                    entitySetName: 'c1SetName',
                    entityPath: 'c.1'
                }
            }
        ];

        let query = createQueryFromEntities(listEntity, selectedEntities);
        expect(query.query).toEqual(
            'ListEntity1?$expand=a($expand=a.1($expand=a.1.1),a.2($expand=a.2.1,a.2.2)),b,c($expand=c.1)&$top=1'
        );

        // Full query with filter and expands
        query = createQueryFromEntities(
            { ...listEntity, semanticKeys: [{ name: 'Prop1', value: 'abc123', type: 'Edm.String' }] },
            selectedEntities
        );
        expect(query.query).toEqual(
            "ListEntity1?$filter=Prop1 eq 'abc123'&$expand=a($expand=a.1($expand=a.1.1),a.2($expand=a.2.1,a.2.2)),b,c($expand=c.1)&$count=true"
        );
    });

    test('`createQueryFromEntities` should not wrap GUID/UUID values in quotes', () => {
        const listEntity: ReferencedEntities['listEntity'] = {
            entitySetName: 'ListEntity1',
            semanticKeys: [],
            navPropEntities: [],
            entityPath: 'root',
            entityType: {} as EntityType
        };

        // Single GUID value
        let query = createQueryFromEntities(
            {
                ...listEntity,
                semanticKeys: [{ name: 'ID', value: '550e8400-e29b-41d4-a716-446655440000', type: 'Edm.Guid' }]
            },
            []
        );
        expect(query.query).toEqual('ListEntity1?$filter=ID eq 550e8400-e29b-41d4-a716-446655440000&$count=true');

        // Single UUID value
        query = createQueryFromEntities(
            {
                ...listEntity,
                semanticKeys: [{ name: 'ID', value: '550e8400-e29b-41d4-a716-446655440000', type: 'Edm.UUID' }]
            },
            []
        );
        expect(query.query).toEqual('ListEntity1?$filter=ID eq 550e8400-e29b-41d4-a716-446655440000&$count=true');

        // Comma-separated GUIDs
        query = createQueryFromEntities(
            {
                ...listEntity,
                semanticKeys: [
                    {
                        name: 'ID',
                        value: '550e8400-e29b-41d4-a716-446655440000,a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                        type: 'Edm.Guid'
                    }
                ]
            },
            []
        );
        expect(query.query).toEqual(
            'ListEntity1?$filter=((ID eq 550e8400-e29b-41d4-a716-446655440000) or (ID eq a1b2c3d4-e5f6-7890-abcd-ef1234567890))&$count=true'
        );
    });

    test('`createQueryFromEntities` should handle boolean semantic key values', () => {
        const listEntity: ReferencedEntities['listEntity'] = {
            entitySetName: 'ListEntity1',
            semanticKeys: [],
            navPropEntities: [],
            entityPath: 'root',
            entityType: {} as EntityType
        };

        // Boolean true value (stored as actual boolean by JSON.parse in prompt validation)
        let query = createQueryFromEntities(
            {
                ...listEntity,
                semanticKeys: [{ name: 'IsActive', value: true as unknown as string, type: 'Edm.Boolean' }]
            },
            []
        );
        expect(query.query).toEqual('ListEntity1?$filter=IsActive eq true&$count=true');

        // Boolean in hierarchy query
        const hierarchy: HierarchyEntity = {
            entitySetName: 'ListEntity1',
            entityTypeName: 'ListEntity1Type',
            qualifier: 'MyHierarchy',
            nodeProperty: 'ID',
            parentProperty: 'Parent',
            parentPropertyType: 'Edm.String',
            isDraft: false,
            entityTypeKeys: []
        };
        query = createQueryFromEntities(
            {
                ...listEntity,
                semanticKeys: [{ name: 'IsActive', value: true as unknown as string, type: 'Edm.Boolean' }]
            },
            [],
            1,
            hierarchy
        );
        expect(query.query).toEqual(
            "ListEntity1?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/ListEntity1,HierarchyQualifier='MyHierarchy',NodeProperty='ID',Levels=3)"
        );
    });

    test('`createQueryFromEntities` should generate correct descendants query for hierarchy entities', () => {
        const listEntity: ReferencedEntities['listEntity'] = {
            entitySetName: 'SalesOrganizations',
            semanticKeys: [],
            navPropEntities: [],
            entityPath: 'root',
            entityType: {} as EntityType
        };
        const hierarchy: HierarchyEntity = {
            entitySetName: 'SalesOrganizations',
            entityTypeName: 'SalesOrgType',
            qualifier: 'SalesOrgHierarchy',
            nodeProperty: 'ID',
            parentProperty: 'Parent',
            parentPropertyType: 'Edm.String',
            isDraft: false,
            entityTypeKeys: []
        };

        // No filter - no semantic key values (filter param omitted entirely)
        let query = createQueryFromEntities(listEntity, [], 1, hierarchy);
        expect(query.query).toEqual(
            "SalesOrganizations?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=3)"
        );

        // With string filter (non-draft: filter ignored in TopLevels, same output)
        query = createQueryFromEntities(
            { ...listEntity, semanticKeys: [{ name: 'ID', value: 'Sales', type: 'Edm.String' }] },
            [],
            1,
            hierarchy
        );
        expect(query.query).toEqual(
            "SalesOrganizations?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=3)"
        );

        // With GUID filter (non-draft: filter ignored in TopLevels)
        query = createQueryFromEntities(
            {
                ...listEntity,
                semanticKeys: [{ name: 'ID', value: '550e8400-e29b-41d4-a716-446655440000', type: 'Edm.Guid' }]
            },
            [],
            1,
            hierarchy
        );
        expect(query.query).toEqual(
            "SalesOrganizations?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=3)"
        );

        // With comma-separated filter values (non-draft: filter ignored in TopLevels)
        query = createQueryFromEntities(
            { ...listEntity, semanticKeys: [{ name: 'ID', value: 'Sales,Marketing', type: 'Edm.String' }] },
            [],
            1,
            hierarchy
        );
        expect(query.query).toEqual(
            "SalesOrganizations?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=3)"
        );

        // With expands
        const selectedEntities: SelectedEntityAnswer[] = [
            { fullPath: 'Children', entity: { entitySetName: 'SalesOrganizations', entityPath: 'Children' } }
        ];
        query = createQueryFromEntities(
            { ...listEntity, semanticKeys: [{ name: 'ID', value: 'Sales', type: 'Edm.String' }] },
            selectedEntities,
            1,
            hierarchy
        );
        expect(query.query).toEqual(
            "SalesOrganizations?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/SalesOrganizations,HierarchyQualifier='SalesOrgHierarchy',NodeProperty='ID',Levels=3)&$expand=Children"
        );
    });

    test('`createQueryFromEntities` should wrap with ancestors() for draft-enabled hierarchy entities', () => {
        const listEntity: ReferencedEntities['listEntity'] = {
            entitySetName: 'P_SADL_HIER_UUID_D_COMPNY_ROOT',
            semanticKeys: [],
            navPropEntities: [],
            entityPath: 'root',
            entityType: {} as EntityType
        };
        const hierarchy: HierarchyEntity = {
            entitySetName: 'P_SADL_HIER_UUID_D_COMPNY_ROOT',
            entityTypeName: 'P_SADL_HIER_UUID_D_COMPNY_ROOTType',
            qualifier: 'I_SADL_HIER_UUID_COMPANY_NODE',
            nodeProperty: '__HierarchyPropertiesForI_SADL_HIER_UUID_COMPANY_NODE/NodeId',
            parentProperty: 'OwnerCompany',
            parentPropertyType: 'Edm.Guid',
            isDraft: true,
            entityTypeKeys: []
        };

        // No user filter — no filter on ancestors
        let query = createQueryFromEntities(listEntity, [], 1, hierarchy);
        expect(query.query).toEqual(
            "P_SADL_HIER_UUID_D_COMPNY_ROOT?$apply=ancestors($root/P_SADL_HIER_UUID_D_COMPNY_ROOT,I_SADL_HIER_UUID_COMPANY_NODE,__HierarchyPropertiesForI_SADL_HIER_UUID_COMPANY_NODE/NodeId,keep start)/com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/P_SADL_HIER_UUID_D_COMPNY_ROOT,HierarchyQualifier='I_SADL_HIER_UUID_COMPANY_NODE',NodeProperty='__HierarchyPropertiesForI_SADL_HIER_UUID_COMPANY_NODE/NodeId',Levels=3)"
        );

        // With GUID and boolean filters — filter applied to ancestors wrapper, TopLevels unaffected
        query = createQueryFromEntities(
            {
                ...listEntity,
                semanticKeys: [
                    { name: 'Company', value: 'cb565aac-b20e-1fe1-8b88-3dca3ae3111a', type: 'Edm.Guid' },
                    { name: 'IsActiveEntity', value: true as unknown as string, type: 'Edm.Boolean' }
                ]
            },
            [],
            1,
            hierarchy
        );
        expect(query.query).toEqual(
            "P_SADL_HIER_UUID_D_COMPNY_ROOT?$apply=ancestors($root/P_SADL_HIER_UUID_D_COMPNY_ROOT,I_SADL_HIER_UUID_COMPANY_NODE,__HierarchyPropertiesForI_SADL_HIER_UUID_COMPANY_NODE/NodeId,filter(Company eq cb565aac-b20e-1fe1-8b88-3dca3ae3111a and IsActiveEntity eq true),keep start)/com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/P_SADL_HIER_UUID_D_COMPNY_ROOT,HierarchyQualifier='I_SADL_HIER_UUID_COMPANY_NODE',NodeProperty='__HierarchyPropertiesForI_SADL_HIER_UUID_COMPANY_NODE/NodeId',Levels=3)"
        );
    });
});

describe('buildNavPropHierarchyQuery', () => {
    const hierarchy: HierarchyEntity = {
        entitySetName: 'PPS_PurOrdItemHierarchy',
        entityTypeName: 'PPS_PurOrdItemHierarchyType',
        qualifier: 'I_PPS_PurchaseOrderItemHNRltn',
        nodeProperty: '__HierarchyPropertiesForI_PPS_PurchaseOrderItemHNRltn/NodeId',
        parentProperty: 'PurchasingParentItem',
        parentPropertyType: 'Edm.String',
        isDraft: false,
        entityTypeKeys: ['PurchaseOrder', 'PurchaseOrderItem']
    };

    test('should build a nav-key-rooted TopLevels query for a non-draft list entity', () => {
        const listEntity: ReferencedEntities['listEntity'] = {
            entitySetName: 'PPS_PurchaseOrder',
            semanticKeys: [{ name: 'PurchaseOrder', value: '4500003676', type: 'Edm.String' }],
            navPropEntities: [],
            entityPath: 'root',
            entityType: { keys: [] } as unknown as EntityType
        };
        const result = buildNavPropHierarchyQuery(listEntity, '_PurchaseOrderItem', hierarchy);
        expect(result).toEqual(
            "PPS_PurchaseOrder(PurchaseOrder='4500003676')/_PurchaseOrderItem?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/PPS_PurchaseOrder(PurchaseOrder='4500003676')/_PurchaseOrderItem,HierarchyQualifier='I_PPS_PurchaseOrderItemHNRltn',NodeProperty='__HierarchyPropertiesForI_PPS_PurchaseOrderItemHNRltn/NodeId',Levels=3)"
        );
    });

    test('should append DraftUUID and IsActiveEntity for draft list entities', () => {
        const listEntity: ReferencedEntities['listEntity'] = {
            entitySetName: 'PPS_PurchaseOrder',
            semanticKeys: [{ name: 'PurchaseOrder', value: '4500003676', type: 'Edm.String' }],
            navPropEntities: [],
            entityPath: 'root',
            entityType: { keys: [{ name: 'IsActiveEntity' }] } as unknown as EntityType
        };
        const result = buildNavPropHierarchyQuery(listEntity, '_PurchaseOrderItem', hierarchy);
        expect(result).toEqual(
            "PPS_PurchaseOrder(PurchaseOrder='4500003676',DraftUUID=00000000-0000-0000-0000-000000000000,IsActiveEntity=true)/_PurchaseOrderItem?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/PPS_PurchaseOrder(PurchaseOrder='4500003676',DraftUUID=00000000-0000-0000-0000-000000000000,IsActiveEntity=true)/_PurchaseOrderItem,HierarchyQualifier='I_PPS_PurchaseOrderItemHNRltn',NodeProperty='__HierarchyPropertiesForI_PPS_PurchaseOrderItemHNRltn/NodeId',Levels=3)"
        );
    });

    test('should use keyName over name when set (semantic key mapped to actual entity key)', () => {
        const listEntity: ReferencedEntities['listEntity'] = {
            entitySetName: 'TravelSet',
            semanticKeys: [{ name: 'TravelID', keyName: 'TravelUUID', value: 'abc-123', type: 'Edm.Guid' }],
            navPropEntities: [],
            entityPath: 'root',
            entityType: { keys: [] } as unknown as EntityType
        };
        const result = buildNavPropHierarchyQuery(listEntity, '_Items', hierarchy);
        expect(result).toContain('TravelSet(TravelUUID=abc-123)/_Items');
    });

    test('should use unquoted values for GUID and boolean keys', () => {
        const listEntity: ReferencedEntities['listEntity'] = {
            entitySetName: 'MySet',
            semanticKeys: [
                { name: 'ID', value: '550e8400-e29b-41d4-a716-446655440000', type: 'Edm.Guid' },
                { name: 'IsActive', value: 'true', type: 'Edm.Boolean' }
            ],
            navPropEntities: [],
            entityPath: 'root',
            entityType: { keys: [] } as unknown as EntityType
        };
        const result = buildNavPropHierarchyQuery(listEntity, '_Children', hierarchy);
        expect(result).toContain('MySet(ID=550e8400-e29b-41d4-a716-446655440000,IsActive=true)/_Children');
    });

    test('should use only the first value when semantic key has comma-separated values', () => {
        const listEntity: ReferencedEntities['listEntity'] = {
            entitySetName: 'Orders',
            semanticKeys: [{ name: 'OrderID', value: 'ORD1,ORD2', type: 'Edm.String' }],
            navPropEntities: [],
            entityPath: 'root',
            entityType: { keys: [] } as unknown as EntityType
        };
        const result = buildNavPropHierarchyQuery(listEntity, '_Items', hierarchy);
        expect(result).toContain("Orders(OrderID='ORD1')/_Items");
        expect(result).not.toContain('ORD2');
    });

    test('should return undefined when no semantic key values are provided', () => {
        const listEntity: ReferencedEntities['listEntity'] = {
            entitySetName: 'PPS_PurchaseOrder',
            semanticKeys: [],
            navPropEntities: [],
            entityPath: 'root',
            entityType: { keys: [] } as unknown as EntityType
        };
        expect(buildNavPropHierarchyQuery(listEntity, '_PurchaseOrderItem', hierarchy)).toBeUndefined();
    });

    test('should return undefined when all semantic keys have empty or undefined values', () => {
        const listEntity: ReferencedEntities['listEntity'] = {
            entitySetName: 'PPS_PurchaseOrder',
            semanticKeys: [
                { name: 'PurchaseOrder', value: '', type: 'Edm.String' },
                { name: 'DraftUUID', value: 'some-uuid', type: 'Edm.Guid' }
            ],
            navPropEntities: [],
            entityPath: 'root',
            entityType: { keys: [] } as unknown as EntityType
        };
        // Empty value and draft key are both skipped → no key parts → undefined
        expect(buildNavPropHierarchyQuery(listEntity, '_PurchaseOrderItem', hierarchy)).toBeUndefined();
    });

    test('should skip DraftUUID and IsActiveEntity from semantic keys', () => {
        const listEntity: ReferencedEntities['listEntity'] = {
            entitySetName: 'Orders',
            semanticKeys: [
                { name: 'OrderID', value: 'ORD1', type: 'Edm.String' },
                { name: 'DraftUUID', value: 'some-uuid', type: 'Edm.Guid' },
                { name: 'IsActiveEntity', value: 'true', type: 'Edm.Boolean' }
            ],
            navPropEntities: [],
            entityPath: 'root',
            entityType: { keys: [] } as unknown as EntityType
        };
        const result = buildNavPropHierarchyQuery(listEntity, '_Items', hierarchy);
        expect(result).toContain("Orders(OrderID='ORD1')/_Items");
        expect(result).not.toContain('DraftUUID=some-uuid');
        expect(result).not.toContain('IsActiveEntity=true');
    });
});

describe('fetchData', () => {
    const mockOdataService = {
        defaults: { baseURL: 'https://example.com/', headers: {} },
        get: jest.fn()
    } as unknown as ODataService;

    const listEntity: ReferencedEntities['listEntity'] = {
        entitySetName: 'Orders',
        semanticKeys: [{ name: 'OrderID', value: 'ORD1', type: 'Edm.String' }],
        navPropEntities: [],
        entityPath: 'root',
        entityType: { keys: [] } as unknown as EntityType
    };

    const navHierarchy: HierarchyEntity = {
        entitySetName: 'OrderItems',
        entityTypeName: 'OrderItemsType',
        qualifier: 'ItemHierarchy',
        nodeProperty: '__HP/NodeId',
        parentProperty: 'ParentItem',
        parentPropertyType: 'Edm.String',
        isDraft: false,
        entityTypeKeys: ['OrderID', 'ItemID']
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return entityData from a successful query', async () => {
        const rows = [{ OrderID: 'ORD1' }];
        (mockOdataService.get as jest.Mock).mockResolvedValueOnce({ data: '', odata: () => rows });

        const result = await fetchData(listEntity, mockOdataService, [], 1);

        expect(result.odataResult.entityData).toEqual(rows);
        expect(result.odataResult.error).toBeUndefined();
    });

    test('should return an error string when the query throws', async () => {
        (mockOdataService.get as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

        const result = await fetchData(listEntity, mockOdataService, [], 1);

        expect(result.odataResult.entityData).toBeUndefined();
        expect(result.odataResult.error).toContain('Network failure');
    });

    test('should issue a nav-prop hierarchy query and patch matching expanded items', async () => {
        const mainRows = [
            {
                OrderID: 'ORD1',
                _Items: [
                    { OrderID: 'ORD1', ItemID: '10', __HP: null },
                    { OrderID: 'ORD1', ItemID: '20', __HP: null }
                ]
            }
        ];
        const navRows = [
            { OrderID: 'ORD1', ItemID: '10', __HP: { NodeId: 'node-1', DistanceFromRoot: 0 } },
            { OrderID: 'ORD1', ItemID: '20', __HP: { NodeId: 'node-2', DistanceFromRoot: 1 } }
        ];

        (mockOdataService.get as jest.Mock)
            .mockResolvedValueOnce({ data: '', odata: () => mainRows })
            .mockResolvedValueOnce({ data: '', odata: () => navRows });

        const selectedEntities = [
            { fullPath: '_Items', entity: { entitySetName: 'OrderItems', entityPath: '_Items' } }
        ] as any[];

        const result = await fetchData(listEntity, mockOdataService, selectedEntities, 1, undefined, [navHierarchy]);

        const items = (result.odataResult.entityData as any[])[0]['_Items'] as any[];
        expect(items[0]['__HP']).toEqual({ NodeId: 'node-1', DistanceFromRoot: 0 });
        expect(items[1]['__HP']).toEqual({ NodeId: 'node-2', DistanceFromRoot: 1 });
        expect(mockOdataService.get).toHaveBeenCalledTimes(2);
    });

    test('should skip nav-prop hierarchy query when no selected entity matches', async () => {
        const mainRows = [{ OrderID: 'ORD1' }];
        (mockOdataService.get as jest.Mock).mockResolvedValueOnce({ data: '', odata: () => mainRows });

        // selectedEntities has a different entity set — no match for navHierarchy
        const selectedEntities = [
            { fullPath: '_Other', entity: { entitySetName: 'OtherSet', entityPath: '_Other' } }
        ] as any[];

        const result = await fetchData(listEntity, mockOdataService, selectedEntities, 1, undefined, [navHierarchy]);

        expect(mockOdataService.get).toHaveBeenCalledTimes(1);
        expect(result.odataResult.entityData).toEqual(mainRows);
    });

    test('should skip nav-prop hierarchy query when buildNavPropHierarchyQuery returns undefined', async () => {
        const mainRows = [{ OrderID: 'ORD1' }];
        (mockOdataService.get as jest.Mock).mockResolvedValueOnce({ data: '', odata: () => mainRows });

        const noKeyEntity: ReferencedEntities['listEntity'] = {
            ...listEntity,
            semanticKeys: [] // no keys → buildNavPropHierarchyQuery returns undefined
        };
        const selectedEntities = [
            { fullPath: '_Items', entity: { entitySetName: 'OrderItems', entityPath: '_Items' } }
        ] as any[];

        const result = await fetchData(noKeyEntity, mockOdataService, selectedEntities, 1, undefined, [navHierarchy]);

        expect(mockOdataService.get).toHaveBeenCalledTimes(1);
        expect(result.odataResult.entityData).toEqual(mainRows);
    });

    test('should skip patching when nav query returns no data', async () => {
        const mainRows = [{ OrderID: 'ORD1', _Items: [{ OrderID: 'ORD1', ItemID: '10', __HP: null }] }];
        (mockOdataService.get as jest.Mock)
            .mockResolvedValueOnce({ data: '', odata: () => mainRows })
            .mockResolvedValueOnce({ data: '', odata: () => undefined }); // nav query returns no data

        const selectedEntities = [
            { fullPath: '_Items', entity: { entitySetName: 'OrderItems', entityPath: '_Items' } }
        ] as any[];

        const result = await fetchData(listEntity, mockOdataService, selectedEntities, 1, undefined, [navHierarchy]);

        // __HP untouched — merge skipped
        const items = (result.odataResult.entityData as any[])[0]['_Items'] as any[];
        expect(items[0]['__HP']).toBeNull();
    });

    test('should skip patching root records where nav prop is not an array', async () => {
        const mainRows = [
            { OrderID: 'ORD1', _Items: null }, // null — not an array
            { OrderID: 'ORD2' } // missing property entirely
        ];
        const navRows = [{ OrderID: 'ORD1', ItemID: '10', __HP: { NodeId: 'node-1' } }];

        (mockOdataService.get as jest.Mock)
            .mockResolvedValueOnce({ data: '', odata: () => mainRows })
            .mockResolvedValueOnce({ data: '', odata: () => navRows });

        const selectedEntities = [
            { fullPath: '_Items', entity: { entitySetName: 'OrderItems', entityPath: '_Items' } }
        ] as any[];

        expect(async () =>
            fetchData(listEntity, mockOdataService, selectedEntities, 1, undefined, [navHierarchy])
        ).not.toThrow();
    });
});
