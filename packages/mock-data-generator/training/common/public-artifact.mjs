import { createHash } from 'node:crypto';
import { assertPublicModelMetadata } from '../../scripts/build-model-manifest.mjs';

/** Record identifiers a trainer keeps for audit but a shipped head must not carry (see build-model-manifest.mjs). */
const RECORD_IDENTIFIER_FIELDS = Object.freeze([
    'trainIds',
    'calibrationIds',
    'sealedIds',
    'trainGroups',
    'calibrationGroups',
    'trainFamilies',
    'calibrationFamilies'
]);
const HEX64 = /^[a-f0-9]{64}$/u;
const DEVELOPER_PATH = /\/(?:Users|home)\/[A-Za-z0-9._-]+\//u;

/**
 * Drop the training, calibration and sealed record identifiers from a qualified head, then run the
 * manifest builder's own public-metadata check on the result.
 * @param {object} head qualified head
 * @returns {object} the head without record identifiers
 * @throws {Error} when the result still carries record identifiers or a developer path
 */
export function publicHead(head) {
    const qualification = Object.fromEntries(
        Object.entries(head.qualification ?? {}).filter(([key]) => !RECORD_IDENTIFIER_FIELDS.includes(key))
    );
    const stripped = { ...head, qualification };
    assertPublicModelMetadata(stripped);
    if (DEVELOPER_PATH.test(JSON.stringify(stripped))) {
        throw new TypeError('the head contains a developer path');
    }
    return stripped;
}

/**
 * Validate a label-provenance review record: model-panel consensus, not human-verified, at least two
 * judges with prompt fingerprints, and guideline, adjudication and consistency digests.
 * @param {object} record review record
 * @returns {object} the record
 * @throws {TypeError} naming the first violated requirement
 */
export function assertReviewRecord(record) {
    if (record?.format !== 'mockgen-label-review-record' || record.version !== 1) {
        throw new TypeError('unsupported review record');
    }
    if (record.method !== 'model-panel-consensus' || record.humanVerified !== false) {
        throw new TypeError('review record must state model-panel-consensus with humanVerified false');
    }
    if (
        !Array.isArray(record.judges) ||
        record.judges.length < 2 ||
        record.judges.some((judge) => !judge.model || !HEX64.test(judge.promptSha256 ?? ''))
    ) {
        throw new TypeError('review record requires at least two judges with prompt fingerprints');
    }
    for (const key of ['guidelineSha256', 'adjudicationSha256', 'consistencySha256']) {
        if (!HEX64.test(record[key] ?? '')) {
            throw new TypeError(`review record ${key} must be a sha256`);
        }
    }
    return record;
}

/**
 * The label provenance a qualified head records for its review record.
 * @param {object} reviewRecord validated review record
 * @returns {{ method: string, humanVerified: false, reviewRecordSha256: string }} the provenance
 */
export function labelProvenance(reviewRecord) {
    return {
        method: reviewRecord.method,
        humanVerified: false,
        reviewRecordSha256: createHash('sha256').update(JSON.stringify(reviewRecord)).digest('hex')
    };
}
