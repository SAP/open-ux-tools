import type { FieldContextV3, SemanticClassification, SemanticClassifier, SemanticClassifierInput } from '../types.js';
import { matchConcept, type ConceptHead } from './concept-head.js';

export interface TextEmbedder {
    embed(texts: ReadonlyArray<string>, signal: AbortSignal): Promise<ReadonlyArray<ReadonlyArray<number>>>;
}

export interface EmbeddingHeadCalibration {
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
     * Without it the head stays the multinomial-logistic layer the pilot shipped.
     */
    hidden?: Readonly<{ weights: ReadonlyArray<ReadonlyArray<number>>; bias: ReadonlyArray<number> }>;
    inputFormat?: 'v1' | 'v2' | 'v3';
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

interface FieldTextInput {
    propertyName: string;
    entityName: string;
    label?: string;
    neighbors?: ReadonlyArray<string>;
    annotations?: string;
}

const ABSTAIN_LABELS = new Set(['unknown', 'REVIEW_ME']);

/**
 * Role names that changed after the pilot head was trained. Only pre-v3 heads are translated;
 * v3 heads must already use registered names. Remove together with the v1/v2 adapter.
 */
export const LEGACY_HEAD_LABEL_ALIASES: Readonly<Record<string, string>> = Object.freeze({ order_status: 'status' });

function legacyLabel(head: EmbeddingClassifierHead, role: string): string {
    return head.inputFormat === 'v3' ? role : (LEGACY_HEAD_LABEL_ALIASES[role] ?? role);
}

/**
 * Preserve the byte-level input format used to train the pilot classifier head.
 *
 * @param input
 */
export function buildEmbeddingFieldText(input: FieldTextInput): string {
    const words = input.propertyName.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
    const entity = input.entityName.replace(/s$/, '');
    const label = input.label && input.label !== input.propertyName ? ` (${input.label})` : '';
    const neighbors = (input.neighbors ?? []).slice(0, 8).join(', ');
    const base = `${words}${label} field of a ${entity} (related: ${neighbors})`;
    const annotationText = input.annotations?.trim();
    return annotationText ? `${base} [annotations: ${annotationText}]` : base;
}

/**
 * Remove nondeterministic low-order floating-point wobble before softmax ranking.
 *
 * @param value
 */
export function quantizeLogit(value: number): number {
    return Math.round(value * 1_000) / 1_000;
}

export function assertEmbeddingHead(head: EmbeddingClassifierHead, options: EmbeddingSemanticClassifierOptions): void {
    // Each class weight row spans the hidden units when the head has a hidden layer, the embedding
    // dimensions otherwise.
    const classWeightLength = head.hidden ? head.hidden.bias.length : head.dim;
    if (
        !Number.isSafeInteger(head.dim) ||
        head.dim <= 0 ||
        head.labels.length === 0 ||
        head.coef.length !== head.labels.length ||
        head.intercept.length !== head.labels.length ||
        head.labels.some((label) => label.length === 0) ||
        head.coef.some(
            (weights) => weights.length !== classWeightLength || weights.some((weight) => !Number.isFinite(weight))
        ) ||
        head.intercept.some((value) => !Number.isFinite(value)) ||
        (head.hidden !== undefined &&
            (head.hidden.bias.length === 0 ||
                head.hidden.weights.length !== head.hidden.bias.length ||
                head.hidden.bias.some((value) => !Number.isFinite(value)) ||
                head.hidden.weights.some(
                    (weights) => weights.length !== head.dim || weights.some((weight) => !Number.isFinite(weight))
                )))
    ) {
        throw new TypeError('Invalid embedding classifier head');
    }
    if (head.calibration && (!Number.isFinite(head.calibration.temperature) || head.calibration.temperature <= 0)) {
        throw new TypeError('Invalid embedding classifier calibration');
    }
    if (head.inputFormat !== 'v3') {
        return;
    }
    if (head.labels.includes('REVIEW_ME') || head.abstentionLabels?.includes('REVIEW_ME')) {
        throw new TypeError('Unresolved review decision cannot be a v3 classifier class');
    }
    if (!options.serializeV3Input || !options.v3Roles || !options.v3RegistryFingerprint) {
        throw new TypeError('v3 classifier requires semantic-v3 runtime contract dependencies');
    }
    for (const label of head.labels) {
        if (!ABSTAIN_LABELS.has(label) && !options.v3Roles[label]) {
            throw new TypeError(`v3 classifier label ${label} is not registered`);
        }
    }
    const abstentionLabels = new Set(head.abstentionLabels ?? []);
    const calibratedRoles = head.labels.filter((label) => !ABSTAIN_LABELS.has(label));
    const auxiliaryLabels = head.auxiliaryLabels ?? [];
    if (
        !Array.isArray(auxiliaryLabels) ||
        auxiliaryLabels.some(
            (label) => typeof label !== 'string' || !head.labels.includes(label) || ABSTAIN_LABELS.has(label)
        )
    ) {
        throw new TypeError('Invalid v3 embedding classifier contract');
    }
    const calibrationIsValid = (value: unknown): value is number =>
        typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
    const support = head.calibrationSupport;
    const countIsValid = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
    if (
        head.maxWordPieceTokens !== 64 ||
        !/^[a-f0-9]{64}$/u.test(head.encoderSha256 ?? '') ||
        !/^[a-f0-9]{64}$/u.test(head.tokenizerSha256 ?? '') ||
        !options.v3SerializerFingerprint ||
        head.serializerFingerprint !== options.v3SerializerFingerprint ||
        head.registryFingerprint !== options.v3RegistryFingerprint ||
        !abstentionLabels.has('unknown') ||
        !head.labels.includes('unknown') ||
        new Set(head.labels).size !== head.labels.length ||
        !head.calibration ||
        !calibrationIsValid(head.calibration.routeConfidenceThreshold) ||
        !calibrationIsValid(head.calibration.annotationOverrideThreshold) ||
        !calibrationIsValid(head.calibration.conformalQuantile) ||
        !calibrationIsValid(head.calibration.coverage) ||
        calibratedRoles.some((role) => !calibrationIsValid(head.roleCalibration?.[role])) ||
        calibratedRoles.some((role) => {
            const family = options.v3Roles?.[role]?.family;
            return !family || !calibrationIsValid(head.familyCalibration?.[family]);
        }) ||
        (support !== undefined &&
            (!countIsValid(support.minimumCorrectPerRole) ||
                support.minimumCorrectPerRole < 1 ||
                !countIsValid(support.minimumCorrectPerFamily) ||
                support.minimumCorrectPerFamily < 1 ||
                calibratedRoles.some((role) => !countIsValid(support.roles[role])) ||
                calibratedRoles.some((role) => {
                    const family = options.v3Roles?.[role]?.family;
                    return !family || !countIsValid(support.families[family]);
                })))
    ) {
        throw new TypeError('Invalid v3 embedding classifier contract');
    }
}

function annotationSummary(input: SemanticClassifierInput): string | undefined {
    if (input.annotations.length === 0) {
        return undefined;
    }
    return JSON.stringify(input.annotations.map((annotation) => [annotation.term, annotation.value])).slice(0, 200);
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
            role: legacyLabel(head, role),
            classIndex,
            confidence: exponentials[classIndex] / total
        }))
        .sort((left, right) => right.confidence - left.confidence || left.classIndex - right.classIndex);
    // The v2 adapter preserves the incumbent head contract; v3 never discards abstention.
    const routed =
        head.inputFormat === 'v3'
            ? ranked[0]
            : (ranked.find((candidate) => !ABSTAIN_LABELS.has(candidate.role)) ?? ranked[0]);
    const calibration = head.calibration;
    const predictionSet = calibration
        ? ranked
              .filter((candidate) => candidate.confidence >= 1 - calibration.conformalQuantile)
              .map(({ role }) => role)
        : undefined;
    const threshold =
        head.inputFormat === 'v3'
            ? Math.max(
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
              )
            : calibration?.routeConfidenceThreshold;
    return Object.freeze({
        role: routed.role,
        confidence: routed.confidence,
        source: 'classifier',
        ...(threshold === undefined ? {} : { routeThreshold: threshold }),
        ...(predictionSet ? { predictionSetSize: predictionSet.length } : {}),
        ...(head.inputFormat === 'v3' && predictionSet ? { predictionSet: Object.freeze(predictionSet) } : {}),
        top: Object.freeze(
            ranked
                .slice(0, 5)
                .map((candidate) => Object.freeze({ role: candidate.role, confidence: candidate.confidence }))
        )
    });
}

