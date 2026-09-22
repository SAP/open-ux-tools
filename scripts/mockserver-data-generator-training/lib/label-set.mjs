/**
 * Decide which labels the v3 head may claim from expected-count previews.
 *
 * A label is claimable only when the calibration partition holds at least the trainer's floor of
 * expected rows for it and its role family. The family floor counts only roles that pass the role
 * floor themselves: rows of an unclaimed role leave the partitions and can never become correct
 * calibration rows, so they must not prop up a family. Every status role that appears in the sealed
 * set must be claimable, otherwise sealed status recall is capped below the gate and training must
 * stop. Labels the trainer already found unsupportable are passed back in as `unclaimed` and are
 * dropped before any counting, never relabelled.
 */

/**
 * @param {object} options options
 * @param {Record<string, number>} options.trainLabels train rows per label
 * @param {Record<string, number>} options.calibrationLabels calibration rows per label
 * @param {Record<string, number>} options.sealedLabels sealed rows per label
 * @param {Record<string, { family: string }>} options.registryRoles semantic role registry
 * @param {number} [options.minimumCorrectPerRole] role floor
 * @param {number} [options.minimumCorrectPerFamily] family floor
 * @param {string[]} [options.unclaimed] labels withdrawn after a trainer calibration-support failure
 * @returns {{ claimed: string[], dropped: Array<{ label: string, reason: string }>, blockers: string[] }} decision
 */
export function selectClaimableLabels({
    trainLabels,
    calibrationLabels,
    sealedLabels,
    registryRoles,
    minimumCorrectPerRole = 5,
    minimumCorrectPerFamily = 10,
    unclaimed = []
}) {
    const family = (label) => (label === 'unknown' ? 'abstention' : registryRoles[label]?.family);
    const withdrawn = new Set(unclaimed);
    const claimed = [];
    const dropped = [];
    const candidates = [];
    for (const label of Object.keys(trainLabels).sort()) {
        if (label === 'unknown') {
            claimed.push(label);
            continue;
        }
        if (withdrawn.has(label)) {
            dropped.push({ label, reason: 'withdrawn after trainer calibration-support failure' });
            continue;
        }
        if (!registryRoles[label]) {
            dropped.push({ label, reason: 'unregistered' });
            continue;
        }
        const roleRows = calibrationLabels[label] ?? 0;
        if (roleRows < minimumCorrectPerRole)
            dropped.push({ label, reason: `calibration rows ${roleRows} < ${minimumCorrectPerRole}` });
        else candidates.push(label);
    }
    const familyCounts = {};
    for (const label of candidates) {
        familyCounts[family(label)] = (familyCounts[family(label)] ?? 0) + (calibrationLabels[label] ?? 0);
    }
    for (const label of candidates) {
        const familyRows = familyCounts[family(label)] ?? 0;
        if (familyRows < minimumCorrectPerFamily)
            dropped.push({ label, reason: `family ${family(label)} rows ${familyRows} < ${minimumCorrectPerFamily}` });
        else claimed.push(label);
    }
    claimed.sort();
    if (!(calibrationLabels.unknown > 0) || !(trainLabels.unknown > 0))
        dropped.push({ label: 'unknown', reason: 'reviewed abstention examples required in both partitions' });
    const blockers = Object.keys(sealedLabels)
        .filter((label) => family(label) === 'status' && !claimed.includes(label))
        .map((label) => `sealed status role ${label} is not claimable; sealed status recall would be capped`);
    return { claimed, dropped, blockers };
}
