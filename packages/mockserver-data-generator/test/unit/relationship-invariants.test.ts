import { generateDeterministicResources } from '../../src/generation/deterministic.js';
import type { SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';

const property = (name: string, options: Partial<SchemaProperty> = {}): SchemaProperty => ({
    name,
    primitiveType: 'int',
    nullable: false,
    isKey: name === 'ID',
    annotations: [],
    ...options
});

function graph(leftValues: ReadonlyArray<number>, rightValues: ReadonlyArray<number>): SchemaGraph {
    return {
        namespace: 'review',
        entities: [
            {
                name: 'Left',
                entitySetName: 'Lefts',
                properties: [property('ID', { enumValues: leftValues })]
            },
            {
                name: 'Right',
                entitySetName: 'Rights',
                properties: [property('ID', { enumValues: rightValues })]
            },
            {
                name: 'Child',
                entitySetName: 'Children',
                properties: [property('ID'), property('SharedParentID', { isKey: false })]
            }
        ],
        relationships: [
            {
                name: 'Child_Left',
                fromEntitySet: 'Children',
                toEntitySet: 'Lefts',
                mappings: [{ sourceProperty: 'SharedParentID', targetProperty: 'ID' }]
            },
            {
                name: 'Child_Right',
                fromEntitySet: 'Children',
                toEntitySet: 'Rights',
                mappings: [{ sourceProperty: 'SharedParentID', targetProperty: 'ID' }]
            }
        ]
    };
}

describe('whole-service relationship invariants', () => {
    test('chooses the common parent domain when two relationships share a source property', () => {
        const result = generateDeterministicResources(
            graph([1, 2], [2, 3]),
            [
                { name: 'Lefts', kind: 'entity-set' },
                { name: 'Rights', kind: 'entity-set' },
                { name: 'Children', kind: 'entity-set' }
            ],
            { rowsPerEntity: 3 }
        );

        expect(result.resources.Children).toHaveLength(3);
        expect(result.resources.Children.every((row) => row.SharedParentID === 2)).toBe(true);
    });

    test('abstains when shared relationship constraints have no solution', () => {
        const result = generateDeterministicResources(
            graph([1, 2], [3, 4]),
            [
                { name: 'Lefts', kind: 'entity-set' },
                { name: 'Rights', kind: 'entity-set' },
                { name: 'Children', kind: 'entity-set' }
            ],
            { rowsPerEntity: 3 }
        );

        expect(result.resources.Children).toEqual([]);
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({
                code: 'ROW_COUNT_REDUCED_UNSATISFIABLE_RELATIONSHIP_CONSTRAINTS',
                target: 'Children'
            })
        );
    });

    test('jointly reduces a one-to-one child whose only key is the parent foreign key', () => {
        const constrained: SchemaGraph = {
            namespace: 'review',
            entities: [
                {
                    name: 'Parent',
                    entitySetName: 'Parents',
                    properties: [property('ID', { enumValues: [1, 2] })]
                },
                {
                    name: 'Child',
                    entitySetName: 'Children',
                    properties: [property('ParentID', { isKey: true })]
                }
            ],
            relationships: [
                {
                    name: 'Child_Parent',
                    fromEntitySet: 'Children',
                    toEntitySet: 'Parents',
                    mappings: [{ sourceProperty: 'ParentID', targetProperty: 'ID' }]
                }
            ]
        };

        const result = generateDeterministicResources(
            constrained,
            [
                { name: 'Parents', kind: 'entity-set' },
                { name: 'Children', kind: 'entity-set' }
            ],
            { rowsPerEntity: 5 }
        );

        expect(result.resources.Children).toEqual([{ ParentID: 1 }, { ParentID: 2 }]);
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({
                code: 'ROW_COUNT_REDUCED_UNSATISFIABLE_RELATIONSHIP_CONSTRAINTS',
                target: 'Children'
            })
        );
    });

    test('backtracks to unused shared foreign keys independently of relationship declaration order', () => {
        const constrained = graph([1, 2, 3], [2, 3, 4]);
        constrained.entities[2].properties = [property('SharedParentID', { isKey: true })];
        const targets = [
            { name: 'Lefts', kind: 'entity-set' as const },
            { name: 'Rights', kind: 'entity-set' as const },
            { name: 'Children', kind: 'entity-set' as const }
        ];

        const rowCounts = { rowsPerEntity: { Lefts: 3, Rights: 3, Children: 2 } };
        const forward = generateDeterministicResources(constrained, targets, rowCounts);
        const reversed = generateDeterministicResources(
            { ...constrained, relationships: [...constrained.relationships].reverse() },
            targets,
            rowCounts
        );

        expect(forward.resources.Children).toEqual([{ SharedParentID: 2 }, { SharedParentID: 3 }]);
        expect(reversed.resources.Children).toEqual(forward.resources.Children);
    });

    test('backtracks across independent relationship components to fill composite child keys', () => {
        const constrained: SchemaGraph = {
            namespace: 'review',
            entities: [
                {
                    name: 'Left',
                    entitySetName: 'Lefts',
                    properties: [property('ID', { enumValues: [1, 2] })]
                },
                {
                    name: 'Right',
                    entitySetName: 'Rights',
                    properties: [property('ID', { enumValues: [10, 20, 30, 40] })]
                },
                {
                    name: 'Child',
                    entitySetName: 'Children',
                    properties: [property('LeftID', { isKey: true }), property('RightID', { isKey: true })]
                }
            ],
            relationships: [
                {
                    name: 'Child_Left',
                    fromEntitySet: 'Children',
                    toEntitySet: 'Lefts',
                    mappings: [{ sourceProperty: 'LeftID', targetProperty: 'ID' }]
                },
                {
                    name: 'Child_Right',
                    fromEntitySet: 'Children',
                    toEntitySet: 'Rights',
                    mappings: [{ sourceProperty: 'RightID', targetProperty: 'ID' }]
                }
            ]
        };

        const result = generateDeterministicResources(
            constrained,
            [
                { name: 'Lefts', kind: 'entity-set' },
                { name: 'Rights', kind: 'entity-set' },
                { name: 'Children', kind: 'entity-set' }
            ],
            { rowsPerEntity: 5 }
        );

        expect(result.resources.Children).toHaveLength(5);
        expect(
            new Set(result.resources.Children.map((row) => `${String(row.LeftID)}:${String(row.RightID)}`)).size
        ).toBe(5);
    });

    test('propagates parent reductions to earlier dependants until the graph is stable', () => {
        const constrained: SchemaGraph = {
            namespace: 'review',
            entities: [
                { name: 'Missing', entitySetName: 'MissingParents', properties: [property('ID')] },
                { name: 'Parent', entitySetName: 'Parents', properties: [property('ID'), property('MissingID')] },
                { name: 'Child', entitySetName: 'Children', properties: [property('ID'), property('ParentID')] }
            ],
            relationships: [
                {
                    name: 'Child_Parent',
                    fromEntitySet: 'Children',
                    toEntitySet: 'Parents',
                    mappings: [{ sourceProperty: 'ParentID', targetProperty: 'ID' }]
                },
                {
                    name: 'Parent_Missing',
                    fromEntitySet: 'Parents',
                    toEntitySet: 'MissingParents',
                    mappings: [{ sourceProperty: 'MissingID', targetProperty: 'ID' }]
                }
            ]
        };

        const result = generateDeterministicResources(
            constrained,
            [
                { name: 'Parents', kind: 'entity-set' },
                { name: 'Children', kind: 'entity-set' }
            ],
            { rowsPerEntity: 3 }
        );

        expect(result.resources.Parents).toEqual([]);
        expect(result.resources.Children).toEqual([]);
    });

    test('bounds indexed shared-key search for disjoint 300-row parent domains', () => {
        const left = Array.from({ length: 300 }, (_unused, index) => index + 1);
        const right = Array.from({ length: 300 }, (_unused, index) => index + 301);
        const started = performance.now();

        const result = generateDeterministicResources(
            graph(left, right),
            [
                { name: 'Lefts', kind: 'entity-set' },
                { name: 'Rights', kind: 'entity-set' },
                { name: 'Children', kind: 'entity-set' }
            ],
            { rowsPerEntity: 300 }
        );

        expect(result.resources.Children).toEqual([]);
        expect(performance.now() - started).toBeLessThan(1_000);
    });
});
