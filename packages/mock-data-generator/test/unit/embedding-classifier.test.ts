import { jest } from '@jest/globals';
import {
    createEmbeddingSemanticClassifier,
    quantizeLogit,
    type EmbeddingClassifierHead,
    type TextEmbedder
} from '../../src/model/embedding-classifier.js';
import { FIELD_CONTEXT_SERIALIZER_FINGERPRINT, serializeFieldContextV3 } from '../../src/semantics/field-context.js';
import { packagedRoleRegistry } from '../../src/semantics/role-registry.js';

describe('embedding classifier', () => {
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
        const classifier = createEmbeddingSemanticClassifier({
            fingerprint: 'classifier-head-and-encoder-sha256',
            embedder: { embed },
            head,
            serializeV3Input: serializeFieldContextV3,
            v3Roles: packagedRoleRegistry().roles,
            v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
            v3RegistryFingerprint: packagedRoleRegistry().fingerprint
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
        const classifier = createEmbeddingSemanticClassifier({
            fingerprint: 'classifier-head-and-encoder-sha256',
            embedder: { embed },
            head,
            serializeV3Input: serializeFieldContextV3,
            v3Roles: packagedRoleRegistry().roles,
            v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
            v3RegistryFingerprint: packagedRoleRegistry().fingerprint
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
                embedder: { embed: jest.fn<TextEmbedder['embed']>() },
                head,
                serializeV3Input: serializeFieldContextV3,
                v3Roles: packagedRoleRegistry().roles,
                v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
                v3RegistryFingerprint: packagedRoleRegistry().fingerprint
            })
        ).toThrow('v3 classifier label unsupported_finance_guess is not registered');
    });

    it('rejects a head trained on another input format', () => {
        const head = {
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            dim: 1,
            labels: ['unknown', 'country'],
            coef: [[0], [1]],
            intercept: [0, 0],
            inputFormat: 'v2'
        } as unknown as EmbeddingClassifierHead;

        expect(() =>
            createEmbeddingSemanticClassifier({
                fingerprint: 'classifier-head-and-encoder-sha256',
                embedder: { embed: jest.fn<TextEmbedder['embed']>() },
                head
            })
        ).toThrow('Unsupported embedding classifier input format');
    });

    it('quantizes logits to three decimals', () => {
        expect(quantizeLogit(1.23456)).toBe(1.235);
    });

    it('caches the classification of identical field text', async () => {
        const embed: jest.MockedFunction<TextEmbedder['embed']> = jest.fn(async () => [[1]]);
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
            roleCalibration: { country: 0.2 },
            familyCalibration: { location: 0.2 },
            calibration: {
                temperature: 1,
                routeConfidenceThreshold: 0.2,
                annotationOverrideThreshold: 0.4,
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
            v3Roles: packagedRoleRegistry().roles,
            v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
            v3RegistryFingerprint: packagedRoleRegistry().fingerprint
        });
        const input = {
            inputFormat: 'v3',
            entityName: 'Address',
            propertyName: 'OpaqueRegion',
            primitiveType: 'string',
            nullable: false,
            isKey: false,
            facets: {},
            annotations: [],
            linkedMetadataPaths: [],
            relationshipParticipation: [],
            neighbors: []
        } as const;
        const signal = new AbortController().signal;

        const first = await classifier.classify(input, signal);
        const second = await classifier.classify(input, signal);

        expect(first).toEqual(second);
        expect(first.role).toBe('country');
        expect(first.source).toBe('classifier');
        expect(first.routeThreshold).toBe(0.2);
        expect(embed).toHaveBeenCalledTimes(1);
    });
});
