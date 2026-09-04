import { createHash } from 'node:crypto';

export const REALISM_DOMAINS = Object.freeze(['finance', 'sales', 'service', 'maintenance', 'master-data', 'non-sap']);
export const REALISM_FORMATS = Object.freeze(['edmx-v2', 'edmx-v4', 'csn']);

const SHA256 = /^[a-f0-9]{64}$/;
const SEVERITIES = Object.freeze(['none', 'minor', 'major', 'critical']);
const MINIMUM_FIELDS = 300;
const MINIMUM_FIELDS_PER_FORMAT = 50;

function canonicalJson(value) {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
    }
    if (value !== null && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function record(value, label) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${label} must be an object`);
    }
    return value;
}

function nonEmptyString(value, label, maximumLength = 1_200) {
    if (typeof value !== 'string' || value.trim().length === 0 || value.length > maximumLength) {
        throw new TypeError(`${label} must be a bounded non-empty string`);
    }
    return value;
}

function fingerprint(value, label) {
    const parsed = nonEmptyString(value, label, 64);
    if (!SHA256.test(parsed)) {
        throw new TypeError(`${label} must be a lowercase SHA-256`);
    }
    return parsed;
}

function deepFreeze(value) {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const entry of Object.values(value)) {
            deepFreeze(entry);
        }
    }
    return value;
}

function stratumMetrics(fields, reviews, property, stratum) {
    const selected = fields.filter((field) => field[property] === stratum);
    const reviewByKey = new Map(reviews.map((review) => [review.fieldKey, review]));
    const reviewed = selected.map((field) => reviewByKey.get(field.fieldKey));
    const realisticFields = reviewed.filter((review) => review?.realistic).length;
    const criticalIssues = reviewed.filter((review) => review?.severity === 'critical').length;
    return Object.freeze({
        reviewedFields: selected.length,
        realisticFields,
        realisticRate: selected.length === 0 ? 0 : realisticFields / selected.length,
        criticalIssues
    });
}

/** Validate a sealed realism evidence artifact and all frozen coverage denominators. */
export function validateRealismEvidence(value) {
    const evidence = record(value, 'realism evidence');
    if (
        evidence.version !== 1 ||
        evidence.kind !== 'mockserver-data-generator-realism-evidence' ||
        !Number.isSafeInteger(evidence.randomizationSeed) ||
        !Number.isSafeInteger(evidence.minimumReviewedFields) ||
        evidence.minimumReviewedFields < MINIMUM_FIELDS ||
        !Array.isArray(evidence.targets) ||
        !Array.isArray(evidence.fields) ||
        !Array.isArray(evidence.coverageGaps)
    ) {
        throw new TypeError('realism evidence header is invalid');
    }
    fingerprint(evidence.candidateFingerprint, 'candidate fingerprint');
    fingerprint(evidence.promptFingerprint, 'prompt fingerprint');
    fingerprint(evidence.outputSchemaFingerprint, 'output schema fingerprint');
    fingerprint(evidence.selectionManifestFingerprint, 'selection manifest fingerprint');
    if (evidence.fields.length < evidence.minimumReviewedFields) {
        throw new TypeError('realism evidence is below the frozen field minimum');
    }
    const targetByService = new Map();
    for (const rawTarget of evidence.targets) {
        const target = record(rawTarget, 'realism target');
        const domain = nonEmptyString(target.domain, 'realism target domain');
        const format = nonEmptyString(target.format, 'realism target format');
        const serviceId = nonEmptyString(target.serviceId, 'realism target service ID');
        if (!REALISM_DOMAINS.includes(domain) || !REALISM_FORMATS.includes(format) || targetByService.has(serviceId)) {
            throw new TypeError('realism target identity or stratum is invalid');
        }
        nonEmptyString(target.provenance, 'realism target provenance', 2_000);
        fingerprint(target.schemaFingerprint, 'schema fingerprint');
        fingerprint(target.resultFingerprint, 'result fingerprint');
        targetByService.set(serviceId, target);
    }
    const fieldKeys = new Set();
    for (const [index, rawField] of evidence.fields.entries()) {
        const field = record(rawField, 'realism field');
        const fieldKey = nonEmptyString(field.fieldKey, 'realism field key');
        const serviceId = nonEmptyString(field.serviceId, 'realism field service ID');
        const target = targetByService.get(serviceId);
        if (
            field.presentationIndex !== index ||
            fieldKeys.has(fieldKey) ||
            !target ||
            field.domain !== target.domain ||
            field.format !== target.format ||
            !Array.isArray(field.values)
        ) {
            throw new TypeError('realism field identity, order, or target binding is invalid');
        }
        nonEmptyString(field.entity, 'realism field entity');
        nonEmptyString(field.property, 'realism field property');
        nonEmptyString(field.primitiveType, 'realism field primitive type');
        nonEmptyString(field.plannerSource, 'realism field planner source');
        fieldKeys.add(fieldKey);
    }
    const declaredGaps = new Set(evidence.coverageGaps);
    if (
        declaredGaps.size !== evidence.coverageGaps.length ||
        evidence.coverageGaps.some((domain) => !REALISM_DOMAINS.includes(domain))
    ) {
        throw new TypeError('realism coverage gaps are invalid');
    }
    for (const domain of REALISM_DOMAINS) {
        const count = evidence.fields.filter((field) => field.domain === domain).length;
        if (count === 0 && declaredGaps.has(domain)) {
            continue;
        }
        if (count === 0 || declaredGaps.has(domain)) {
            throw new TypeError(`realism domain ${domain} does not meet the frozen coverage minimum`);
        }
    }
    for (const format of REALISM_FORMATS) {
        const count = evidence.fields.filter((field) => field.format === format).length;
        if (count < MINIMUM_FIELDS_PER_FORMAT) {
            throw new TypeError(`realism format ${format} does not meet the frozen coverage minimum`);
        }
    }
    return evidence;
}

/** Randomize presentation deterministically, validate coverage, and fingerprint the evidence payload. */
export function sealRealismEvidence(value) {
    const input = JSON.parse(JSON.stringify(value));
    const fields = [...input.fields]
        .sort((left, right) => {
            const leftOrder = sha256(`${input.randomizationSeed}\0${left.fieldKey}`);
            const rightOrder = sha256(`${input.randomizationSeed}\0${right.fieldKey}`);
            return leftOrder.localeCompare(rightOrder) || left.fieldKey.localeCompare(right.fieldKey);
        })
        .map((field, presentationIndex) => ({ ...field, presentationIndex }));
    const payload = { ...input, fields };
    validateRealismEvidence(payload);
    return deepFreeze({ ...payload, fingerprint: sha256(canonicalJson(payload)) });
}

function validateProviderArtifact(source, evidenceSource, evidence, promptSource, schemaSource) {
    const artifact = record(JSON.parse(source), 'provider artifact');
    if (
        artifact.version !== 1 ||
        artifact.endpointClass !== 'public-metadata-external' ||
        nonEmptyString(artifact.provider, 'provider name').length === 0 ||
        nonEmptyString(artifact.requestedModel, 'requested model').length === 0 ||
        !Array.isArray(artifact.resolvedModels) ||
        artifact.resolvedModels.length === 0 ||
        artifact.resolvedModels.some((model) => typeof model !== 'string' || model.length === 0) ||
        artifact.promptFingerprint !== sha256(promptSource) ||
        artifact.outputSchemaFingerprint !== sha256(schemaSource) ||
        JSON.stringify(artifact.inputFingerprints) !== JSON.stringify([sha256(evidenceSource)])
    ) {
        throw new TypeError('provider artifact lineage does not match the realism campaign');
    }
    const output = record(artifact.output, 'provider output');
    if (output.version !== 1 || output.evidenceFingerprint !== evidence.fingerprint || !Array.isArray(output.reviews)) {
        throw new TypeError('provider output is not bound to the realism evidence');
    }
    const expectedKeys = new Set(evidence.fields.map((field) => field.fieldKey));
    const reviewKeys = new Set();
    for (const rawReview of output.reviews) {
        const review = record(rawReview, 'provider review');
        const fieldKey = nonEmptyString(review.fieldKey, 'provider review field key');
        const reason = nonEmptyString(review.reason, 'provider review reason', 400);
        if (
            !expectedKeys.has(fieldKey) ||
            reviewKeys.has(fieldKey) ||
            typeof review.realistic !== 'boolean' ||
            !SEVERITIES.includes(review.severity) ||
            review.realistic !== (review.severity === 'none') ||
            reason.length > 400
        ) {
            throw new TypeError(`provider review is invalid for ${fieldKey}`);
        }
        reviewKeys.add(fieldKey);
    }
    if (reviewKeys.size !== expectedKeys.size) {
        throw new TypeError('provider output must review every realism field exactly once');
    }
    return { artifact, reviews: output.reviews };
}

/** Compile pessimistic consensus from exactly two independent, lineage-bound provider artifacts. */
export function compileRealismReviews(evidenceSource, promptSource, schemaSource, providerSources) {
    const evidence = JSON.parse(evidenceSource);
    const { fingerprint: suppliedFingerprint, ...payload } = evidence;
    if (suppliedFingerprint !== sha256(canonicalJson(payload))) {
        throw new TypeError('realism evidence fingerprint does not match its payload');
    }
    validateRealismEvidence(payload);
    if (
        evidence.promptFingerprint !== sha256(promptSource) ||
        evidence.outputSchemaFingerprint !== sha256(schemaSource) ||
        providerSources.length !== 2
    ) {
        throw new TypeError('realism campaign prompt, schema, or provider count is invalid');
    }
    const providers = providerSources.map((source) =>
        validateProviderArtifact(source, evidenceSource, evidence, promptSource, schemaSource)
    );
    if (new Set(providers.map(({ artifact }) => artifact.provider)).size !== 2) {
        throw new TypeError('realism campaign requires two independent providers');
    }
    const providerReviews = providers.map(({ reviews }) => new Map(reviews.map((review) => [review.fieldKey, review])));
    let disagreements = 0;
    const reviews = evidence.fields
        .map((field) => {
            const fieldReviews = providerReviews.map((provider) => provider.get(field.fieldKey));
            if (new Set(fieldReviews.map((review) => `${review.realistic}:${review.severity}`)).size > 1) {
                disagreements += 1;
            }
            const severity = fieldReviews.reduce(
                (selected, review) =>
                    SEVERITIES.indexOf(review.severity) > SEVERITIES.indexOf(selected) ? review.severity : selected,
                'none'
            );
            return Object.freeze({
                fieldKey: field.fieldKey,
                domain: field.domain,
                format: field.format,
                realistic: fieldReviews.every((review) => review.realistic),
                severity,
                reasons: Object.freeze([...new Set(fieldReviews.map((review) => review.reason))].sort())
            });
        })
        .sort((left, right) => left.fieldKey.localeCompare(right.fieldKey));
    const realisticFields = reviews.filter((review) => review.realistic).length;
    const criticalIssues = reviews.filter((review) => review.severity === 'critical').length;
    const realisticRate = reviews.length === 0 ? 0 : realisticFields / reviews.length;
    const domainMetrics = Object.freeze(
        Object.fromEntries(
            REALISM_DOMAINS.map((domain) => [domain, stratumMetrics(evidence.fields, reviews, 'domain', domain)])
        )
    );
    const formatMetrics = Object.freeze(
        Object.fromEntries(
            REALISM_FORMATS.map((format) => [format, stratumMetrics(evidence.fields, reviews, 'format', format)])
        )
    );
    const domainsPass = Object.values(domainMetrics).every(
        (metrics) => metrics.reviewedFields > 0 && metrics.realisticRate >= 0.8 && metrics.criticalIssues === 0
    );
    const formatsPass = Object.values(formatMetrics).every(
        (metrics) =>
            metrics.reviewedFields >= MINIMUM_FIELDS_PER_FORMAT &&
            metrics.realisticRate >= 0.8 &&
            metrics.criticalIssues === 0
    );
    const report = {
        version: 1,
        kind: 'mockserver-data-generator-realism-consensus',
        candidateFingerprint: evidence.candidateFingerprint,
        evidenceFingerprint: evidence.fingerprint,
        providerArtifactFingerprints: providerSources.map((source) => sha256(source)).sort(),
        providers: providers
            .map(({ artifact }) => ({
                provider: artifact.provider,
                requestedModel: artifact.requestedModel,
                resolvedModels: [...artifact.resolvedModels].sort()
            }))
            .sort((left, right) => left.provider.localeCompare(right.provider)),
        reviewedFields: reviews.length,
        realisticFields,
        realisticRate,
        criticalIssues,
        disagreements,
        domainMetrics,
        formatMetrics,
        coverageGaps: [...evidence.coverageGaps],
        passed:
            evidence.coverageGaps.length === 0 &&
            realisticRate >= 0.8 &&
            criticalIssues === 0 &&
            domainsPass &&
            formatsPass,
        fields: reviews
    };
    return deepFreeze({ ...report, fingerprint: sha256(canonicalJson(report)) });
}
