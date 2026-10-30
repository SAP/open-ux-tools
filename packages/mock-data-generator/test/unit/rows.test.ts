import {
    freezeRows,
    hasAuthoritativeRows,
    isKeyOrEnumerated,
    isProtectedProperty,
    keySignature,
    ownsInitialData,
    protectedPropertyNames,
    pushUniqueDiagnostic,
    sameValue
} from '../../src/generation/rows.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';
import type { ExistingMockData, MockDataGeneratorDiagnostic } from '../../src/types.js';

function property(name: string, extra: Partial<SchemaProperty> = {}): SchemaProperty {
    return { name, primitiveType: 'string', nullable: true, isKey: false, annotations: [], ...extra };
}

const owner: SchemaEntity = {
    name: 'Order',
    entitySetName: 'Orders',
    properties: [
        property('ID', { isKey: true }),
        property('Status', { enumValues: ['open'] }),
        property('Kind', { enumValues: [] }),
        property('CustomerID'),
        property('Note')
    ]
};

const graph: SchemaGraph = {
    namespace: 'test',
    entities: [owner],
    relationships: [
        {
            name: 'to_Customer',
            fromEntitySet: 'Orders',
            toEntitySet: 'Customers',
            mappings: [{ sourceProperty: 'CustomerID', targetProperty: 'ID' }]
        }
    ]
};

describe('generation row helpers', () => {
    it('compares values by identity or JSON text', () => {
        // Given equal and different JSON values
        // When they are compared
        // Then scalars, arrays and NaN compare by value
        expect(sameValue(1, 1)).toBe(true);
        expect(sameValue(Number.NaN, Number.NaN)).toBe(true);
        expect(sameValue(['a', 1], ['a', 1])).toBe(true);
        expect(sameValue('1', 1)).toBe(false);
        expect(sameValue(undefined, null)).toBe(false);
    });

    it('signs a row by its key values in key order', () => {
        // Given a composite key and a row missing one key value
        const keys = [{ name: 'ID' }, { name: 'Version' }];
        // When the rows are signed
        // Then the signature is the JSON array of key values, a missing value as null
        expect(keySignature(keys, { ID: 'A', Version: 1, Note: 'x' })).toBe('["A",1]');
        expect(keySignature(keys, { ID: 'A' })).toBe('["A",null]');
    });

    it('treats only present, enumerable initial rows as authoritative', () => {
        // Given every kind of initial rows
        const rows = [{ ID: '1' }];
        // When authority is checked
        // Then JSON rows and enumerable contributors are authoritative; absent and opaque ones are not
        expect(hasAuthoritativeRows({ source: 'json', present: true, rows })).toBe(true);
        expect(hasAuthoritativeRows({ source: 'json', present: true, rows: [] })).toBe(true);
        expect(hasAuthoritativeRows({ source: 'contributor', present: true, enumerable: true, rows })).toBe(true);
        expect(hasAuthoritativeRows({ source: 'contributor', present: true, enumerable: false })).toBe(false);
        expect(hasAuthoritativeRows({ source: 'none', present: false })).toBe(false);
        expect(hasAuthoritativeRows(undefined)).toBe(false);
    });

    it('counts caller-owned data from non-empty rows or a contributor with initial data', () => {
        // Given existing data in each ownership state
        const none: ExistingMockData = {
            contributor: { present: false },
            initialRows: { source: 'none', present: false }
        };
        const emptyFile: ExistingMockData = {
            contributor: { present: false },
            initialRows: { source: 'json', present: true, rows: [] }
        };
        const file: ExistingMockData = {
            contributor: { present: false },
            initialRows: { source: 'json', present: true, rows: [{ ID: '1' }] }
        };
        const opaqueContributor: ExistingMockData = {
            contributor: { present: true, hasInitialData: true },
            initialRows: { source: 'contributor', present: true, enumerable: false }
        };
        const contributorWithoutData: ExistingMockData = {
            contributor: { present: true, hasInitialData: false },
            initialRows: { source: 'contributor', present: true, enumerable: false }
        };
        // When ownership is checked
        // Then rows or declared contributor data count; an empty file or bare contributor does not
        expect(ownsInitialData(undefined)).toBe(false);
        expect(ownsInitialData(none)).toBe(false);
        expect(ownsInitialData(emptyFile)).toBe(false);
        expect(ownsInitialData(file)).toBe(true);
        expect(ownsInitialData(opaqueContributor)).toBe(true);
        expect(ownsInitialData(contributorWithoutData)).toBe(false);
    });

    it('protects keys, declared enumerations and relationship ends, consistently per field and per entity', () => {
        // Given an entity with a key, a filled and an empty enumeration, a foreign key and a free field
        // When protection is computed per field and as a set
        const perField = owner.properties
            .filter((field) => isProtectedProperty(graph, owner, field))
            .map(({ name }) => name);
        // Then both agree, and only the free field is unprotected
        expect(perField).toEqual(['ID', 'Status', 'Kind', 'CustomerID']);
        expect([...protectedPropertyNames(graph, owner)].sort()).toEqual([...perField].sort());
    });

    it('fixes keys and enumerations with members, but not an empty enumeration, for coherence rules', () => {
        // Given the same entity
        // When the coherence predicate is applied
        // Then an empty enumeration does not fix the field
        expect(owner.properties.filter(isKeyOrEnumerated).map(({ name }) => name)).toEqual(['ID', 'Status']);
    });

    it('freezes the row list and each row', () => {
        // Given mutable rows
        const rows = [{ ID: '1' }, { ID: '2' }];
        // When they are frozen
        const frozen = freezeRows(rows);
        // Then the array and every row are frozen, and the rows are the same objects
        expect(Object.isFrozen(frozen)).toBe(true);
        expect(frozen.every((row) => Object.isFrozen(row))).toBe(true);
        expect(frozen[0]).toBe(rows[0]);
    });

    it('reports a code once per target', () => {
        // Given diagnostics with a repeated code and target
        const diagnostics: MockDataGeneratorDiagnostic[] = [];
        const first: MockDataGeneratorDiagnostic = {
            code: 'SCHEMA_PROPERTY_OMITTED',
            severity: 'warning',
            target: 'A.b',
            message: 'first'
        };
        // When the same code is reported again for the same and for another target
        pushUniqueDiagnostic(diagnostics, first);
        pushUniqueDiagnostic(diagnostics, { ...first, message: 'second' });
        pushUniqueDiagnostic(diagnostics, { ...first, target: 'A.c' });
        // Then only the first report per target is kept, in order
        expect(diagnostics.map(({ target, message }) => `${target}:${message}`)).toEqual(['A.b:first', 'A.c:first']);
    });
});
