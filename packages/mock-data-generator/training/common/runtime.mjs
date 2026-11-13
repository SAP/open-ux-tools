/**
 * The built runtime of this package, the single boundary between the training tools and the generator.
 * Serializer, tokenizer, encoder, role registry and head checks are the runtime's own, so a trained
 * head cannot drift from what the package loads. Build first: `pnpm --filter @sap-ux/mock-data-generator build`.
 */
import * as bankStore from '../../dist/semantics/bank-store.js';
import * as classifier from '../../dist/semantics/classifier.js';
import * as fieldContext from '../../dist/semantics/field-context.js';
import * as lexicalFallback from '../../dist/semantics/lexical-fallback.js';
import * as roleRegistry from '../../dist/semantics/role-registry.js';
import * as edmx from '../../dist/schema/edmx.js';
import * as candidateRelevance from '../../dist/model/candidate-relevance.js';
import * as conceptHead from '../../dist/model/concept-head.js';
import * as embeddingClassifier from '../../dist/model/embedding-classifier.js';
import * as tokenizer from '../../dist/model/minilm-tokenizer.js';
import * as minilm from '../../dist/model/minilm-runtime.js';
import * as packagedModels from '../../dist/model/packaged-models.js';

export const { FIELD_CONTEXT_SERIALIZER_FINGERPRINT, createFieldContextV3, serializeFieldContextV3 } = fieldContext;
export const { routedRoleCompatibility } = roleRegistry;
export const { classifySchema, semanticPropertyKey } = classifier;
export const { arbitrateSemanticClassifications } = lexicalFallback;
export const { parseEdmx } = edmx;
export const { createMiniLmTokenizer } = tokenizer;
export const { assertEmbeddingHead, createEmbeddingSemanticClassifier } = embeddingClassifier;
export const { assertPackagedClassifierHead, assertReleaseClassifier, assertReleaseRelevanceHead } = packagedModels;
export const {
    FIELD_VALUE_RELEVANCE_SERIALIZER_FINGERPRINT,
    assertCandidateRelevanceHead,
    serializeCandidateRelevancePair
} = candidateRelevance;
export const { parseConceptHead } = conceptHead;
export const { conceptValueBank, parseValueBankStore } = bankStore;

/**
 * The packaged role registry: role definitions by name and the fingerprint the role head pins.
 * @returns {{ roles: Readonly<Record<string, { family: string }>>, fingerprint: string }} the registry
 */
export function roleRegistryContract() {
    const { roles, fingerprint } = roleRegistry.packagedRoleRegistry();
    return { roles, fingerprint };
}

/**
 * The v3 options `createEmbeddingSemanticClassifier` and `assertEmbeddingHead` take, from the packaged runtime.
 * @returns {object} serializer, roles and fingerprints
 */
export function v3ClassifierContract() {
    const { roles, fingerprint } = roleRegistryContract();
    return {
        serializeV3Input: serializeFieldContextV3,
        v3Roles: roles,
        v3RegistryFingerprint: fingerprint,
        v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT
    };
}

/**
 * Open the MiniLM sentence encoder on the native ONNX runtime, verifying both artifact digests first.
 * @param {object} options encoder options
 * @param {string} options.encoder encoder ONNX path
 * @param {string} options.vocabulary WordPiece vocabulary path
 * @param {string} [options.encoderSha256] expected encoder digest
 * @param {string} [options.vocabularySha256] expected vocabulary digest
 * @param {number} [options.hiddenSize] embedding dimension
 * @returns {Promise<{ embed: (texts: string[], signal: object) => Promise<number[][]>, dispose: () => Promise<void> }>} the embedder
 */
export async function openEncoder({ encoder, vocabulary, encoderSha256, vocabularySha256, hiddenSize = 384 }) {
    const backend = minilm.createOnnxBackend(await import('onnxruntime-node'), 'training');
    return minilm.createMiniLmTextEmbedder({
        modelPath: encoder,
        vocabularyPath: vocabulary,
        hiddenSize,
        maxWordPieceTokens: 64,
        ...(encoderSha256 ? { expectedEncoderSha256: encoderSha256 } : {}),
        ...(vocabularySha256 ? { expectedVocabularySha256: vocabularySha256 } : {}),
        backend
    });
}

/**
 * Embed texts in batches, logging progress for long runs.
 * @param {{ embed: (texts: string[], signal: object) => Promise<number[][]> }} embedder the embedder
 * @param {string[]} texts texts to embed
 * @param {(done: number, total: number) => void} [progress] progress callback, called per batch
 * @returns {Promise<number[][]>} one vector per text
 */
export async function embedAll(embedder, texts, progress) {
    const vectors = [];
    const signal = new AbortController().signal;
    for (let start = 0; start < texts.length; start += 256) {
        vectors.push(...(await embedder.embed(texts.slice(start, start + 256), signal)));
        progress?.(Math.min(texts.length, start + 256), texts.length);
    }
    return vectors;
}
