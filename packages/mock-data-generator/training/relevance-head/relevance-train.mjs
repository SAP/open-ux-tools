import { sha256 } from '../common/io.mjs';
import { FIELD_VALUE_RELEVANCE_SERIALIZER_FINGERPRINT, serializeCandidateRelevancePair } from '../common/runtime.mjs';

const fingerprint = (value) => sha256(JSON.stringify(value));

/**
 * Rows of one partition: unique, known ids with both positives and hard negatives.
 * @param {object[]} rows reviewed rows
 * @param {string[]} ids partition ids
 * @param {string} name partition name, for the error
 * @returns {object[]} the rows in id order
 */
function selectPartition(rows, ids, name) {
    if (!Array.isArray(ids) || ids.length === 0 || new Set(ids).size !== ids.length) {
        throw new TypeError(`${name} partition must contain unique row IDs`);
    }
    const index = new Map(rows.map((row) => [row.id, row]));
    const selected = ids.map((id) => index.get(id));
    if (selected.some((row) => !row)) {
        throw new TypeError(`${name} partition contains an unknown row ID`);
    }
    if (!selected.some((row) => row.relevant) || !selected.some((row) => !row.relevant)) {
        throw new TypeError(`${name} partition needs reviewed positives and cross-domain hard negatives`);
    }
    return selected;
}

/**
 * Require reviewed, service-identified rows whose negatives are hard negatives and whose pairs serialize.
 * @param {object[]} rows reviewed rows
 */
function assertReviewedRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0 || new Set(rows.map((row) => row.id)).size !== rows.length) {
        throw new TypeError('relevance training rows must have unique IDs');
    }
    for (const row of rows) {
        if (
            typeof row.id !== 'string' ||
            row.id.length === 0 ||
            typeof row.serviceGroup !== 'string' ||
            row.serviceGroup.length === 0 ||
            row.reviewed !== true ||
            typeof row.relevant !== 'boolean' ||
            !row.pair
        ) {
            throw new TypeError('every relevance pair must be reviewed and service-identified');
        }
        if (!row.relevant && !['cross-domain', 'kind-mismatch'].includes(row.negativeKind)) {
            throw new TypeError('negative relevance examples must be reviewed cross-domain hard negatives');
        }
        serializeCandidateRelevancePair(row.pair);
    }
}

/**
 * Require partitions to be disjoint by row, service group, service identity and serialized pair, in order.
 * @param {Array<[string, object[]]>} partitions named partitions
 * @throws {TypeError} naming the first partition that overlaps an earlier one
 */
export function assertDisjoint(partitions) {
    const seenIds = new Set();
    const seenServices = new Set();
    const seenServiceIdentities = new Set();
    const seenTexts = new Set();
    for (const [name, rows] of partitions) {
        const services = new Set(rows.map((row) => row.serviceGroup));
        const serviceIdentities = new Set(
            rows.map(
                (row) => `${row.pair.service.odataVersion}|${row.pair.service.urlPath}|${row.pair.service.alias ?? ''}`
            )
        );
        const texts = new Set(rows.map((row) => serializeCandidateRelevancePair(row.pair)));
        if (texts.size !== rows.length) {
            throw new TypeError(`${name} partition contains a duplicate field/value pair`);
        }
        for (const row of rows) {
            if (seenIds.has(row.id)) {
                throw new TypeError(`${name} partition overlaps an earlier partition`);
            }
            seenIds.add(row.id);
        }
        if (
            [...services].some((service) => seenServices.has(service)) ||
            [...serviceIdentities].some((identity) => seenServiceIdentities.has(identity))
        ) {
            throw new TypeError(`${name} partition is not service-disjoint`);
        }
        if ([...texts].some((text) => seenTexts.has(text))) {
            throw new TypeError(`${name} partition repeats a field/value pair from an earlier partition`);
        }
        services.forEach((service) => seenServices.add(service));
        serviceIdentities.forEach((identity) => seenServiceIdentities.add(identity));
        texts.forEach((text) => seenTexts.add(text));
    }
}

/**
 * Embed the serialized pairs of rows and check the vectors.
 * @param {object[]} rows reviewed rows
 * @param {{ embed: (texts: string[], signal: object) => Promise<number[][]> }} embedder runtime encoder
 * @param {number} [expectedDimension] required dimension
 * @returns {Promise<{ vectors: number[][], dimension: number }>} vectors and their dimension
 */
