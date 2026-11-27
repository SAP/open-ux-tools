import { sha256 } from '../common/io.mjs';
import { assertReviewRecord, labelProvenance } from '../common/public-artifact.mjs';
import {
    assertEmbeddingHead,
    assertPackagedClassifierHead,
    assertReleaseClassifier,
    v3ClassifierContract
} from '../common/runtime.mjs';

/**
 * Promote an unqualified v3 role head to qualified only when every release check passes: family-disjoint
 * partitions, calibration support for every routed label, a passing sealed gate for exactly this head and
 * sealed set, a valid review record, and the runtime's own head and release checks.
 * @param {object} options options
 * @param {object} options.head unqualified head from train-head.mjs
 * @param {object} options.report sealed report from evaluate-sealed.mjs
 * @param {string} options.recomputedSealedFingerprint fingerprint recomputed from the sealed rows
 * @param {object} options.manifest packaged model manifest
 * @param {object} options.reviewRecord label review record
 * @param {string} options.qualifiedAt ISO timestamp
 * @returns {object} the qualified head (still carrying its record identifiers; see `publicHead`)
 */
export function qualifyHead({ head, report, recomputedSealedFingerprint, manifest, reviewRecord, qualifiedAt }) {
    if (head?.inputFormat !== 'v3') {
        throw new TypeError('only v3 heads can be qualified');
    }
    if (head.qualification?.status !== 'unqualified') {
        throw new TypeError('head must come from the development trainer');
    }
    if (head.qualification.partitionPolicyVersion !== 'family-disjoint-v2') {
        throw new TypeError('head partitions are not family-disjoint');
    }
    const auxiliary = new Set(head.auxiliaryLabels ?? []);
    const routable = head.labels.filter(
        (label) => !(head.abstentionLabels ?? ['unknown']).includes(label) && !auxiliary.has(label)
    );
    if (routable.length === 0) {
        throw new TypeError('head routes no label at all');
    }
    if ((head.qualification.insufficientCalibrationRoles ?? []).some((label) => !auxiliary.has(label))) {
        throw new TypeError('head routes a label without calibration support');
    }
    if (
        JSON.stringify([...auxiliary].sort()) !==
        JSON.stringify(Object.keys(head.qualification.auxiliaryReasons ?? {}).sort())
    ) {
        throw new TypeError('auxiliary labels do not match the trainer decision record');
    }
    if (!report?.gate?.pass) {
        throw new TypeError(`role quality gate failed: ${(report?.gate?.failures ?? ['missing']).join('; ')}`);
    }
    if (report.sealedDatasetFingerprint !== recomputedSealedFingerprint) {
        throw new TypeError('sealed dataset fingerprint drift');
    }
    if (report.headSha256 !== sha256(JSON.stringify(head))) {
        throw new TypeError('sealed report was produced for a different head');
    }
    assertReviewRecord(reviewRecord);
    const qualified = {
        ...head,
        qualification: {
            ...head.qualification,
            status: 'qualified',
            reason: 'Sealed service-disjoint evaluation passed the release gate on machine-panel labels.',
            sealedDatasetFingerprint: report.sealedDatasetFingerprint,
            sealedEvaluation: report.sealedEvaluation,
            labelProvenance: labelProvenance(reviewRecord),
            qualifiedAt
        }
    };
    assertEmbeddingHead(qualified, {
        fingerprint: head.qualification.artifactFingerprint,
        embedder: { embed: async () => [] },
        head: qualified,
        ...v3ClassifierContract()
    });
    assertPackagedClassifierHead(qualified, 'v3');
    const candidateManifest = structuredClone(manifest);
    const classifier = candidateManifest.components.find((component) => component.kind === 'classifier');
    classifier.contract = { ...classifier.contract, inputFormat: 'v3' };
    assertReleaseClassifier(candidateManifest, qualified);
    if (JSON.stringify(qualified).includes('REVIEW_ME')) {
        throw new TypeError('qualified head contains an unresolved review label');
    }
    return qualified;
}
