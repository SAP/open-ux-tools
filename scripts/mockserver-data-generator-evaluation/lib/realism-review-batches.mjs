import { createHash } from 'node:crypto';
import { validateRealismEvidence } from './realism.mjs';

const SHA256 = /^[a-f0-9]{64}$/;
const SEVERITIES = new Set(['none', 'minor', 'major', 'critical']);

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

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

function record(value, label) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${label} must be an object`);
    }
    return value;
}

function nonEmptyString(value, label) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new TypeError(`${label} must be a non-empty string`);
    }
    return value;
}

function fingerprint(value, label) {
    const result = nonEmptyString(value, label);
    if (!SHA256.test(result)) {
        throw new TypeError(`${label} must be a lowercase SHA-256`);
    }
    return result;
}

function parseEvidenceSource(evidenceSource) {
    const evidence = record(JSON.parse(evidenceSource), 'realism evidence');
    const { fingerprint: suppliedFingerprint, ...payload } = evidence;
    if (suppliedFingerprint !== sha256(canonicalJson(payload))) {
        throw new TypeError('realism evidence fingerprint does not match its payload');
    }
    validateRealismEvidence(payload);
    return evidence;
}

function seal(value) {
    return Object.freeze({ ...value, fingerprint: sha256(canonicalJson(value)) });
}

/** Split a sealed blinded realism packet into deterministic, bounded provider inputs. */
export function prepareRealismReviewBatches(evidenceSource, maximumFieldsPerBatch = 50) {
    if (!Number.isSafeInteger(maximumFieldsPerBatch) || maximumFieldsPerBatch < 1 || maximumFieldsPerBatch > 100) {
        throw new TypeError('maximum fields per review batch must be an integer from 1 through 100');
    }
    const evidence = parseEvidenceSource(evidenceSource);
    const batchCount = Math.ceil(evidence.fields.length / maximumFieldsPerBatch);
    const batches = Array.from({ length: batchCount }, (_unused, batchOffset) => {
        const batchIndex = batchOffset + 1;
        const fields = evidence.fields.slice(
            batchOffset * maximumFieldsPerBatch,
            (batchOffset + 1) * maximumFieldsPerBatch
        );
        const value = Object.freeze({
            version: 1,
            kind: 'mockserver-data-generator-realism-review-batch',
            evidenceFingerprint: evidence.fingerprint,
            candidateFingerprint: evidence.candidateFingerprint,
            promptFingerprint: evidence.promptFingerprint,
            outputSchemaFingerprint: evidence.outputSchemaFingerprint,
            batchIndex,
            batchCount,
            reviewedFields: fields.length,
            fields
        });
        const source = `${JSON.stringify(value, null, 2)}\n`;
        return Object.freeze({
            batchIndex,
            filename: `input-${String(batchIndex).padStart(3, '0')}.json`,
            value,
            source,
            inputFingerprint: sha256(source)
        });
    });
    const manifest = seal({
        version: 1,
        kind: 'mockserver-data-generator-realism-review-batches',
        evidenceSourceFingerprint: sha256(evidenceSource),
        evidenceFingerprint: evidence.fingerprint,
        candidateFingerprint: evidence.candidateFingerprint,
        promptFingerprint: evidence.promptFingerprint,
        outputSchemaFingerprint: evidence.outputSchemaFingerprint,
        maximumFieldsPerBatch,
        reviewedFields: evidence.fields.length,
        batchCount,
        batches: batches.map(({ batchIndex, filename, value, inputFingerprint }) =>
            Object.freeze({
                batchIndex,
                filename,
                reviewedFields: value.reviewedFields,
                inputFingerprint
            })
        )
    });
    return Object.freeze({ manifest, batches: Object.freeze(batches) });
}

function validateProviderReview(review, expectedKeys) {
    const value = record(review, 'provider batch review');
    const fieldKey = nonEmptyString(value.fieldKey, 'provider batch review field key');
    const reason = nonEmptyString(value.reason, 'provider batch review reason');
    if (
        !expectedKeys.has(fieldKey) ||
        typeof value.realistic !== 'boolean' ||
        !SEVERITIES.has(value.severity) ||
        value.realistic !== (value.severity === 'none') ||
        reason.length > 400
    ) {
        throw new TypeError(`provider batch review is invalid for ${fieldKey}`);
    }
    return value;
}

function validateProviderArtifactFingerprint(artifact) {
    if (artifact.fingerprint === undefined) {
        throw new TypeError('provider batch artifact fingerprint is required');
    }
    const { fingerprint: suppliedFingerprint, ...payload } = artifact;
    if (!SHA256.test(suppliedFingerprint) || suppliedFingerprint !== sha256(JSON.stringify(payload))) {
        throw new TypeError('provider batch artifact fingerprint is invalid');
    }
}

/** Assemble bounded provider responses into one full-evidence provider artifact. */
export function assembleRealismProviderArtifact(
    evidenceSource,
    manifestSource,
    promptSource,
    schemaSource,
    providerArtifactSources
) {
    const evidence = parseEvidenceSource(evidenceSource);
    if (
        evidence.promptFingerprint !== sha256(promptSource) ||
        evidence.outputSchemaFingerprint !== sha256(schemaSource)
    ) {
        throw new TypeError('realism evidence prompt or output schema does not match the supplied review contract');
    }
    const manifest = record(JSON.parse(manifestSource), 'realism review batch manifest');
    const prepared = prepareRealismReviewBatches(evidenceSource, manifest.maximumFieldsPerBatch);
    if (canonicalJson(manifest) !== canonicalJson(prepared.manifest)) {
        throw new TypeError('realism review batch manifest does not match the evidence');
    }
    if (providerArtifactSources.length !== prepared.batches.length) {
        throw new TypeError('provider assembly requires exactly one artifact per review batch');
    }
    const artifactsByInput = new Map();
    for (const source of providerArtifactSources) {
        const artifact = record(JSON.parse(source), 'provider batch artifact');
        validateProviderArtifactFingerprint(artifact);
        if (!Array.isArray(artifact.inputFingerprints) || artifact.inputFingerprints.length !== 1) {
            throw new TypeError('provider batch artifact must bind exactly one input');
        }
        const inputFingerprint = fingerprint(artifact.inputFingerprints[0], 'provider batch input fingerprint');
        if (artifactsByInput.has(inputFingerprint)) {
            throw new TypeError('provider assembly contains a duplicate review batch');
        }
        artifactsByInput.set(inputFingerprint, { artifact, source });
    }
    const ordered = prepared.batches.map(({ inputFingerprint }) => {
        const artifact = artifactsByInput.get(inputFingerprint);
        if (!artifact) {
            throw new TypeError('provider assembly is missing a review batch artifact');
        }
        return artifact;
    });
    const first = ordered[0].artifact;
    const identity = JSON.stringify({
        provider: first.provider,
        requestedModel: first.requestedModel,
        endpointClass: first.endpointClass,
        dataHandlingClass: first.dataHandlingClass,
        runManifestFingerprint: first.runManifestFingerprint,
        providerPolicyFingerprint: first.providerPolicyFingerprint,
        promotionEligible: first.promotionEligible,
        derivativeTrainingEligible: first.derivativeTrainingEligible
    });
    const reviewsByKey = new Map();
    for (const [index, { artifact }] of ordered.entries()) {
        if (
            artifact.version !== 1 ||
            artifact.endpointClass !== 'public-metadata-external' ||
            artifact.promptFingerprint !== sha256(promptSource) ||
            artifact.outputSchemaFingerprint !== sha256(schemaSource) ||
            artifact.promotionEligible !== false ||
            artifact.derivativeTrainingEligible !== true ||
            !Array.isArray(artifact.resolvedModels) ||
            artifact.resolvedModels.length === 0 ||
            artifact.resolvedModels.some((model) => typeof model !== 'string' || model.length === 0) ||
            JSON.stringify({
                provider: artifact.provider,
                requestedModel: artifact.requestedModel,
                endpointClass: artifact.endpointClass,
                dataHandlingClass: artifact.dataHandlingClass,
                runManifestFingerprint: artifact.runManifestFingerprint,
                providerPolicyFingerprint: artifact.providerPolicyFingerprint,
                promotionEligible: artifact.promotionEligible,
                derivativeTrainingEligible: artifact.derivativeTrainingEligible
            }) !== identity
        ) {
            throw new TypeError('review batch artifacts must use the same provider and requested model');
        }
        const output = record(artifact.output, 'provider batch output');
        if (
            output.version !== 1 ||
            output.evidenceFingerprint !== evidence.fingerprint ||
            !Array.isArray(output.reviews)
        ) {
            throw new TypeError('provider batch output is not bound to the realism evidence');
        }
        const expectedKeys = new Set(prepared.batches[index].value.fields.map(({ fieldKey }) => fieldKey));
        if (output.reviews.length !== expectedKeys.size) {
            throw new TypeError('provider batch output must review every batch field exactly once');
        }
        for (const review of output.reviews) {
            const validated = validateProviderReview(review, expectedKeys);
            if (reviewsByKey.has(validated.fieldKey)) {
                throw new TypeError('provider assembly contains a duplicate field review');
            }
            reviewsByKey.set(validated.fieldKey, validated);
        }
    }
    const reviews = evidence.fields.map(({ fieldKey }) => {
        const review = reviewsByKey.get(fieldKey);
        if (!review) {
            throw new TypeError('provider assembly does not cover every realism field');
        }
        return review;
    });
    const batchArtifactFingerprints = ordered.map(({ source }) => sha256(source));
    const costs = ordered.map(({ artifact }) => artifact.costUsd);
    const normalizations = [
        ...new Set([
            ...ordered.flatMap(({ artifact }) =>
                Array.isArray(artifact.normalizations) ? artifact.normalizations : []
            ),
            'realism-review-batch-aggregation-v1'
        ])
    ].sort();
    const providerWarnings = [
        ...new Set(
            ordered.flatMap(({ artifact }) =>
                Array.isArray(artifact.providerWarnings) ? artifact.providerWarnings : []
            )
        )
    ].sort();
    const base = {
        version: 1,
        provider: nonEmptyString(first.provider, 'provider name'),
        requestedModel: nonEmptyString(first.requestedModel, 'requested model'),
        resolvedModels: [...new Set(ordered.flatMap(({ artifact }) => artifact.resolvedModels))].sort(),
        endpointClass: first.endpointClass,
        dataHandlingClass: first.dataHandlingClass,
        runManifestFingerprint: first.runManifestFingerprint,
        providerPolicyFingerprint: first.providerPolicyFingerprint,
        promotionEligible: false,
        derivativeTrainingEligible: true,
        createdAt: ordered
            .map(({ artifact }) => artifact.createdAt)
            .sort()
            .at(-1),
        costUsd: costs.every((cost) => typeof cost === 'number')
            ? Number(costs.reduce((total, cost) => total + cost, 0).toFixed(12))
            : null,
        normalizations,
        ...(providerWarnings.length > 0 ? { providerWarnings } : {}),
        promptFingerprint: sha256(promptSource),
        outputSchemaFingerprint: sha256(schemaSource),
        inputFingerprints: [sha256(evidenceSource)],
        rawResponseFingerprint: sha256(canonicalJson(batchArtifactFingerprints)),
        aggregation: {
            version: 1,
            kind: 'mockserver-data-generator-provider-review-aggregation',
            evidenceSourceFingerprint: sha256(evidenceSource),
            batchManifestFingerprint: manifest.fingerprint,
            batchInputFingerprints: prepared.batches.map(({ inputFingerprint }) => inputFingerprint),
            batchArtifactFingerprints
        },
        output: {
            version: 1,
            evidenceFingerprint: evidence.fingerprint,
            reviews
        }
    };
    return Object.freeze({ ...base, fingerprint: sha256(JSON.stringify(base)) });
}
