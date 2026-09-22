import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
    fittingSourceAllowed,
    inputKeys,
    reviewItemId,
    selectUniform,
    serviceFieldItems
} from './lib/source-review-queue.mjs';

const metadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
    <EntityType Name="Contact"><Key><PropertyRef Name="ID"/></Key>
      <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
      <Property Name="Email" Type="Edm.String" MaxLength="80"/>
      <Property Name="City" Type="Edm.String" MaxLength="40"/>
      <Property Name="Country" Type="Edm.String" MaxLength="3"/>
    </EntityType>
    <EntityContainer Name="Container"><EntitySet Name="Contacts" EntityType="Demo.Contact"/></EntityContainer>
  </Schema></edmx:DataServices>
</edmx:Edmx>`;

const authorized = {
    license: { identifier: 'INTERNAL-OWNER-AUTHORIZATION', redistributable: false },
    trainingAuthorization: { scope: 'structural-metadata-only', privacyReview: { status: 'passed' } }
};

// A tokenizer stand-in: one "token" per character code, which is enough to key identical inputs.
const tokenizer = { encodeForModel: (text) => ({ inputIds: [...text].map((character) => character.charCodeAt(0)) }) };

async function fixture(split = 'train', checksumOverride = undefined) {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-source-queue-'));
    await writeFile(join(root, 'metadata.xml'), metadata);
    const checksum = checksumOverride ?? createHash('sha256').update(metadata).digest('hex');
    const service = {
        id: 'service-one',
        source: { uri: 'metadata.xml', format: 'edmx', contentChecksum: checksum, serviceName: 'Demo' },
        businessDomainFamily: 'contacts',
        ...authorized
    };
    return {
        root,
        registry: { services: [service] },
        splits: { assignments: { 'service-one': split }, clusters: [['service-one']] }
    };
}

test('admits only permitted, non-evaluation, parseable training sources', () => {
    assert.equal(fittingSourceAllowed({ source: { format: 'edmx' }, ...authorized }), true);
    assert.equal(fittingSourceAllowed({ source: { format: 'edmx' }, ...authorized, evaluationOnly: true }), false);
    assert.equal(fittingSourceAllowed({ source: { format: 'openapi' }, ...authorized }), false);
    assert.equal(
        fittingSourceAllowed({
            source: { format: 'edmx' },
            license: { identifier: 'SAP-INTERNAL-PENDING', redistributable: false }
        }),
        false
    );
    assert.equal(
        fittingSourceAllowed({ source: { format: 'csn' }, license: { identifier: 'MIT', redistributable: true } }),
        true
    );
});

test('builds planner-convention queue items for every field of a train service', async () => {
    const { root, registry, splits } = await fixture();
    try {
        const result = await serviceFieldItems({ root, registry, splits, serviceId: 'service-one' });
        assert.equal(result.partition, 'train');
        assert.deepEqual(
            result.items.map((item) => item.fieldId),
            ['ID', 'Email', 'City', 'Country'].map((name) => `property:Demo/Demo/Contact/${name}`)
        );
        assert.deepEqual(Object.keys(result.items[0]).sort(), [
            'candidateRole',
            'context',
            'domain',
            'fieldId',
            'priorPlannerStatus',
            'reviewStatus',
            'serviceId',
            'sourceChecksum',
            'split'
        ]);
        assert.equal(result.items[0].candidateRole, null);
        assert.equal(result.items[0].domain, 'contacts');
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('refuses holdout services and sources whose bytes do not match the registered checksum', async () => {
    const holdout = await fixture('unseen-sap-holdout');
    const tampered = await fixture('train', 'f'.repeat(64));
    try {
        await assert.rejects(serviceFieldItems({ ...holdout, serviceId: 'service-one' }), /not train or calibration/u);
        await assert.rejects(serviceFieldItems({ ...tampered, serviceId: 'service-one' }), /checksum mismatch/u);
    } finally {
        await rm(holdout.root, { recursive: true, force: true });
        await rm(tampered.root, { recursive: true, force: true });
    }
});

test('samples deterministically, caps per service, and never repeats judged or sealed inputs', async () => {
    const { root, registry, splits } = await fixture();
    try {
        const { items } = await serviceFieldItems({ root, registry, splits, serviceId: 'service-one' });
        const first = selectUniform(items, { perService: 2, seed: 's', tokenizer });
        const again = selectUniform(items, { perService: 2, seed: 's', tokenizer });
        assert.equal(first.length, 2);
        assert.deepEqual(
            first.map((item) => item.fieldId),
            again.map((item) => item.fieldId)
        );

        const judged = new Set([reviewItemId(first[0].serviceId, first[0].fieldId)]);
        const sealed = new Set([inputKeys(first[1].context, tokenizer).textKey]);
        const next = selectUniform(items, {
            perService: 4,
            seed: 's',
            tokenizer,
            excludeItemIds: judged,
            excludeContentKeys: sealed
        });
        assert.equal(next.length, 2);
        assert.ok(!next.some((item) => item.fieldId === first[0].fieldId || item.fieldId === first[1].fieldId));
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
