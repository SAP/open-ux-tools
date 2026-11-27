import { applySftGeneration } from '../../src/generation/sft.js';
import type { SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';
import { semanticPropertyKey } from '../../src/semantics/classifier.js';
import type { MockDataRow, SftGenerator } from '../../src/types.js';

const property = (name: string, extra: Partial<SchemaProperty> = {}): SchemaProperty => ({
    name,
    primitiveType: 'string',
    nullable: !extra.isKey,
    isKey: false,
    annotations: [],
    ...extra
});

const graph: SchemaGraph = {
    namespace: 'Demo',
    entities: [
        {
            name: 'Order',
            entitySetName: 'Orders',
            properties: [
                property('ID', { isKey: true }),
                property('Stage', { links: { text: 'StageText' } }),
                property('StageText')
            ]
        }
    ],
    relationships: []
};

/**
 * The order rows the earlier tiers wrote: two rows per stage, with no stage text yet.
 * @returns the rows by entity set
 */
const resources = (): Record<string, MockDataRow[]> => ({
    Orders: [
        { ID: 'O1', Stage: 'A', StageText: null },
        { ID: 'O2', Stage: 'A', StageText: null },
        { ID: 'O3', Stage: 'B', StageText: null },
        { ID: 'O4', Stage: 'B', StageText: null }
    ]
});

/**
 * Run the fine-tuned tier with a model that writes the given stage texts, one per row.
 * @param texts the model's stage texts in row order
 * @returns the stage and stage text of each row
 */
async function stageTexts(texts: ReadonlyArray<string>): Promise<string[]> {
    const sft: SftGenerator = {
        fingerprint: 'stage-texts',
        generate: async () => ({ rows: texts.map((StageText) => ({ StageText })) })
    };
    const result = await applySftGeneration({
        graph,
        resources: resources(),
        service: { urlPath: '/demo', odataVersion: '4.0' },
        options: { seed: 1 },
        classifications: new Map([
            [
                semanticPropertyKey('Orders', 'Stage'),
                { role: 'status_code', confidence: 1, source: 'metadata' as const }
            ]
        ]),
        sft,
        signal: new AbortController().signal,
        candidateVerifier: { fingerprint: 'accept-all', verifyBatch: async (pairs) => pairs.map(() => true) }
    });
    return result.resources.Orders.map((row) => `${String(row.Stage)}:${String(row.StageText)}`);
}

describe('one text per code from the fine-tuned tier', () => {
    it('keeps the accepted text of a code when an earlier row of that code has none', async () => {
        // Given a model whose text for the first row of each stage only repeats the code, and is rejected
        // When the stage texts are written
        const texts = await stageTexts(['A', 'Awaiting approval', 'B', 'Being shipped']);

        // Then every row of a stage carries that stage's accepted text
        expect(texts).toEqual(['A:Awaiting approval', 'A:Awaiting approval', 'B:Being shipped', 'B:Being shipped']);
    });

    it('keeps the text of the first row of a code when it is accepted', async () => {
        // Given the same texts with the accepted one first
        // When the stage texts are written
        const texts = await stageTexts(['Awaiting approval', 'A', 'Being shipped', 'B']);

        // Then every row of a stage carries that text
        expect(texts).toEqual(['A:Awaiting approval', 'A:Awaiting approval', 'B:Being shipped', 'B:Being shipped']);
    });
});
