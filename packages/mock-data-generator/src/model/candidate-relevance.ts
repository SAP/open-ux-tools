import { createHash } from 'node:crypto';
import type { SftCandidateRelevancePair, SftCandidateRelevanceVerifier } from '../types.js';
import type { TextEmbedder } from './embedding-classifier.js';

export const FIELD_VALUE_RELEVANCE_SERIALIZER_VERSION = 'field-value-relevance-v2-text' as const;
export const FIELD_VALUE_RELEVANCE_SERIALIZER_FINGERPRINT = createHash('sha256')
    .update(FIELD_VALUE_RELEVANCE_SERIALIZER_VERSION)
    .digest('hex');

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

export interface CandidateRelevanceVerifierOptions extends CandidateRelevanceContract {
    head: CandidateRelevanceHead;
    embedder: TextEmbedder;
    fingerprint: string;
}

/**
 * Verify the head contract before creating a native encoder session.
 *
 * @param head
 * @param contract
 */
export function assertCandidateRelevanceHead(head: CandidateRelevanceHead, contract: CandidateRelevanceContract): void {
    if (head.model !== 'field-value-relevance-v1' || head.qualification?.status !== 'qualified') {
        throw new TypeError('A qualified field-to-value relevance head is required');
    }
    if (head.serializerFingerprint !== FIELD_VALUE_RELEVANCE_SERIALIZER_FINGERPRINT || head.maxWordPieceTokens !== 64) {
        throw new TypeError('Field-to-value relevance serializer contract mismatch');
    }
    if (
        !/^[a-f\d]{64}$/u.test(head.encoderSha256) ||
        !/^[a-f\d]{64}$/u.test(head.tokenizerSha256) ||
        head.encoderSha256 !== contract.encoderSha256 ||
        head.tokenizerSha256 !== contract.vocabularySha256
    ) {
        throw new TypeError('Field-to-value relevance artifact fingerprint mismatch');
    }
    if (
        !Number.isSafeInteger(head.dim) ||
        head.dim <= 0 ||
        head.dim !== contract.embeddingDimension ||
        head.coef.length !== head.dim ||
        head.coef.some((weight) => !Number.isFinite(weight))
    ) {
        throw new TypeError('Field-to-value relevance embedding dimension mismatch');
    }
    if (
        !Number.isFinite(head.intercept) ||
        !Number.isFinite(head.temperature) ||
        head.temperature <= 0 ||
        !Number.isFinite(head.threshold) ||
        head.threshold <= 0 ||
        head.threshold >= 1
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
