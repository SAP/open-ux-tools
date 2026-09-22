import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { parseEdmx } from '../../packages/mock-data-generator/dist/schema/edmx.js';
import { createFieldContextV3 } from '../../packages/mock-data-generator/dist/semantics/field-context.js';
import { SEMANTIC_ROLE_REGISTRY } from '../../packages/mock-data-generator/dist/semantics/role-registry.js';
import { routeSealedService, sealedDatasetFingerprint, summarizeSealedDecisions } from './lib/sealed-evaluation.mjs';

const edmx = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices>
<Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="S">
<EntityType Name="Ticket"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="LifecycleCode" Type="Edm.String" MaxLength="2"/>
<Property Name="ContactMail" Type="Edm.String" MaxLength="80"/>
<Property Name="Note" Type="Edm.String" MaxLength="80"/>
</EntityType>
<EntityContainer Name="C"><EntitySet Name="Tickets" EntityType="S.Ticket"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

const graph = parseEdmx(edmx);
const entity = graph.entities[0];
const row = (name, label, serviceId = 'svc-a', domain = 'service') => ({
    id: `property:${serviceId}/Tickets/${name}`,
    serviceId,
    domain,
    label,
    sourceChecksum: 'e'.repeat(64),
    context: createFieldContextV3(
        graph,
        entity,
        entity.properties.find((property) => property.name === name)
    )
});
const stubClassifier = (roles) => ({
    fingerprint: 'f'.repeat(64),
    inputFormat: 'v3',
    async classify(input) {
        const role = roles[input.propertyName] ?? 'unknown';
        return {
            role,
            confidence: role === 'unknown' ? 0.99 : 0.97,
            source: role === 'unknown' ? 'unknown' : 'classifier',
            routeThreshold: 0.5
        };
    }
});

test('routes sealed fields through runtime arbitration and derives gate fields', async () => {
    const rows = [row('LifecycleCode', 'status'), row('ContactMail', 'email'), row('Note', 'unknown')];
    const decisions = await routeSealedService({
        graph,
        rows,
        classifier: stubClassifier({ LifecycleCode: 'status', ContactMail: 'email', Note: 'city' })
    });
    assert.equal(decisions.length, 3);
    const summary = summarizeSealedDecisions({
        decisions,
        claimedLabels: ['status', 'email', 'city'],
        registryRoles: SEMANTIC_ROLE_REGISTRY
    });
    const byId = Object.fromEntries(summary.fields.map((field) => [field.expectedRole, field]));
    assert.equal(byId.status.unannotatedStatus, true);
    assert.equal(summary.sealedEvaluation.unannotatedStatusFields.total, 1);
    assert.equal(summary.sealedEvaluation.services, 1);
    assert.ok(summary.sealedEvaluation.acceptedRoles.total >= 1);
    if (byId.unknown.acceptedRole === 'city') assert.equal(byId.unknown.criticalFalsePositive, true);
    assert.equal(summary.gate.pass, false, 'three fields cannot satisfy the sample-size rule');
});

test('policy-forbidden expected roles leave the recall denominators but stay in the field table', async () => {
    // `status` forbids keys: the ID key labelled status can never be routed by any classifier.
    const rows = [row('ID', 'status'), row('LifecycleCode', 'status'), row('Note', 'unknown')];
    const decisions = await routeSealedService({
        graph,
        rows,
        classifier: stubClassifier({ LifecycleCode: 'status' })
    });
    const summary = summarizeSealedDecisions({
        decisions,
        claimedLabels: ['status'],
        registryRoles: SEMANTIC_ROLE_REGISTRY
    });
    const key = summary.fields.find((field) => field.id.endsWith('/ID'));
    assert.equal(key.policyExcluded, true);
    assert.equal(key.expectedPolicy, 'key-policy');
    assert.equal(key.unannotatedStatus, false);
    assert.equal(key.supported, false);
    assert.equal(summary.sealedEvaluation.unannotatedStatusFields.total, 1);
    assert.equal(summary.fields.length, 3);
});

test('sealed fingerprint is order-independent and sensitive to labels', () => {
    const rows = [row('LifecycleCode', 'status'), row('ContactMail', 'email')];
    assert.equal(sealedDatasetFingerprint(rows), sealedDatasetFingerprint([...rows].reverse()));
    assert.notEqual(
        sealedDatasetFingerprint(rows),
        sealedDatasetFingerprint([row('LifecycleCode', 'unknown'), row('ContactMail', 'email')])
    );
});

test('missing sealed fields fail the summary instead of being ignored', () => {
    assert.throws(
        () =>
            summarizeSealedDecisions({
                decisions: [{ row: row('Note', 'unknown'), missing: true }],
                claimedLabels: [],
                registryRoles: SEMANTIC_ROLE_REGISTRY
            }),
        /could not be located/u
    );
});
