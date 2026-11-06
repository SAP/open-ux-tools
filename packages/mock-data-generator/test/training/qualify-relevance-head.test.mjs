import { createHash } from 'node:crypto';
import { FIELD_VALUE_RELEVANCE_SERIALIZER_FINGERPRINT } from '../../training/common/runtime.mjs';
import { qualifyRelevanceHead } from '../../training/relevance-head/qualify-relevance.mjs';
import { relevanceDataFingerprint } from '../../training/relevance-head/relevance-train.mjs';

const hex = (character) => character.repeat(64);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const pair = (group, field, value) => ({
    service: { alias: group, urlPath: `/${group}`, odataVersion: '4.0' },
    resource: 'R',
    entity: 'E',
    field: { name: field, primitiveType: 'string', nullable: true },
    value,
    linkedCode: { property: 'ID', value: '1' },
    textLink: { codeProperty: 'ID', textProperty: field },
    relatedResources: []
});
const rowsFor = (group, count, negatives) =>
    Array.from({ length: count }, (_, index) => ({
        id: `${group}-${index}`,
        serviceGroup: group,
        reviewed: true,
        relevant: index >= negatives,
        ...(index < negatives ? { negativeKind: 'cross-domain' } : {}),
        pair: pair(group, `F${index}`, `${group}-v${index}`)
    }));
const train = rowsFor('g-train', 4, 2);
const calibration = rowsFor('g-cal', 4, 2);
const sealed = rowsFor('g-sealed', 300, 200);
const partitions = {
    train: train.map((row) => row.id),
    calibration: calibration.map((row) => row.id),
    sealed: sealed.map((row) => row.id)
};
const head = {
    model: 'field-value-relevance-v1',
    dim: 2,
    coef: [0.1, 0.2],
    intercept: 0,
    temperature: 1,
    threshold: 0.6,
    maxWordPieceTokens: 64,
    encoderSha256: hex('a'),
    tokenizerSha256: hex('b'),
    serializerFingerprint: FIELD_VALUE_RELEVANCE_SERIALIZER_FINGERPRINT,
    qualification: {
        status: 'unqualified',
        trainingDataFingerprint: relevanceDataFingerprint(train),
        calibrationDataFingerprint: relevanceDataFingerprint(calibration),
        sealedIds: partitions.sealed
    }
};
const report = {
    headSha256: sha(JSON.stringify(head)),
    sealedDatasetFingerprint: relevanceDataFingerprint(sealed),
    sealed: { positives: 100, positiveAccepted: 85, hardNegatives: 200, hardNegativeAccepted: 1 }
};
const reviewRecord = {
    format: 'mockgen-label-review-record',
    version: 1,
    method: 'model-panel-consensus',
    humanVerified: false,
    judges: [
        { model: 'a', promptSha256: hex('c') },
        { model: 'b', promptSha256: hex('c') }
    ],
    guidelineSha256: hex('d'),
    adjudicationSha256: hex('e'),
    consistencySha256: hex('f')
};
const base = {
    head,
    report,
    rows: [...train, ...calibration, ...sealed],
    partitions,
    contract: { encoderSha256: hex('a'), vocabularySha256: hex('b'), embeddingDimension: 2 },
    reviewRecord,
    qualifiedAt: 'x'
};

describe('qualifyRelevanceHead', () => {
    test('qualifies a relevance head with count-shaped sealed evidence', () => {
        // Given a report whose sealed counts pass the release gate
        // When qualified
        const qualified = qualifyRelevanceHead(base);
        // Then the head is service-disjoint qualified with the sealed counts
        expect(qualified.qualification.status).toBe('qualified');
        expect(qualified.qualification.partitionPolicyVersion).toBe('service-disjoint-v1');
        expect(qualified.qualification.sealedEvaluation).toEqual(report.sealed);
    });

    test('refuses hard-negative leakage, drift, overlapping partitions and wrong counts', () => {
        // Given each broken input, then qualification refuses
        const leaky = { ...report, sealed: { ...report.sealed, hardNegativeAccepted: 3 } };
        expect(() => qualifyRelevanceHead({ ...base, report: leaky })).toThrow(/relevance verifier/u);
        expect(() =>
            qualifyRelevanceHead({ ...base, report: { ...report, sealedDatasetFingerprint: hex('0') } })
        ).toThrow(/drift/u);
        const overlapping = { ...partitions, calibration: [...partitions.calibration, partitions.train[0]] };
        expect(() => qualifyRelevanceHead({ ...base, partitions: overlapping })).toThrow(/service-disjoint|overlaps/u);
        const miscounted = { ...report, sealed: { ...report.sealed, positives: 99 } };
        expect(() => qualifyRelevanceHead({ ...base, report: miscounted })).toThrow(/sealed counts/u);
        expect(() => qualifyRelevanceHead({ ...base, report: { ...report, headSha256: hex('0') } })).toThrow(
            /different head/u
        );
        expect(() => qualifyRelevanceHead({ ...base, partitions: { ...partitions, train: ['missing'] } })).toThrow(
            /unknown row/u
        );
    });
});
