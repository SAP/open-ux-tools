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

const stringProperty = (name: string, options: Partial<SchemaProperty> = {}): SchemaProperty => ({
    name,
    primitiveType: 'string',
    nullable: false,
    isKey: false,
    maxLength: 4,
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

    test('keeps generated string key domains distinct for unrelated entity sets', () => {
        const unrelated: SchemaGraph = {
            namespace: 'review',
            entities: [
                {
                    name: 'A',
                    entitySetName: 'As',
                    properties: [stringProperty('ID', { isKey: true, maxLength: 8 })]
                },
                {
                    name: 'B',
                    entitySetName: 'Bs',
                    properties: [stringProperty('ID', { isKey: true, maxLength: 8 })]
                }
            ],
            relationships: []
        };

        const result = generateDeterministicResources(
            unrelated,
            [
                { name: 'As', kind: 'entity-set' },
                { name: 'Bs', kind: 'entity-set' }
            ],
            { rowsPerEntity: 2, seed: 31 }
        );

        expect(result.resources.As).not.toEqual(result.resources.Bs);
    });

    test('aligns generated string key domains with different compatible lengths across related entity sets', () => {
        const constrained: SchemaGraph = {
            namespace: 'review',
            entities: [
                {
                    name: 'ParentA',
                    entitySetName: 'ParentsA',
                    properties: [stringProperty('SharedCode', { isKey: true })]
                },
                {
                    name: 'ParentB',
                    entitySetName: 'ParentsB',
                    properties: [stringProperty('SharedCode', { isKey: true, maxLength: 3 })]
                },
                {
                    name: 'Child',
                    entitySetName: 'Children',
                    properties: [property('ID'), stringProperty('SharedCode', { maxLength: 2 })]
                }
            ],
            relationships: [
                {
                    name: 'Child_ParentA',
                    fromEntitySet: 'Children',
                    toEntitySet: 'ParentsA',
                    mappings: [{ sourceProperty: 'SharedCode', targetProperty: 'SharedCode' }]
                },
                {
                    name: 'Child_ParentB',
                    fromEntitySet: 'Children',
                    toEntitySet: 'ParentsB',
                    mappings: [{ sourceProperty: 'SharedCode', targetProperty: 'SharedCode' }]
                }
            ]
        };

        const result = generateDeterministicResources(
            constrained,
            [
                { name: 'ParentsA', kind: 'entity-set' },
                { name: 'ParentsB', kind: 'entity-set' },
                { name: 'Children', kind: 'entity-set' }
            ],
            { rowsPerEntity: 2, seed: 31 }
        );

        expect(result.resources.Children).toHaveLength(2);
        expect(result.resources.ParentsA).toEqual(result.resources.ParentsB);
        expect(result.resources.ParentsA.every(({ SharedCode }) => String(SharedCode).length <= 2)).toBe(true);
    });

    test('aligns generated composite key domains independently of property declaration order', () => {
        const constrained: SchemaGraph = {
            namespace: 'review',
            entities: [
                {
                    name: 'ParentA',
                    entitySetName: 'ParentsA',
                    properties: [
                        stringProperty('SharedCode', { isKey: true }),
                        property('Flag', { isKey: true, primitiveType: 'bool' })
                    ]
                },
                {
                    name: 'ParentB',
                    entitySetName: 'ParentsB',
                    properties: [
                        property('Flag', { isKey: true, primitiveType: 'bool' }),
                        stringProperty('SharedCode', { isKey: true })
                    ]
                },
                {
                    name: 'Child',
                    entitySetName: 'Children',
                    properties: [
                        stringProperty('SharedCode', { isKey: true }),
                        property('Flag', { isKey: true, primitiveType: 'bool' })
                    ]
                }
            ],
            relationships: [
                {
                    name: 'Child_ParentA',
                    fromEntitySet: 'Children',
                    toEntitySet: 'ParentsA',
                    mappings: [
                        { sourceProperty: 'SharedCode', targetProperty: 'SharedCode' },
                        { sourceProperty: 'Flag', targetProperty: 'Flag' }
                    ]
                },
                {
                    name: 'Child_ParentB',
                    fromEntitySet: 'Children',
                    toEntitySet: 'ParentsB',
                    mappings: [
                        { sourceProperty: 'SharedCode', targetProperty: 'SharedCode' },
                        { sourceProperty: 'Flag', targetProperty: 'Flag' }
                    ]
                }
            ]
        };

        const result = generateDeterministicResources(
            constrained,
            [
                { name: 'ParentsA', kind: 'entity-set' },
                { name: 'ParentsB', kind: 'entity-set' },
                { name: 'Children', kind: 'entity-set' }
            ],
            { rowsPerEntity: 2, seed: 31 }
        );

        expect(result.resources.Children).toHaveLength(2);
        expect(result.resources.ParentsA.map(({ SharedCode, Flag }) => [SharedCode, Flag])).toEqual(
            result.resources.ParentsB.map(({ SharedCode, Flag }) => [SharedCode, Flag])
        );
    });

    test('aligns shared key domains transitively through generated source keys', () => {
        const entity = (name: string): SchemaGraph['entities'][number] => ({
            name,
            entitySetName: name,
            properties: [stringProperty('K', { isKey: true })]
        });
        const relationship = (from: string, to: string): SchemaGraph['relationships'][number] => ({
            name: `${from}_${to}`,
            fromEntitySet: from,
            toEntitySet: to,
            mappings: [{ sourceProperty: 'K', targetProperty: 'K' }]
        });
        const constrained: SchemaGraph = {
            namespace: 'review',
            entities: ['A', 'B', 'C', 'D', 'E'].map(entity),
            relationships: [
                relationship('C', 'A'),
                relationship('C', 'B'),
                relationship('D', 'C'),
                relationship('D', 'E')
            ]
        };

        const result = generateDeterministicResources(
            constrained,
            ['A', 'B', 'C', 'D', 'E'].map((name) => ({ name, kind: 'entity-set' })),
            { rowsPerEntity: 2, seed: 31 }
        );

        expect(result.resources.D).toHaveLength(2);
        expect(result.diagnostics).not.toContainEqual(
            expect.objectContaining({ code: 'ROW_COUNT_REDUCED_UNSATISFIABLE_RELATIONSHIP_CONSTRAINTS' })
        );
    });

    test('aligns compatible decimal key domains across precision and scale variants', () => {
        const decimalProperty = (name: string, precision: number, scale: number): SchemaProperty => ({
            name,
            primitiveType: 'decimal',
            nullable: false,
            isKey: true,
            precision,
            scale,
            annotations: []
        });
        const constrained: SchemaGraph = {
            namespace: 'review',
            entities: [
                {
                    name: 'ParentA',
                    entitySetName: 'ParentsA',
                    properties: [decimalProperty('AmountKey', 5, 2)]
                },
                {
                    name: 'ParentB',
                    entitySetName: 'ParentsB',
                    properties: [decimalProperty('AmountKey', 5, 1)]
                },
                {
                    name: 'Child',
                    entitySetName: 'Children',
                    properties: [decimalProperty('AmountKey', 5, 1)]
                }
            ],
            relationships: [
                {
                    name: 'Child_ParentA',
                    fromEntitySet: 'Children',
                    toEntitySet: 'ParentsA',
                    mappings: [{ sourceProperty: 'AmountKey', targetProperty: 'AmountKey' }]
                },
                {
                    name: 'Child_ParentB',
                    fromEntitySet: 'Children',
                    toEntitySet: 'ParentsB',
                    mappings: [{ sourceProperty: 'AmountKey', targetProperty: 'AmountKey' }]
                }
            ]
        };

        const result = generateDeterministicResources(
            constrained,
            [
                { name: 'ParentsA', kind: 'entity-set' },
                { name: 'ParentsB', kind: 'entity-set' },
                { name: 'Children', kind: 'entity-set' }
            ],
            { rowsPerEntity: 3, seed: 31 }
        );

        expect(result.resources.Children).toHaveLength(3);
        expect(result.resources.ParentsA).toEqual(result.resources.ParentsB);
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
