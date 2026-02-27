import type { EntityType } from '@sap-ux/vocabularies-types';
import { createQueryFromEntities, getExpands } from '../src/data-download/odata-query';
import type { ReferencedEntities } from '../src/data-download/types';
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
});
