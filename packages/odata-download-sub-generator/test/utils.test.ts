import type { ReferencedEntities } from '../src/data-download/types';
import { createEntitySetData } from '../src/data-download/utils';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

describe('Test utils', () => {
    describe('createEntitySetData', () => {
        test('should create an entity set data map for writing to files', async () => {
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

        test('should remove duplicate entities at all nesting levels', () => {
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
});
