import { sha256 } from '../common/io.mjs';
import { assertReviewRecord, labelProvenance } from '../common/public-artifact.mjs';
import { assertCandidateRelevanceHead, assertReleaseRelevanceHead } from '../common/runtime.mjs';
import { assertDisjoint, relevanceDataFingerprint } from './relevance-train.mjs';

/**
 * Promote an unqualified relevance head only when partitions, data fingerprints, sealed counts and the
 * review record check out and the runtime's own head and release checks pass.
 * @param {object} options options
 * @param {object} options.head unqualified relevance head
 * @param {object} options.report report from train-relevance-head.mjs
 * @param {object[]} options.rows reviewed rows
 * @param {{ train: string[], calibration: string[], sealed: string[] }} options.partitions id lists
 * @param {{ encoderSha256: string, vocabularySha256: string, embeddingDimension: number }} options.contract classifier encoder contract
 * @param {object} options.reviewRecord label review record
 * @param {string} options.qualifiedAt ISO timestamp
 * @returns {object} the qualified head (still carrying `sealedIds`; see `publicHead`)
 */
export function qualifyRelevanceHead({ head, report, rows, partitions, contract, reviewRecord, qualifiedAt }) {
    if (head?.qualification?.status !== 'unqualified') {
        throw new TypeError('relevance head must come from the development trainer');
    }
    const byId = new Map(rows.map((row) => [row.id, row]));
    const select = (ids, name) =>
        ids.map((id) => {
            const row = byId.get(id);
            if (!row) {
                throw new TypeError(`${name} partition references an unknown row`);
            }
            return row;
        });
    const train = select(partitions.train, 'training');
    const calibration = select(partitions.calibration, 'calibration');
    const sealed = select(partitions.sealed, 'sealed');
    assertDisjoint([
        ['training', train],
        ['calibration', calibration],
        ['sealed', sealed]
    ]);
    if (relevanceDataFingerprint(train) !== head.qualification.trainingDataFingerprint) {
        throw new TypeError('training data fingerprint drift');
    }
    if (relevanceDataFingerprint(calibration) !== head.qualification.calibrationDataFingerprint) {
        throw new TypeError('calibration data fingerprint drift');
    }
    const sealedFingerprint = relevanceDataFingerprint(sealed);
    if (report?.sealedDatasetFingerprint !== sealedFingerprint) {
        throw new TypeError('sealed data fingerprint drift');
    }
    if (report.headSha256 !== sha256(JSON.stringify(head))) {
        throw new TypeError('relevance report was produced for a different head');
    }
    const positives = sealed.filter((row) => row.relevant).length;
    const hardNegatives = sealed.length - positives;
    if (report.sealed?.positives !== positives || report.sealed?.hardNegatives !== hardNegatives) {
        throw new TypeError('sealed counts do not match the sealed partition');
    }
    assertReviewRecord(reviewRecord);
    const qualified = {
        ...head,
        qualification: {
            ...head.qualification,
            status: 'qualified',
            reason: 'Service-disjoint sealed evaluation passed the release gate on machine-panel labels.',
            partitionPolicyVersion: 'service-disjoint-v1',
            sealedDatasetFingerprint: sealedFingerprint,
            sealedEvaluation: {
                positives,
                positiveAccepted: report.sealed.positiveAccepted,
                hardNegatives,
                hardNegativeAccepted: report.sealed.hardNegativeAccepted
            },
            labelProvenance: labelProvenance(reviewRecord),
            qualifiedAt
        }
    };
    assertCandidateRelevanceHead(qualified, contract);
    assertReleaseRelevanceHead(qualified);
    return qualified;
}
