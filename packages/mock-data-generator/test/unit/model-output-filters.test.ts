import { readFileSync } from 'node:fs';
import type { SchemaProperty } from '../../src/schema/graph.js';
import { isInstructionEcho, isNarrativePlaceholder } from '../../src/generation/sft.js';
import { semanticRules, fieldFilter, parseSemanticRuleStore } from '../../src/semantics/rule-store.js';
import { oracleIsInstructionEcho, oracleIsNarrativePlaceholder } from './model-output-filters-oracle.js';

const STORE = JSON.parse(
    readFileSync(new URL('../../resources/rules/semantic-rules.v1.json', import.meta.url), 'utf8')
) as Record<string, unknown>;

/**
 * A string property with optional label and description.
 *
 * @param name property name
 * @param label property label
 * @param description property description
 * @returns the property
 */
function property(name: string, label?: string, description?: string): SchemaProperty {
    return { name, label, description, primitiveType: 'string', nullable: false, isKey: false, annotations: [] };
}

const PROPERTIES = [
    property('City'),
    property('CustomerName', 'Customer Name', 'The name of the customer'),
    property('Price', 'Price ($)', 'Price in $& units'),
    property('a.b', 'A+B', 'x|y'),
    property('Description', undefined, 'Free text'),
    property('Code')
];

const PLACEHOLDERS = ['n/a', 'na', 'N/A', 'none', 'Null', 'unknown', 'TBD', 'todo', 'placeholder', 'lorem'];
const VALUES = [
    ...PLACEHOLDERS,
    'lorem ipsum',
    '  Lorem   Ipsum ',
    'lorem ipsum dolor',
    'sample',
    'sample text',
    'sample texts',
    'test',
    'test value',
    'test values',
    'value',
    'text',
    'n-a',
    'nan',
    '/products/1',
    '//cdn.example.com/a.png',
    'https://example.com/a',
    'mailto://x',
    'https://example.com/a b',
    'Return a JSON array of rows',
    'please output only the json   array',
    'JSON array with objects for each row',
    'json array containing three fields',
    'json array of numbers',
    `json array ${'x '.repeat(47)}with rows`,
    `return ${'x '.repeat(39)}json array`,
    'generate a json list',
    'The "City" key should contain a city',
    'city field must include the town',
    'customer name key should return text',
    'Customer name value',
    'customer name placeholder',
    'City #3',
    'city 2nd',
    'city 12',
    'price ($) 4',
    'price ($) value',
    'a.b 7',
    'axb 7',
    'a+b text',
    'x|y description',
    'x 1',
    'City',
    'customer name',
    'the name of the customer',
    'Berlin',
    'Hamburg 2',
    'Order 4711 for ACME',
    'An ordinary description that mentions a field',
    ''
];

describe('model output filters', () => {
    it('flag exactly what the former in-code expressions flagged', () => {
        // Given every property and candidate value
        for (const candidate of PROPERTIES) {
            for (const value of VALUES) {
                // When both filters judge it, then they agree with the former ones
                expect([value, isInstructionEcho(candidate, value)]).toEqual([
                    value,
                    oracleIsInstructionEcho(candidate, value)
                ]);
                expect([value, isNarrativePlaceholder(candidate, value)]).toEqual([
                    value,
                    oracleIsNarrativePlaceholder(candidate, value)
                ]);
            }
        }
        // And the corpus reaches every filter
        expect(VALUES.filter((value) => oracleIsInstructionEcho(PROPERTIES[0], value)).length).toBeGreaterThan(3);
        expect(VALUES.filter((value) => oracleIsNarrativePlaceholder(PROPERTIES[0], value)).length).toBeGreaterThan(20);
        expect(isInstructionEcho(PROPERTIES[0], 42)).toBe(false);
    });

    it('compile the instruction echoes once and the field templates per field', () => {
        const filters = semanticRules().modelOutputFilters;
        expect(filters.instructionEcho).toHaveLength(2);
        expect(filters.instructionEcho.every((pattern) => pattern.flags === 'u')).toBe(true);
        expect(fieldFilter(filters.fieldOrdinal, 'city|town').test('town #2')).toBe(true);
        // A name holding `$&` is inserted verbatim, not expanded as a replacement pattern
        expect(fieldFilter(filters.fieldPlaceholder, 'a\\$&b').test('a$&b value')).toBe(true);
    });

    it.each([
        ['an invalid expression', { pathOrUrl: '(' }, /pathOrUrl is not a valid regular expression/u],
        ['a template without the names', { fieldOrdinal: '^\\d+$' }, /fieldOrdinal must hold \{fields\} exactly once/u],
        [
            'a template with the names twice',
            { fieldOrdinal: '^(?:{fields}) (?:{fields})$' },
            /fieldOrdinal must hold \{fields\} exactly once/u
        ],
        ['a placeholder in upper case', { placeholderValues: ['N/A'] }, /lower-case with single spaces/u],
        ['an unknown key', { extra: 'x' }, /modelOutputFilters has unexpected keys: extra/u]
    ])('reject %s', (_case, change, message) => {
        // Given the packaged store with a defective filter section
        const filters = { ...(STORE.modelOutputFilters as Record<string, unknown>), ...change };
        // Then parsing fails with the defect named
        expect(() => parseSemanticRuleStore({ ...STORE, modelOutputFilters: filters })).toThrow(message);
    });
});
