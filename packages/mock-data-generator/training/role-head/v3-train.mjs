import { sha256 } from '../common/io.mjs';
import { FIELD_CONTEXT_SERIALIZER_FINGERPRINT, roleRegistryContract } from '../common/runtime.mjs';

const ABSTENTION = ['unknown'];
const MINIMUM_CORRECT_PER_ROLE = 5;
const MINIMUM_CORRECT_PER_FAMILY = 10;
const NOMINAL_TARGET_COVERAGE = 0.9;

/**
 * Rows of one partition, refusing duplicate or unknown ids.
 * @param {object[]} rows export rows
 * @param {string[]} ids partition ids
 * @param {string} name partition name, for the error
 * @returns {object[]} the rows in export order
 */
function selectPartition(rows, ids, name) {
    const selected = new Set(ids);
    const byId = new Set(rows.map((row) => row.id));
    if (selected.size !== ids.length || ids.some((id) => !byId.has(id))) {
        throw new TypeError(`${name} partition contains duplicate or unknown row IDs`);
    }
    return rows.filter((row) => selected.has(row.id));
}

/**
 * Class scores before temperature and softmax: the optional ReLU hidden layer, then the class weights.
 * @param {number[]} vector embedding
 * @param {number[][]} coef class weights
 * @param {number[]} intercept class biases
 * @param {{ weights: number[][], bias: number[] }} [hidden] hidden layer
 * @returns {number[]} class scores
 */
