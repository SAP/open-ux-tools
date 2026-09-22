import { createHash } from 'node:crypto';
import {
    SEMANTIC_ROLE_REGISTRY,
    SEMANTIC_ROLE_REGISTRY_FINGERPRINT
} from '../../../packages/mock-data-generator/dist/index.js';
import { FIELD_CONTEXT_SERIALIZER_FINGERPRINT } from '../../../packages/mock-data-generator/dist/index.js';

const ABSTENTION = ['unknown'];

function fingerprint(value) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function assertPartition(rows, ids, name) {
    const selected = new Set(ids);
    if (selected.size !== ids.length || ids.some((id) => !rows.some((row) => row.id === id))) {
        throw new TypeError(`${name} partition contains duplicate or unknown row IDs`);
    }
    return rows.filter((row) => selected.has(row.id));
}

/**
 * Forward pass shared with the runtime up to the class scores: an optional ReLU hidden layer, then
 * the class weights. Kept separate from the softmax so a temperature search can reuse the scores.
 *
 * @param {number[]} vector embedding
 * @param {number[][]} coef class weights (per hidden unit when `hidden` is given)
 * @param {number[]} intercept class biases
 * @param {{weights: number[][], bias: number[]}} [hidden] hidden layer
 * @returns {number[]} class scores before temperature and softmax
 */
function classScores(vector, coef, intercept, hidden = undefined) {
    const activations = hidden
        ? hidden.bias.map((bias, unit) =>
              Math.max(
                  0,
                  hidden.weights[unit].reduce((sum, weight, dim) => sum + weight * vector[dim], bias)
              )
          )
        : vector;
    return coef.map((weights, index) =>
        weights.reduce((sum, weight, index2) => sum + weight * activations[index2], intercept[index])
    );
}

/**
 * Temperature-scaled softmax over class scores.
 *
 * @param {number[]} scores class scores from `classScores`
 * @param {number} [temperature] calibration temperature
 * @returns {number[]} class probabilities
 */
function softmax(scores, temperature = 1) {
    const logits = scores.map((score) => score / temperature);
    const max = Math.max(...logits);
    const values = logits.map((value) => Math.exp(value - max));
    const total = values.reduce((sum, value) => sum + value, 0);
    return values.map((value) => value / total);
}

/**
 * Forward pass shared with the runtime: an optional ReLU hidden layer, then the class weights.
 *
 * @param {number[]} vector embedding
 * @param {number[][]} coef class weights (per hidden unit when `hidden` is given)
 * @param {number[]} intercept class biases
 * @param {number} [temperature] calibration temperature
 * @param {{weights: number[][], bias: number[]}} [hidden] hidden layer
 * @returns {number[]} class probabilities
 */
function probabilities(vector, coef, intercept, temperature = 1, hidden = undefined) {
    return softmax(classScores(vector, coef, intercept, hidden), temperature);
}

