import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    collectQueueContexts,
    contextStatistics,
    fitBinaryProbe,
    leaveOneFamilyOutProbe,
    partitionForSplit
} from './lib/context-statistics.mjs';

const context = (propertyName, entityName = 'Orders') => ({
    inputFormat: 'v3',
    entityName,
    propertyName,
    primitiveType: 'string',
    nullable: true,
    isKey: false,
    facets: {},
    annotations: [],
    linkedMetadataPaths: [],
    relationshipParticipation: [],
    neighbors: []
});
const queue = (split, fields) => ({
    services: [
        {
            serviceId: 'svc',
            pending: fields.map((name) => ({
                fieldId: `property:svc/Orders/${name}`,
                serviceId: 'svc',
                split,
                domain: 'd',
                context: context(name)
            }))
        }
    ]
});
const tokenizer = { encodeForModel: (text) => ({ inputIds: text.split(' ') }) };
const serialize = (ctx) => `v3 ${ctx.propertyName} ${ctx.entityName}`;

test('partitions map canonical splits and reject unknown ones', () => {
    assert.equal(partitionForSplit('train'), 'train');
    assert.equal(partitionForSplit('unseen-sap-holdout'), 'sealed');
    assert.throws(() => partitionForSplit('other'), /unsupported canonical split/u);
});

test('statistics count overflow, distinct texts and cross-partition collisions without text', () => {
    const items = collectQueueContexts([
        queue('train', ['status', 'status', 'a b c d']),
        queue('calibration', ['status']),
        queue('known-sap-holdout', ['x'])
    ]);
    const report = contextStatistics({ items, serialize, tokenizer, maxWordPieceTokens: 4 });
    assert.equal(report.total, 5);
    assert.equal(report.overflow.count, 1);
    assert.equal(report.perPartition.train.distinctTexts, 2);
    assert.equal(report.crossPartitionCollisions.trainCalibration, 1);
    assert.equal(report.crossPartitionCollisions.trainSealed, 0);
    assert.equal(JSON.stringify(report).includes('status'), false);
});

test('probe separates linearly separable proxy classes family by family', () => {
    const vectors = [];
    const labels = [];
    const families = [];
    for (let i = 0; i < 40; i += 1) {
        const positive = i % 2 === 0;
        vectors.push([positive ? 1 + (i % 5) / 10 : -1 - (i % 5) / 10, (i % 3) / 10]);
        labels.push(positive);
        families.push(`family-${i % 4}`);
    }
    const report = leaveOneFamilyOutProbe({ vectors, labels, families });
    assert.equal(report.overall.total, 40);
    assert.ok(report.overall.accuracy >= 0.95);
    assert.equal(report.perFamily.length, 4);
    assert.throws(() => fitBinaryProbe([[1]], [true]), /both classes/u);
});
