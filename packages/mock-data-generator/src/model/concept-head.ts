import type { ConceptBank, ConceptMatch } from '../types.js';
import type { ConceptValueBank } from '../semantics/bank-store.js';

/**
 * The classifier's prototype head (head B). It shares the encoder with the trained role head (head A)
 * and represents each field concept by a prototype vector: the normalized mean of the encoder vectors
 * of real example fields of that concept. A field takes the nearest concept when the cosine similarity
 * and the gap to the runner-up both clear the head's thresholds, which are chosen on judged real fields.
 * Concepts are added or changed through this file alone, without retraining head A.
 *
 * The file carries prototypes, thresholds and acceptance inputs only; each concept's values live in the
 * value-bank store under `concept:<id>` and are joined here, so `concepts` holds complete banks.
 */
export interface ConceptHead {
    readonly format: 'mockgen-concept-head';
    readonly version: 2;
    readonly dim: number;
    readonly encoderSha256: string;
    readonly tokenizerSha256: string;
    readonly serializerFingerprint: string;
    readonly thresholds: Readonly<{ similarity: number; margin: number }>;
    readonly concepts: ReadonlyArray<ConceptBank>;
    /** Row-major unit vectors, one per concept, `concepts.length * dim` values. */
    readonly prototypes: Float32Array;
    /** Learned acceptance layer; when present it decides whether the nearest concept is accepted. */
    readonly acceptance?: ConceptAcceptance;
}

/**
 * A logistic acceptance layer trained on judged field/concept pairs. Its inputs describe how close the
 * field is to the nearest prototype, how clearly it beats the runner-up, how close the concept's own
 * examples sit (its cohesion) and the concept's value kind.
 */
export interface ConceptAcceptance {
    readonly model: 'logistic-v1';
    readonly features: ReadonlyArray<string>;
    readonly mean: ReadonlyArray<number>;
    readonly scale: ReadonlyArray<number>;
    readonly weights: ReadonlyArray<number>;
    readonly bias: number;
    readonly threshold: number;
}

const ACCEPTANCE_KINDS = ['code', 'code-text', 'identifier', 'name', 'text', 'number', 'decimal'] as const;
const ACCEPTANCE_FEATURES = [
    'similarity',
    'margin',
    'similarityOverP25',
    'similarityOverP50',
    'similarityOverP10',
    'examples',
    ...ACCEPTANCE_KINDS.map((kind) => `kind:${kind}`)
];

export interface ConceptHeadContract {
    dim: number;
    encoderSha256: string;
    tokenizerSha256: string;
    serializerFingerprint: string;
}

const SHA256 = /^[0-9a-f]{64}$/u;

