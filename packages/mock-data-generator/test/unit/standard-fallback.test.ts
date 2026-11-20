import { applyStandardFallback } from '../../src/generation/standard-fallback.js';
import { checkPlaceholders, checkSharedTexts } from '../../src/quality/realism-text.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';
import {
    isStandardFallbackValue,
    standardFallbackTest,
    standardFallbackValue
} from '../../src/spec/standard-mockserver.js';
import type { ExistingMockData, MockDataRow } from '../../src/types.js';

const property = (name: string, options: Partial<SchemaProperty> = {}): SchemaProperty => ({
    name,
    primitiveType: 'string',
    nullable: true,
    isKey: false,
    annotations: [],
    ...options
});

const graphOf = (...entities: SchemaEntity[]): SchemaGraph => ({ namespace: 'Demo', entities, relationships: [] });

/** Carriers keyed by a code whose declared text is the carrier name, with a free note and a one-character flag. */
const carriers: SchemaEntity = {
    name: 'Carrier',
    entitySetName: 'Carriers',
    properties: [
        property('CarrierID', { isKey: true, nullable: false, maxLength: 3, links: { text: 'CarrierName' } }),
        property('CarrierName', { maxLength: 40 }),
        property('Note', { maxLength: 40 }),
        property('Flag', { maxLength: 1 })
    ]
};

/** Flights whose carrier comes from the carrier value list, which also supplies the carrier's display text. */
const flights: SchemaEntity = {
    name: 'Flight',
    entitySetName: 'Flights',
    properties: [
        property('FlightID', { primitiveType: 'int', isKey: true, nullable: false }),
        property('CarrierID', {
            maxLength: 3,
            links: {
                text: 'CarrierLabel',
                valueListCollection: 'Carriers',
                valueListParameters: [
                    { direction: 'InOut', localProperty: 'CarrierID', valueListProperty: 'CarrierID' }
                ]
            }
        }),
        property('CarrierLabel', { maxLength: 40 }),
        property('Remark', { maxLength: 40 })
    ]
};

describe('standard mock server values', () => {
    it('writes the property name and the row index, cut to the column', () => {
        // Given string properties without a length, with room for part of the name, and without room for any
        // When their standard values are computed
        // Then they hold the name and the index the way the standard mock server writes them, and nothing
        // where no part of the name fits
        expect(standardFallbackValue(property('BankNumber'), 3)).toBe('BankNumber_3');
        expect(standardFallbackValue(property('BankNumber', { maxLength: 8 }), 3)).toBe('BankNu_3');
        expect(standardFallbackValue(property('BankNumber', { maxLength: 8 }), 12)).toBe('BankN_12');
        expect(standardFallbackValue(property('Flag', { maxLength: 2 }), 3)).toBeUndefined();
    });

    it('recognises its own values and nothing else', () => {
        // Given a property cut to eight characters
        const bankNumber = property('BankNumber', { maxLength: 8 });

        // When values are tested
        // Then only a leading part of the name with an underscore and a number is a standard value
        expect(isStandardFallbackValue(bankNumber, 'BankNu_3')).toBe(true);
        expect(isStandardFallbackValue(bankNumber, 'BankNumber_17')).toBe(true);
        expect(isStandardFallbackValue(bankNumber, 'Bank Number 3')).toBe(false);
        expect(isStandardFallbackValue(bankNumber, 'Other_3')).toBe(false);
        expect(isStandardFallbackValue(bankNumber, '_3')).toBe(false);
        expect(isStandardFallbackValue(bankNumber, '3')).toBe(false);
        expect(isStandardFallbackValue(bankNumber, 3)).toBe(false);
    });

    it('is not counted as a placeholder, while a counted-up label still is', () => {
        // Given a column of standard values and a column that counts up the label of a field
        const remarks: SchemaEntity = {
            name: 'Remark',
            entitySetName: 'Remarks',
            properties: [property('ID', { isKey: true, primitiveType: 'int' }), property('Remark'), property('Memo')]
        };
        const resources = {
            Remarks: [0, 1, 2].map((index) => ({ ID: index, Remark: `Remark_${index}`, Memo: `Remark ${index + 1}` }))
        };

        // When the placeholder check runs
        const outcome = checkPlaceholders({ graph: graphOf(remarks), resources });

        // Then only the counted-up label is a finding
        expect(outcome.findings.map(({ property: name }) => name)).toEqual(['Memo']);
    });

    it('is recognised under any property name of the service, as a value list copies it', () => {
        // Given the carrier and flight schema, where a flight's carrier text is copied from the carrier name
        const isFallback = standardFallbackTest(graphOf(carriers, flights));

        // When values are tested
        // Then a leading part of any property name with an underscore and a number is a fallback value
        expect(isFallback('CarrierName_1')).toBe(true);
        expect(isFallback('Rem_4')).toBe(true);
        expect(isFallback('Unknown_1')).toBe(false);
        expect(isFallback('CarrierName 1')).toBe(false);
        expect(isFallback(null)).toBe(false);
    });

    it('is not counted as a text two unrelated fields share', () => {
        // Given two unrelated fields that hold the same fallback values copied from the name of a value help
        const places: SchemaEntity = {
            name: 'Place',
            entitySetName: 'Places',
            properties: [
                property('ID', { isKey: true, primitiveType: 'int' }),
                property('AirlineName'),
                property('AirportName')
            ]
        };
        const helps: SchemaEntity = {
            name: 'Help',
            entitySetName: 'Helps',
            properties: [property('ID', { isKey: true, primitiveType: 'int' }), property('Name')]
        };
        const resources = {
            Places: [0, 1, 2].map((index) => ({
                ID: index,
                AirlineName: `Name_${index}`,
                AirportName: `Name_${index}`
            }))
        };

        // When the shared-text check runs
        const outcome = checkSharedTexts({ graph: graphOf(places, helps), resources });

        // Then the fallback values are no finding
        expect(outcome.findings).toEqual([]);
    });
});

