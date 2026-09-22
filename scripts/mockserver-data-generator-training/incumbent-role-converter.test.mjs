import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { convertIncumbentRoleJudgments, assertRolePartitionIsolation } from './lib/incumbent-role-converter.mjs';

const metadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
    <EntityType Name="Booking"><Key><PropertyRef Name="ID"/></Key>
      <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
      <Property Name="BookingStatus" Type="Edm.String" MaxLength="2"/>
    </EntityType>
    <EntityContainer Name="Container"><EntitySet Name="Bookings" EntityType="Demo.Booking"/></EntityContainer>
  </Schema></edmx:DataServices>
</edmx:Edmx>`;

async function fixture() {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-incumbent-role-'));
    await writeFile(join(root, 'metadata.xml'), metadata);
    const checksum = createHash('sha256').update(metadata).digest('hex');
    const service = {
        id: 'booking-service',
        productFamily: 'booking-family',
        source: { uri: 'metadata.xml', format: 'edmx', contentChecksum: checksum },
        license: { identifier: 'Apache-2.0', redistributable: true }
    };
    return {
        root,
        registry: { services: [service] },
        splits: { assignments: { 'booking-service': 'train' }, clusters: [['booking-service']] },
        bindings: [{ reviewSourceService: 'old:booking', serviceId: 'booking-service' }],
        reviews: [
            {
                source_service: 'old:booking',
                entity_type_name: 'Booking',
                property_name: 'BookingStatus',
                hint: 'status'
            }
        ]
    };
}

test('joins an incumbent decision only through a checksum-verified original schema', async () => {
    const input = await fixture();
    try {
        const result = await convertIncumbentRoleJudgments({ ...input, purpose: 'train' });
        assert.equal(result.rows.length, 1);
        assert.equal(result.rows[0].label, 'status');
        assert.equal(result.rows[0].context.facets.maxLength, 2);
        assert.equal(result.rows[0].source.sourceChecksum, input.registry.services[0].source.contentChecksum);
        assert.equal(result.qualification.status, 'unqualified');
        assert.deepEqual(result.counts.exclusions, {});
    } finally {
        await rm(input.root, { recursive: true, force: true });
    }
});

test('excludes REVIEW_ME, unmatched fields and unsupported labels with reason counts', async () => {
    const input = await fixture();
    try {
        input.reviews.push(
            { ...input.reviews[0], property_name: 'ID', hint: 'REVIEW_ME' },
            { ...input.reviews[0], property_name: 'Missing' },
            { ...input.reviews[0], property_name: 'ID', hint: 'not_a_role' }
        );
        const result = await convertIncumbentRoleJudgments({ ...input, purpose: 'train' });
        assert.equal(result.rows.length, 1);
        assert.deepEqual(result.counts.exclusions, {
            'unresolved-review': 1,
            'schema-field-not-unique': 1,
            'unregistered-role': 1
        });
    } finally {
        await rm(input.root, { recursive: true, force: true });
    }
});

test('excludes an unauthorized source and a source in the wrong canonical split', async () => {
    const input = await fixture();
    try {
        input.registry.services[0].license.redistributable = false;
        const unauthorized = await convertIncumbentRoleJudgments({ ...input, purpose: 'train' });
        assert.equal(unauthorized.rows.length, 0);
        assert.equal(unauthorized.counts.exclusions['unauthorized-source'], 1);
        input.registry.services[0].license.redistributable = true;
        input.splits.assignments['booking-service'] = 'calibration';
        const wrongSplit = await convertIncumbentRoleJudgments({ ...input, purpose: 'train' });
        assert.equal(wrongSplit.rows.length, 0);
        assert.equal(wrongSplit.counts.exclusions['wrong-canonical-split'], 1);
    } finally {
        await rm(input.root, { recursive: true, force: true });
    }
});

test('does not admit an unassigned source to sealed evaluation', async () => {
    const input = await fixture();
    try {
        input.splits.assignments['booking-service'] = null;
        const unassigned = await convertIncumbentRoleJudgments({ ...input, purpose: 'evaluation' });
        assert.equal(unassigned.rows.length, 0);
        assert.equal(unassigned.counts.exclusions['wrong-canonical-split'], 1);
    } finally {
        await rm(input.root, { recursive: true, force: true });
    }
});

test('fails closed on source corruption and unsafe source paths', async () => {
    const input = await fixture();
    try {
        input.registry.services[0].source.contentChecksum = 'b'.repeat(64);
        await assert.rejects(
            convertIncumbentRoleJudgments({ ...input, purpose: 'train' }),
            /source checksum mismatch/u
        );
        input.registry.services[0].source.uri = '../metadata.xml';
        await assert.rejects(convertIncumbentRoleJudgments({ ...input, purpose: 'train' }), /escapes the source root/u);
    } finally {
        await rm(input.root, { recursive: true, force: true });
    }
});

test('rejects same service family or serialized context across train and calibration', () => {
    assert.throws(
        () =>
            assertRolePartitionIsolation({
                train: [{ id: 'a', group: 'a', family: 'same', serialized: 'first' }],
                calibration: [{ id: 'b', group: 'b', family: 'same', serialized: 'second' }],
                evaluation: []
            }),
        /service family leakage/u
    );
    assert.throws(
        () =>
            assertRolePartitionIsolation({
                train: [{ id: 'a', group: 'a', family: 'one', serialized: 'same' }],
                calibration: [{ id: 'b', group: 'b', family: 'two', serialized: 'same' }],
                evaluation: []
            }),
        /serialized context leakage/u
    );
});

test('rejects contradictory role judgments for one serialized context inside training', () => {
    assert.throws(
        () =>
            assertRolePartitionIsolation({
                train: [
                    { id: 'a', group: 'a', family: 'one', label: 'email', serialized: 'same' },
                    { id: 'b', group: 'b', family: 'two', label: 'country', serialized: 'same' }
                ],
                calibration: [],
                evaluation: []
            }),
        /conflicting labels/u
    );
});
