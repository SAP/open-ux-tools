import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAdjudicationPacket } from './lib/adjudication-packet.mjs';
import { adjudicatePacket } from './lib/judge-panel.mjs';
import { joinAdjudicatedQueue } from './lib/adjudicated-queue-join.mjs';
import { buildPartitionManifests } from './lib/partition-manifests.mjs';
import { createOpaqueIdentity } from './lib/opaque-identity.mjs';

const checksum = 'c'.repeat(64);
const context = (propertyName) => ({
    inputFormat: 'v3',
    entityName: 'Orders',
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
const service = (id, split, extra = {}) => ({
    id,
    source: { contentChecksum: checksum, format: 'csn', uri: `${id}.json` },
    license: { identifier: 'Apache-2.0', redistributable: true },
    ...extra
});
const registry = {
    services: [
        service('svc-train', 'train'),
        service('svc-cal', 'calibration'),
        service('svc-hold', 'unseen-sap-holdout'),
        service('svc-eval', 'train', { evaluationOnly: true })
    ]
};
const splits = {
    assignments: {
        'svc-train': 'train',
        'svc-cal': 'calibration',
        'svc-hold': 'unseen-sap-holdout',
        'svc-eval': 'train'
    },
    clusters: [['svc-train'], ['svc-cal'], ['svc-hold'], ['svc-eval']]
};
const queue = (serviceId, split, names) => ({
    services: [
        {
            serviceId,
            pending: names.map((name) => ({
                fieldId: `property:${serviceId}/Orders/${name}`,
                serviceId,
                split,
                domain: 'sales',
                candidateRole: null,
                reviewStatus: 'pending',
                priorPlannerStatus: null,
                context: context(name),
                sourceChecksum: checksum
            }))
        }
    ]
});
const roles = ['status', 'email'];
const registryRoles = { status: { family: 'status' }, email: { family: 'contact' } };
const guidelineText =
    'Assign status for any lifecycle or processing status of a business object; unknown otherwise. '.repeat(2);
const packet = buildAdjudicationPacket({
    queues: [
        queue('svc-train', 'train', ['status_a', 'mail', 'id']),
        queue('svc-cal', 'calibration', ['status_b', 'other']),
        queue('svc-hold', 'unseen-sap-holdout', ['state']),
        queue('svc-eval', 'train', ['status_c'])
    ],
    roles,
    suggestedRoles: ['status'],
    guidelineText
});
const labelsFor = (item) =>
    /status|state/u.test(item.fieldId) ? 'status' : /mail/u.test(item.fieldId) ? 'email' : 'unknown';
const run = (judgeId, model, flip) => ({
    judgeId,
    model,
    promptSha256: 'b'.repeat(64),
    judgments: packet.items.map((item, index) => ({
        itemId: item.itemId,
        expectedRole: flip === index ? 'email' : labelsFor(item),
        supported: true,
        decisiveMetadata: false
    }))
});
const adjudication = adjudicatePacket({
    packet,
    judgeRuns: [run('a', 'm-a', -1), run('b', 'm-b', -1), run('c', 'm-c', 0)],
    roles,
    statusRoles: ['status']
});

test('join emits opaque fitting rows, real sealed rows, and skips unauthorized sources', () => {
    const identity = createOpaqueIdentity('0123456789abcdef-salt');
    const joined = joinAdjudicatedQueue({ packet, adjudication, registry, splits, identity, roles });
    assert.equal(joined.counts.sealed, 1);
    assert.equal(joined.sealedRows[0].serviceId, 'svc-hold');
    assert.equal(joined.counts.skippedByReason['source-not-authorized-for-training'], 1);
    assert.ok(
        joined.fittingRows.every(
            (row) =>
                /^[a-f0-9]{64}$/u.test(row.id) &&
                /^[a-f0-9]{64}$/u.test(row.group) &&
                /^[a-f0-9]{64}$/u.test(row.family)
        )
    );
    assert.equal(JSON.stringify(joined.fittingRows).includes('svc-train'), false);
    const manifests = buildPartitionManifests({
        fittingRows: joined.fittingRows,
        sealedRows: joined.sealedRows,
        registryRoles,
        minimumCorrectPerRole: 1,
        minimumCorrectPerFamily: 1
    });
    assert.equal(manifests.trainIds.length, 3);
    assert.equal(manifests.calibrationIds.length, 2);
    assert.equal(manifests.counts.sealed.statusFields, 1);
    assert.ok(manifests.claimableLabelsPreview.includes('unknown'));
});

test('join drops every row of a serialized context that carries conflicting labels in one partition', () => {
    const identity = createOpaqueIdentity('0123456789abcdef-salt');
    // Two train fields with identical structure are judged differently: both leave the fitting set.
    const conflictQueue = queue('svc-train', 'train', ['status_a', 'status_b', 'mail']);
    conflictQueue.services[0].pending[1].context = context('status_a');
    const conflictPacket = buildAdjudicationPacket({
        queues: [
            conflictQueue,
            queue('svc-cal', 'calibration', ['status_c', 'other']),
            queue('svc-hold', 'unseen-sap-holdout', ['state'])
        ],
        roles,
        suggestedRoles: ['status'],
        guidelineText
    });
    const judge = (judgeId, model) => ({
        judgeId,
        model,
        promptSha256: 'b'.repeat(64),
        judgments: conflictPacket.items.map((item) => ({
            itemId: item.itemId,
            expectedRole: item.fieldId.endsWith('status_b') ? 'unknown' : labelsFor(item),
            supported: true,
            decisiveMetadata: false
        }))
    });
    const conflictAdjudication = adjudicatePacket({
        packet: conflictPacket,
        judgeRuns: [judge('a', 'm-a'), judge('b', 'm-b'), judge('c', 'm-c')],
        roles,
        statusRoles: ['status']
    });
    const joined = joinAdjudicatedQueue({
        packet: conflictPacket,
        adjudication: conflictAdjudication,
        registry,
        splits,
        identity,
        roles
    });
    assert.equal(joined.counts.skippedByReason['conflicting-context-labels'], 2);
    assert.deepEqual(joined.counts.fittingByPartition, { train: 1, calibration: 2 });
    assert.equal(joined.counts.sealed, 1);
});

test('join drops the lower-ranked copy of a context shared across partitions, never moving rows', () => {
    const identity = createOpaqueIdentity('0123456789abcdef-salt');
    // `mail` exists in train, calibration and the sealed holdout with the same structure.
    const leakPacket = buildAdjudicationPacket({
        queues: [
            queue('svc-train', 'train', ['status_a', 'mail']),
            queue('svc-cal', 'calibration', ['status_b', 'mail', 'other']),
            queue('svc-hold', 'unseen-sap-holdout', ['state', 'mail'])
        ],
        roles,
        suggestedRoles: ['status'],
        guidelineText
    });
    const judge = (judgeId, model) => ({
        judgeId,
        model,
        promptSha256: 'b'.repeat(64),
        judgments: leakPacket.items.map((item) => ({
            itemId: item.itemId,
            expectedRole: labelsFor(item),
            supported: true,
            decisiveMetadata: false
        }))
    });
    const leakAdjudication = adjudicatePacket({
        packet: leakPacket,
        judgeRuns: [judge('a', 'm-a'), judge('b', 'm-b'), judge('c', 'm-c')],
        roles,
        statusRoles: ['status']
    });
    const joined = joinAdjudicatedQueue({
        packet: leakPacket,
        adjudication: leakAdjudication,
        registry,
        splits,
        identity,
        roles
    });
    assert.equal(joined.counts.skippedByReason['cross-partition-context-leakage'], 2);
    assert.deepEqual(joined.counts.fittingByPartition, { train: 1, calibration: 2 });
    assert.equal(joined.counts.sealed, 2);
    assert.equal(joined.sealedRows.filter((row) => row.label === 'email').length, 1);
});

test('partition manifests reject missing abstention examples', () => {
    const rows = [
        { id: '1', group: 'g1', family: 'f1', partition: 'train', label: 'status', context: context('x') },
        { id: '2', group: 'g2', family: 'f2', partition: 'calibration', label: 'status', context: context('y') }
    ];
    assert.throws(
        () => buildPartitionManifests({ fittingRows: rows, sealedRows: [], registryRoles }),
        /unknown examples/u
    );
});
