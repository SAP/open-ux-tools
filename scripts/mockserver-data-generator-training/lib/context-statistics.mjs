/**
 * Privacy-safe statistics over v3 field contexts from review queues and projected rows.
 *
 * Nothing here trains a production artifact. The leave-one-family-out probe is a diagnostic
 * over proxy labels and must never be fitted on sealed (holdout) contexts.
 */

const HOLDOUT_SUFFIX = '-holdout';

/**
 * Map a canonical split name to a training partition.
 *
 * @param {string} split canonical split name
 * @returns {'train'|'calibration'|'sealed'} partition
 */
export function partitionForSplit(split) {
    if (split === 'train' || split === 'calibration') return split;
    if (typeof split === 'string' && split.endsWith(HOLDOUT_SUFFIX)) return 'sealed';
    throw new TypeError(`unsupported canonical split: ${String(split)}`);
}

/**
 * Flatten review queues into context items.
 *
 * @param {Array<{ services: Array<{ pending: Array<object> }> }>} queues parsed review queues
 * @returns {Array<{ fieldId: string, serviceId: string, split: string, partition: string, domain: string, context: object }>} items
 */
export function collectQueueContexts(queues) {
    const items = [];
    for (const queue of queues) {
        if (!Array.isArray(queue?.services)) throw new TypeError('review queue requires a services array');
        for (const service of queue.services) {
            for (const field of service.pending ?? []) {
                if (!field?.context || field.context.inputFormat !== 'v3') {
                    throw new TypeError(`queue field ${field?.fieldId ?? '?'} lacks a v3 context`);
                }
                items.push({
                    fieldId: field.fieldId,
                    serviceId: field.serviceId,
                    split: field.split,
                    partition: partitionForSplit(field.split),
                    domain: field.domain,
                    context: field.context
                });
            }
        }
    }
    return items;
}

/**
 * Compute overflow, distinct-text and cross-partition collision counts.
 *
 * @param {object} options options
 * @param {Array<{ partition: string, context: object }>} options.items context items
 * @param {(context: object) => string} options.serialize runtime v3 serializer
 * @param {{ encodeForModel(text: string): { inputIds: ReadonlyArray<number> } }} options.tokenizer runtime tokenizer
 * @param {number} [options.maxWordPieceTokens] token budget
 * @returns {object} statistics without any field text
 */
export function contextStatistics({ items, serialize, tokenizer, maxWordPieceTokens = 64 }) {
    const perPartition = {};
    const textsByPartition = new Map();
    let overflow = 0;
    let maxTokens = 0;
    for (const item of items) {
        const text = serialize(item.context);
        const tokens = tokenizer.encodeForModel(text).inputIds.length;
        maxTokens = Math.max(maxTokens, tokens);
        const bucket = (perPartition[item.partition] ??= { fields: 0, overflow: 0, distinctTexts: 0 });
        bucket.fields += 1;
        if (tokens > maxWordPieceTokens) {
            overflow += 1;
            bucket.overflow += 1;
        }
        if (!textsByPartition.has(item.partition)) textsByPartition.set(item.partition, new Set());
        textsByPartition.get(item.partition).add(text);
    }
    for (const [partition, texts] of textsByPartition) perPartition[partition].distinctTexts = texts.size;
    const intersect = (a, b) =>
        [...(textsByPartition.get(a) ?? [])].filter((t) => textsByPartition.get(b)?.has(t)).length;
    return {
        total: items.length,
        maxWordPieceTokens,
        overflow: { count: overflow, maxTokens },
        perPartition,
        crossPartitionCollisions: {
            trainCalibration: intersect('train', 'calibration'),
            trainSealed: intersect('train', 'sealed'),
            calibrationSealed: intersect('calibration', 'sealed')
        }
    };
}

function sigmoid(z) {
    return 1 / (1 + Math.exp(-z));
}

