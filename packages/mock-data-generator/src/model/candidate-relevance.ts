import type { SftCandidateRelevancePair, SftCandidateRelevanceVerifier } from '../types.js';
import type { TextEmbedder } from './embedding-classifier.js';
import { isRecord, isSha256Hex } from '../guards.js';
import { sha256 } from '../hash.js';

const FIELD_VALUE_RELEVANCE_SERIALIZER_VERSION = 'field-value-relevance-v2-text' as const;
export const FIELD_VALUE_RELEVANCE_SERIALIZER_FINGERPRINT = sha256(FIELD_VALUE_RELEVANCE_SERIALIZER_VERSION);

export interface CandidateRelevanceHead {
    model: 'field-value-relevance-v1';
    dim: number;
    coef: ReadonlyArray<number>;
    intercept: number;
    temperature: number;
    threshold: number;
    maxWordPieceTokens: 64;
    encoderSha256: string;
    tokenizerSha256: string;
    serializerFingerprint: string;
    qualification: Readonly<{ status: 'qualified' | 'unqualified' }>;
}

interface CandidateRelevanceContract {
    encoderSha256: string;
    vocabularySha256: string;
    embeddingDimension: number;
}

interface CandidateRelevanceVerifierOptions extends CandidateRelevanceContract {
    head: CandidateRelevanceHead;
    embedder: TextEmbedder;
    fingerprint: string;
}

/**
 * Verify a parsed relevance head against the encoder contract before creating a native encoder session.
 *
 * @param head the parsed head
 * @param contract the encoder digests and embedding dimension the head must match
 * @throws {TypeError} naming the violated part of the contract
 */
export function assertCandidateRelevanceHead(
    head: unknown,
    contract: CandidateRelevanceContract
): asserts head is CandidateRelevanceHead {
    if (
        !isRecord(head) ||
        head.model !== 'field-value-relevance-v1' ||
        !isRecord(head.qualification) ||
        head.qualification.status !== 'qualified'
    ) {
        throw new TypeError('A qualified field-to-value relevance head is required');
    }
    if (head.serializerFingerprint !== FIELD_VALUE_RELEVANCE_SERIALIZER_FINGERPRINT || head.maxWordPieceTokens !== 64) {
        throw new TypeError('Field-to-value relevance serializer contract mismatch');
    }
    if (
        !isSha256Hex(head.encoderSha256) ||
        !isSha256Hex(head.tokenizerSha256) ||
        head.encoderSha256 !== contract.encoderSha256 ||
        head.tokenizerSha256 !== contract.vocabularySha256
    ) {
        throw new TypeError('Field-to-value relevance artifact fingerprint mismatch');
    }
    const coef = head.coef;
    if (
        typeof head.dim !== 'number' ||
        !Number.isSafeInteger(head.dim) ||
        head.dim <= 0 ||
        head.dim !== contract.embeddingDimension ||
        !Array.isArray(coef) ||
        coef.length !== head.dim ||
        coef.some((weight) => !Number.isFinite(weight))
    ) {
        throw new TypeError('Field-to-value relevance embedding dimension mismatch');
    }
    const { intercept, temperature, threshold } = head;
    if (
        typeof intercept !== 'number' ||
        !Number.isFinite(intercept) ||
        typeof temperature !== 'number' ||
        !Number.isFinite(temperature) ||
        temperature <= 0 ||
        typeof threshold !== 'number' ||
        !Number.isFinite(threshold) ||
        threshold <= 0 ||
        threshold >= 1
    ) {
        throw new TypeError('Invalid field-to-value relevance calibration');
    }
}

function compact(value: string, maximumLength: number): string {
    return value
        .replace(/[|\s]+/gu, ' ')
        .trim()
        .slice(0, maximumLength);
}

/**
 * The candidate value and field identity precede optional context in the shared 64-token budget.
 *
 * @param pair
 */
export function serializeCandidateRelevancePair(pair: SftCandidateRelevancePair): string {
    // A short natural-language rendering: the frozen sentence encoder reads words, not
    // pipe-delimited technical fields. The value comes first, then what the field is, then the
    // code it is linked to and the surrounding structure.
    const clause = (prefix: string, value: string | undefined, maximumLength: number): string[] =>
        value ? [`${prefix}${compact(value, maximumLength)}`] : [];
    return [
        `Value "${compact(pair.value, 96)}" for field ${compact(pair.field.name, 48)}`,
        ...clause('labelled ', pair.field.label, 64),
        `of ${compact(pair.entity, 48)} in ${compact(pair.resource, 48)}`,
        ...clause(`linked to ${compact(pair.linkedCode.property, 48)} = `, pair.linkedCode.value, 48),
        ...clause('', pair.field.description, 96),
        ...clause('referenced by ', pair.field.referencedBy?.join(', '), 96),
        ...clause('keys into ', pair.field.foreignKeyTargets?.join(', '), 96),
        ...clause('related to ', pair.relatedResources.join(', '), 96)
    ].join('; ');
}

/**
 * Score reviewed field/value pairs with a separately calibrated binary head.
 *
 * @param options
 */
export function createEmbeddingCandidateRelevanceVerifier(
    options: CandidateRelevanceVerifierOptions
): SftCandidateRelevanceVerifier {
    assertCandidateRelevanceHead(options.head, options);
    return Object.freeze({
        fingerprint: options.fingerprint,
        verifyBatch: async (pairs: ReadonlyArray<SftCandidateRelevancePair>, signal: AbortSignal) => {
            signal.throwIfAborted();
            if (pairs.length === 0) {
                return Object.freeze([]);
            }
            const vectors = await options.embedder.embed(pairs.map(serializeCandidateRelevancePair), signal);
            signal.throwIfAborted();
            if (vectors.length !== pairs.length) {
                throw new TypeError('Field-to-value relevance encoder returned an invalid batch size');
            }
            return Object.freeze(
                vectors.map((vector) => {
                    if (vector.length !== options.head.dim || vector.some((value) => !Number.isFinite(value))) {
                        throw new TypeError('Field-to-value relevance encoder returned an invalid vector');
                    }
                    const logit =
                        vector.reduce(
                            (sum, value, index) => sum + value * options.head.coef[index],
                            options.head.intercept
                        ) / options.head.temperature;
                    const probability = 1 / (1 + Math.exp(-logit));
                    return probability >= options.head.threshold;
                })
            );
        }
    });
}
