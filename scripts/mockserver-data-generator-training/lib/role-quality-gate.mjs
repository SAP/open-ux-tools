/** Measure accepted role decisions on reviewed, service-disjoint fields. */
export function evaluateRoleQualityGate(fields) {
    if (!Array.isArray(fields)) throw new TypeError('reviewed fields must be an array');
    const ids = new Set();
    for (const field of fields) {
        if (!field?.id || !field.serviceId || !field.domain || !field.expectedRole) {
            throw new TypeError('reviewed fields require field, service, domain and role identities');
        }
        const key = `${field.serviceId}/${field.id}`;
        if (ids.has(key)) throw new TypeError(`duplicate reviewed field: ${key}`);
        ids.add(key);
    }
    // The classifier is what this gate qualifies, so precision and critical false positives are
    // measured on its own accepted decisions; metadata and lexical decisions are deterministic
    // runtime policy covered by unit tests and reported separately by the sealed evaluation.
    const accepted = fields.filter(
        (field) =>
            typeof field.acceptedRole === 'string' &&
            field.acceptedRole !== 'unknown' &&
            (field.acceptedSource === undefined || field.acceptedSource === 'classifier')
    );
    const acceptedCorrect = accepted.filter((field) => field.acceptedRole === field.expectedRole);
    const supported = fields.filter((field) => field.supported === true && field.decisiveMetadata !== true);
    const supportedCorrect = supported.filter((field) => field.acceptedRole === field.expectedRole);
    const statuses = fields.filter((field) => field.unannotatedStatus === true);
    const statusCorrect = statuses.filter((field) => field.acceptedRole === field.expectedRole);
    const criticalFalsePositives = accepted.filter((field) => field.criticalFalsePositive === true).length;
    const metrics = {
        reviewedFields: fields.length,
        acceptedFields: accepted.length,
        acceptedPrecision: accepted.length ? acceptedCorrect.length / accepted.length : 0,
        supportedFields: supported.length,
        supportedRecall: supported.length ? supportedCorrect.length / supported.length : 0,
        statusFields: statuses.length,
        statusServices: new Set(statuses.map((field) => field.serviceId)).size,
        statusDomains: new Set(statuses.map((field) => field.domain)).size,
        statusRecall: statuses.length ? statusCorrect.length / statuses.length : 0,
        criticalFalsePositives
    };
    const failures = [];
    if (metrics.acceptedPrecision < 0.95) failures.push('accepted precision below 95%');
    if (metrics.supportedRecall < 0.6) failures.push('supported recall below 60%');
    if (metrics.statusFields < 30 || metrics.statusServices < 4 || metrics.statusDomains < 2) {
        failures.push('status sample below 30 fields, four services or two domains');
    } else if (metrics.statusRecall < 0.6) {
        failures.push('status recall below 60%');
    }
    // Rate, not an absolute count: the sealed set grew from 45 to 4,317 fields.
    if (metrics.acceptedFields > 0 && criticalFalsePositives / metrics.acceptedFields > 0.03) {
        failures.push('critical false-positive rate above 3% of accepted decisions');
    }
    return { pass: failures.length === 0, metrics, failures };
}