describe('standard fallback', () => {
    const fill = (
        resources: Record<string, ReadonlyArray<MockDataRow>>,
        existingData: Record<string, ExistingMockData> = {}
    ): ReturnType<typeof applyStandardFallback> =>
        applyStandardFallback(graphOf(carriers, flights), resources, existingData, {});

    it('fills empty generated strings, keeps every value and key, and gives a column too short for the name a code', () => {
        // Given generated carriers with empty names, notes and flags, one note set
        const resources = {
            Carriers: [
                { CarrierID: 'AA', CarrierName: null, Note: null, Flag: null },
                { CarrierID: 'BB', CarrierName: '', Note: 'kept', Flag: null }
            ]
        };

        // When the fallback runs
        const result = fill(resources);

        // Then each empty string holds its standard value, the set note and the keys stay, and the one-character
        // flag, which cannot hold its name, holds a one-character code
        const code = expect.stringMatching(/^[A-Z0-9]$/u);
        expect(result.resources.Carriers).toEqual([
            { CarrierID: 'AA', CarrierName: 'CarrierName_0', Note: 'Note_0', Flag: code },
            { CarrierID: 'BB', CarrierName: 'CarrierName_1', Note: 'kept', Flag: code }
        ]);
        expect(result.filled).toBe(5);
    });

    it('gives each code one text', () => {
        // Given generated flights whose carrier code repeats and whose carrier text is declared on the code,
        // without a carrier value help to copy from
        const ownText: SchemaEntity = {
            ...flights,
            properties: flights.properties.map((field) =>
                field.name === 'CarrierID' ? { ...field, links: { text: 'CarrierLabel' } } : field
            )
        };
        const resources = {
            Flights: [
                { FlightID: 1, CarrierID: 'AA', CarrierLabel: null, Remark: null },
                { FlightID: 2, CarrierID: 'BB', CarrierLabel: null, Remark: null },
                { FlightID: 3, CarrierID: 'AA', CarrierLabel: null, Remark: null }
            ]
        };

        // When the fallback runs
        const result = applyStandardFallback(graphOf(ownText), resources, {}, {});

        // Then a repeated code repeats its text, while a free field counts the rows
        expect(result.resources.Flights.map((row) => row.CarrierLabel)).toEqual([
            'CarrierLabel_0',
            'CarrierLabel_1',
            'CarrierLabel_0'
        ]);
        expect(result.resources.Flights.map((row) => row.Remark)).toEqual(['Remark_0', 'Remark_1', 'Remark_2']);
    });

    it('copies a field a value list determines from the matching value-help row instead of inventing it', () => {
        // Given generated carriers and flights whose carrier text comes from the carrier value list
        const resources = {
            Carriers: [
                { CarrierID: 'AA', CarrierName: null, Note: 'x', Flag: null },
                { CarrierID: 'BB', CarrierName: 'Blue Bird', Note: 'y', Flag: null }
            ],
            Flights: [
                { FlightID: 1, CarrierID: 'BB', CarrierLabel: null, Remark: 'a' },
                { FlightID: 2, CarrierID: 'AA', CarrierLabel: '', Remark: 'b' },
                { FlightID: 3, CarrierID: 'ZZ', CarrierLabel: null, Remark: 'c' }
            ]
        };

        // When the fallback runs
        const result = fill(resources);

        // Then each flight shows its carrier's text, filled or not, and a flight whose carrier has no value-help
        // row keeps its empty text rather than one no carrier has
        expect(result.resources.Flights.map((row) => row.CarrierLabel)).toEqual(['Blue Bird', 'CarrierName_0', null]);
        expect(result.resources.Carriers.map((row) => row.CarrierName)).toEqual(['CarrierName_0', 'Blue Bird']);
    });

    it('leaves a field empty whose planned role rejects the standard value', () => {
        // Given generated carriers whose note is planned as a URL
        const resources = { Carriers: [{ CarrierID: 'AA', CarrierName: null, Note: null, Flag: null }] };

        // When the fallback runs with that role
        const result = applyStandardFallback(graphOf(carriers, flights), resources, {}, { 'Carriers.Note': 'url' });

        // Then the URL stays empty instead of holding a name and a number, and the name and the flag are filled
        expect(result.resources.Carriers).toEqual([
            { CarrierID: 'AA', CarrierName: 'CarrierName_0', Note: null, Flag: expect.stringMatching(/^[A-Z0-9]$/u) }
        ]);
        expect(result.filled).toBe(2);
    });

    it('leaves a field several value lists determine, and the columns it reads, as they are', () => {
        // Given flights whose carrier text is the display text of the carrier list and an output of a second list
        const labels: SchemaEntity = {
            name: 'Label',
            entitySetName: 'Labels',
            properties: [
                property('Code', { isKey: true, nullable: false, maxLength: 3 }),
                property('Caption', { maxLength: 40 })
            ]
        };
        const twoLists: SchemaEntity = {
            ...flights,
            properties: [
                ...flights.properties,
                property('LabelCode', {
                    maxLength: 3,
                    links: {
                        valueListCollection: 'Labels',
                        valueListParameters: [
                            { direction: 'InOut', localProperty: 'LabelCode', valueListProperty: 'Code' },
                            { direction: 'Out', localProperty: 'CarrierLabel', valueListProperty: 'Caption' }
                        ]
                    }
                })
            ]
        };
        const resources = {
            Carriers: [{ CarrierID: 'AA', CarrierName: null, Note: 'x', Flag: null }],
            Labels: [{ Code: 'L1', Caption: null }],
            Flights: [{ FlightID: 1, CarrierID: 'AA', CarrierLabel: null, Remark: 'a', LabelCode: 'L1' }]
        };

        // When the fallback runs
        const result = applyStandardFallback(graphOf(carriers, labels, twoLists), resources, {}, {});

        // Then the shared text and both value-help columns it reads stay empty, so neither list disagrees with it
        expect(result.resources.Flights[0].CarrierLabel).toBeNull();
        expect(result.resources.Carriers[0].CarrierName).toBeNull();
        expect(result.resources.Labels[0].Caption).toBeNull();
    });

    it('never changes a supplied row', () => {
        // Given a supplied carrier with an empty name next to a generated one
        const supplied = { CarrierID: 'AA', CarrierName: null, Note: null, Flag: null };
        const existingData: Record<string, ExistingMockData> = {
            Carriers: {
                contributor: { present: false },
                initialRows: { source: 'json', present: true, rows: [supplied] }
            }
        };
        const resources = { Carriers: [supplied, { CarrierID: 'BB', CarrierName: null, Note: null, Flag: null }] };

        // When the fallback runs
        const result = fill(resources, existingData);

        // Then the supplied row stays as given, and only the generated row is filled
        expect(result.resources.Carriers).toEqual([
            supplied,
            {
                CarrierID: 'BB',
                CarrierName: 'CarrierName_1',
                Note: 'Note_1',
                Flag: expect.stringMatching(/^[A-Z0-9]$/u)
            }
        ]);
    });
});
