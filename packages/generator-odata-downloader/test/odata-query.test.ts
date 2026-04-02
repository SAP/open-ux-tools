import type { EntityType } from '@sap-ux/vocabularies-types';
import { createQueryFromEntities, getExpands } from '../src/data-download/odata-query';
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
        expect(query.query).toEqual("ListEntity1?$filter=IsActive eq 'true'&$count=true");

        // Boolean in hierarchy query
        const hierarchy: HierarchyEntity = {
            entitySetName: 'ListEntity1',
            entityTypeName: 'ListEntity1Type',
            qualifier: 'MyHierarchy',
            nodeProperty: 'ID',
            parentProperty: 'Parent',
            parentPropertyType: 'Edm.String',
            isDraft: false
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
            'ListEntity1?$apply=descendants($root/ListEntity1,MyHierarchy,ID,filter(IsActive eq true),3,keep start)'
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
            isDraft: false
        };

        // No filter - no semantic key values (filter param omitted entirely)
        let query = createQueryFromEntities(listEntity, [], 1, hierarchy);
        expect(query.query).toEqual(
            'SalesOrganizations?$apply=descendants($root/SalesOrganizations,SalesOrgHierarchy,ID,3,keep start)'
        );

        // With string filter
        query = createQueryFromEntities(
            { ...listEntity, semanticKeys: [{ name: 'ID', value: 'Sales', type: 'Edm.String' }] },
            [],
            1,
            hierarchy
        );
        expect(query.query).toEqual(
            "SalesOrganizations?$apply=descendants($root/SalesOrganizations,SalesOrgHierarchy,ID,filter(ID eq 'Sales'),3,keep start)"
        );

        // With GUID filter (unquoted)
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
            'SalesOrganizations?$apply=descendants($root/SalesOrganizations,SalesOrgHierarchy,ID,filter(ID eq 550e8400-e29b-41d4-a716-446655440000),3,keep start)'
        );

        // With comma-separated filter values
        query = createQueryFromEntities(
            { ...listEntity, semanticKeys: [{ name: 'ID', value: 'Sales,Marketing', type: 'Edm.String' }] },
            [],
            1,
            hierarchy
        );
        expect(query.query).toEqual(
            "SalesOrganizations?$apply=descendants($root/SalesOrganizations,SalesOrgHierarchy,ID,filter((ID eq 'Sales' or ID eq 'Marketing')),3,keep start)"
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
            "SalesOrganizations?$apply=descendants($root/SalesOrganizations,SalesOrgHierarchy,ID,filter(ID eq 'Sales'),3,keep start)&$expand=Children"
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
            isDraft: true
        };

        // No user filter — no filter on ancestors or descendants
        let query = createQueryFromEntities(listEntity, [], 1, hierarchy);
        expect(query.query).toEqual(
            'P_SADL_HIER_UUID_D_COMPNY_ROOT?$apply=ancestors($root/P_SADL_HIER_UUID_D_COMPNY_ROOT,I_SADL_HIER_UUID_COMPANY_NODE,__HierarchyPropertiesForI_SADL_HIER_UUID_COMPANY_NODE/NodeId,keep start)/descendants($root/P_SADL_HIER_UUID_D_COMPNY_ROOT,I_SADL_HIER_UUID_COMPANY_NODE,__HierarchyPropertiesForI_SADL_HIER_UUID_COMPANY_NODE/NodeId,3,keep start)'
        );

        // With GUID and boolean filters — same filter applied to both ancestors and descendants
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
            'P_SADL_HIER_UUID_D_COMPNY_ROOT?$apply=ancestors($root/P_SADL_HIER_UUID_D_COMPNY_ROOT,I_SADL_HIER_UUID_COMPANY_NODE,__HierarchyPropertiesForI_SADL_HIER_UUID_COMPANY_NODE/NodeId,filter(Company eq cb565aac-b20e-1fe1-8b88-3dca3ae3111a and IsActiveEntity eq true),keep start)/descendants($root/P_SADL_HIER_UUID_D_COMPNY_ROOT,I_SADL_HIER_UUID_COMPANY_NODE,__HierarchyPropertiesForI_SADL_HIER_UUID_COMPANY_NODE/NodeId,filter(Company eq cb565aac-b20e-1fe1-8b88-3dca3ae3111a and IsActiveEntity eq true),3,keep start)'
        );
    });
});
