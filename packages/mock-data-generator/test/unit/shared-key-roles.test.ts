import { generateDeterministicResources } from '../../src/generation/deterministic.js';
import type { SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';
import type { SemanticClassification } from '../../src/types.js';

const property = (name: string, options: Partial<SchemaProperty> = {}): SchemaProperty => ({
    name,
    primitiveType: 'string',
    nullable: false,
    isKey: false,
    maxLength: 10,
    annotations: [],
    ...options
});

/**
 * Two parents keyed by a code and a child whose reference points to the key of both, so both keys are
 * generated from one shared domain.
 *
 * @returns the graph
 */
function sharedKeyGraph(): SchemaGraph {
    return {
        namespace: 'shared',
        entities: [
            { name: 'Va', entitySetName: 'Vas', properties: [property('Vk', { isKey: true })] },
            { name: 'Vb', entitySetName: 'Vbs', properties: [property('Vk', { isKey: true })] },
            {
                name: 'Vc',
                entitySetName: 'Vcs',
                properties: [
                    property('Vi', { isKey: true, primitiveType: 'int', maxLength: undefined }),
                    property('Vr')
                ]
            }
        ],
        relationships: [
            {
                name: 'toVa',
                fromEntitySet: 'Vcs',
                toEntitySet: 'Vas',
                mappings: [{ sourceProperty: 'Vr', targetProperty: 'Vk' }],
                provenance: 'explicit',
                confidence: 1
            },
            {
                name: 'toVb',
                fromEntitySet: 'Vcs',
                toEntitySet: 'Vbs',
                mappings: [{ sourceProperty: 'Vr', targetProperty: 'Vk' }],
                provenance: 'explicit',
                confidence: 1
            }
        ]
    };
}

const routed: SemanticClassification = { role: 'business_identifier', source: 'classifier', confidence: 0.99 };

test.each([['Vas.Vk'], ['Vbs.Vk']])(
    'generates the keys of a shared domain with one role when only %s is routed to it',
    (routedKey) => {
        // Given two keys a reference points to, only one of them routed to a role
        const classifications = new Map([[routedKey, routed]]);

        // When the rows are generated
        const { resources } = generateDeterministicResources(
            sharedKeyGraph(),
            ['Vas', 'Vbs', 'Vcs'].map((name) => ({ name, kind: 'entity-set' as const })),
            { rowsPerEntity: 10, seed: 1 },
            classifications
        );

        // Then both keys hold the same values, so every child references a row of each parent
        const values = (set: string): string[] => resources[set].map((row) => String(row.Vk)).sort();
        expect(values('Vas')).toEqual(values('Vbs'));
        expect(resources.Vcs).toHaveLength(10);
    }
);
