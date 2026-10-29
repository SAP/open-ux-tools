import { assessRealism, REALISM_CHECK } from '../../src/quality/realism.js';
import type { GeographyReferences, RealismCheck } from '../../src/quality/realism.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';
import type { MockDataRow } from '../../src/types.js';

const property = (name: string, extra: Partial<SchemaProperty> = {}): SchemaProperty => ({
    name,
    primitiveType: 'string',
    nullable: true,
    isKey: false,
    annotations: [],
    ...extra
});

const entity = (entitySetName: string, properties: SchemaProperty[]): SchemaEntity => ({
    name: `${entitySetName}Type`,
    entitySetName,
    properties: [property('ID', { isKey: true }), ...properties]
});

const graphOf = (...entities: SchemaEntity[]): SchemaGraph => ({ namespace: 'test', entities, relationships: [] });

const rowsOf = (count: number, row: (index: number) => Record<string, string | number | null>): MockDataRow[] =>
    Array.from({ length: count }, (_, index) => ({ ID: `K${index}`, ...row(index) }));

const failing = (
    graph: SchemaGraph,
    resources: Record<string, MockDataRow[]>,
    check: RealismCheck,
    geography?: GeographyReferences
) =>
    assessRealism({ graph, resources, geography })
        .findings.filter((finding) => finding.check === check)
        .map(({ entitySet, property: name, failingCells }) => `${entitySet}.${name}:${failingCells}`);

