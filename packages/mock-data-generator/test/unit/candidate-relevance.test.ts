import {
    assertCandidateRelevanceHead,
    createEmbeddingCandidateRelevanceVerifier,
    FIELD_VALUE_RELEVANCE_SERIALIZER_FINGERPRINT,
    serializeCandidateRelevancePair,
    type CandidateRelevanceHead
} from '../../src/model/candidate-relevance.js';
import type { SftCandidateRelevancePair } from '../../src/types.js';

const encoderSha256 = 'a'.repeat(64);
const vocabularySha256 = 'b'.repeat(64);

function head(): CandidateRelevanceHead {
    return {
        model: 'field-value-relevance-v1',
        dim: 2,
        coef: [1, -1],
        intercept: 0,
        temperature: 1,
        threshold: 0.7,
        maxWordPieceTokens: 64,
        encoderSha256,
        tokenizerSha256: vocabularySha256,
        serializerFingerprint: FIELD_VALUE_RELEVANCE_SERIALIZER_FINGERPRINT,
        qualification: { status: 'qualified' }
    };
}

function pair(value: string): SftCandidateRelevancePair {
    return {
        service: { urlPath: '/service', odataVersion: '4.0' },
        resource: 'ActionCodes',
        entity: 'ActionCode',
        field: {
            name: 'Meaning',
            label: 'Action meaning',
            description: 'The meaning of the action code',
            primitiveType: 'string',
            isKey: false,
            nullable: false,
            referencedBy: ['Tasks.ActionCode']
        },
        value,
        linkedCode: { property: 'Code', value: 'A' },
        textLink: { codeProperty: 'Code', textProperty: 'Meaning' },
        relatedResources: ['Tasks']
    };
}

describe('field-to-value relevance head', () => {
    test('rejects unqualified, mismatched and malformed heads before inference', () => {
        const contract = { encoderSha256, vocabularySha256, embeddingDimension: 2 };
        expect(() => assertCandidateRelevanceHead(head(), contract)).not.toThrow();
        expect(() =>
            assertCandidateRelevanceHead({ ...head(), qualification: { status: 'unqualified' } }, contract)
        ).toThrow(/qualified/);
        expect(() => assertCandidateRelevanceHead(head(), { ...contract, encoderSha256: 'c'.repeat(64) })).toThrow(
            /fingerprint/
        );
        expect(() => assertCandidateRelevanceHead({ ...head(), coef: [1] }, contract)).toThrow(/dimension/);
        expect(() =>
            assertCandidateRelevanceHead({ ...head(), serializerFingerprint: 'c'.repeat(64) }, contract)
        ).toThrow(/serializer/);
    });

    test('serializes field and candidate identity ahead of optional context', () => {
        const serialized = serializeCandidateRelevancePair(pair('A valid action'));
        expect(serialized).toContain('Meaning');
        expect(serialized).toContain('A valid action');
        expect(serialized.indexOf('A valid action')).toBeLessThan(serialized.indexOf('Tasks.ActionCode'));
    });

    test('batches decisions using the separately calibrated head', async () => {
        const embed = jest.fn(async () => [
            [1, 0],
            [0, 1]
        ]);
        const verifier = createEmbeddingCandidateRelevanceVerifier({
            head: head(),
            embedder: { embed },
            fingerprint: 'relevance-head-sha',
            encoderSha256,
            vocabularySha256,
            embeddingDimension: 2
        });
        expect(
            await verifier.verifyBatch([pair('A valid action'), pair('Off-topic text')], new AbortController().signal)
        ).toEqual([true, false]);
        expect(embed).toHaveBeenCalledTimes(1);
        expect(verifier.fingerprint).toBe('relevance-head-sha');
    });

    test('propagates cancellation and rejects invalid encoder output', async () => {
        const controller = new AbortController();
        controller.abort(new Error('cancelled'));
        const verifier = createEmbeddingCandidateRelevanceVerifier({
            head: head(),
            embedder: { embed: jest.fn(async () => [[0, 0]]) },
            fingerprint: 'relevance-head-sha',
            encoderSha256,
            vocabularySha256,
            embeddingDimension: 2
        });
        await expect(verifier.verifyBatch([pair('Value')], controller.signal)).rejects.toThrow('cancelled');
        const malformed = createEmbeddingCandidateRelevanceVerifier({
            head: head(),
            embedder: { embed: jest.fn(async () => [[Number.NaN, 0]]) },
            fingerprint: 'relevance-head-sha',
            encoderSha256,
            vocabularySha256,
            embeddingDimension: 2
        });
        await expect(malformed.verifyBatch([pair('Value')], new AbortController().signal)).rejects.toThrow(/vector/);
    });
});