async function vectorsFor(rows, embedder, expectedDimension) {
    const vectors = await embedder.embed(
        rows.map((row) => serializeCandidateRelevancePair(row.pair)),
        new AbortController().signal
    );
    const dimension = expectedDimension ?? vectors[0]?.length;
    if (
        vectors.length !== rows.length ||
        !Number.isSafeInteger(dimension) ||
        dimension <= 0 ||
        vectors.some((vector) => vector.length !== dimension || vector.some((value) => !Number.isFinite(value)))
    ) {
        throw new TypeError('relevance encoder returned invalid or inconsistent vectors');
    }
    return { vectors, dimension };
}

/**
 * Numerically stable logistic function.
 * @param {number} logit logit
 * @returns {number} probability
 */
function sigmoid(logit) {
    return logit >= 0 ? 1 / (1 + Math.exp(-logit)) : Math.exp(logit) / (1 + Math.exp(logit));
}

/**
 * Relevance probability of one vector under a head.
 * @param {{ coef: number[], intercept: number, temperature: number }} head relevance head
 * @param {number[]} vector pair embedding
 * @returns {number} probability
 */
function probability(head, vector) {
    const logit = vector.reduce((sum, value, index) => sum + value * head.coef[index], head.intercept);
    return sigmoid(logit / head.temperature);
}

/**
 * Acceptance counts and rates of a head on reviewed rows.
 * @param {object[]} rows reviewed rows
 * @param {number[][]} vectors their embeddings
 * @param {{ threshold: number }} head relevance head
 * @returns {object} counts and rates
 */
function measure(rows, vectors, head) {
    const decisions = rows.map((row, index) => ({
        relevant: row.relevant,
        accepted: probability(head, vectors[index]) >= head.threshold
    }));
    const positives = decisions.filter(({ relevant }) => relevant);
    const negatives = decisions.filter(({ relevant }) => !relevant);
    return Object.freeze({
        total: rows.length,
        positives: positives.length,
        hardNegatives: negatives.length,
        positiveAccepted: positives.filter(({ accepted }) => accepted).length,
        hardNegativeAccepted: negatives.filter(({ accepted }) => accepted).length,
        positiveAcceptance: positives.filter(({ accepted }) => accepted).length / positives.length,
        hardNegativeAcceptance: negatives.filter(({ accepted }) => accepted).length / negatives.length
    });
}

/**
 * Fingerprint reviewed relevance rows exactly as the trainer records them.
 * @param {object[]} rows reviewed rows
 * @returns {string} sha256
 */
export function relevanceDataFingerprint(rows) {
    return fingerprint(rows.map(({ id, serviceGroup, relevant, pair }) => ({ id, serviceGroup, relevant, pair })));
}

/**
 * Validate reviewed, service-disjoint partitions before any encoder work.
 * @param {object} options options
 * @param {object[]} options.rows reviewed rows
 * @param {string[]} options.trainIds train ids
 * @param {string[]} options.calibrationIds calibration ids
 * @param {string[]} options.sealedIds sealed ids
 * @param {string} options.encoderSha256 encoder digest
 * @param {string} options.vocabularySha256 vocabulary digest
 * @returns {{ train: object[], calibration: object[], sealed: object[] }} the partitions
 */
export function validateRelevanceDataset({
    rows,
    trainIds,
    calibrationIds,
    sealedIds,
    encoderSha256,
    vocabularySha256
}) {
    assertReviewedRows(rows);
    if (!/^[a-f\d]{64}$/u.test(encoderSha256 ?? '') || !/^[a-f\d]{64}$/u.test(vocabularySha256 ?? '')) {
        throw new TypeError('relevance encoder and vocabulary SHA-256 values are required');
    }
    const train = selectPartition(rows, trainIds, 'training');
    const calibration = selectPartition(rows, calibrationIds, 'calibration');
    const sealed = selectPartition(rows, sealedIds, 'sealed');
    assertDisjoint([
        ['training', train],
        ['calibration', calibration],
        ['sealed', sealed]
    ]);
    return { train, calibration, sealed };
}

/**
 * Train an unqualified binary relevance head: full-batch logistic regression on encoder embeddings of the
 * serialized pairs, threshold set on calibration hard negatives at the negative budget (default 1%),
 * never below 0.5. Sealed rows are checked for leakage but never used to fit or calibrate.
 * @param {object} options options
 * @param {object[]} options.rows reviewed rows
 * @param {string[]} options.trainIds train ids
 * @param {string[]} options.calibrationIds calibration ids
 * @param {string[]} options.sealedIds sealed ids
 * @param {string} options.encoderSha256 encoder digest
 * @param {string} options.vocabularySha256 vocabulary digest
 * @param {{ embed: (texts: string[], signal: object) => Promise<number[][]> }} options.embedder runtime encoder
 * @param {{ epochs?: number, learningRate?: number, l2?: number, negativeBudget?: number }} [options.fit] fit settings
 * @returns {Promise<{ head: object, calibration: object }>} the head and its calibration measurement
 */
