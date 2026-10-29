import type { FieldContextV3, SemanticClassification, SemanticClassifier, SemanticClassifierInput } from '../types.js';
import { matchConcept, type ConceptHead } from './concept-head.js';
import { isRecord, isSha256Hex } from '../guards.js';
import { rememberLatest } from './bounded-entries.js';
import { CLASSIFIER_CACHE_ENTRIES } from '../limits.js';

export interface TextEmbedder {
    embed(texts: ReadonlyArray<string>, signal: AbortSignal): Promise<ReadonlyArray<ReadonlyArray<number>>>;
}

interface EmbeddingHeadCalibration {
    temperature: number;
    routeConfidenceThreshold: number;
    annotationOverrideThreshold: number;
    conformalQuantile: number;
    coverage: number;
    ece: Readonly<{ before: number; after: number }>;
    source: string;
}

export interface EmbeddingClassifierHead {
    model: string;
    dim: number;
    labels: ReadonlyArray<string>;
    coef: ReadonlyArray<ReadonlyArray<number>>;
    intercept: ReadonlyArray<number>;
    /**
     * Optional hidden layer (ReLU) between the embedding and the class weights. When present the
     * head is an MLP: `logits = coef · relu(hidden.weights · embedding + hidden.bias) + intercept`,
     * and each `coef` row has one weight per hidden unit instead of one per embedding dimension.
     * Without it the head uses a multinomial-logistic layer.
     */
    hidden?: Readonly<{ weights: ReadonlyArray<ReadonlyArray<number>>; bias: ReadonlyArray<number> }>;
    inputFormat: 'v3';
    maxWordPieceTokens?: number;
    encoderSha256?: string;
    tokenizerSha256?: string;
    serializerFingerprint?: string;
    registryFingerprint?: string;
    abstentionLabels?: ReadonlyArray<string>;
    /**
     * Labels the head was trained on to keep its decision boundary sharp but never routes: they
     * lack calibration support or calibration precision. A decision that lands on one of them is
     * treated exactly like an unsupported role (route threshold above 1).
     */
    auxiliaryLabels?: ReadonlyArray<string>;
    roleCalibration?: Readonly<Record<string, number>>;
    familyCalibration?: Readonly<Record<string, number>>;
    calibrationSupport?: Readonly<{
        minimumCorrectPerRole: number;
        minimumCorrectPerFamily: number;
        roles: Readonly<Record<string, number>>;
        families: Readonly<Record<string, number>>;
    }>;
    calibration?: EmbeddingHeadCalibration;
}

export interface EmbeddingSemanticClassifierOptions {
    fingerprint: string;
    embedder: TextEmbedder;
    head: EmbeddingClassifierHead;
    serializeV3Input?: (input: FieldContextV3) => string;
    v3Roles?: Readonly<Record<string, Readonly<{ family: string }>>>;
    v3RegistryFingerprint?: string;
    v3SerializerFingerprint?: string;
    /** Prototype head (head B) sharing this encoder; reports a concept match next to the role. */
    conceptHead?: ConceptHead;
}

const ABSTAIN_LABELS = new Set(['unknown']);

/**
 * Remove nondeterministic low-order floating-point wobble before softmax ranking.
 *
 * @param value
 */
export function quantizeLogit(value: number): number {
    return Math.round(value * 1_000) / 1_000;
}

/** The runtime dependencies a v3 head is validated against. */
export type EmbeddingHeadContract = Pick<
    EmbeddingSemanticClassifierOptions,
    'serializeV3Input' | 'v3Roles' | 'v3RegistryFingerprint' | 'v3SerializerFingerprint'
>;

const HEAD_ERROR = 'Invalid embedding classifier head';
const CONTRACT_ERROR = 'Invalid v3 embedding classifier contract';