describe('realism checks', () => {
    describe('placeholders', () => {
        it('flags a service name followed by a number and a column counting up a service name', () => {
            // Given a field whose values echo another field's name, and a column counting up a one-word field name
            const graph = graphOf(
                entity('Address', [property('TaxJurisdiction'), property('CareOf'), property('Remark')])
            );
            const resources = {
                Address: rowsOf(5, (index) => ({
                    TaxJurisdiction: `Jurisdiction ${index + 1}`,
                    CareOf: `Remark ${index + 1}`
                }))
            };
            // When the rows are checked, Then both fields fail in every row
            expect(failing(graph, resources, REALISM_CHECK.placeholder)).toEqual([
                'Address.CareOf:5',
                'Address.TaxJurisdiction:5'
            ]);
        });

        it('accepts a column counting up a prefix that names nothing in the service', () => {
            // Given floors counted up in a location field
            const graph = graphOf(entity('Address', [property('Location')]));
            const resources = { Address: rowsOf(5, (index) => ({ Location: `Floor ${index + 1}` })) };
            // When the rows are checked, Then nothing fails: a counted value is data unless it echoes a name
            expect(failing(graph, resources, REALISM_CHECK.placeholder)).toEqual([]);
        });

        it('accepts numbered values that are not service names, one-word names with a number, and enumeration members', () => {
            // Given street addresses, a room repeated in rows, a phone prefix and an enumeration member that looks numbered
            const graph = graphOf(
                entity('Address', [
                    property('Street'),
                    property('AssetRoom'),
                    property('Fax'),
                    property('Grade', { enumValues: ['Level 1'] })
                ])
            );
            const resources = {
                Address: rowsOf(4, (index) => ({
                    Street: ['Hill Street 4', 'Main Road 12', 'Oak Lane', 'Elm Way 7'][index],
                    AssetRoom: 'Room 14',
                    Fax: '+1 672',
                    Grade: 'Level 1'
                }))
            };
            // When the rows are checked, Then nothing fails
            expect(failing(graph, resources, REALISM_CHECK.placeholder)).toEqual([]);
        });
    });

    describe('name leaks', () => {
        it('flags a value that is the name of another property', () => {
            // Given a field holding the technical name of a sibling field
            const graph = graphOf(entity('Mapping', [property('TransactionType'), property('LastChangedByUser')]));
            const resources = {
                Mapping: rowsOf(3, () => ({ TransactionType: 'LastChangedByUser', LastChangedByUser: 'JSMITH' }))
            };
            // When the rows are checked, Then the field fails
            expect(failing(graph, resources, REALISM_CHECK.nameLeak)).toEqual(['Mapping.TransactionType:3']);
        });
    });

    describe('shared texts', () => {
        it('flags unrelated fields filled from the same list and accepts fields about the same subject', () => {
            // Given a category description and a user description sharing generic texts, and two city fields sharing cities
            const graph = graphOf(
                entity('Bank', [property('CategoryDescription'), property('CityName')]),
                entity('User', [property('UserDescription'), property('DeviatingCityName')])
            );
            const texts = ['Valve repair', 'Safety check', 'Pump inspection'];
            const cities = ['New York', 'San Jose', 'Rio Branco'];
            const resources = {
                Bank: rowsOf(3, (index) => ({ CategoryDescription: texts[index], CityName: cities[index] })),
                User: rowsOf(3, (index) => ({ UserDescription: texts[index], DeviatingCityName: cities[index] }))
            };
            // When the rows are checked, Then only the descriptions fail
            expect(failing(graph, resources, REALISM_CHECK.sharedText)).toEqual([
                'Bank.CategoryDescription:3',
                'User.UserDescription:3'
            ]);
        });

        it('accepts a name and a description of the same entity sharing values', () => {
            // Given a texts entity whose name and descr fields both hold currency names
            const graph = graphOf(entity('CurrencyTexts', [property('name'), property('descr')]));
            const names = ['US Dollar', 'Pound Sterling', 'Japanese Yen'];
            const resources = { CurrencyTexts: rowsOf(3, (index) => ({ name: names[index], descr: names[index] })) };
            // When the rows are checked, Then nothing fails
            expect(failing(graph, resources, REALISM_CHECK.sharedText)).toEqual([]);
        });
    });

    describe('code texts', () => {
        it('flags a text that changes for one code and a name field holding codes', () => {
            // Given a code whose text differs between rows, and a language name holding language codes
            const graph = graphOf(
                entity('Bank', [
                    property('Category', { maxLength: 2, links: { text: 'CategoryText' } }),
                    property('CategoryText', { maxLength: 40 }),
                    property('LanguageName', { maxLength: 40 })
                ])
            );
            const resources = {
                Bank: rowsOf(4, (index) => ({
                    Category: 'A',
                    CategoryText: index < 2 ? 'Retail' : 'Central',
                    LanguageName: ['ES', 'PT', 'DE', 'IT'][index]
                }))
            };
            // When the rows are checked, Then both text fields fail in every row
            expect(failing(graph, resources, REALISM_CHECK.codeText)).toEqual([
                'Bank.CategoryText:4',
                'Bank.LanguageName:4'
            ]);
        });

        it('accepts a text that is a function of its code', () => {
            const graph = graphOf(
                entity('Bank', [property('Category', { links: { text: 'CategoryText' } }), property('CategoryText')])
            );
            const resources = {
                Bank: rowsOf(4, (index) => ({
                    Category: index % 2 ? 'A' : 'B',
                    CategoryText: index % 2 ? 'Retail' : 'Central'
                }))
            };
            expect(failing(graph, resources, REALISM_CHECK.codeText)).toEqual([]);
        });

        it('does not pair texts with empty codes', () => {
            // Given rows whose code was left empty and whose texts differ
            const graph = graphOf(
                entity('Bank', [property('Category', { links: { text: 'CategoryText' } }), property('CategoryText')])
            );
            const resources = { Bank: rowsOf(4, (index) => ({ Category: '', CategoryText: `Text ${'ABCD'[index]}` })) };
            // When the rows are checked, Then the empty code is no code, and nothing fails
            expect(failing(graph, resources, REALISM_CHECK.codeText)).toEqual([]);
        });
    });

    describe('temporal', () => {
        const dated = graphOf(
            entity('Partner', [
                property('CreatedDate', { primitiveType: 'date' }),
                property('CreatedTime', { primitiveType: 'time' }),
                property('CreatedDateTime', { primitiveType: 'datetimeoffset' }),
                property('ChangedDateTime', { primitiveType: 'datetimeoffset' }),
                property('ValidFrom', { primitiveType: 'date' }),
                property('ValidTo', { primitiveType: 'date' })
            ])
        );

        it('flags reversed validity, a change equal to the creation in every row, a midnight timestamp next to a real time', () => {
            // Given rows with the defects the generator produced
            const resources = {
                Partner: rowsOf(5, (index) => ({
                    CreatedDate: `2023-02-0${index + 1}`,
                    CreatedTime: '12:49:00',
                    CreatedDateTime: `2023-02-0${index + 1}T00:00:00.000Z`,
                    ChangedDateTime: `2023-02-0${index + 1}T00:00:00.000Z`,
                    ValidFrom: '2024-01-01',
                    ValidTo: '2023-01-01'
                }))
            };
            // When the rows are checked, Then each defect is reported on its field
            expect(failing(dated, resources, REALISM_CHECK.temporalOrder)).toEqual(['Partner.ValidFrom:5']);
            expect(failing(dated, resources, REALISM_CHECK.temporalIdentity)).toEqual(['Partner.CreatedDateTime:5']);
            expect(failing(dated, resources, REALISM_CHECK.temporalComposition)).toEqual([
                'Partner.ChangedDateTime:5',
                'Partner.CreatedDateTime:5'
            ]);
        });

        it('accepts consistent dates and times', () => {
            const resources = {
                Partner: rowsOf(5, (index) => ({
                    CreatedDate: `2023-02-0${index + 1}`,
                    CreatedTime: `1${index}:49:00`,
                    CreatedDateTime: `2023-02-0${index + 1}T1${index}:49:00.000Z`,
                    ChangedDateTime: `2023-03-0${index + 1}T08:15:00.000Z`,
                    ValidFrom: '2022-01-01',
                    ValidTo: '2024-01-01'
                }))
            };
            for (const check of [
                REALISM_CHECK.temporalOrder,
                REALISM_CHECK.temporalIdentity,
                REALISM_CHECK.temporalComposition
            ]) {
                expect(failing(dated, resources, check)).toEqual([]);
            }
        });
    });

    describe('geography', () => {
        const references: GeographyReferences = {
            regions: new Set(['US', 'DE', 'IE', 'FI']),
            callingCodes: new Map([
                ['1', new Set(['US'])],
                ['49', new Set(['DE'])],
                ['353', new Set(['IE'])]
            ]),
            cityRegions: new Map([
                ['dublin', new Set(['IE'])],
                ['berlin', new Set(['DE'])],
                ['new york', new Set(['US'])]
            ]),
            zoneRegions: new Map([['Europe/Berlin', new Set(['DE'])]])
        };
        const graph = graphOf(
            entity('Bank', [property('BankCountry'), property('City'), property('Swift'), property('Phone')])
        );

        it('flags a city, bank identifier and phone number from another country than the row', () => {
            // Given a US bank with an Irish city, a German bank identifier and an Irish phone number
            const resources = {
                Bank: rowsOf(3, () => ({
                    BankCountry: 'US',
                    City: 'Dublin',
                    Swift: 'DEUTDEFF',
                    Phone: '+353 1 234567'
                }))
            };
            // When the rows are checked against the references, Then all three fields fail
            expect(failing(graph, resources, REALISM_CHECK.geography, references)).toEqual([
                'Bank.City:3',
                'Bank.Phone:3',
                'Bank.Swift:3'
            ]);
        });

        it('accepts geography that agrees with the row and skips the check without references', () => {
            const resources = {
                Bank: rowsOf(3, () => ({
                    BankCountry: 'DE',
                    City: 'Berlin',
                    Swift: 'DEUTDEFF',
                    Phone: '+49 30 1234567'
                }))
            };
            expect(failing(graph, resources, REALISM_CHECK.geography, references)).toEqual([]);
            const mismatched = {
                Bank: rowsOf(3, () => ({ BankCountry: 'US', City: 'Dublin', Swift: 'DEUTDEFF', Phone: '+353 1' }))
            };
            expect(failing(graph, mismatched, REALISM_CHECK.geography)).toEqual([]);
        });
    });

    describe('constant columns and supplied rows', () => {
        it('flags a constant column and skips rows the caller supplied', () => {
            // Given a constant generated column, and supplied rows that are constant too
            const graph = graphOf(entity('Bank', [property('Branch')]));
            const resources = { Bank: rowsOf(6, (index) => ({ Branch: index < 5 ? 'Main' : 'North' })) };
            // When all rows are generated, Then the column passes because one row differs
            expect(failing(graph, resources, REALISM_CHECK.constantColumn)).toEqual([]);
            // When the differing row was supplied by the caller, Then the generated rows are constant
            const assessment = assessRealism({ graph, resources, isSupplied: (_set, index) => index === 5 });
            expect(assessment.findings.map(({ check, property: name }) => `${check}:${name}`)).toEqual([
                'constant-column:Branch'
            ]);
        });

        it('does not count a column left empty as constant', () => {
            // Given a mandatory column the generator left empty in every row
            const graph = graphOf(entity('Bank', [property('Branch', { nullable: false })]));
            const resources = { Bank: rowsOf(6, () => ({ Branch: '' })) };
            // When the rows are checked, Then empty is no value, and nothing fails
            expect(failing(graph, resources, REALISM_CHECK.constantColumn)).toEqual([]);
        });
    });
});
