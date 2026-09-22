import { createHash } from 'node:crypto';
import { assertCandidateRelevanceHead } from '../../../packages/mock-data-generator/dist/model/candidate-relevance.js';
import { assertReleaseRelevanceHead } from '../../../packages/mock-data-generator/dist/model/packaged-models.js';
import { assertDisjoint, relevanceDataFingerprint } from './relevance-train.mjs';
import { assertReviewRecord } from './qualify-head.mjs';

/**
 * Promote an unqualified relevance head only when provenance, partitions and sealed counts pass
 * the release gate. The record states machine-label provenance.
 */

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/**
 * @param {object} options options
 * @param {object} options.head unqualified relevance head
 * @param {object} options.report relevance report from train-relevance-head
 * @param {object[]} options.rows reviewed dataset
 * @param {{ train: string[], calibration: string[], sealed: string[] }} options.partitions id lists
 * @param {{ encoderSha256: string, vocabularySha256: string, embeddingDimension: number }} options.contract classifier contract
 * @param {object} options.reviewRecord label review record
 * @param {string} options.qualifiedAt ISO timestamp
 * @returns {object} qualified head
 */
export function qualifyRelevanceHead({ head, report, rows, partitions, contract, reviewRecord, qualifiedAt }) {
    if (head?.qualification?.status !== 'unqualified')
        throw new TypeError('relevance head must come from the development trainer');
    const byId = new Map(rows.map((row) => [row.id, row]));
    const select = (ids, name) =>
        ids.map((id) => {
            const row = byId.get(id);
            if (!row) throw new TypeError(`${name} partition references an unknown row`);
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
    if (relevanceDataFingerprint(train) !== head.qualification.trainingDataFingerprint)
        throw new TypeError('training data fingerprint drift');
    if (relevanceDataFingerprint(calibration) !== head.qualification.calibrationDataFingerprint)
        throw new TypeError('calibration data fingerprint drift');
    const sealedFingerprint = relevanceDataFingerprint(sealed);
    if (report?.sealedDatasetFingerprint !== sealedFingerprint) throw new TypeError('sealed data fingerprint drift');
    if (report.headSha256 !== sha256(JSON.stringify(head)))
        throw new TypeError('relevance report was produced for a different head');
    const counts = report.sealed;
    const positives = sealed.filter((row) => row.relevant).length;
    const hardNegatives = sealed.length - positives;
    if (counts?.positives !== positives || counts?.hardNegatives !== hardNegatives)
        throw new TypeError('sealed counts do not match the sealed partition');
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
                positiveAccepted: counts.positiveAccepted,
                hardNegatives,
                hardNegativeAccepted: counts.hardNegativeAccepted
            },
            labelProvenance: {
                method: reviewRecord.method,
                humanVerified: false,
                reviewRecordSha256: sha256(JSON.stringify(reviewRecord))
            },
            qualifiedAt
        }
    };
    assertCandidateRelevanceHead(qualified, contract);
    assertReleaseRelevanceHead(qualified);
    return qualified;
}
