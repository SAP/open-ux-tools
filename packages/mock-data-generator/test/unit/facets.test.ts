import { putInFacetForm } from '../../src/generation/facet-form.js';
import { assessRealism, REALISM_CHECK } from '../../src/quality/realism.js';
import type { SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';
import { inFacetForm, stringFacets } from '../../src/spec/facets.js';
import { countryNumericCode, ISO_3166_NUMERIC } from '../../src/spec/iso3166.js';
import { createRequire } from 'node:module';
import type { MockDataRow } from '../../src/types.js';

const field = (name: string, annotations: SchemaProperty['annotations'], extra: Partial<SchemaProperty> = {}) =>
    ({ name, primitiveType: 'string', nullable: true, isKey: false, annotations, ...extra }) as SchemaProperty;

const digits = field('Qd', [{ term: 'SAP__common.IsDigitSequence' }], { maxLength: 6 });
const upper = field('Qu', [{ term: 'Common.IsUpperCase', value: true }], { maxLength: 12 });

describe('string facets', () => {
    it.each([
        [[{ term: 'Common.IsDigitSequence' }], { digits: true, upperCase: false }],
        [[{ term: 'Common.IsDigitSequence', value: false }], { digits: false, upperCase: false }],
        [[{ term: 'sap:display-format', value: 'NonNegative' }], { digits: true, upperCase: false }],
        [[{ term: 'SAP__common.IsUpperCase' }], { digits: false, upperCase: true }],
        [[{ term: 'sap:display-format', value: 'UpperCase' }], { digits: false, upperCase: true }],
        [[{ term: 'sap:display-format', value: 'Date' }], { digits: false, upperCase: false }]
    ] as const)('reads %j', (annotations, expected) => {
        // Given a string field with the annotation, Then its facets are read from V4 terms or V2 attributes
        expect(stringFacets(field('Qx', [...annotations]))).toEqual(expected);
    });

    it('gives the form a field holds a string in, or none', () => {
        // Then an upper-case field holds upper case, a digit field only digits, and nothing too long
        expect(inFacetForm(upper, 'Main st')).toBe('MAIN ST');
        expect(inFacetForm(upper, 'Straße am See')).toBeUndefined();
        expect(inFacetForm(digits, '004711')).toBe('004711');
        expect(inFacetForm(digits, 'T00971')).toBeUndefined();
        expect(inFacetForm(field('Qn', [], { primitiveType: 'int' }), 'abc')).toBe('abc');
    });
});

describe('putting generated values in facet form', () => {
    const graph: SchemaGraph = {
        namespace: 'test',
        entities: [
            {
                name: 'QeType',
                entitySetName: 'Qe',
                properties: [field('Qk', [{ term: 'Common.IsUpperCase' }], { isKey: true }), digits, upper]
            }
        ],
        relationships: []
    };
    const rows: MockDataRow[] = [
        { Qk: 'k1', Qd: 'T00971', Qu: 'Tax' },
        { Qk: 'k2', Qd: '000001', Qu: 'Legal' }
    ];

    it('upper-cases texts and replaces letters in digit sequences, never a key or a supplied row', () => {
        // Given generated rows, the first of them supplied by the caller
        const existingData = {
            Qe: { contributor: { present: false }, initialRows: { present: true, source: 'json', rows: [rows[0]] } }
        } as const;
        // When the rows are put in facet form
        const formed = putInFacetForm({ graph, resources: { Qe: rows }, existingData: {}, plannedRoles: {} }).Qe;
        const supplied = putInFacetForm({ graph, resources: { Qe: rows }, existingData, plannedRoles: {} }).Qe;
        // Then texts are upper case, digit fields hold digits, keys keep their value, and supplied rows stay
        expect(formed.map((row) => row.Qu)).toEqual(['TAX', 'LEGAL']);
        expect(formed.every((row) => /^\d{6}$/u.test(String(row.Qd)))).toBe(true);
        expect(formed[1].Qd).toBe('000001');
        expect(formed.map((row) => row.Qk)).toEqual(['k1', 'k2']);
        expect(supplied[0]).toEqual(rows[0]);
    });

    it('gives a country code in a digit-sequence field its ISO 3166-1 numeric code', () => {
        // Given a generated country code in a digit field that the plan routes to a country
        const country = field('Qc', [{ term: 'Common.IsDigitSequence' }], { maxLength: 3 });
        const graph: SchemaGraph = {
            namespace: 'test',
            entities: [
                { name: 'QgType', entitySetName: 'Qg', properties: [field('Qk', [], { isKey: true }), country] }
            ],
            relationships: []
        };
        const resources = {
            Qg: [
                { Qk: 'k1', Qc: 'BE' },
                { Qk: 'k2', Qc: 'de' }
            ]
        };
        // When the rows are put in facet form
        const formed = putInFacetForm({ graph, resources, existingData: {}, plannedRoles: { 'Qg.Qc': 'country' } }).Qg;
        // Then each holds its country's numeric code, and the check passes
        expect(formed.map(({ Qc }) => Qc)).toEqual(['056', '276']);
        const findings = assessRealism({ graph, resources: { Qg: [...formed] } }).findings;
        expect(findings.filter(({ check }) => check === REALISM_CHECK.facet)).toEqual([]);
    });

    it('holds the numeric codes of the CLDR release it cites', () => {
        // Given the CLDR code mappings, user-assigned codes left out
        const require = createRequire(import.meta.url);
        const mappings: Record<string, { _numeric?: string }> = require('cldr-core/supplemental/codeMappings.json')
            .supplemental.codeMappings;
        const userAssigned = (code: string): boolean => /^(?:AA|ZZ|Q[M-Z]|X[A-Z])$/u.test(code);
        const expected = Object.fromEntries(
            Object.entries(mappings).flatMap(([code, { _numeric: numeric }]) =>
                /^[A-Z]{2}$/u.test(code) && numeric && !userAssigned(code) ? [[code, numeric]] : []
            )
        );
        // Then the table is that mapping
        expect(ISO_3166_NUMERIC).toEqual(expected);
        expect(countryNumericCode('na')).toBe('516');
        expect(countryNumericCode('QQ')).toBeUndefined();
    });

    it('keeps a value whose form the planned role rejects', () => {
        // Given a digit field whose planned role holds region codes
        const formed = putInFacetForm({
            graph,
            resources: { Qe: rows },
            existingData: {},
            plannedRoles: { 'Qe.Qd': 'country' }
        }).Qe;
        // Then its letters stay rather than becoming a number the role rejects
        expect(formed[0].Qd).toBe('T00971');
    });

    it('is checked: letters in a digit sequence and lower case in an upper-case field fail', () => {
        // Given rows that break both facets
        const findings = assessRealism({ graph, resources: { Qe: rows } })
            .findings.filter(({ check }) => check === REALISM_CHECK.facet)
            .map(({ entitySet, property, failingCells }) => `${entitySet}.${property}:${failingCells}`);
        // Then each broken cell fails, the key included
        expect(findings).toEqual(['Qe.Qd:1', 'Qe.Qk:2', 'Qe.Qu:2']);
    });
});