/**
 * Build the production classifier around the pilot's embedding and calibrated-head contract.
 *
 * @param options
 */
export function createEmbeddingSemanticClassifier(options: EmbeddingSemanticClassifierOptions): SemanticClassifier {
    assertEmbeddingHead(options.head, options);
    const cache = new Map<string, SemanticClassification>();
    const fieldText = (input: SemanticClassifierInput): string => {
        if (options.head.inputFormat === 'v3') {
            if (!isFieldContextV3(input) || !options.serializeV3Input) {
                throw new TypeError('v3 classifier requires FieldContextV3 input');
            }
            return options.serializeV3Input(input);
        }
        return buildEmbeddingFieldText({
            propertyName: input.propertyName,
            entityName: input.entityName,
            ...(input.label ? { label: input.label } : {}),
            ...(options.head.inputFormat === 'v2' ? { annotations: annotationSummary(input) } : {})
        });
    };
    const classifyBatch = async (
        inputs: ReadonlyArray<SemanticClassifierInput>,
        signal: AbortSignal
    ): Promise<ReadonlyArray<SemanticClassification>> => {
        signal.throwIfAborted();
        const texts = inputs.map(fieldText);
        const uncachedTexts = [...new Set(texts.filter((text) => !cache.has(text)))];
        if (uncachedTexts.length > 0) {
            const vectors = await options.embedder.embed(uncachedTexts, signal);
            signal.throwIfAborted();
            if (vectors.length !== uncachedTexts.length) {
                throw new TypeError('Embedding runtime returned an invalid batch size');
            }
            const primitiveTypes = new Map(
                inputs.map((input, index) => [texts[index], (input as { primitiveType?: string }).primitiveType])
            );
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
                cache.set(text, concept ? Object.freeze({ ...classification, concept }) : classification);
            }
        }
        return Object.freeze(
            texts.map((text) => {
                const classification = cache.get(text);
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
        inputFormat: options.head.inputFormat ?? 'v1',
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