function classScores(vector, coef, intercept, hidden) {
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
 * Softmax of class scores at a temperature.
 * @param {number[]} scores class scores
 * @param {number} [temperature] temperature
 * @returns {number[]} probabilities
 */
function softmax(scores, temperature = 1) {
    const logits = scores.map((score) => score / temperature);
    const max = Math.max(...logits);
    const values = logits.map((value) => Math.exp(value - max));
    const total = values.reduce((sum, value) => sum + value, 0);
    return values.map((value) => value / total);
}

const percentile = (values, fraction) =>
    values.length ? values[Math.min(values.length - 1, Math.floor(values.length * fraction))] : 1;

/**
 * Check partitions before any encoder work: disjoint ids, groups, families and texts, consistent labels,
 * registered roles and reviewed `unknown` examples on both sides.
 * @param {object} artifact v3 export
 * @param {string[]} trainIds train ids
 * @param {string[]} calibrationIds calibration ids
 * @param {Readonly<Record<string, { family: string }>>} roles role registry
 * @returns {{ train: object[], calibration: object[], labels: string[], partitionPolicyVersion: string }} the partitions
 */
function checkedPartitions(artifact, trainIds, calibrationIds, roles) {
    const train = selectPartition(artifact.rows, trainIds, 'train');
    const calibration = selectPartition(artifact.rows, calibrationIds, 'calibration');
    const trainIdSet = new Set(trainIds);
    if (calibrationIds.some((id) => trainIdSet.has(id))) {
        throw new TypeError('train and calibration partitions overlap');
    }
    if (train.length === 0 || calibration.length === 0) {
        throw new TypeError('train and calibration partitions are required');
    }
    const all = [...train, ...calibration];
    if (all.some((row) => typeof row.label !== 'string' || row.label.length === 0)) {
        throw new TypeError('every training row requires a non-empty label');
    }
    if (all.some((row) => typeof row.group !== 'string' || row.group.length === 0)) {
        throw new TypeError('every training row requires an explicit group');
    }
    const trainGroups = new Set(train.map((row) => row.group));
    if (calibration.some((row) => trainGroups.has(row.group))) {
        throw new TypeError('train and calibration partitions share groups');
    }
    const trainFamilies = new Set(train.map((row) => row.family).filter(Boolean));
    if (calibration.some((row) => row.family && trainFamilies.has(row.family))) {
        throw new TypeError('train and calibration partitions share service families');
    }
    const trainTexts = new Set(train.map((row) => row.serialized));
    if (calibration.some((row) => trainTexts.has(row.serialized))) {
        throw new TypeError('train and calibration partitions share serialized contexts');
    }
    const labelsByContext = new Map();
    for (const row of all) {
        const previous = labelsByContext.get(row.serialized);
        if (previous && previous !== row.label) {
            throw new TypeError('one serialized context has conflicting labels');
        }
        labelsByContext.set(row.serialized, row.label);
    }
    const labels = [...new Set(all.map((row) => row.label))].sort();
    if (labels.includes('REVIEW_ME')) {
        throw new TypeError('unresolved REVIEW_ME decisions cannot train a classifier');
    }
    if (!train.some((row) => row.label === 'unknown') || !calibration.some((row) => row.label === 'unknown')) {
        throw new TypeError('v3 classifier requires reviewed unknown abstention examples in train and calibration');
    }
    if (labels.some((label) => label !== 'unknown' && !Object.hasOwn(roles, label))) {
        throw new TypeError('training labels must be registered semantic roles');
    }
    if (labels.some((label) => !ABSTENTION.includes(label) && !train.some((row) => row.label === label))) {
        throw new TypeError('calibration contains a label absent from training');
    }
    const partitionPolicyVersion = all.every((row) => typeof row.family === 'string' && row.family.length > 0)
        ? 'family-disjoint-v2'
        : 'group-disjoint-v1-development';
    return { train, calibration, labels, partitionPolicyVersion };
}

/**
 * Calibrate a pretrained MLP head (see train_mlp_head.py, ensemble_mlp_heads.py) into a v3 role head.
 *
 * On the calibration partition only: grid-searched temperature, a global route threshold, per-role and
 * per-family thresholds (5th percentile of correct confidences), a 90% conformal quantile, calibration
 * support counts, and per-role routing precision with the runtime's own acceptance rule. A role whose
 * thresholds cannot reach the routing precision target, or whose support is below the floors, stays in
 * the head as an auxiliary class: it shapes the decision boundary but is never routed.
 * @param {object} options options
 * @param {object} options.artifact v3 export (export-dataset.mjs)
 * @param {string[]} options.trainIds train ids
 * @param {string[]} options.calibrationIds calibration ids
 * @param {{ embed: (texts: string[], signal: object) => Promise<number[][]> }} options.embedder runtime encoder
 * @param {string} options.encoderSha256 encoder digest the head pins
 * @param {object} options.pretrained pretrained head with `labels`, `hidden`, `coef`, `intercept`, `training`
 * @param {number} [options.minimumRoutingPrecision] per-role precision target on calibration
 * @param {number} [options.minimumRoutedForPrecision] decisions needed to measure that precision
 * @returns {Promise<object>} the unqualified head
 */
export async function trainV3Head({
    artifact,
    trainIds,
    calibrationIds,
    embedder,
    encoderSha256,
    pretrained,
    minimumRoutingPrecision = 0.95,
    minimumRoutedForPrecision = 3
}) {
    const { roles, fingerprint: registryFingerprint } = roleRegistryContract();
    if (artifact?.format !== 'mockgen-v3-training-export' || artifact.tokenizer?.maxWordPieceTokens !== 64) {
        throw new TypeError('v3 training requires a 64-token export artifact');
    }
    if (artifact.registryFingerprint && artifact.registryFingerprint !== registryFingerprint) {
        throw new TypeError('role registry fingerprint does not match the loaded runtime');
    }
    if (artifact.serializer?.fingerprint && artifact.serializer.fingerprint !== FIELD_CONTEXT_SERIALIZER_FINGERPRINT) {
        throw new TypeError('field serializer fingerprint does not match the loaded runtime');
    }
    if (!Array.isArray(trainIds) || !Array.isArray(calibrationIds)) {
        throw new TypeError('train and calibration partitions must be ID arrays');
    }
    if (!/^[a-f0-9]{64}$/u.test(encoderSha256 ?? '')) {
        throw new TypeError('encoderSha256 must be a lowercase SHA-256');
    }
    if (!(minimumRoutingPrecision > 0 && minimumRoutingPrecision <= 1) || !(minimumRoutedForPrecision >= 1)) {
        throw new TypeError('routing precision must be in (0, 1] and minimum routed at least 1');
    }
    const { train, calibration, labels, partitionPolicyVersion } = checkedPartitions(
        artifact,
        trainIds,
        calibrationIds,
        roles
    );
    if (!pretrained || JSON.stringify([...pretrained.labels].sort()) !== JSON.stringify(labels)) {
        throw new TypeError('pretrained head labels do not match the export');
    }
    const dim = pretrained.dim;
    const hidden = pretrained.hidden;
    if (
        !Number.isSafeInteger(dim) ||
        !Array.isArray(hidden?.weights) ||
        hidden.weights.some((row) => row.length !== dim)
    ) {
        throw new TypeError('pretrained hidden layer does not match the embedding dimension');
    }
    const coef = labels.map((label) => [...pretrained.coef[pretrained.labels.indexOf(label)]]);
    const intercept = labels.map((label) => pretrained.intercept[pretrained.labels.indexOf(label)]);
    const family = (label) => roles[label]?.family;

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

    const calVectors = await embedder.embed(
        calibration.map((row) => row.serialized),
        new AbortController().signal
    );
    if (
        calVectors.length !== calibration.length ||
        calVectors.some((vector) => vector.length !== dim || vector.some((value) => !Number.isFinite(value)))
    ) {
        throw new TypeError('calibration embedder returned inconsistent vectors');
    }
    const calScores = calVectors.map((vector) => classScores(vector, coef, intercept, hidden));
    const nll = (temperature) =>
        -calScores.reduce((sum, scores, index) => {
            const probs = softmax(scores, temperature);
            return sum + Math.log(Math.max(probs[labels.indexOf(calibration[index].label)], 1e-12));
        }, 0) / calScores.length;
    let temperature = 1;
    for (let candidate = 0.5; candidate <= 3; candidate += 0.05) {
        if (nll(candidate) < nll(temperature)) {
            temperature = Number(candidate.toFixed(2));
        }
    }
    const rawCalProbabilities = calScores.map((scores) => softmax(scores, 1));
    const calProbabilities = calScores.map((scores) => softmax(scores, temperature));
    const topOf = (probs) => labels[probs.indexOf(Math.max(...probs))];
    const correct = calProbabilities.map((probs, index) => topOf(probs) === calibration[index].label);
    const accuracy = correct.filter(Boolean).length / correct.length;
    const confidences = calProbabilities.map((probs) => Math.max(...probs));
    const threshold = percentile(
        confidences.filter((_confidence, index) => correct[index]).sort((left, right) => left - right),
        0.05
    );
    const calibrationError = (probabilitiesForSet) =>
        Array.from({ length: 10 }, (_, bin) => {
            const entries = probabilitiesForSet
                .map((probs, index) => ({
                    confidence: Math.max(...probs),
                    correct: topOf(probs) === calibration[index].label
                }))
                .filter(({ confidence }) => confidence >= bin / 10 && confidence < (bin + 1) / 10);
            if (entries.length === 0) {
                return 0;
            }
            const meanConfidence = entries.reduce((sum, entry) => sum + entry.confidence, 0) / entries.length;
            const accuracyInBin = entries.filter((entry) => entry.correct).length / entries.length;
            return (entries.length / confidences.length) * Math.abs(meanConfidence - accuracyInBin);
        }).reduce((sum, value) => sum + value, 0);
    const routable = labels.filter((label) => !ABSTENTION.includes(label));
    const families = [...new Set(routable.map(family))];
    const correctConfidencesWhere = (predicate) =>
        confidences
            .filter((_confidence, index) => correct[index] && predicate(calibration[index].label))
            .sort((left, right) => left - right);
    const roleCalibration = Object.fromEntries(
        routable.map((label) => [
            label,
            percentile(
                correctConfidencesWhere((expected) => expected === label),
                0.05
            )
        ])
    );
    const familyCalibration = Object.fromEntries(
        families.map((name) => [
            name,
            percentile(
                correctConfidencesWhere((expected) => family(expected) === name),
                0.05
            )
        ])
    );
    const correctRoles = calibration
        .filter((_row, index) => correct[index])
        .map((row) => row.label)
        .filter((label) => !ABSTENTION.includes(label));
    const calibrationSupport = {
        minimumCorrectPerRole: MINIMUM_CORRECT_PER_ROLE,
        minimumCorrectPerFamily: MINIMUM_CORRECT_PER_FAMILY,
        roles: Object.fromEntries(
            routable.map((label) => [label, correctRoles.filter((role) => role === label).length])
        ),
        families: Object.fromEntries(
            families.map((name) => [name, correctRoles.filter((role) => family(role) === name).length])
        )
    };
    const trueProbabilities = calProbabilities.map((probs, index) => probs[labels.indexOf(calibration[index].label)]);
    const nonconformity = trueProbabilities.map((value) => 1 - value).sort((left, right) => left - right);
    const quantileIndex = Math.min(
        nonconformity.length - 1,
        Math.ceil((nonconformity.length + 1) * NOMINAL_TARGET_COVERAGE) - 1
    );
    const conformalQuantile = nonconformity[quantileIndex] ?? 1;
    const empiricalCoverage =
        trueProbabilities.filter((value) => 1 - value <= conformalQuantile).length / trueProbabilities.length;

    // Each role's threshold is raised, never lowered, to the smallest confidence at which its routed
    // calibration decisions reach the precision target with enough decisions to measure it.
    const calibrationPrecision = {};
    for (const label of routable) {
        const baseThreshold = Math.max(threshold, roleCalibration[label] ?? 0, familyCalibration[family(label)] ?? 0);
        const decisions = calProbabilities
            .map((probs, index) => {
                const confidence = Math.max(...probs);
                const setSize = probs.filter((value) => value >= 1 - conformalQuantile).length;
                return topOf(probs) === label && confidence >= baseThreshold && setSize === 1
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
        routable.flatMap((label) => {
            const reasons = [];
            if (calibrationSupport.roles[label] < MINIMUM_CORRECT_PER_ROLE) {
                reasons.push(`role support ${calibrationSupport.roles[label]} < ${MINIMUM_CORRECT_PER_ROLE}`);
            }
            const familySupport = calibrationSupport.families[family(label)];
            if (familySupport < MINIMUM_CORRECT_PER_FAMILY) {
                reasons.push(`family ${family(label)} support ${familySupport} < ${MINIMUM_CORRECT_PER_FAMILY}`);
            }
            const { routed, correct: correctRouted, unreachable } = calibrationPrecision[label];
            if (unreachable) {
                reasons.push(
                    `routing precision target ${minimumRoutingPrecision} unreachable (${correctRouted}/${routed} at the base threshold)`
                );
            }
            return reasons.length > 0 ? [[label, reasons]] : [];
        })
    );
    const auxiliaryLabels = Object.keys(auxiliaryReasons).sort();
    const sortedSet = (values) => [...new Set(values.filter(Boolean))].sort();
    const partitionIdentity = {
        trainGroups: sortedSet(train.map((row) => row.group)),
        calibrationGroups: sortedSet(calibration.map((row) => row.group)),
        trainFamilies: sortedSet(train.map((row) => row.family)),
        calibrationFamilies: sortedSet(calibration.map((row) => row.family))
    };
    const trainLabels = sortedSet(train.map((row) => row.label));
    const calibrationLabels = sortedSet(calibration.map((row) => row.label));
    return {
        model: pretrained.model,
        dim,
        labels,
        coef,
        intercept,
        hidden,
        inputFormat: 'v3',
        maxWordPieceTokens: 64,
        encoderSha256,
        tokenizerSha256: artifact.tokenizer.vocabularySha256,
        serializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
        registryFingerprint,
        abstentionLabels: ABSTENTION,
        auxiliaryLabels,
        roleCalibration,
        familyCalibration,
        calibrationSupport,
        calibrationPrecision: { minimumRoutedForPrecision, minimumRoutingPrecision, roles: calibrationPrecision },
        calibration: {
            temperature,
            routeConfidenceThreshold: threshold,
            annotationOverrideThreshold: threshold,
            conformalQuantile,
            coverage: empiricalCoverage,
            nominalTargetCoverage: NOMINAL_TARGET_COVERAGE,
            ece: { before: calibrationError(rawCalProbabilities), after: calibrationError(calProbabilities) },
            source: 'explicit-calibration-partition-grid-temperature',
            n: calibration.length,
            accuracy
        },
        training: {
            algorithm: pretrained.training?.algorithm ?? 'pretrained',
            pretrained: pretrained.training ?? {},
            classWeights,
            classWeightPolicy: 'capped-inverse-square-root-frequency-8x-normalized'
        },
        qualification: {
            status: 'unqualified',
            reason: 'Development head only; no held-out or sealed service evidence is claimed.',
            trainIds: [...trainIds],
            calibrationIds: [...calibrationIds],
            ...partitionIdentity,
            trainLabels,
            calibrationLabels,
            calibrationLabelsAbsentFromTraining: calibrationLabels.filter((label) => !trainLabels.includes(label)),
            routableLabels: routable.filter((label) => !auxiliaryLabels.includes(label)),
            auxiliaryReasons,
            insufficientCalibrationRoles: routable.filter(
                (label) => calibrationSupport.roles[label] < MINIMUM_CORRECT_PER_ROLE
            ),
            insufficientCalibrationFamilies: Object.keys(calibrationSupport.families).filter(
                (name) => calibrationSupport.families[name] < MINIMUM_CORRECT_PER_FAMILY
            ),
            partitionPolicyVersion,
            artifactFingerprint: sha256(
                JSON.stringify({
                    rows: artifact.rows,
                    labels: artifact.labels,
                    tokenizer: artifact.tokenizer,
                    serializer: artifact.serializer,
                    trainIds,
                    calibrationIds,
                    ...partitionIdentity,
                    partitionPolicyVersion
                })
            )
        }
    };
}
