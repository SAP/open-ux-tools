import { generateDeterministicResources } from '../../src/generation/deterministic.js';
import { CATALOG_ROLE_SAMPLES } from '../../src/semantics/sample-catalog.js';

const LANGUAGES = CATALOG_ROLE_SAMPLES.language;
import type { SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';

function generateKeys(properties: SchemaProperty[], rowsPerEntity: number) {
    const graph: SchemaGraph = {
        namespace: 'Composite',
        entities: [{ name: 'Record', entitySetName: 'Records', properties }],
        relationships: []
    };
    return generateDeterministicResources(graph, [{ name: 'Records', kind: 'entity-set' }], {
        pipeline: 'semantic-v2',
        seed: 42,
        rowsPerEntity
    }).resources.Records;
}

const key = (name: string, options: Partial<SchemaProperty> = {}): SchemaProperty => ({
    name,
    primitiveType: 'string',
    nullable: false,
    isKey: true,
    annotations: [],
    maxLength: 4,
    ...options
});

describe('composite key sampling', () => {
    test('does not collapse a keyless resource while checking routed key collisions', () => {
        const graph: SchemaGraph = {
            namespace: 'Keyless',
            entities: [
                {
                    name: 'Observation',
                    entitySetName: 'Observations',
                    properties: [key('description', { isKey: false, maxLength: 40 })]
                }
            ],
            relationships: []
        };

        const result = generateDeterministicResources(graph, [{ name: 'Observations', kind: 'entity-set' }], {
            pipeline: 'semantic-v2',
            seed: 42,
            rowsPerEntity: 3
        });

        expect(result.resources.Observations).toHaveLength(3);
        expect(result.diagnostics.map(({ code }) => code)).not.toContain('ROW_COUNT_REDUCED_UNSATISFIABLE_KEY_DOMAIN');
    });

    test('does not claim ten unique rows from a smaller routed finite provider domain', () => {
        const graph: SchemaGraph = {
            namespace: 'Locale',
            entities: [{ name: 'Language', entitySetName: 'Languages', properties: [key('code', { maxLength: 14 })] }],
            relationships: []
        };
        const result = generateDeterministicResources(
            graph,
            [{ name: 'Languages', kind: 'entity-set' }],
            { pipeline: 'semantic-v2', seed: 42, rowsPerEntity: LANGUAGES.length + 5 },
            new Map([['Languages.code', { role: 'language', confidence: 0.99, source: 'classifier' as const }]])
        );

        expect(result.resources.Languages).toHaveLength(LANGUAGES.length);
        expect(new Set(result.resources.Languages.map((row) => row.code)).size).toBe(LANGUAGES.length);
        expect(result.diagnostics.map(({ code }) => code)).toContain('ROW_COUNT_REDUCED_UNSATISFIABLE_KEY_DOMAIN');
    });

    test('retains complete rows when another key dimension makes finite provider values unique', () => {
        const graph: SchemaGraph = {
            namespace: 'Locale',
            entities: [
                {
                    name: 'Translation',
                    entitySetName: 'Translations',
                    properties: [key('code', { maxLength: 14 }), key('sequence', { primitiveType: 'int' })]
                }
            ],
            relationships: []
        };
        const result = generateDeterministicResources(
            graph,
            [{ name: 'Translations', kind: 'entity-set' }],
            { pipeline: 'semantic-v2', seed: 42, rowsPerEntity: 10 },
            new Map([['Translations.code', { role: 'language', confidence: 0.99, source: 'classifier' as const }]])
        );

        expect(result.resources.Translations).toHaveLength(10);
        expect(new Set(result.resources.Translations.map((row) => JSON.stringify([row.code, row.sequence]))).size).toBe(
            10
        );
    });

    test('varies each finite component before exhausting a preceding component', () => {
        const properties = [key('DimensionA'), key('DimensionB'), key('EffectiveOn', { primitiveType: 'date' })];
        const rows = generateKeys(properties, 10);
        expect(rows).toHaveLength(10);
        expect(new Set(rows.map((row) => row.DimensionA)).size).toBe(10);
        expect(new Set(rows.map((row) => row.DimensionB)).size).toBe(10);
        expect(new Set(rows.map((row) => JSON.stringify(row))).size).toBe(10);
        expect(generateKeys(properties, 10)).toEqual(rows);
    });

    test.each([
        [2, 3],
        [2, 3, 4],
        [1, 2, 2],
        [3, 3, 3]
    ])('retains every distinct tuple in finite domain %j', (...cardinalities) => {
        const properties = cardinalities.map((cardinality, index) =>
            key(`Axis${index}`, {
                primitiveType: 'int',
                enumValues: Array.from({ length: cardinality }, (_, value) => value)
            })
        );
        const capacity = cardinalities.reduce((product, value) => product * value, 1);
        const rows = generateKeys(properties, capacity + 1);
        expect(rows).toHaveLength(capacity);
        expect(new Set(rows.map((row) => JSON.stringify(row))).size).toBe(capacity);
    });
});
