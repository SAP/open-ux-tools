/** Select metadata-only review candidates; this does not assign semantic roles. */
export function eligiblePublicStatusServices({
    registry,
    datasets,
    partitions,
    includeAuthorizedInternal = false,
    requireStatusField = true
}) {
    if (!Array.isArray(partitions) || partitions.length === 0) {
        throw new TypeError('status review selection requires explicit partitions');
    }
    const sources = new Map((registry.services ?? []).map((service) => [service.id, service]));
    const eligibleFormats = new Set(['csn', 'edmx', 'schema-graph']);
    const selectedPartitions = new Set(partitions);
    return [
        ...new Set(
            datasets
                .filter(({ name }) => selectedPartitions.has(name))
                .flatMap(({ dataset }) => dataset.services ?? [])
                .filter((partition) => {
                    const service = sources.get(partition.serviceId);
                    const publicSource =
                        service?.license?.redistributable === true &&
                        ['Apache-2.0', 'MIT'].includes(service?.license?.identifier);
                    const approvedInternal =
                        includeAuthorizedInternal &&
                        service?.license?.identifier === 'INTERNAL-OWNER-AUTHORIZATION' &&
                        service?.trainingAuthorization?.scope === 'structural-metadata-only' &&
                        service?.trainingAuthorization?.privacyReview?.status === 'passed';
                    return (
                        (publicSource || approvedInternal) &&
                        eligibleFormats.has(service.source?.format) &&
                        (!requireStatusField ||
                            (partition.properties ?? []).some((property) =>
                                /status/iu.test(property.fieldId?.split('/').at(-1) ?? '')
                            ))
                    );
                })
                .map((partition) => partition.serviceId)
        )
    ];
}

/** Select authorized training/calibration sources only; output must remain private. */
export function eligibleAuthorizedStatusTrainingServices({ registry, datasets }) {
    return eligiblePublicStatusServices({
        registry,
        datasets,
        partitions: ['train', 'calibration'],
        includeAuthorizedInternal: true
    });
}

/** Preserve the fixed public-holdout cohort for the sealed role-review queue. */
export function eligiblePublicStatusHoldoutServices({ registry, datasets }) {
    return eligiblePublicStatusServices({
        registry,
        datasets,
        partitions: datasets.map(({ name }) => name).filter((name) => name.endsWith('-holdout'))
    });
}

/**
 * Deterministically sample non-status-named fields per eligible service for abstention review.
 *
 * The sample is a review candidate list only; it assigns no role and never touches values.
 *
 * @param {object} options options
 * @param {object} options.registry canonical registry
 * @param {Array<{ name: string, dataset: object }>} options.datasets planner partitions
 * @param {string[]} options.partitions partition names to draw from
 * @param {boolean} [options.includeAuthorizedInternal] admit approved internal structural metadata
 * @param {string} options.seed deterministic sampling seed
 * @param {number} options.perService fields per service
 * @param {RegExp} [options.fieldNamePattern] select fields whose identifier matches instead of the non-status default
 * @returns {Map<string, Set<string>>} sampled field ids per service id
 */
export function eligibleFieldSample({
    registry,
    datasets,
    partitions,
    includeAuthorizedInternal = false,
    seed,
    perService,
    fieldNamePattern
}) {
    if (fieldNamePattern !== undefined && !(fieldNamePattern instanceof RegExp))
        throw new TypeError('fieldNamePattern must be a RegExp');
    if (typeof seed !== 'string' || seed.length === 0) throw new TypeError('field sampling requires a seed');
    if (!Number.isSafeInteger(perService) || perService < 1)
        throw new TypeError('perService must be a positive integer');
    const serviceIds = new Set(
        eligiblePublicStatusServices({
            registry,
            datasets,
            partitions,
            includeAuthorizedInternal,
            requireStatusField: false
        })
    );
    const selected = new Set(partitions);
    const sample = new Map();
    for (const { name, dataset } of datasets) {
        if (!selected.has(name)) continue;
        for (const partition of dataset.services ?? []) {
            if (!serviceIds.has(partition.serviceId)) continue;
            const candidates = (partition.properties ?? [])
                .map((property) => property.fieldId)
                // Default: non-status-named fields. With a pattern: fields whose identifier
                // matches it (used to target a specific ambiguity for review, never for routing).
                .filter(
                    (fieldId) =>
                        typeof fieldId === 'string' &&
                        (fieldNamePattern
                            ? fieldNamePattern.test(fieldId.split('/').at(-1) ?? '')
                            : !/status/iu.test(fieldId.split('/').at(-1) ?? ''))
                )
                .map((fieldId) => ({ fieldId, order: hashOrder(`${seed}|${fieldId}`) }))
                .sort((a, b) => a.order.localeCompare(b.order) || a.fieldId.localeCompare(b.fieldId))
                .slice(0, perService)
                .map(({ fieldId }) => fieldId);
            if (candidates.length > 0) sample.set(partition.serviceId, new Set(candidates));
        }
    }
    return sample;
}

function hashOrder(value) {
    let hash = 2166136261;
    for (const char of value) {
        hash ^= char.codePointAt(0);
        hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}
