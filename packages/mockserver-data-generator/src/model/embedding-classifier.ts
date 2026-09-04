import type { SemanticClassification, SemanticClassifier, SemanticClassifierInput } from '../types.js';

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
    inputFormat?: 'v1' | 'v2';
    calibration?: EmbeddingHeadCalibration;
}

export interface EmbeddingSemanticClassifierOptions {
    fingerprint: string;
    embedder: TextEmbedder;
    head: EmbeddingClassifierHead;
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

function assertHead(head: EmbeddingClassifierHead): void {
    if (
        !Number.isSafeInteger(head.dim) ||
        head.dim <= 0 ||
        head.labels.length === 0 ||
        head.coef.length !== head.labels.length ||
        head.intercept.length !== head.labels.length ||
        head.labels.some((label) => label.length === 0) ||
        head.coef.some(
            (weights) => weights.length !== head.dim || weights.some((weight) => !Number.isFinite(weight))
        ) ||
        head.intercept.some((value) => !Number.isFinite(value))
    ) {
        throw new TypeError('Invalid embedding classifier head');
    }
    if (head.calibration && (!Number.isFinite(head.calibration.temperature) || head.calibration.temperature <= 0)) {
        throw new TypeError('Invalid embedding classifier calibration');
    }
}

function annotationSummary(input: SemanticClassifierInput): string | undefined {
    if (input.annotations.length === 0) {
        return undefined;
    }
    return JSON.stringify(input.annotations.map((annotation) => [annotation.term, annotation.value])).slice(0, 200);
}

function applyHead(vector: ReadonlyArray<number>, head: EmbeddingClassifierHead): SemanticClassification {
    if (vector.length !== head.dim || vector.some((value) => !Number.isFinite(value))) {
        throw new TypeError('Embedding vector does not match the classifier head');
    }
    const temperature = head.calibration?.temperature ?? 1;
    const logits = head.labels.map((_label, classIndex) => {
        const weights = head.coef[classIndex];
        let sum = head.intercept[classIndex];
        for (let dimension = 0; dimension < vector.length; dimension += 1) {
            sum += vector[dimension] * weights[dimension];
        }
        return quantizeLogit(sum / temperature);
    });
    const maximumLogit = Math.max(...logits);
    const exponentials = logits.map((logit) => Math.exp(logit - maximumLogit));
    const total = exponentials.reduce((sum, value) => sum + value, 0);
    const ranked = head.labels
        .map((role, classIndex) => ({ role, classIndex, confidence: exponentials[classIndex] / total }))
        .sort((left, right) => right.confidence - left.confidence || left.classIndex - right.classIndex);
    const routed = ranked.find((candidate) => !ABSTAIN_LABELS.has(candidate.role)) ?? ranked[0];
    const calibration = head.calibration;
    return Object.freeze({
        role: routed.role,
        confidence: routed.confidence,
        source: 'classifier',
        ...(calibration ? { routeThreshold: calibration.routeConfidenceThreshold } : {}),
        ...(calibration
            ? {
                  predictionSetSize: ranked.filter(
                      (candidate) => candidate.confidence >= 1 - calibration.conformalQuantile
                  ).length
              }
            : {}),
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
    assertHead(options.head);
    const cache = new Map<string, SemanticClassification>();
    return Object.freeze({
        fingerprint: options.fingerprint,
        classify: async (input: SemanticClassifierInput, signal: AbortSignal) => {
            signal.throwIfAborted();
            const text = buildEmbeddingFieldText({
                propertyName: input.propertyName,
                entityName: input.entityName,
                ...(input.label ? { label: input.label } : {}),
                ...(options.head.inputFormat === 'v2' ? { annotations: annotationSummary(input) } : {})
            });
            const cached = cache.get(text);
            if (cached) {
                return cached;
            }
            const vectors = await options.embedder.embed([text], signal);
            const vector = vectors[0];
            if (!vector) {
                throw new TypeError('Embedding runtime returned no vector');
            }
            const classification = applyHead(vector, options.head);
            cache.set(text, classification);
            return classification;
        }
    });
}