export async function trainRelevanceHead({
    rows,
    trainIds,
    calibrationIds,
    sealedIds,
    encoderSha256,
    vocabularySha256,
    embedder,
    fit = {}
}) {
    const { train, calibration } = validateRelevanceDataset({
        rows,
        trainIds,
        calibrationIds,
        sealedIds,
        encoderSha256,
        vocabularySha256
    });
    const { epochs = 2000, learningRate = 0.2, l2 = 0.001, negativeBudget = 0.01 } = fit;
    if (
        !Number.isSafeInteger(epochs) ||
        epochs < 1 ||
        epochs > 5000 ||
        !(learningRate > 0 && learningRate <= 2) ||
        !(l2 >= 0 && l2 <= 10) ||
        !(negativeBudget > 0 && negativeBudget <= 0.2)
    ) {
        throw new TypeError('invalid relevance fit configuration');
    }
    const { vectors: trainVectors, dimension } = await vectorsFor(train, embedder);
    const coef = new Array(dimension).fill(0);
    let intercept = 0;
    for (let epoch = 0; epoch < epochs; epoch++) {
        const gradient = new Array(dimension).fill(0);
        let biasGradient = 0;
        for (const [index, row] of train.entries()) {
            const vector = trainVectors[index];
            const logit = vector.reduce((sum, value, dim) => sum + value * coef[dim], intercept);
            const error = sigmoid(logit) - Number(row.relevant);
            biasGradient += error;
            vector.forEach((value, dim) => {
                gradient[dim] += error * value;
            });
        }
        intercept -= (learningRate * biasGradient) / train.length;
        for (let dim = 0; dim < dimension; dim++) {
            coef[dim] -= learningRate * (gradient[dim] / train.length + l2 * coef[dim]);
        }
    }
    const { vectors: calibrationVectors } = await vectorsFor(calibration, embedder, dimension);
    const uncalibrated = { coef, intercept, temperature: 1 };
    const negativeProbabilities = calibration
        .flatMap((row, index) => (row.relevant ? [] : [probability(uncalibrated, calibrationVectors[index])]))
        .sort((left, right) => left - right);
    const negativeQuantile =
        negativeProbabilities[
            Math.min(
                negativeProbabilities.length - 1,
                Math.ceil((1 - negativeBudget) * negativeProbabilities.length) - 1
            )
        ] ?? 1;
    const threshold = Math.min(1 - 1e-9, Math.max(0.5, negativeQuantile + 1e-6));
    const head = Object.freeze({
        model: 'field-value-relevance-v1',
        dim: dimension,
        coef: Object.freeze(coef),
        intercept,
        temperature: 1,
        threshold,
        maxWordPieceTokens: 64,
        encoderSha256,
        tokenizerSha256: vocabularySha256,
        serializerFingerprint: FIELD_VALUE_RELEVANCE_SERIALIZER_FINGERPRINT,
        qualification: Object.freeze({
            status: 'unqualified',
            reason: 'Sealed evaluation, blinded review and human approval are required before packaging.',
            trainingDataFingerprint: relevanceDataFingerprint(train),
            calibrationDataFingerprint: relevanceDataFingerprint(calibration),
            sealedIds: Object.freeze([...sealedIds])
        })
    });
    return Object.freeze({ head, calibration: measure(calibration, calibrationVectors, head) });
}

/**
 * Evaluate a frozen head on a separate reviewed partition without changing its threshold.
 * @param {object} options options
 * @param {object} options.head relevance head
 * @param {object[]} options.rows reviewed rows to evaluate
 * @param {{ embed: (texts: string[], signal: object) => Promise<number[][]> }} options.embedder runtime encoder
 * @returns {Promise<object>} acceptance counts and rates
 */
export async function evaluateRelevanceHead({ head, rows, embedder }) {
    assertReviewedRows(rows);
    if (!rows.some((row) => row.relevant) || !rows.some((row) => !row.relevant)) {
        throw new TypeError('relevance evaluation needs positive and cross-domain negative pairs');
    }
    const { vectors } = await vectorsFor(rows, embedder, head.dim);
    return measure(rows, vectors, head);
}