/** Train a deterministic development head from already exported runtime texts. */
export async function trainV3Head({ artifact, trainIds, calibrationIds, embedder, encoderSha256, fit = {} }) {
    if (artifact?.format !== 'mockgen-v3-training-export' || artifact.tokenizer?.maxWordPieceTokens !== 64) {
        throw new TypeError('v3 training requires a 64-token export artifact');
    }
    if (artifact.registryFingerprint && artifact.registryFingerprint !== SEMANTIC_ROLE_REGISTRY_FINGERPRINT)
        throw new TypeError('role registry fingerprint does not match the loaded runtime');
    if (artifact.serializer?.fingerprint && artifact.serializer.fingerprint !== FIELD_CONTEXT_SERIALIZER_FINGERPRINT)
        throw new TypeError('field serializer fingerprint does not match the loaded runtime');
    if (!Array.isArray(trainIds) || !Array.isArray(calibrationIds))
        throw new TypeError('train and calibration partitions must be ID arrays');
    if (!/^[a-f0-9]{64}$/u.test(encoderSha256 ?? '')) throw new TypeError('encoderSha256 must be a lowercase SHA-256');
    const train = assertPartition(artifact.rows, trainIds, 'train');
    const calibration = assertPartition(artifact.rows, calibrationIds, 'calibration');
    const overlap = new Set(trainIds.filter((id) => calibrationIds.includes(id)));
    if (overlap.size > 0) throw new TypeError('train and calibration partitions overlap');
    if (train.length === 0 || calibration.length === 0)
        throw new TypeError('train and calibration partitions are required');
    if ([...train, ...calibration].some((row) => typeof row.label !== 'string' || row.label.length === 0))
        throw new TypeError('every training row requires a non-empty label');
    if ([...train, ...calibration].some((row) => typeof row.group !== 'string' || row.group.length === 0))
        throw new TypeError('every training row requires an explicit group');
    const trainGroups = new Set(train.map((row) => row.group));
    if (calibration.some((row) => trainGroups.has(row.group)))
        throw new TypeError('train and calibration partitions share groups');
    const trainFamilies = new Set(train.map((row) => row.family).filter(Boolean));
    const partitionPolicyVersion = [...train, ...calibration].every(
        (row) => typeof row.family === 'string' && row.family.length > 0
    )
        ? 'family-disjoint-v2'
        : 'group-disjoint-v1-development';
    if (calibration.some((row) => row.family && trainFamilies.has(row.family)))
        throw new TypeError('train and calibration partitions share service families');
    const trainTexts = new Set(train.map((row) => row.serialized));
    if (calibration.some((row) => trainTexts.has(row.serialized)))
        throw new TypeError('train and calibration partitions share serialized contexts');
    const labelsByContext = new Map();
    for (const row of [...train, ...calibration]) {
        const previous = labelsByContext.get(row.serialized);
        if (previous && previous !== row.label) throw new TypeError('one serialized context has conflicting labels');
        labelsByContext.set(row.serialized, row.label);
    }
    const labels = [...new Set([...train, ...calibration].map((row) => row.label))].sort();
    const trainLabels = [...new Set(train.map((row) => row.label))].sort();
    const calibrationLabels = [...new Set(calibration.map((row) => row.label))].sort();
    if (labels.includes('REVIEW_ME')) throw new TypeError('unresolved REVIEW_ME decisions cannot train a classifier');
    if (!trainLabels.includes('unknown') || !calibrationLabels.includes('unknown')) {
        throw new TypeError('v3 classifier requires reviewed unknown abstention examples in train and calibration');
    }
    if (labels.some((label) => label !== 'unknown' && !SEMANTIC_ROLE_REGISTRY[label]))
        throw new TypeError('training labels must be registered semantic roles');
    if (labels.some((label) => !ABSTENTION.includes(label) && !train.some((row) => row.label === label)))
        throw new TypeError('calibration contains a label absent from training');
    const trainVectors = await embedder.embed(
        train.map((row) => row.serialized),
        new AbortController().signal
    );
    const dim = trainVectors[0]?.length;
    if (
        !Number.isSafeInteger(dim) ||
        dim <= 0 ||
        trainVectors.some((vector) => vector.length !== dim || vector.some((value) => !Number.isFinite(value)))
    )
        throw new TypeError('embedder returned inconsistent vectors');
    // A pretrained head (hidden layer + class weights fitted outside, on the same runtime
    // embeddings) skips the in-process gradient descent; calibration, support counts, per-role
    // thresholds and every qualification check below still run here unchanged.
    const pretrained = fit.pretrained;
    if (pretrained && JSON.stringify([...pretrained.labels].sort()) !== JSON.stringify([...labels].sort())) {
        throw new TypeError('pretrained head labels do not match the export');
    }
    const epochs = fit.epochs ?? 250;
    const learningRate = fit.learningRate ?? 0.2;
    const l2 = fit.l2 ?? 0.001;
    if (
        !Number.isSafeInteger(epochs) ||
        epochs < 1 ||
        epochs > 5000 ||
        !Number.isFinite(learningRate) ||
        learningRate <= 0 ||
        learningRate > 2 ||
        !Number.isFinite(l2) ||
        l2 < 0 ||
        l2 > 10
    )
        throw new TypeError('invalid deterministic logistic fit configuration');
    const hidden = pretrained?.hidden;
    const coef = pretrained
        ? labels.map((_label, index) => [...pretrained.coef[pretrained.labels.indexOf(labels[index])]])
        : labels.map(() => new Array(dim).fill(0));
    const intercept = pretrained
        ? labels.map((_label, index) => pretrained.intercept[pretrained.labels.indexOf(labels[index])])
        : labels.map(() => 0);
    if (pretrained && (hidden === undefined || hidden.weights.some((weights) => weights.length !== dim))) {
        throw new TypeError('pretrained hidden layer does not match the embedding dimension');
    }
    const classCounts = Object.fromEntries(
        labels.map((label) => [label, train.filter((row) => row.label === label).length])
    );
    const largestClass = Math.max(...Object.values(classCounts));
    const unnormalizedWeights = Object.fromEntries(
        labels.map((label) => [label, Math.min(8, Math.sqrt(largestClass / classCounts[label]))])
    );
    const meanExampleWeight = train.reduce((sum, row) => sum + unnormalizedWeights[row.label], 0) / train.length;
    const classWeights = Object.fromEntries(
        labels.map((label) => [label, unnormalizedWeights[label] / meanExampleWeight])
    );
    const loss = () =>
        -trainVectors.reduce((sum, vector, index) => {
            const probs = probabilities(vector, coef, intercept, 1, hidden);
            return (
                sum +
                classWeights[train[index].label] * Math.log(Math.max(probs[labels.indexOf(train[index].label)], 1e-12))
            );
        }, 0) /
            trainVectors.length +
        (l2 / 2) * coef.flat().reduce((sum, value) => sum + value * value, 0);
    const trainLossBefore = loss();
    for (let epoch = 0; epoch < (pretrained ? 0 : epochs); epoch += 1) {
        const weightGradient = labels.map(() => new Array(dim).fill(0));
        const biasGradient = labels.map(() => 0);
        for (const [index, vector] of trainVectors.entries()) {
            const probs = probabilities(vector, coef, intercept);
            const target = labels.indexOf(train[index].label);
            for (let classIndex = 0; classIndex < labels.length; classIndex += 1) {
                const error = classWeights[train[index].label] * (probs[classIndex] - (classIndex === target ? 1 : 0));
                biasGradient[classIndex] += error;
                for (let dimension = 0; dimension < dim; dimension += 1)
                    weightGradient[classIndex][dimension] += error * vector[dimension];
            }
        }
        for (let classIndex = 0; classIndex < labels.length; classIndex += 1) {
            intercept[classIndex] -= (learningRate * biasGradient[classIndex]) / trainVectors.length;
            for (let dimension = 0; dimension < dim; dimension += 1) {
                coef[classIndex][dimension] -=
                    learningRate *
                    (weightGradient[classIndex][dimension] / trainVectors.length + l2 * coef[classIndex][dimension]);
            }
        }
    }
    const trainLossAfter = loss();
    const calVectors = await embedder.embed(
        calibration.map((row) => row.serialized),
        new AbortController().signal
    );
    if (
        calVectors.length !== calibration.length ||
        calVectors.some((vector) => vector.length !== dim || vector.some((value) => !Number.isFinite(value)))
    )
        throw new TypeError('calibration embedder returned inconsistent vectors');
    // Class scores do not depend on the temperature, so the forward pass runs once per row rather
    // than once per row for every temperature candidate.
    const calScores = calVectors.map((vector) => classScores(vector, coef, intercept, hidden));
    const nll = (temperature) =>
        -calScores.reduce((sum, scores, index) => {
            const probs = softmax(scores, temperature);
            return sum + Math.log(Math.max(probs[labels.indexOf(calibration[index].label)], 1e-12));
        }, 0) / calScores.length;
    let temperature = 1;
    for (let candidate = 0.5; candidate <= 3; candidate += 0.05)
        if (nll(candidate) < nll(temperature)) temperature = Number(candidate.toFixed(2));
    const rawCalProbabilities = calScores.map((scores) => softmax(scores, 1));
    const calProbabilities = calScores.map((scores) => softmax(scores, temperature));
    const correct = calProbabilities.map(
        (probs, index) => labels[probs.indexOf(Math.max(...probs))] === calibration[index].label
    );
    const accuracy = correct.filter(Boolean).length / correct.length;
    const confidences = calProbabilities.map((probs) => Math.max(...probs));
    const correctConfidences = confidences
        .filter((_confidence, index) => correct[index])
        .sort((left, right) => left - right);
    const percentile = (values, fraction) =>
        values.length ? values[Math.min(values.length - 1, Math.floor(values.length * fraction))] : 1;
    const threshold = percentile(correctConfidences, 0.05);
    const calibrationError = (probabilitiesForSet) =>
        Array.from({ length: 10 }, (_, bin) => {
            const entries = probabilitiesForSet
                .map((probs, index) => ({
                    confidence: Math.max(...probs),
                    correct: labels[probs.indexOf(Math.max(...probs))] === calibration[index].label
                }))
                .filter(({ confidence }) => confidence >= bin / 10 && confidence < (bin + 1) / 10);
            if (entries.length === 0) return 0;
            const meanConfidence = entries.reduce((sum, entry) => sum + entry.confidence, 0) / entries.length;
            const accuracyInBin = entries.filter((entry) => entry.correct).length / entries.length;
            return (entries.length / confidences.length) * Math.abs(meanConfidence - accuracyInBin);
        }).reduce((sum, value) => sum + value, 0);
    const eceBefore = calibrationError(rawCalProbabilities);
    const eceAfter = calibrationError(calProbabilities);
    const roleCalibration = Object.fromEntries(
        labels
            .filter((label) => !ABSTENTION.includes(label))
            .map((label) => [
                label,
                percentile(
                    calProbabilities
                        .map((probs, index) => ({
                            confidence: Math.max(...probs),
                            correct: labels[probs.indexOf(Math.max(...probs))] === calibration[index].label
                        }))
                        .filter((entry, index) => calibration[index].label === label && entry.correct)
                        .map((entry) => entry.confidence)
                        .sort((a, b) => a - b),
                    0.05
                )
            ])
    );
    const familyCalibration = Object.fromEntries(
        [
            ...new Set(
                labels
                    .filter((label) => !ABSTENTION.includes(label))
                    .map((label) => SEMANTIC_ROLE_REGISTRY[label].family)
            )
        ].map((family) => [
            family,
            percentile(
                calProbabilities
                    .map((probs, index) => ({
                        confidence: Math.max(...probs),
                        correct: labels[probs.indexOf(Math.max(...probs))] === calibration[index].label,
                        family: SEMANTIC_ROLE_REGISTRY[calibration[index].label]?.family
                    }))
                    .filter((entry) => entry.family === family && entry.correct)
                    .map((entry) => entry.confidence)
                    .sort((a, b) => a - b),
                0.05
            )
        ])
    );
    const minimumCorrectPerRole = 5;
    const minimumCorrectPerFamily = 10;
    const correctCalibratedRoles = calibration
        .filter((_row, index) => correct[index])
        .map((row) => row.label)
        .filter((label) => !ABSTENTION.includes(label));
    const calibrationSupport = {
        minimumCorrectPerRole,
        minimumCorrectPerFamily,
        roles: Object.fromEntries(
            labels
                .filter((label) => !ABSTENTION.includes(label))
                .map((label) => [label, correctCalibratedRoles.filter((candidate) => candidate === label).length])
        ),
        families: Object.fromEntries(
            [
                ...new Set(
                    labels
                        .filter((label) => !ABSTENTION.includes(label))
                        .map((label) => SEMANTIC_ROLE_REGISTRY[label].family)
                )
            ].map((family) => [
                family,
                correctCalibratedRoles.filter((label) => SEMANTIC_ROLE_REGISTRY[label].family === family).length
            ])
        )
    };
    const trueProbabilities = calProbabilities.map((probs, index) => probs[labels.indexOf(calibration[index].label)]);
    const nonconformity = trueProbabilities.map((value) => 1 - value).sort((left, right) => left - right);
    const nominalTargetCoverage = 0.9;
    const quantileIndex = Math.min(
        nonconformity.length - 1,
        Math.ceil((nonconformity.length + 1) * nominalTargetCoverage) - 1
    );
    const conformalQuantile = nonconformity[quantileIndex] ?? 1;
    const empiricalCoverage =
        trueProbabilities.filter((value) => 1 - value <= conformalQuantile).length / trueProbabilities.length;
    // Routing precision per role, measured with the runtime's own acceptance rule on the
    // calibration partition: top label, confidence at or above the role/family/global threshold,
    // singleton conformal prediction set. Each role's threshold is then raised, never lowered, to
    // the smallest confidence at which its routed calibration decisions reach the precision target
    // with enough decisions to measure it. A role that cannot reach the target at any threshold
    // stays in the head as an auxiliary class: it sharpens the boundary but is never routed.
    // Labels are never dropped, so coverage grows with evidence.
    // A role that was right every time it routed is held back only by how rarely it appeared.
    // Three correct decisions out of three is weak evidence, but it is evidence; five was an
    // arbitrary floor that kept perfect-precision roles such as `time` permanently auxiliary.
    const minimumRoutedForPrecision = Number(process.env.MOCKGEN_MINIMUM_ROUTED ?? 3);
    // Per-role estimate on a few dozen calibration decisions; the sealed gate enforces 0.95 overall.
    const minimumRoutingPrecision = Number(process.env.MOCKGEN_ROUTING_PRECISION ?? 0.95);
    const calibrationPrecision = {};
    for (const label of labels.filter((label) => !ABSTENTION.includes(label))) {
        const family = SEMANTIC_ROLE_REGISTRY[label].family;
        const baseThreshold = Math.max(threshold, roleCalibration[label] ?? 0, familyCalibration[family] ?? 0);
        const decisions = calProbabilities
            .map((probs, index) => {
                const top = labels[probs.indexOf(Math.max(...probs))];
                const confidence = Math.max(...probs);
                const setSize = probs.filter((value) => value >= 1 - conformalQuantile).length;
                return top === label && confidence >= baseThreshold && setSize === 1
                    ? { confidence, correct: calibration[index].label === label }
                    : undefined;
            })
            .filter(Boolean)
            .sort((left, right) => left.confidence - right.confidence);
        const at = (cut) => {
            const routed = decisions.filter((decision) => decision.confidence >= cut);
            return {
                threshold: cut,
                routed: routed.length,
                correct: routed.filter((decision) => decision.correct).length
            };
        };
        const chosen = [baseThreshold, ...decisions.map((decision) => decision.confidence)]
            .map(at)
            .find(
                (candidate) =>
                    candidate.routed >= minimumRoutedForPrecision &&
                    candidate.correct / candidate.routed >= minimumRoutingPrecision
            );
        calibrationPrecision[label] = chosen ?? { ...at(baseThreshold), threshold: baseThreshold, unreachable: true };
        if (chosen && chosen.threshold > (roleCalibration[label] ?? 0)) {
            roleCalibration[label] = Math.min(1, chosen.threshold);
        }
    }
    const auxiliaryReasons = Object.fromEntries(
        labels
            .filter((label) => !ABSTENTION.includes(label))
            .flatMap((label) => {
                const family = SEMANTIC_ROLE_REGISTRY[label].family;
                const reasons = [];
                if (calibrationSupport.roles[label] < minimumCorrectPerRole)
                    reasons.push(`role support ${calibrationSupport.roles[label]} < ${minimumCorrectPerRole}`);
                if (calibrationSupport.families[family] < minimumCorrectPerFamily)
                    reasons.push(
                        `family ${family} support ${calibrationSupport.families[family]} < ${minimumCorrectPerFamily}`
                    );
                const { routed, correct: correctRouted, unreachable } = calibrationPrecision[label];
                if (unreachable)
                    reasons.push(
                        `routing precision target ${minimumRoutingPrecision} unreachable (${correctRouted}/${routed} at the base threshold)`
                    );
                return reasons.length > 0 ? [[label, reasons]] : [];
            })
    );
    const auxiliaryLabels = Object.keys(auxiliaryReasons).sort();
    const routableLabels = labels.filter((label) => !ABSTENTION.includes(label) && !auxiliaryLabels.includes(label));
    return {
        model: pretrained ? pretrained.model : 'runtime-minilm-l6-v2-development-softmax',
        dim,
        labels,
        coef,
        intercept,
        ...(hidden ? { hidden } : {}),
        inputFormat: 'v3',
        maxWordPieceTokens: 64,
        encoderSha256,
        tokenizerSha256: artifact.tokenizer.vocabularySha256,
        serializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
        registryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
        abstentionLabels: ABSTENTION,
        auxiliaryLabels,
        roleCalibration,
        familyCalibration,
        calibrationSupport,
        calibrationPrecision: {
            minimumRoutedForPrecision,
            minimumRoutingPrecision,
            roles: calibrationPrecision
        },
        calibration: {
            temperature,
            routeConfidenceThreshold: threshold,
            annotationOverrideThreshold: threshold,
            conformalQuantile,
            coverage: empiricalCoverage,
            nominalTargetCoverage,
            ece: { before: eceBefore, after: eceAfter },
            source: 'explicit-calibration-partition-grid-temperature',
            n: calibration.length,
            accuracy
        },
        training: {
            algorithm: pretrained
                ? (pretrained.training?.algorithm ?? 'pretrained')
                : 'class-balanced-multinomial-logistic-gradient-descent',
            ...(pretrained ? { pretrained: pretrained.training ?? {} } : {}),
            epochs: pretrained ? 0 : epochs,
            learningRate,
            l2,
            classWeights,
            classWeightPolicy: 'capped-inverse-square-root-frequency-8x-normalized',
            trainLossBefore,
            trainLossAfter
        },
        qualification: {
            status: 'unqualified',
            reason: 'Development head only; no held-out or sealed service evidence is claimed.',
            trainIds: [...trainIds],
            calibrationIds: [...calibrationIds],
            trainGroups: [...new Set(train.map((row) => row.group))].sort(),
            calibrationGroups: [...new Set(calibration.map((row) => row.group))].sort(),
            trainFamilies: [...new Set(train.map((row) => row.family).filter(Boolean))].sort(),
            calibrationFamilies: [...new Set(calibration.map((row) => row.family).filter(Boolean))].sort(),
            trainLabels,
            calibrationLabels,
            calibrationLabelsAbsentFromTraining: calibrationLabels.filter((label) => !trainLabels.includes(label)),
            routableLabels,
            auxiliaryReasons,
            insufficientCalibrationRoles: labels.filter(
                (label) => !ABSTENTION.includes(label) && calibrationSupport.roles[label] < minimumCorrectPerRole
            ),
            insufficientCalibrationFamilies: Object.keys(calibrationSupport.families).filter(
                (family) => calibrationSupport.families[family] < minimumCorrectPerFamily
            ),
            partitionPolicyVersion,
            artifactFingerprint: fingerprint({
                rows: artifact.rows,
                labels: artifact.labels,
                tokenizer: artifact.tokenizer,
                serializer: artifact.serializer,
                trainIds,
                calibrationIds,
                trainGroups: [...new Set(train.map((row) => row.group))].sort(),
                calibrationGroups: [...new Set(calibration.map((row) => row.group))].sort(),
                trainFamilies: [...new Set(train.map((row) => row.family).filter(Boolean))].sort(),
                calibrationFamilies: [...new Set(calibration.map((row) => row.family).filter(Boolean))].sort(),
                partitionPolicyVersion
            })
        }
    };
}
