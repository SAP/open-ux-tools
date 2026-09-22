import { assertRolePartitionIsolation } from './incumbent-role-converter.mjs';

/**
 * Build train/calibration/sealed id manifests with the checks the trainer and release gate apply.
 *
 * @param {object} options options
 * @param {object[]} options.fittingRows opaque train/calibration rows
 * @param {object[]} options.sealedRows sealed evaluation rows
 * @param {Record<string, { family: string }>} options.registryRoles semantic role registry
 * @param {number} [options.minimumCorrectPerRole] trainer floor per role
 * @param {number} [options.minimumCorrectPerFamily] trainer floor per role family
 * @returns {object} manifests and counts
 */
export function buildPartitionManifests({
    fittingRows,
    sealedRows,
    registryRoles,
    minimumCorrectPerRole = 5,
    minimumCorrectPerFamily = 10
}) {
    const train = fittingRows.filter((row) => row.partition === 'train');
    const calibration = fittingRows.filter((row) => row.partition === 'calibration');
    if (train.length === 0 || calibration.length === 0)
        throw new TypeError('both train and calibration partitions must be non-empty');
    const labels = (rows) => new Set(rows.map((row) => row.label));
    const trainLabels = labels(train);
    const calibrationLabels = labels(calibration);
    const absent = [...calibrationLabels].filter((label) => !trainLabels.has(label));
    if (!trainLabels.has('unknown') || !calibrationLabels.has('unknown'))
        throw new TypeError('reviewed unknown examples are required in train and calibration');
    assertRolePartitionIsolation({ train, calibration, sealed: sealedRows });
    const histogram = (rows) => rows.reduce((acc, row) => ({ ...acc, [row.label]: (acc[row.label] ?? 0) + 1 }), {});
    const roleFamily = (label) =>
        label === 'unknown' ? 'abstention' : (registryRoles[label]?.family ?? 'unregistered');
    const familyHistogram = (rows) =>
        rows.reduce((acc, row) => ({ ...acc, [roleFamily(row.label)]: (acc[roleFamily(row.label)] ?? 0) + 1 }), {});
    const calibrationByLabel = histogram(calibration);
    const calibrationByFamily = familyHistogram(calibration);
    const claimable = [...trainLabels]
        .filter(
            (label) =>
                label === 'unknown' ||
                ((calibrationByLabel[label] ?? 0) >= minimumCorrectPerRole &&
                    (calibrationByFamily[roleFamily(label)] ?? 0) >= minimumCorrectPerFamily)
        )
        .sort();
    const sealedStatus = sealedRows.filter((row) => roleFamily(row.label) === 'status');
    return {
        trainIds: train.map((row) => row.id),
        calibrationIds: calibration.map((row) => row.id),
        sealedIds: sealedRows.map((row) => row.id),
        counts: {
            train: {
                rows: train.length,
                labels: histogram(train),
                families: familyHistogram(train),
                serviceFamilies: new Set(train.map((row) => row.family)).size
            },
            calibration: {
                rows: calibration.length,
                labels: calibrationByLabel,
                families: calibrationByFamily,
                serviceFamilies: new Set(calibration.map((row) => row.family)).size
            },
            sealed: {
                rows: sealedRows.length,
                labels: histogram(sealedRows),
                families: familyHistogram(sealedRows),
                services: new Set(sealedRows.map((row) => row.serviceId)).size,
                domains: new Set(sealedRows.map((row) => row.domain)).size,
                statusFields: sealedStatus.length,
                statusServices: new Set(sealedStatus.map((row) => row.serviceId)).size,
                statusDomains: new Set(sealedStatus.map((row) => row.domain)).size
            }
        },
        calibrationLabelsAbsentFromTraining: absent,
        claimableLabelsPreview: claimable,
        floors: { minimumCorrectPerRole, minimumCorrectPerFamily },
        note: 'claimable preview counts expected calibration rows; the trainer counts correctly classified rows, so the final claim set can only shrink.'
    };
}
