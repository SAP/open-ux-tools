import {
    buildEmbeddingFieldText,
    createEmbeddingSemanticClassifier,
    quantizeLogit,
    type EmbeddingClassifierHead,
    type TextEmbedder
} from '../../src/index.js';

describe('pilot-compatible embedding classifier', () => {
    it('preserves the trained v2 input contract and three-decimal logit quantization', () => {
        expect(
            buildEmbeddingFieldText({
                propertyName: 'CountryCode',
                entityName: 'BankAddresses',
                label: 'Country',
                annotations: 'sap:semantics=currency-code'
            })
        ).toBe('Country Code (Country) field of a BankAddresse (related: ) [annotations: sap:semantics=currency-code]');
        expect(quantizeLogit(1.23456)).toBe(1.235);
    });

    it('applies the calibrated logistic head, excludes abstain labels, and caches identical field text', async () => {
        const embed: jest.MockedFunction<TextEmbedder['embed']> = jest.fn(async () => [[1, 0]]);
        const head: EmbeddingClassifierHead = {
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            dim: 2,
            labels: ['unknown', 'person_first_name', 'person_last_name'],
            coef: [
                [4, 0],
                [3, 0],
                [0, 2]
            ],
            intercept: [0, 0, 0],
            inputFormat: 'v2',
            calibration: {
                temperature: 1,
                routeConfidenceThreshold: 0.2,
                annotationOverrideThreshold: 0.4,
                conformalQuantile: 0.1,
                coverage: 0.9,
                ece: { before: 0.1, after: 0.05 },
                source: 'calibration-test'
            }
        };
        const classifier = createEmbeddingSemanticClassifier({
            fingerprint: 'classifier-head-and-encoder-sha256',
            embedder: { embed },
            head
        });
        const input = {
            entityName: 'Contact',
            propertyName: 'OpaqueGiven',
            primitiveType: 'string',
            annotations: []
        } as const;
        const signal = new AbortController().signal;

        const first = await classifier.classify(input, signal);
        const second = await classifier.classify(input, signal);

        expect(first).toEqual(second);
        expect(first.role).toBe('person_first_name');
        expect(first.source).toBe('classifier');
        expect(first.routeThreshold).toBe(0.2);
        expect(first.top?.[0].role).toBe('unknown');
        expect(embed).toHaveBeenCalledTimes(1);
    });
});