function isStringArray(value: unknown): value is ReadonlyArray<string> {
    return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isNumberMatrix(value: unknown): value is ReadonlyArray<ReadonlyArray<number>> {
    return Array.isArray(value) && value.every((row) => Array.isArray(row));
}

function isOptional(value: unknown, check: (present: unknown) => boolean): boolean {
    return value === undefined || check(value);
}

/**
 * Check the JSON shape of a head: the type of every field the later checks read. Values (finiteness,
 * lengths, thresholds) are checked by the named checks that follow.
 *
 * @param value the parsed head
 * @throws {TypeError} naming the first field with the wrong type
 */
function assertHeadShape(value: unknown): asserts value is EmbeddingClassifierHead {
    const fail = (field: string): never => {
        throw new TypeError(`${HEAD_ERROR}: ${field} has the wrong type`);
    };
    if (!isRecord(value)) {
        // Thrown directly so the record narrowing holds for the checks below.
        throw new TypeError(`${HEAD_ERROR}: the head has the wrong type`);
    }
    if (typeof value.dim !== 'number') {
        fail('dim');
    }
    if (!isStringArray(value.labels)) {
        fail('labels');
    }
    if (!isNumberMatrix(value.coef)) {
        fail('coef');
    }
    if (!Array.isArray(value.intercept)) {
        fail('intercept');
    }
    const hidden = value.hidden;
    if (!isOptional(hidden, (layer) => isRecord(layer) && isNumberMatrix(layer.weights) && Array.isArray(layer.bias))) {
        fail('hidden');
    }
    if (!isOptional(value.abstentionLabels, isStringArray)) {
        fail('abstentionLabels');
    }
    for (const field of ['roleCalibration', 'familyCalibration', 'calibration'] as const) {
        if (!isOptional(value[field], isRecord)) {
            fail(field);
        }
    }
    const support = value.calibrationSupport;
    if (!isOptional(support, (entry) => isRecord(entry) && isRecord(entry.roles) && isRecord(entry.families))) {
        fail('calibrationSupport');
    }
}

/**
 * Check the layer dimensions and weights: one finite weight row per label over the hidden units (or the
 * embedding when there is no hidden layer), one finite intercept per label.
 *
 * @param head the head
 * @throws {TypeError} naming the inconsistent layer
 */
function assertHeadLayers(head: EmbeddingClassifierHead): void {
    // Each class weight row spans the hidden units when the head has a hidden layer, the embedding
    // dimensions otherwise.
    const classWeightLength = head.hidden ? head.hidden.bias.length : head.dim;
    const finiteRow = (weights: ReadonlyArray<number>, length: number): boolean =>
        weights.length === length && weights.every((weight) => Number.isFinite(weight));
    if (!Number.isSafeInteger(head.dim) || head.dim <= 0) {
        throw new TypeError(`${HEAD_ERROR}: dim must be a positive integer`);
    }
    if (head.labels.length === 0 || head.labels.some((label) => label.length === 0)) {
        throw new TypeError(`${HEAD_ERROR}: labels must be non-empty`);
    }
    if (
        head.coef.length !== head.labels.length ||
        head.coef.some((weights) => !finiteRow(weights, classWeightLength))
    ) {
        throw new TypeError(`${HEAD_ERROR}: coef needs one finite row of ${classWeightLength} weights per label`);
    }
    if (head.intercept.length !== head.labels.length || head.intercept.some((value) => !Number.isFinite(value))) {
        throw new TypeError(`${HEAD_ERROR}: intercept needs one finite value per label`);
    }
    const hidden = head.hidden;
    if (
        hidden !== undefined &&
        (hidden.bias.length === 0 ||
            hidden.weights.length !== hidden.bias.length ||
            hidden.bias.some((value) => !Number.isFinite(value)) ||
            hidden.weights.some((weights) => !finiteRow(weights, head.dim)))
    ) {
        throw new TypeError(`${HEAD_ERROR}: hidden needs one finite row of ${head.dim} weights per finite bias`);
    }
}

/**
 * Check that the runtime supplies the v3 dependencies and that every label the head can return is a
 * registered role or an abstention label.
 *
 * @param head the head
 * @param contract the runtime's v3 dependencies
 */
function assertRegisteredLabels(head: EmbeddingClassifierHead, contract: EmbeddingHeadContract): void {
    if (head.inputFormat !== 'v3') {
        throw new TypeError('Unsupported embedding classifier input format');
    }
    if (!contract.serializeV3Input || !contract.v3Roles || !contract.v3RegistryFingerprint) {
        throw new TypeError('v3 classifier requires semantic-v3 runtime contract dependencies');
    }
    for (const label of head.labels) {
        if (!ABSTAIN_LABELS.has(label) && !contract.v3Roles[label]) {
            throw new TypeError(`v3 classifier label ${label} is not registered`);
        }
    }
    const auxiliaryLabels: unknown = head.auxiliaryLabels ?? [];
    if (
        !Array.isArray(auxiliaryLabels) ||
        auxiliaryLabels.some(
            (label) => typeof label !== 'string' || !head.labels.includes(label) || ABSTAIN_LABELS.has(label)
        )
    ) {
        throw new TypeError(`${CONTRACT_ERROR}: auxiliary labels must be trained, routable labels`);
    }
}

/**
 * Check that the head was trained for this encoder, serializer and role registry, and that its labels
 * are unique and include the `unknown` abstention.
 *
 * @param head the head
 * @param contract the runtime's v3 dependencies
 */
function assertTrainingContract(head: EmbeddingClassifierHead, contract: EmbeddingHeadContract): void {
    if (head.maxWordPieceTokens !== 64 || !isSha256Hex(head.encoderSha256) || !isSha256Hex(head.tokenizerSha256)) {
        throw new TypeError(`${CONTRACT_ERROR}: the head must pin the 64-token encoder and tokenizer digests`);
    }
    if (
        !contract.v3SerializerFingerprint ||
        head.serializerFingerprint !== contract.v3SerializerFingerprint ||
        head.registryFingerprint !== contract.v3RegistryFingerprint
    ) {
        throw new TypeError(`${CONTRACT_ERROR}: the head was trained for another serializer or role registry`);
    }
    if (
        !new Set(head.abstentionLabels ?? []).has('unknown') ||
        !head.labels.includes('unknown') ||
        new Set(head.labels).size !== head.labels.length
    ) {
        throw new TypeError(`${CONTRACT_ERROR}: labels must be unique and abstain with unknown`);
    }
}

/**
 * Check the calibration: a positive temperature, routing thresholds in [0, 1], a calibrated precision for
 * every role and its family, and, when declared, the calibration support counts.
 *
 * @param head the head
 * @param contract the runtime's v3 dependencies
 */
function assertCalibration(head: EmbeddingClassifierHead, contract: EmbeddingHeadContract): void {
    const probability = (value: unknown): boolean =>
        typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
    const count = (value: unknown): boolean => Number.isSafeInteger(value) && Number(value) >= 0;
    const calibratedRoles = head.labels.filter((label) => !ABSTAIN_LABELS.has(label));
    const familyOf = (role: string): string | undefined => contract.v3Roles?.[role]?.family;
    const calibration = head.calibration;
    if (
        !calibration ||
        !probability(calibration.routeConfidenceThreshold) ||
        !probability(calibration.annotationOverrideThreshold) ||
        !probability(calibration.conformalQuantile) ||
        !probability(calibration.coverage)
    ) {
        throw new TypeError(`${CONTRACT_ERROR}: calibration thresholds must lie in [0, 1]`);
    }
    if (
        calibratedRoles.some((role) => !probability(head.roleCalibration?.[role])) ||
        calibratedRoles.some((role) => {
            const family = familyOf(role);
            return !family || !probability(head.familyCalibration?.[family]);
        })
    ) {
        throw new TypeError(`${CONTRACT_ERROR}: every role and its family need a calibrated precision`);
    }
    const support = head.calibrationSupport;
    if (
        support !== undefined &&
        (!count(support.minimumCorrectPerRole) ||
            support.minimumCorrectPerRole < 1 ||
            !count(support.minimumCorrectPerFamily) ||
            support.minimumCorrectPerFamily < 1 ||
            calibratedRoles.some((role) => !count(support.roles[role])) ||
            calibratedRoles.some((role) => {
                const family = familyOf(role);
                return !family || !count(support.families[family]);
            }))
    ) {
        throw new TypeError(`${CONTRACT_ERROR}: calibration support needs counts for every role and family`);
    }
}

/**
 * Validate a parsed classifier head against the runtime's v3 contract before any native session is created.
 * Checks run in order: JSON shape, layer dimensions, temperature, input format and registered labels,
 * training contract, calibration.
 *
 * @param head the parsed head
 * @param contract the runtime's v3 dependencies
 * @throws {TypeError} naming the first violated check
 */
export function assertEmbeddingHead(
    head: unknown,
    contract: EmbeddingHeadContract
): asserts head is EmbeddingClassifierHead {
    assertHeadShape(head);
    assertHeadLayers(head);
    const temperature = head.calibration?.temperature;
    if (head.calibration && (typeof temperature !== 'number' || !Number.isFinite(temperature) || temperature <= 0)) {
        throw new TypeError('Invalid embedding classifier calibration');
    }
    assertRegisteredLabels(head, contract);
    assertTrainingContract(head, contract);
    assertCalibration(head, contract);
}

function isFieldContextV3(input: SemanticClassifierInput): input is FieldContextV3 {
    return Reflect.get(input, 'inputFormat') === 'v3';
}

function applyHead(
    vector: ReadonlyArray<number>,
    head: EmbeddingClassifierHead,
    roles: EmbeddingSemanticClassifierOptions['v3Roles']
): SemanticClassification {
    if (vector.length !== head.dim || vector.some((value) => !Number.isFinite(value))) {
        throw new TypeError('Embedding vector does not match the classifier head');
    }
    const temperature = head.calibration?.temperature ?? 1;
    const activations = head.hidden
        ? head.hidden.bias.map((bias, unit) => {
              const weights = head.hidden?.weights[unit] ?? [];
              let sum = bias;
              for (let dimension = 0; dimension < vector.length; dimension += 1) {
                  sum += vector[dimension] * weights[dimension];
              }
              return sum > 0 ? sum : 0;
          })
        : vector;
    const logits = head.labels.map((_label, classIndex) => {
        const weights = head.coef[classIndex];
        let sum = head.intercept[classIndex];
        for (let index = 0; index < activations.length; index += 1) {
            sum += activations[index] * weights[index];
        }
        return quantizeLogit(sum / temperature);
    });
    const maximumLogit = Math.max(...logits);
    const exponentials = logits.map((logit) => Math.exp(logit - maximumLogit));
    const total = exponentials.reduce((sum, value) => sum + value, 0);
    const ranked = head.labels
        .map((role, classIndex) => ({
            role,
            classIndex,
            confidence: exponentials[classIndex] / total
        }))
        .sort((left, right) => right.confidence - left.confidence || left.classIndex - right.classIndex);
    // Abstention is never discarded: an `unknown` decision stays the routed role.
    const routed = ranked[0];
    const calibration = head.calibration;
    const predictionSet = calibration
        ? ranked
              .filter((candidate) => candidate.confidence >= 1 - calibration.conformalQuantile)
              .map(({ role }) => role)
        : undefined;
    const threshold = Math.max(
        head.auxiliaryLabels?.includes(routed.role) ? 1.01 : 0,
        calibration?.routeConfidenceThreshold ?? 1,
        head.roleCalibration?.[routed.role] ?? 0,
        head.familyCalibration?.[roles?.[routed.role]?.family ?? ''] ?? 0,
        head.calibrationSupport &&
            (head.calibrationSupport.roles[routed.role] ?? 0) < head.calibrationSupport.minimumCorrectPerRole
            ? 1.01
            : 0,
        head.calibrationSupport &&
            (head.calibrationSupport.families[roles?.[routed.role]?.family ?? ''] ?? 0) <
                head.calibrationSupport.minimumCorrectPerFamily
            ? 1.01
            : 0
    );
    return Object.freeze({
        role: routed.role,
        confidence: routed.confidence,
        source: 'classifier',
        routeThreshold: threshold,
        ...(predictionSet
            ? { predictionSetSize: predictionSet.length, predictionSet: Object.freeze(predictionSet) }
            : {}),
        top: Object.freeze(
            ranked
                .slice(0, 5)
                .map((candidate) => Object.freeze({ role: candidate.role, confidence: candidate.confidence }))
        )
    });
}

/**
 * Build the classifier around the embedding and calibrated-head contract.
 *
 * @param options
 */
export function createEmbeddingSemanticClassifier(options: EmbeddingSemanticClassifierOptions): SemanticClassifier {
    assertEmbeddingHead(options.head, options);
    const cache = new Map<string, SemanticClassification>();
    const fieldText = (input: SemanticClassifierInput): string => {
        if (!isFieldContextV3(input) || !options.serializeV3Input) {
            throw new TypeError('v3 classifier requires FieldContextV3 input');
        }
        return options.serializeV3Input(input);
    };
    const classifyBatch = async (
        inputs: ReadonlyArray<SemanticClassifierInput>,
        signal: AbortSignal
    ): Promise<ReadonlyArray<SemanticClassification>> => {
        signal.throwIfAborted();
        const texts = inputs.map(fieldText);
        // Resolve the batch from its own map: remembering new entries may evict others from the bounded cache.
        const resolved = new Map<string, SemanticClassification>();
        for (const text of texts) {
            const cached = cache.get(text);
            if (cached) {
                resolved.set(text, cached);
            }
        }
        const uncachedTexts = [...new Set(texts.filter((text) => !resolved.has(text)))];
        if (uncachedTexts.length > 0) {
            const vectors = await options.embedder.embed(uncachedTexts, signal);
            signal.throwIfAborted();
            if (vectors.length !== uncachedTexts.length) {
                throw new TypeError('Embedding runtime returned an invalid batch size');
            }
            const primitiveTypes = new Map(inputs.map((input, index) => [texts[index], input.primitiveType]));
            for (const [index, text] of uncachedTexts.entries()) {
                const vector = vectors[index];
                if (!vector) {
                    throw new TypeError('Embedding runtime returned no vector');
                }
                const classification = applyHead(vector, options.head, options.v3Roles);
                const primitiveType = primitiveTypes.get(text);
                const concept =
                    options.conceptHead && primitiveType
                        ? matchConcept(options.conceptHead, vector, primitiveType)
                        : undefined;
                resolved.set(text, concept ? Object.freeze({ ...classification, concept }) : classification);
            }
            for (const text of uncachedTexts) {
                const classification = resolved.get(text);
                if (classification) {
                    rememberLatest(cache, text, classification, CLASSIFIER_CACHE_ENTRIES);
                }
            }
        }
        return Object.freeze(
            texts.map((text) => {
                const classification = resolved.get(text);
                if (!classification) {
                    throw new TypeError('Embedding classification cache is incomplete');
                }
                return classification;
            })
        );
    };
    const conceptBanks = new Map((options.conceptHead?.concepts ?? []).map((concept) => [concept.id, concept]));
    return Object.freeze({
        fingerprint: options.fingerprint,
        inputFormat: options.head.inputFormat,
        ...(options.conceptHead ? { conceptBank: (id: string) => conceptBanks.get(id) } : {}),
        classify: async (input: SemanticClassifierInput, signal: AbortSignal) => {
            const result = (await classifyBatch([input], signal))[0];
            if (!result) {
                throw new TypeError('Embedding classifier returned no classification');
            }
            return result;
        },
        classifyBatch
    });
}
