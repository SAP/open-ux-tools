import { conceptValueBank, parseConceptHead, parseValueBankStore } from '../../training/common/runtime.mjs';
import {
    buildConceptHead,
    conceptCatalogue,
    conceptPrototype,
    percentile,
    replaceConceptBanks
} from '../../training/concept-head/concept-head.mjs';

const contract = {
    dim: 2,
    encoderSha256: 'a'.repeat(64),
    tokenizerSha256: 'b'.repeat(64),
    serializerFingerprint: 'fingerprint'
};
const records = [
    { id: 'order-type', name: 'order type', value_kind: 'code', types: ['string'], bank_values: ['A', 'B', 'A', ''] },
    {
        id: 'country-text',
        name: 'country text',
        value_kind: 'code-text',
        types: ['string'],
        bank_pairs: [{ code: 'DE', text: 'Germany', extra: 1 }]
    },
    {
        id: 'net-amount',
        name: 'net amount',
        value_kind: 'decimal',
        types: ['decimal'],
        bank_range: { min: 1, max: 9, scale: 2 }
    }
];

describe('conceptCatalogue', () => {
    test('takes the bank that matches each value kind', () => {
        // Given a string, a code-text and a numeric concept
        const catalogue = conceptCatalogue(records);
        // Then values are distinct and non-empty, pairs are trimmed to code/text, ranges are kept
        expect(catalogue[0]).toEqual({
            id: 'order-type',
            name: 'order type',
            valueKind: 'code',
            types: ['string'],
            values: ['A', 'B']
        });
        expect(catalogue[1].pairs).toEqual([{ code: 'DE', text: 'Germany' }]);
        expect(catalogue[2].range).toEqual({ min: 1, max: 9, scale: 2 });
    });

    test('refuses concepts without a usable bank', () => {
        // Given an empty string bank and an inverted range, then the build refuses and names both
        const broken = [
            { ...records[0], bank_values: [] },
            { ...records[2], bank_range: { min: 9, max: 1, scale: 0 } }
        ];
        expect(() => conceptCatalogue(broken)).toThrow(
            /2 concepts have no usable bank: order-type \(code\); net-amount/u
        );
    });
});

describe('concept prototypes', () => {
    test('percentile interpolates linearly between ranks', () => {
        // Given four values, then p25 sits a quarter of the way into the second gap
        expect(percentile([4, 1, 3, 2], 0.25)).toBeCloseTo(1.75);
        expect(percentile([4, 1, 3, 2], 0.5)).toBeCloseTo(2.5);
    });

    test('the prototype is the normalised mean of unit vectors with p25 as minimum similarity', () => {
        // Given two orthogonal example vectors of different length
        const built = conceptPrototype([
            [2, 0],
            [0, 1]
        ]);
        // Then the prototype bisects them and every example has similarity cos 45 degrees
        expect(built.prototype[0]).toBeCloseTo(Math.SQRT1_2);
        expect(built.prototype[1]).toBeCloseTo(Math.SQRT1_2);
        expect(built.minimumSimilarity).toBeCloseTo(Math.SQRT1_2);
        expect(built.cohesion).toEqual({ p10: 0.7071, p25: 0.7071, p50: 0.7071, examples: 2 });
    });
});

describe('buildConceptHead', () => {
    const texts = (prefix, count) => Array.from({ length: count }, (_, index) => `${prefix}-${index}`);
    const embed = async (batch) => batch.map((text) => (text.startsWith('order') ? [1, 0.1] : [0.1, 1]));

    test('builds a version 2 head the runtime parses against the rebuilt store', async () => {
        // Given two concepts with enough distinct examples and one with too few
        const catalogue = conceptCatalogue(records);
        const textsByConcept = new Map([
            ['order-type', [...texts('order', 6), 'order-0']],
            ['country-text', texts('country', 7)],
            ['net-amount', texts('net', 4)]
        ]);
        // When the head is built and the store's concept banks are replaced
        const { head, banks, tooFewExamples } = await buildConceptHead({
            catalogue,
            textsByConcept,
            embed,
            contract,
            thresholds: { similarity: 0.75, margin: 0.02 },
            maxExamples: 100
        });
        const store = replaceConceptBanks(
            {
                format: 'mockgen-value-banks',
                version: 2,
                sampleDataset: { id: 'samples', version: '1' },
                banks: {
                    'concept:stale': {
                        kind: 'concept',
                        id: 'stale',
                        name: 'stale',
                        valueKind: 'code',
                        types: ['string'],
                        values: ['X']
                    },
                    'role:currencies': { kind: 'role', id: 'currencies', valueKind: 'code', values: ['EUR'] }
                }
            },
            banks
        );
        // Then the head keeps the shipped key order, skips the thin concept and parses at runtime
        expect(Object.keys(head)).toEqual([
            'format',
            'version',
            'dim',
            'encoderSha256',
            'tokenizerSha256',
            'serializerFingerprint',
            'thresholds',
            'prototypes',
            'concepts'
        ]);
        expect(head.concepts.map((concept) => concept.id)).toEqual(['order-type', 'country-text']);
        expect(head.concepts[0].cohesion.examples).toBe(6);
        expect(tooFewExamples).toEqual(['net-amount']);
        expect(Object.keys(store.banks)).toEqual(['role:currencies', 'concept:order-type', 'concept:country-text']);
        const parsedStore = parseValueBankStore(store);
        const parsed = parseConceptHead(head, contract, (id) => conceptValueBank(parsedStore, id));
        expect(parsed.concepts).toHaveLength(2);
        expect(parsed.prototypes).toHaveLength(4);
    });
});
