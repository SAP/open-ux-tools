import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { FIELD_VALUE_RELEVANCE_SERIALIZER_FINGERPRINT } from '../../packages/mock-data-generator/dist/model/candidate-relevance.js';
import { qualifyRelevanceHead } from './lib/qualify-relevance-head.mjs';
import { relevanceDataFingerprint } from './lib/relevance-train.mjs';

const hex = (char) => char.repeat(64);
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
const rows = [...train, ...calibration, ...sealed];
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
const contract = { encoderSha256: hex('a'), vocabularySha256: hex('b'), embeddingDimension: 2 };
const base = { head, report, rows, partitions, contract, reviewRecord, qualifiedAt: 'x' };

test('qualifies a relevance head with count-shaped sealed evidence', () => {
    const qualified = qualifyRelevanceHead(base);
    assert.equal(qualified.qualification.status, 'qualified');
    assert.equal(qualified.qualification.partitionPolicyVersion, 'service-disjoint-v1');
    assert.deepEqual(qualified.qualification.sealedEvaluation, {
        positives: 100,
        positiveAccepted: 85,
        hardNegatives: 200,
        hardNegativeAccepted: 1
    });
});

test('refuses hard-negative leakage, drift and overlapping partitions', () => {
    assert.throws(
        () =>
            qualifyRelevanceHead({
                ...base,
                report: { ...report, sealed: { ...report.sealed, hardNegativeAccepted: 3 } }
            }),
        /relevance verifier/u
    );
    assert.throws(
        () => qualifyRelevanceHead({ ...base, report: { ...report, sealedDatasetFingerprint: hex('0') } }),
        /drift/u
    );
    assert.throws(
        () =>
            qualifyRelevanceHead({
                ...base,
                partitions: { ...partitions, calibration: [...partitions.calibration, partitions.train[0]] }
            }),
        /service-disjoint|overlaps/u
    );
    assert.throws(
        () => qualifyRelevanceHead({ ...base, report: { ...report, sealed: { ...report.sealed, positives: 99 } } }),
        /sealed counts/u
    );
});
