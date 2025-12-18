import type { EntityType } from '@sap-ux/vocabularies-types';
import { createQueryFromEntities, getNestedExpands } from '../src/data-download/odata-query';
import type { Entity, ReferencedEntities } from '../src/data-download/types';
import { createEntitySetData } from '../src/data-download/utils';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

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

    test('`getNestedExpands` Should build an expand config based on nested navigation properties', () => {
        const entities: Entity[] = testEntities1;
        const expands = getNestedExpands(entities);

        expect(expands.expands).toEqual({
            a: {
                expand: {
                    'a.1': {
                        expand: {
                            'a.1.1': {}
                        }
                    },
                    'a.2': {
                        expand: {
                            'a.2.1': {},
                            'a.2.2': {}
                        }
                    }
                }
            },
            b: {},
            c: {
                expand: {
                    'c.1': {}
                }
            }
        });
    });

    test('`createQueryFromEntities` should create an odata query based on the provided entities', () => {
        const listEntity: ReferencedEntities['listEntity'] = {
            entitySetName: 'ListEntity1',
            semanticKeys: [],
            navPropEntities: testEntities1,
            entityPath: 'root',
            entityType: {} as EntityType
        };

        const query = createQueryFromEntities(listEntity);
        expect(query.query).toEqual('ListEntity1?$expand=a($expand=a.1($expand=a.1.1),a.2($expand=a.2.1,a.2.2)),b,c($expand=c.1)&$top=1');
        expect(query.entitySetsFlat).toEqual({
            'a': 'aSetName',
            'a.1': 'a1SetName',
            'a.1.1': 'a11SetName',
            'a.2': 'a2SetName',
            'a.2.1': 'a21SetName',
            'a.2.2': 'a22SetName',
            'b': 'bSetName',
            'c': 'cSetName',
            'c.1': 'c1SetName'
        });
    });

    test('`createEntitySetData` should create an entity set data map for writing to files', async () => {
        const rootEntity: ReferencedEntities['listEntity'] = JSON.parse(await readFile(join(__dirname, './test-data/TravelEntity.json'), 'utf8'));
        const { entitySetsFlat } = createQueryFromEntities(rootEntity);
        const odataResult = JSON.parse(await readFile(join(__dirname, './test-data/odataResult1.json'), 'utf8')).value;
        const entitySetData = createEntitySetData(odataResult, entitySetsFlat, rootEntity.entitySetName);
        expect(entitySetData).toMatchSnapshot();
    }, 999999999);
});
