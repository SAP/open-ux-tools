import { rebuildContexts } from '../common/field-context.mjs';

/** Pool prefix of the harvested public API rows, which the shipped head neither trained nor calibrated on. */
export const DEFAULT_EXCLUDED_POOL_PREFIX = 'public-harvest';
/** Calibration labels the shipped recipe (P4-C) removed from calibration. */
export const DEFAULT_EXCLUDED_CALIBRATION_LABELS = Object.freeze(['bank_account_internal_id']);

/**
 * Build the role-head train and calibration partitions from the published `rows_head_a` rows.
 *
 * Train is the `train` split and calibration the `calibration` split, without the excluded pool and the
 * excluded calibration labels. Rows whose identical text carries conflicting labels are dropped from both,
 * calibration rows whose label never occurs in train are dropped, and the partitions must be text-,
 * service- and family-disjoint with reviewed `unknown` examples in train. Every context is rebuilt from
 * `field_contexts` and must re-serialize to the published text.
 * @param {object} options options
 * @param {object[]} options.rows `rows_head_a` records in file order
 * @param {Map<string, object>} options.fieldContexts `field_contexts` records by field id
 * @param {string} [options.excludedPoolPrefix] pool prefix left out of both partitions
 * @param {readonly string[]} [options.excludedCalibrationLabels] labels removed from calibration
 * @returns {{ records: object[], trainIds: string[], calibrationIds: string[], report: object }} the partitions
 */
export function buildRoleHeadPartitions({
    rows,
    fieldContexts,
    excludedPoolPrefix = DEFAULT_EXCLUDED_POOL_PREFIX,
    excludedCalibrationLabels = DEFAULT_EXCLUDED_CALIBRATION_LABELS
}) {
    const eligible = rows.filter((row) => !row.pool.startsWith(excludedPoolPrefix));
    const { contexts, unrebuildable } = rebuildContexts(eligible, fieldContexts);
    if (unrebuildable.length > 0) {
        throw new TypeError(
            `${unrebuildable.length} rows do not re-serialize to their published text, e.g. ${unrebuildable[0]}`
        );
    }
    const excludedLabels = new Set(excludedCalibrationLabels);
    let train = eligible.filter((row) => row.split === 'train');
    const allCalibration = eligible.filter((row) => row.split === 'calibration');
    let calibration = allCalibration.filter((row) => !excludedLabels.has(row.label));
    const report = {
        excludedPoolRows: rows.length - eligible.length,
        excludedCalibrationLabelRows: allCalibration.length - calibration.length
    };
    const labelsByText = new Map();
    for (const row of [...train, ...calibration]) {
        labelsByText.set(row.text, (labelsByText.get(row.text) ?? new Set()).add(row.label));
    }
    const conflicting = (row) => labelsByText.get(row.text).size > 1;
    report.conflictingLabelRows = [...train, ...calibration].filter(conflicting).length;
    train = train.filter((row) => !conflicting(row));
    calibration = calibration.filter((row) => !conflicting(row));
    const trainTexts = new Set(train.map((row) => row.text));
    if (calibration.some((row) => trainTexts.has(row.text))) {
        throw new TypeError('calibration text is shared with train');
    }
    const trainLabels = new Set(train.map((row) => row.label));
    report.calibrationLabelAbsentFromTrainRows = calibration.filter((row) => !trainLabels.has(row.label)).length;
    calibration = calibration.filter((row) => trainLabels.has(row.label));
    const disjoint = (key) => {
        const trainValues = new Set(train.map((row) => row[key]));
        return !calibration.some((row) => trainValues.has(row[key]));
    };
    if (!disjoint('family') || !disjoint('service_id')) {
        throw new TypeError('train and calibration share a service or a service family');
    }
    if (!trainLabels.has('unknown')) {
        throw new TypeError('train has no reviewed unknown examples');
    }
    const record = (row) => ({
        id: row.field_id,
        group: row.service_id,
        family: row.family,
        service: row.service_id,
        label: row.label,
        context: contexts.get(row.field_id)
    });
    return {
        records: [...train, ...calibration].map(record),
        trainIds: train.map((row) => row.field_id),
        calibrationIds: calibration.map((row) => row.field_id),
        report: { ...report, train: train.length, calibration: calibration.length, labels: trainLabels.size }
    };
}
