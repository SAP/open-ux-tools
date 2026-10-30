import { jest } from '@jest/globals';
import { rememberLatest } from '../../src/model/bounded-entries.js';
import {
    createEmbeddingSemanticClassifier,
    type EmbeddingClassifierHead,
    type TextEmbedder
} from '../../src/model/embedding-classifier.js';
import { CLASSIFIER_CACHE_ENTRIES } from '../../src/limits.js';
import { FIELD_CONTEXT_SERIALIZER_FINGERPRINT, serializeFieldContextV3 } from '../../src/semantics/field-context.js';
import { packagedRoleRegistry } from '../../src/semantics/role-registry.js';

const head = {
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    dim: 1,
    labels: ['unknown', 'country'],
    coef: [[-1], [1]],
    intercept: [0, 0],
    inputFormat: 'v3',
    maxWordPieceTokens: 64,
    encoderSha256: 'a'.repeat(64),
    tokenizerSha256: 'b'.repeat(64),
    serializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
    registryFingerprint: packagedRoleRegistry().fingerprint,
    abstentionLabels: ['unknown'],
    roleCalibration: { country: 0.9 },
    familyCalibration: { location: 0.9 },
    calibration: {
        temperature: 1,
        routeConfidenceThreshold: 0.9,
        annotationOverrideThreshold: 0.95,
        conformalQuantile: 0.1,
        coverage: 0.9,
        ece: { before: 0.1, after: 0.05 },
        source: 'calibration-test'
    }
} as const satisfies EmbeddingClassifierHead;

const context = (propertyName: string) =>
    ({
        inputFormat: 'v3',
        entityName: 'Bank',
        propertyName,
        primitiveType: 'string',
        nullable: false,
        isKey: false,
        facets: {},
        annotations: [],
        linkedMetadataPaths: [],
        relationshipParticipation: [],
        neighbors: []
    }) as const;

describe('bounded caches', () => {
    it('keeps the most recently remembered entries of any value type', () => {
        // Given a cache bounded to two entries
        const entries = new Map<string, ReadonlyArray<number>>();
        // When three entries are remembered and the first is remembered again
        rememberLatest(entries, 'a', [1], 2);
        rememberLatest(entries, 'b', [2], 2);
        rememberLatest(entries, 'c', [3], 2);
        rememberLatest(entries, 'b', [4], 2);
        // Then the oldest entry was dropped and a re-remembered entry becomes the newest
        expect([...entries]).toEqual([
            ['c', [3]],
            ['b', [4]]
        ]);
    });

    it('classifies a batch larger than the classifier cache and re-embeds only evicted fields', async () => {
        // Given a classifier whose embedder returns one vector per text
        const embed: jest.MockedFunction<TextEmbedder['embed']> = jest.fn(async (texts) => texts.map(() => [1]));
        const classifier = createEmbeddingSemanticClassifier({
            fingerprint: 'classifier-head-and-encoder-sha256',
            embedder: { embed },
            head,
            serializeV3Input: serializeFieldContextV3,
            v3Roles: packagedRoleRegistry().roles,
            v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
            v3RegistryFingerprint: packagedRoleRegistry().fingerprint
        });
        const classifyBatch = classifier.classifyBatch;
        if (!classifyBatch) {
            throw new Error('the embedding classifier classifies batches');
        }
        const signal = new AbortController().signal;
        const inputs = Array.from({ length: CLASSIFIER_CACHE_ENTRIES + 1 }, (_, index) => context(`Field${index}`));
        // When one batch holds one field more than the cache, and then the first and last fields are classified again
        const results = await classifyBatch(inputs, signal);
        const last = await classifyBatch([inputs[inputs.length - 1]], signal);
        const first = await classifyBatch([inputs[0]], signal);
        // Then the large batch is complete, the last field is served from the cache and the evicted first is re-embedded
        expect(results).toHaveLength(inputs.length);
        expect(last).toEqual([results[results.length - 1]]);
        expect(first).toEqual([results[0]]);
        expect(embed).toHaveBeenCalledTimes(2);
        expect(embed.mock.calls[1][0]).toHaveLength(1);
    });

    it('keeps the field texts of a session that classifies many services', async () => {
        // Given a classifier and the distinct field texts of 200 services classified in one session (measured: 50,104)
        const embed: jest.MockedFunction<TextEmbedder['embed']> = jest.fn(async (texts) => texts.map(() => [1]));
        const classifier = createEmbeddingSemanticClassifier({
            fingerprint: 'classifier-head-and-encoder-sha256',
            embedder: { embed },
            head,
            serializeV3Input: serializeFieldContextV3,
            v3Roles: packagedRoleRegistry().roles,
            v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
            v3RegistryFingerprint: packagedRoleRegistry().fingerprint
        });
        const classifyBatch = classifier.classifyBatch;
        if (!classifyBatch) {
            throw new Error('the embedding classifier classifies batches');
        }
        const signal = new AbortController().signal;
        const inputs = Array.from({ length: 50_104 }, (_, index) => context(`Field${index}`));
        // When they are classified service by service and the first field is classified again
        for (let start = 0; start < inputs.length; start += 250) {
            await classifyBatch(inputs.slice(start, start + 250), signal);
        }
        embed.mockClear();
        await classifyBatch([inputs[0]], signal);
        // Then the first field is served from the cache instead of being embedded again
        expect(embed).not.toHaveBeenCalled();
    });
});
