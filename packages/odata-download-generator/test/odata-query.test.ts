import type { EntityType } from '@sap-ux/vocabularies-types';
import { createQueryFromEntities, getExpands } from '../src/data-download/odata-query';
import type { ReferencedEntities } from '../src/data-download/types';
import { createEntitySetData } from '../src/data-download/utils';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
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

    test('`createEntitySetData` should create an entity set data map for writing to files', async () => {
        const rootEntity = JSON.parse(
            await readFile(join(__dirname, './test-data/TravelEntityModel.json'), 'utf8')
        ) as ReferencedEntities['listEntity'];
        // No selected entities, only the unexpanded main/list entity is written
        let odataResult = (
            JSON.parse(await readFile(join(__dirname, './test-data/odataResult1.json'), 'utf8')) as { value: unknown[] }
        ).value;
        let entitySetData = createEntitySetData(odataResult, {}, rootEntity.entitySetName);
        let expectedEntitySetData = await readFile(
            join(__dirname, './test-data/expected-output/test1/entityFileData.json'),
            'utf8'
        );
        expect(entitySetData).toEqual(JSON.parse(expectedEntitySetData));

        // More complex query, multiple entity set files created.
        odataResult = (
            JSON.parse(await readFile(join(__dirname, './test-data/odataResult2.json'), 'utf8')) as { value: unknown[] }
        ).value;
        entitySetData = createEntitySetData(
            odataResult,
            {
                _Country: 'Country',
                _Agency: 'TravelAgency',
                _Booking: 'Booking',
                _Product: 'Supplement',
                _SupplementText: 'SupplementText',
                _Travel: 'Travel',
                _BookSupplement: 'BookingSupplement',
                _Currency: 'Currency',
                _Carrier: 'Airline',
                _Customer: 'Passenger'
            },
            rootEntity.entitySetName
        );
        expectedEntitySetData = await readFile(
            join(__dirname, './test-data/expected-output/test2/entityFileData.json'),
            'utf8'
        );
        expect(entitySetData).toEqual(JSON.parse(expectedEntitySetData));
    });

    test('`createEntitySetData` should remove duplicate entities at all nesting levels', () => {
        // Simulates OData result similar to Travel with expanded Bookings, where:
        // - Same Airline appears in multiple bookings across different travels
        // - Same Currency appears at travel level and booking level
        // - Same Customer appears on multiple bookings
        const odataResult = [
            {
                TravelID: '1',
                TravelName: 'Trip to Paris',
                _Currency: { CurrencyCode: 'EUR', CurrencyName: 'Euro' },
                _Booking: [
                    {
                        BookingID: 'B1',
                        _Carrier: { AirlineID: 'LH', AirlineName: 'Lufthansa' },
                        _Customer: { CustomerID: 'C1', CustomerName: 'John Doe' },
                        _Currency: { CurrencyCode: 'EUR', CurrencyName: 'Euro' } // duplicate of travel currency
                    },
                    {
                        BookingID: 'B2',
                        _Carrier: { AirlineID: 'LH', AirlineName: 'Lufthansa' }, // duplicate carrier
                        _Customer: { CustomerID: 'C2', CustomerName: 'Jane Smith' },
                        _Currency: { CurrencyCode: 'USD', CurrencyName: 'US Dollar' }
                    }
                ]
            },
            {
                TravelID: '2',
                TravelName: 'Trip to London',
                _Currency: { CurrencyCode: 'GBP', CurrencyName: 'British Pound' },
                _Booking: [
                    {
                        BookingID: 'B3',
                        _Carrier: { AirlineID: 'BA', AirlineName: 'British Airways' },
                        _Customer: { CustomerID: 'C1', CustomerName: 'John Doe' }, // duplicate customer from Travel 1
                        _Currency: { CurrencyCode: 'GBP', CurrencyName: 'British Pound' } // duplicate of travel currency
                    },
                    {
                        BookingID: 'B4',
                        _Carrier: { AirlineID: 'LH', AirlineName: 'Lufthansa' }, // duplicate carrier from Travel 1
                        _Customer: { CustomerID: 'C2', CustomerName: 'Jane Smith' }, // duplicate customer
                        _Currency: { CurrencyCode: 'EUR', CurrencyName: 'Euro' } // duplicate currency from Travel 1
                    }
                ]
            }
        ];

        const entitySetsFlat = {
            _Currency: 'Currency',
            _Booking: 'Booking',
            _Carrier: 'Airline',
            _Customer: 'Passenger'
        };

        const result = createEntitySetData(odataResult, entitySetsFlat, 'Travel');

        // 2 unique travels
        expect(result.Travel).toHaveLength(2);
        // 4 unique bookings (B1, B2, B3, B4)
        expect(result.Booking).toHaveLength(4);
        // 3 unique currencies (EUR, USD, GBP) - despite appearing 6 times in the data
        expect(result.Currency).toHaveLength(3);
        expect(result.Currency).toEqual(
            expect.arrayContaining([
                { CurrencyCode: 'EUR', CurrencyName: 'Euro' },
                { CurrencyCode: 'USD', CurrencyName: 'US Dollar' },
                { CurrencyCode: 'GBP', CurrencyName: 'British Pound' }
            ])
        );
        // 2 unique airlines (LH, BA) - despite LH appearing 3 times
        expect(result.Airline).toHaveLength(2);
        expect(result.Airline).toEqual(
            expect.arrayContaining([
                { AirlineID: 'LH', AirlineName: 'Lufthansa' },
                { AirlineID: 'BA', AirlineName: 'British Airways' }
            ])
        );
        // 2 unique customers (C1, C2) - despite each appearing twice
        expect(result.Passenger).toHaveLength(2);
        expect(result.Passenger).toEqual(
            expect.arrayContaining([
                { CustomerID: 'C1', CustomerName: 'John Doe' },
                { CustomerID: 'C2', CustomerName: 'Jane Smith' }
            ])
        );
    });
});
