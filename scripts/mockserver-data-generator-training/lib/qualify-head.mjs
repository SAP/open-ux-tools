import { createHash } from 'node:crypto';
import { assertEmbeddingHead } from '../../../packages/mock-data-generator/dist/model/embedding-classifier.js';
import {
    assertPackagedClassifierHead,
    assertReleaseClassifier
} from '../../../packages/mock-data-generator/dist/model/packaged-models.js';
import {
    FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
    serializeFieldContextV3
} from '../../../packages/mock-data-generator/dist/semantics/field-context.js';
import {
    SEMANTIC_ROLE_REGISTRY,
    SEMANTIC_ROLE_REGISTRY_FINGERPRINT
} from '../../../packages/mock-data-generator/dist/semantics/role-registry.js';

/**
 * Promote an unqualified v3 role head to qualified only when every release check passes.
 *
 * The qualification record states machine-label provenance explicitly. Nothing else in the
 * toolchain writes status 'qualified'.
 */

const HEX64 = /^[a-f0-9]{64}$/u;
const DEVELOPER_PATH = /\/(?:Users|home)\/[A-Za-z0-9._-]+\//u;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/**
 * Validate a label-provenance review record.
 *
 * @param {object} record review record
 * @returns {object} record
 */
export function assertReviewRecord(record) {
    if (record?.format !== 'mockgen-label-review-record' || record.version !== 1)
        throw new TypeError('unsupported review record');
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
        if (!HEX64.test(record[key] ?? '')) throw new TypeError(`review record ${key} must be a sha256`);
    }
    return record;
}

/**
 * Qualify a trained head.
 *
 * @param {object} options options
 * @param {object} options.head unqualified head from train-v3-head
 * @param {object} options.report sealed evaluation report from evaluate-sealed-roles
 * @param {string} options.recomputedSealedFingerprint fingerprint recomputed from the sealed rows
 * @param {object} options.manifest packaged model manifest (current)
 * @param {object} options.reviewRecord label review record
 * @param {string} options.qualifiedAt ISO timestamp
 * @returns {object} qualified head
 */
export function qualifyHead({ head, report, recomputedSealedFingerprint, manifest, reviewRecord, qualifiedAt }) {
    if (head?.inputFormat !== 'v3') throw new TypeError('only v3 heads can be qualified');
    if (head.qualification?.status !== 'unqualified')
        throw new TypeError('head must come from the development trainer');
    if (head.qualification.partitionPolicyVersion !== 'family-disjoint-v2')
        throw new TypeError('head partitions are not family-disjoint');
    const auxiliary = new Set(head.auxiliaryLabels ?? []);
    const routable = head.labels.filter(
        (label) => !(head.abstentionLabels ?? ['unknown']).includes(label) && !auxiliary.has(label)
    );
    if (routable.length === 0) throw new TypeError('head routes no label at all');
    if ((head.qualification.insufficientCalibrationRoles ?? []).some((label) => !auxiliary.has(label))) {
        throw new TypeError('head routes a label without calibration support');
    }
    if (
        JSON.stringify([...auxiliary].sort()) !==
        JSON.stringify(Object.keys(head.qualification.auxiliaryReasons ?? {}).sort())
    ) {
        throw new TypeError('auxiliary labels do not match the trainer decision record');
    }
    if (!report?.gate?.pass)
        throw new TypeError(`role quality gate failed: ${(report?.gate?.failures ?? ['missing']).join('; ')}`);
    if (report.sealedDatasetFingerprint !== recomputedSealedFingerprint)
        throw new TypeError('sealed dataset fingerprint drift');
    if (report.headSha256 !== sha256(JSON.stringify(head)))
        throw new TypeError('sealed report was produced for a different head');
    assertReviewRecord(reviewRecord);
    const qualified = {
        ...head,
        qualification: {
            ...head.qualification,
            status: 'qualified',
            reason: 'Sealed service-disjoint evaluation passed the release gate on machine-panel labels.',
            sealedDatasetFingerprint: report.sealedDatasetFingerprint,
            sealedEvaluation: report.sealedEvaluation,
            labelProvenance: {
                method: reviewRecord.method,
                humanVerified: false,
                reviewRecordSha256: sha256(JSON.stringify(reviewRecord))
            },
            qualifiedAt
        }
    };
    const options = {
        fingerprint: head.qualification.artifactFingerprint,
        embedder: { embed: async () => [] },
        head: qualified,
        serializeV3Input: serializeFieldContextV3,
        v3Roles: SEMANTIC_ROLE_REGISTRY,
        v3RegistryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
        v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT
    };
    assertEmbeddingHead(qualified, options);
    assertPackagedClassifierHead(qualified, 'v3');
    const candidateManifest = structuredClone(manifest);
    const classifier = candidateManifest.components.find((component) => component.kind === 'classifier');
    classifier.contract = { ...classifier.contract, inputFormat: 'v3' };
    assertReleaseClassifier(candidateManifest, qualified);
    const serialized = JSON.stringify(qualified);
    if (DEVELOPER_PATH.test(serialized)) throw new TypeError('qualified head contains a developer path');
    if (serialized.includes('REVIEW_ME')) throw new TypeError('qualified head contains an unresolved review label');
    return qualified;
}