function record(value: unknown, label: string): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${label} must be an object`);
    }
    return value as Record<string, unknown>;
}

function stringArray(value: unknown, label: string): string[] {
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.length === 0)) {
        throw new TypeError(`${label} must be a list of non-empty strings`);
    }
    return value as string[];
}

const CONCEPT_KEYS = new Set(['id', 'minimumSimilarity', 'cohesion']);

function parseConcept(
    value: unknown,
    index: number,
    bankFor: (id: string) => ConceptValueBank | undefined
): ConceptBank {
    const input = record(value, `concept ${index}`);
    const { id } = input;
    if (typeof id !== 'string' || id.length === 0) {
        throw new TypeError(`concept ${index} needs an id`);
    }
    const unexpected = Object.keys(input).filter((key) => !CONCEPT_KEYS.has(key));
    if (unexpected.length > 0) {
        throw new TypeError(
            `concept ${id} carries ${unexpected.join(', ')}; concept values belong in the value-bank store`
        );
    }
    const bank = bankFor(id);
    if (!bank) {
        throw new TypeError(`concept ${id} has no value bank concept:${id} in the value-bank store`);
    }
    const minimum = input.minimumSimilarity;
    if (minimum !== undefined && (typeof minimum !== 'number' || !(minimum > 0 && minimum <= 1))) {
        throw new TypeError(`concept ${id} has an invalid minimum similarity`);
    }
    let cohesion: ConceptBank['cohesion'];
    if (input.cohesion !== undefined) {
        const entry = record(input.cohesion, `concept ${id} cohesion`);
        const { p10, p25, p50, examples } = entry;
        if (
            [p10, p25, p50].some((quantile) => typeof quantile !== 'number' || !(quantile >= -1 && quantile <= 1)) ||
            typeof examples !== 'number' ||
            !Number.isInteger(examples) ||
            examples < 1
        ) {
            throw new TypeError(`concept ${id} has an invalid cohesion profile`);
        }
        cohesion = Object.freeze({ p10: p10 as number, p25: p25 as number, p50: p50 as number, examples });
    }
    return Object.freeze({
        id,
        name: bank.name,
        valueKind: bank.valueKind,
        types: bank.types,
        ...(bank.values ? { values: bank.values } : {}),
        ...(bank.pairs ? { pairs: bank.pairs } : {}),
        ...(bank.range ? { range: bank.range } : {}),
        ...(minimum === undefined ? {} : { minimumSimilarity: minimum as number }),
        ...(cohesion ? { cohesion } : {})
    });
}

function parseAcceptance(value: unknown): ConceptAcceptance {
    const input = record(value, 'concept head acceptance');
    const numbers = (entry: unknown, label: string): number[] => {
        if (
            !Array.isArray(entry) ||
            entry.length !== ACCEPTANCE_FEATURES.length ||
            entry.some((item) => typeof item !== 'number' || !Number.isFinite(item))
        ) {
            throw new TypeError(`concept head acceptance ${label} must list one number per feature`);
        }
        return entry as number[];
    };
    if (input.model !== 'logistic-v1') {
        throw new TypeError('unsupported concept head acceptance model');
    }
    const features = stringArray(input.features, 'concept head acceptance features');
    if (features.join('|') !== ACCEPTANCE_FEATURES.join('|')) {
        throw new TypeError('concept head acceptance features do not match the runtime');
    }
    const scale = numbers(input.scale, 'scale');
    if (scale.some((entry) => !(entry > 0))) {
        throw new TypeError('concept head acceptance scale must be positive');
    }
    const { bias, threshold } = input;
    if (
        typeof bias !== 'number' ||
        !Number.isFinite(bias) ||
        typeof threshold !== 'number' ||
        !(threshold > 0 && threshold < 1)
    ) {
        throw new TypeError('concept head acceptance needs a finite bias and a probability threshold');
    }
    return Object.freeze({
        model: 'logistic-v1',
        features: Object.freeze([...features]),
        mean: Object.freeze([...numbers(input.mean, 'mean')]),
        scale: Object.freeze([...scale]),
        weights: Object.freeze([...numbers(input.weights, 'weights')]),
        bias,
        threshold
    });
}

function acceptanceProbability(
    acceptance: ConceptAcceptance,
    concept: ConceptBank,
    similarity: number,
    margin: number
): number {
    const cohesion = concept.cohesion ?? { p10: 0.75, p25: 0.8, p50: 0.85, examples: 5 };
    const inputs = [
        similarity,
        margin,
        similarity - cohesion.p25,
        similarity - cohesion.p50,
        similarity - cohesion.p10,
        Math.min(cohesion.examples, 100) / 100,
        ...ACCEPTANCE_KINDS.map((kind) => (concept.valueKind === kind ? 1 : 0))
    ];
    const logit = inputs.reduce(
        (sum, input, index) =>
            sum + acceptance.weights[index] * ((input - acceptance.mean[index]) / acceptance.scale[index]),
        acceptance.bias
    );
    return 1 / (1 + Math.exp(-logit));
}

/**
 * Validate a packaged prototype head against the encoder contract it must share with head A.
 *
 * @param value parsed JSON document
 * @param contract encoder, tokenizer and serializer the prototypes were computed with
 * @param bankFor the value bank of a concept id; every concept of the head must have one
 * @returns the validated head with each concept joined to its value bank
 */
export function parseConceptHead(
    value: unknown,
    contract: ConceptHeadContract,
    bankFor: (id: string) => ConceptValueBank | undefined
): ConceptHead {
    const input = record(value, 'concept head');
    if (input.format !== 'mockgen-concept-head') {
        throw new TypeError('unsupported concept head format');
    }
    if (input.version !== 2) {
        throw new TypeError(
            input.version === 1
                ? 'concept head version 1 carries its own values; strip them into the value-bank store'
                : 'unsupported concept head version'
        );
    }
    if (input.dim !== contract.dim) {
        throw new TypeError('concept head dimension does not match the classifier encoder');
    }
    for (const [key, expected] of [
        ['encoderSha256', contract.encoderSha256],
        ['tokenizerSha256', contract.tokenizerSha256],
        ['serializerFingerprint', contract.serializerFingerprint]
    ] as const) {
        if (input[key] !== expected || (key !== 'serializerFingerprint' && !SHA256.test(String(input[key])))) {
            throw new TypeError(`concept head ${key} does not match the classifier contract`);
        }
    }
    const thresholds = record(input.thresholds, 'concept head thresholds');
    const { similarity, margin } = thresholds;
    if (
        typeof similarity !== 'number' ||
        typeof margin !== 'number' ||
        !(similarity > 0 && similarity <= 1) ||
        !(margin >= 0 && margin < 1)
    ) {
        throw new TypeError('concept head thresholds are invalid');
    }
    if (!Array.isArray(input.concepts) || input.concepts.length === 0) {
        throw new TypeError('concept head has no concepts');
    }
    const concepts = input.concepts.map((concept, index) => parseConcept(concept, index, bankFor));
    if (new Set(concepts.map((concept) => concept.id)).size !== concepts.length) {
        throw new TypeError('concept head contains duplicate concept ids');
    }
    if (typeof input.prototypes !== 'string') {
        throw new TypeError('concept head prototypes must be base64 float32 data');
    }
    const bytes = Buffer.from(input.prototypes, 'base64');
    if (bytes.length !== concepts.length * contract.dim * 4) {
        throw new TypeError('concept head prototypes do not match the concept count and dimension');
    }
    const prototypes = new Float32Array(concepts.length * contract.dim);
    for (let index = 0; index < prototypes.length; index++) {
        prototypes[index] = bytes.readFloatLE(index * 4);
    }
    if (prototypes.some((entry) => !Number.isFinite(entry))) {
        throw new TypeError('concept head prototypes contain non-finite values');
    }
    const acceptance = input.acceptance === undefined ? undefined : parseAcceptance(input.acceptance);
    return Object.freeze({
        ...(acceptance ? { acceptance } : {}),
        format: 'mockgen-concept-head',
        version: 2,
        dim: contract.dim,
        encoderSha256: contract.encoderSha256,
        tokenizerSha256: contract.tokenizerSha256,
        serializerFingerprint: contract.serializerFingerprint,
        thresholds: Object.freeze({ similarity, margin }),
        concepts: Object.freeze(concepts),
        prototypes
    });
}

const NUMERIC_TYPES = new Set(['int', 'decimal']);

function typeCompatible(concept: ConceptBank, primitiveType: string): boolean {
    // Numeric ranges only fill numeric columns; string banks only fill text columns of a concept that
    // was observed as text.
    if (concept.valueKind === 'number' || concept.valueKind === 'decimal') {
        return NUMERIC_TYPES.has(primitiveType);
    }
    return primitiveType === 'string' && concept.types.includes('string');
}

/**
 * The nearest type-compatible concept for a field vector, only when it clears the head's thresholds.
 *
 * @param head prototype head
 * @param vector encoder vector of the field (the same vector head A classifies)
 * @param primitiveType the field's primitive type
 * @returns the match, or undefined when the field is not confidently one concept
 */
export function matchConcept(
    head: ConceptHead,
    vector: ReadonlyArray<number>,
    primitiveType: string
): ConceptMatch | undefined {
    if (vector.length !== head.dim) {
        return undefined;
    }
    let norm = 0;
    for (const entry of vector) {
        norm += entry * entry;
    }
    norm = Math.sqrt(norm);
    if (!(norm > 0)) {
        return undefined;
    }
    let best = -Infinity;
    let second = -Infinity;
    let bestIndex = -1;
    for (let concept = 0; concept < head.concepts.length; concept++) {
        if (!typeCompatible(head.concepts[concept], primitiveType)) {
            continue;
        }
        const offset = concept * head.dim;
        let dot = 0;
        for (let index = 0; index < head.dim; index++) {
            dot += head.prototypes[offset + index] * vector[index];
        }
        const similarity = dot / norm;
        if (similarity > best) {
            second = best;
            best = similarity;
            bestIndex = concept;
        } else if (similarity > second) {
            second = similarity;
        }
    }
    if (bestIndex < 0) {
        return undefined;
    }
    const margin = Number.isFinite(second) ? best - second : best;
    const concept = head.concepts[bestIndex];
    if (best < head.thresholds.similarity || margin < head.thresholds.margin) {
        return undefined;
    }
    if (head.acceptance) {
        if (acceptanceProbability(head.acceptance, concept, best, margin) < head.acceptance.threshold) {
            return undefined;
        }
    } else if (best < (concept.minimumSimilarity ?? 0)) {
        return undefined;
    }
    return Object.freeze({ id: concept.id, similarity: Math.min(1, best), margin });
}
