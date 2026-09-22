import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAdjudicationPacket, batchPacket } from './lib/adjudication-packet.mjs';
import { adjudicatePacket, validateJudgeRun } from './lib/judge-panel.mjs';
import { createOpaqueIdentity } from './lib/opaque-identity.mjs';

const context = (propertyName, extra = {}) => ({
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
    neighbors: [],
    ...extra
});
const queue = (split, names) => ({
    services: [
        {
            serviceId: `svc-${split}`,
            pending: names.map((name) => ({
                fieldId: `property:svc/Orders/${name}`,
                serviceId: `svc-${split}`,
                split,
                domain: 'sales',
                candidateRole: null,
                reviewStatus: 'pending',
                priorPlannerStatus: null,
                context: context(name),
                sourceChecksum: 'a'.repeat(64)
            }))
        }
    ]
});
const roles = ['status', 'approval_status', 'email', 'city'];
const guidelineText =
    'Assign status for any lifecycle or processing status of a business object; unknown otherwise. '.repeat(2);
const prompt = 'b'.repeat(64);
const packet = buildAdjudicationPacket({
    queues: [queue('train', ['status_code', 'mail']), queue('known-sap-holdout', ['state'])],
    roles,
    suggestedRoles: ['status'],
    guidelineText
});
const run = (judgeId, model, labels) => ({
    judgeId,
    model,
    promptSha256: prompt,
    judgments: packet.items.map((item, index) => ({
        itemId: item.itemId,
        expectedRole: labels[index],
        supported: true,
        decisiveMetadata: false,
        rationale: 'x'
    }))
});

test('packet items are deduplicated, structural, and batched deterministically', () => {
    assert.equal(packet.items.length, 3);
    assert.equal(packet.qualification, 'pending-adjudication-not-training-data');
    assert.deepEqual(packet.candidateRoles.suggested, ['status']);
    assert.equal(batchPacket(packet, 2).length, 2);
    assert.throws(
        () => buildAdjudicationPacket({ queues: [], roles, suggestedRoles: ['nope'], guidelineText }),
        /not registered/u
    );
});

test('majority consensus adjudicates, disagreement stays pending, provenance is machine-only', () => {
    const result = adjudicatePacket({
        packet,
        judgeRuns: [
            run('a', 'model-a', ['status', 'email', 'status']),
            run('b', 'model-b', ['status', 'email', 'unknown']),
            run('c', 'model-c', ['status', 'unknown', 'city'])
        ],
        roles,
        statusRoles: ['status', 'approval_status']
    });
    assert.deepEqual(
        result.items.map((item) => item.expectedRole),
        ['status', 'email', null]
    );
    assert.equal(result.items[0].agreement, 'unanimous');
    assert.equal(result.items[1].agreement, 'majority');
    assert.equal(result.items[2].reviewStatus, 'pending-disagreement');
    assert.equal(result.provenance.humanVerified, false);
    assert.equal(result.consistency.adjudicated, 2);
    assert.equal(result.consistency.pendingDisagreement, 1);
    assert.equal(result.consistency.statusLabelsWithNameOnlySignal.total, 1);
    assert.ok(result.consistency.fleissKappa !== null);
});

test('judge runs are validated strictly', () => {
    assert.throws(
        () =>
            validateJudgeRun({
                packet,
                run: { judgeId: 'a', model: 'm', promptSha256: 'short', judgments: [] },
                roles
            }),
        /sha256/u
    );
    assert.throws(
        () =>
            validateJudgeRun({
                packet,
                run: {
                    ...run('a', 'm', ['status', 'email', 'status']),
                    judgments: [{ itemId: 'zzz', expectedRole: 'status', supported: true, decisiveMetadata: false }]
                },
                roles
            }),
        /unknown item/u
    );
    assert.throws(
        () =>
            adjudicatePacket({
                packet,
                judgeRuns: [
                    run('a', 'same', ['status', 'email', 'status']),
                    run('b', 'same', ['status', 'email', 'status'])
                ],
                roles
            }),
        /distinct model/u
    );
});

test('opaque identities are salted digests with a private reverse mapping', () => {
    const identity = createOpaqueIdentity('0123456789abcdef-salt');
    const digest = identity.digest('service', 'svc-train');
    assert.match(digest, /^[a-f0-9]{64}$/u);
    assert.equal(identity.mapping().service[digest], 'svc-train');
    assert.throws(() => createOpaqueIdentity('short'), /salt/u);
});
