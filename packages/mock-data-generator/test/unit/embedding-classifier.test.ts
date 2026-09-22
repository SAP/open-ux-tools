import {
    buildEmbeddingFieldText,
    createEmbeddingSemanticClassifier,
    quantizeLogit,
    FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
    serializeFieldContextV3,
    type EmbeddingClassifierHead,
    type TextEmbedder
} from '../../src/index.js';
import { SEMANTIC_ROLE_REGISTRY, SEMANTIC_ROLE_REGISTRY_FINGERPRINT } from '../../src/semantics/role-registry.js';

describe('pilot-compatible embedding classifier', () => {
    it('embeds uncached v3 field contexts in one ordered batch', async () => {
        const embed: jest.MockedFunction<TextEmbedder['embed']> = jest.fn(async () => [[1], [-1]]);
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
            registryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
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
        const classifier = createEmbeddingSemanticClassifier({
            fingerprint: 'classifier-head-and-encoder-sha256',
            embedder: { embed },
            head,
            serializeV3Input: serializeFieldContextV3,
            v3Roles: SEMANTIC_ROLE_REGISTRY,
            v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
            v3RegistryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT
        });
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

        expect(typeof classifier.classifyBatch).toBe('function');
        if (!classifier.classifyBatch) {
            return;
        }
        const inputs = [context('BankCountry'), context('CountryName')];
        const results = await classifier.classifyBatch(inputs, new AbortController().signal);

        expect(embed).toHaveBeenCalledTimes(1);
        expect(embed.mock.calls[0][0]).toHaveLength(2);
        expect(results).toHaveLength(2);
        expect(results[0].role).toBe('country');
        expect(results[1].top?.[0].role).toBe('unknown');
    });

    it('uses the exported FieldContextV3 serializer as the exact runtime input', async () => {
        const context = {
            inputFormat: 'v3',
            entityName: 'BankAddress',
            propertyName: 'CountryCode',
            primitiveType: 'string',
            nullable: false,
            isKey: false,
            facets: { maxLength: 3 },
            label: 'Country',
            description: 'ISO country code',
            annotations: [{ term: 'sap:semantics', value: 'country' }],
            dataElement: 'LAND1',
            linkedMetadataPaths: ['CountryName'],
            relationshipParticipation: [{ relationship: '_Bank', direction: 'source', property: 'BankCountry' }],
            neighbors: ['BankInternalID', 'CountryName']
        } as const;
        const serialized = serializeFieldContextV3(context);
        const embed: jest.MockedFunction<TextEmbedder['embed']> = jest.fn(async () => [[1]]);
        const head = {
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            dim: 1,
            labels: ['unknown', 'country'],
            coef: [[0], [1]],
            intercept: [0, 0],
            inputFormat: 'v3',
            maxWordPieceTokens: 64,
            encoderSha256: 'a'.repeat(64),
            tokenizerSha256: 'b'.repeat(64),
            serializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
            registryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
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
        const classifier = createEmbeddingSemanticClassifier({
            fingerprint: 'classifier-head-and-encoder-sha256',
            embedder: { embed },
            head,
            serializeV3Input: serializeFieldContextV3,
            v3Roles: SEMANTIC_ROLE_REGISTRY,
            v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
            v3RegistryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT
        });

        await classifier.classify(context, new AbortController().signal);

        expect(serialized).toBe(serializeFieldContextV3(context));
        expect(serialized).toMatch(/^Country Code \(string, required\) in Bank Address/u);
        expect(embed).toHaveBeenCalledWith([serialized], expect.any(AbortSignal));
    });

    it('rejects a v3 classifier label that has no registered provider and validator', () => {
        const head = {
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            dim: 1,
            labels: ['unknown', 'unsupported_finance_guess'],
            coef: [[0], [1]],
            intercept: [0, 0],
            inputFormat: 'v3',
            maxWordPieceTokens: 64,
            encoderSha256: 'a'.repeat(64),
            tokenizerSha256: 'b'.repeat(64),
            serializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
            registryFingerprint: 'b'.repeat(64),
            abstentionLabels: ['unknown'],
            roleCalibration: { unsupported_finance_guess: 0.9 },
            familyCalibration: { finance: 0.9 },
            calibration: {
                temperature: 1,
                routeConfidenceThreshold: 0.9,
                annotationOverrideThreshold: 0.95,
                conformalQuantile: 0.1,
                coverage: 0.9,
                ece: { before: 0.1, after: 0.05 },
                source: 'calibration-test'
            }
        } as unknown as EmbeddingClassifierHead;

        expect(() =>
            createEmbeddingSemanticClassifier({
                fingerprint: 'classifier-head-and-encoder-sha256',
                embedder: { embed: jest.fn() },
                head,
                serializeV3Input: serializeFieldContextV3,
                v3Roles: SEMANTIC_ROLE_REGISTRY,
                v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
                v3RegistryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT
            })
        ).toThrow('v3 classifier label unsupported_finance_guess is not registered');
    });

    it('rejects unresolved review decisions as v3 head classes', () => {
        const head: EmbeddingClassifierHead = {
            model: 'test',
            dim: 1,
            labels: ['unknown', 'REVIEW_ME'],
            coef: [[0], [1]],
            intercept: [0, 0],
            inputFormat: 'v3',
            maxWordPieceTokens: 64,
            encoderSha256: 'a'.repeat(64),
            tokenizerSha256: 'b'.repeat(64),
            serializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
            registryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
            abstentionLabels: ['unknown', 'REVIEW_ME'],
            roleCalibration: {},
            familyCalibration: {},
            calibration: {
                temperature: 1,
                routeConfidenceThreshold: 0.9,
                annotationOverrideThreshold: 0.95,
                conformalQuantile: 0.1,
                coverage: 0.9,
                ece: { before: 0.1, after: 0.05 },
                source: 'test'
            }
        };
        expect(() =>
            createEmbeddingSemanticClassifier({
                fingerprint: 'test',
                embedder: { embed: jest.fn() },
                head,
                serializeV3Input: serializeFieldContextV3,
                v3Roles: SEMANTIC_ROLE_REGISTRY,
                v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
                v3RegistryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT
            })
        ).toThrow('Unresolved review decision');
    });

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