/**
 * Fit a binary logistic probe by full-batch gradient descent.
 *
 * @param {number[][]} vectors feature vectors
 * @param {boolean[]} labels binary labels
 * @param {{ epochs?: number, learningRate?: number, l2?: number }} [options] fit options
 * @returns {{ weights: number[], bias: number }} probe
 */
export function fitBinaryProbe(vectors, labels, { epochs = 200, learningRate = 0.5, l2 = 0.001 } = {}) {
    if (vectors.length === 0 || vectors.length !== labels.length)
        throw new TypeError('probe requires aligned vectors and labels');
    const dim = vectors[0].length;
    const weights = new Array(dim).fill(0);
    let bias = 0;
    const positives = labels.filter(Boolean).length;
    const negatives = labels.length - positives;
    if (positives === 0 || negatives === 0) throw new TypeError('probe requires both classes');
    const weightFor = (label) => (label ? labels.length / (2 * positives) : labels.length / (2 * negatives));
    for (let epoch = 0; epoch < epochs; epoch += 1) {
        const gradient = new Array(dim).fill(0);
        let biasGradient = 0;
        vectors.forEach((vector, index) => {
            const target = labels[index] ? 1 : 0;
            const prediction = sigmoid(vector.reduce((sum, value, i) => sum + value * weights[i], bias));
            const error = (prediction - target) * weightFor(labels[index]);
            vector.forEach((value, i) => {
                gradient[i] += error * value;
            });
            biasGradient += error;
        });
        for (let i = 0; i < dim; i += 1) weights[i] -= learningRate * (gradient[i] / vectors.length + l2 * weights[i]);
        bias -= learningRate * (biasGradient / vectors.length);
    }
    return { weights, bias };
}

/**
 * Leave-one-family-out evaluation of a binary probe.
 *
 * @param {object} options options
 * @param {number[][]} options.vectors feature vectors
 * @param {boolean[]} options.labels proxy labels
 * @param {string[]} options.families family per vector
 * @param {object} [options.fit] fit options
 * @returns {{ overall: { correct: number, total: number, accuracy: number }, perFamily: object[] }} report
 */
export function leaveOneFamilyOutProbe({ vectors, labels, families, fit }) {
    if (vectors.length !== labels.length || vectors.length !== families.length) {
        throw new TypeError('vectors, labels and families must align');
    }
    const distinct = [...new Set(families)].sort();
    const perFamily = [];
    let correct = 0;
    for (const family of distinct) {
        const trainIndex = families.flatMap((f, i) => (f === family ? [] : [i]));
        const heldIndex = families.flatMap((f, i) => (f === family ? [i] : []));
        const trainLabels = trainIndex.map((i) => labels[i]);
        if (!trainLabels.some(Boolean) || trainLabels.every(Boolean)) {
            perFamily.push({
                family: family.length > 24 ? `${family.slice(0, 24)}…` : family,
                held: heldIndex.length,
                correct: null,
                accuracy: null,
                skipped: 'single-class-train'
            });
            continue;
        }
        const probe = fitBinaryProbe(
            trainIndex.map((i) => vectors[i]),
            trainLabels,
            fit
        );
        let familyCorrect = 0;
        for (const i of heldIndex) {
            const p = sigmoid(vectors[i].reduce((sum, value, j) => sum + value * probe.weights[j], probe.bias));
            if (p >= 0.5 === labels[i]) familyCorrect += 1;
        }
        correct += familyCorrect;
        perFamily.push({
            family: family.length > 24 ? `${family.slice(0, 24)}…` : family,
            held: heldIndex.length,
            correct: familyCorrect,
            accuracy: heldIndex.length ? familyCorrect / heldIndex.length : null
        });
    }
    const evaluated = perFamily.filter((entry) => entry.correct !== null).reduce((sum, entry) => sum + entry.held, 0);
    return { overall: { correct, total: evaluated, accuracy: evaluated ? correct / evaluated : null }, perFamily };
}
