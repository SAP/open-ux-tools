import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { convertPlannerServiceV3 } from './lib/planner-v3-converter.mjs';

const metadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
    <EntityType Name="Contact"><Key><PropertyRef Name="ID"/></Key>
      <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
      <Property Name="Email" Type="Edm.String" MaxLength="80"/>
      <Property Name="Other" Type="Edm.String"/>
    </EntityType>
    <EntityContainer Name="Container"><EntitySet Name="Contacts" EntityType="Demo.Contact"/></EntityContainer>
  </Schema></edmx:DataServices>
</edmx:Edmx>`;

async function fixture(split = 'train') {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-planner-v3-'));
    await writeFile(join(root, 'metadata.xml'), metadata);
    const checksum = createHash('sha256').update(metadata).digest('hex');
    return {
        root,
        registry: {
            services: [
                {
                    id: 'service-one',
                    source: { uri: 'metadata.xml', format: 'edmx', contentChecksum: checksum },
                    license: { identifier: 'Apache-2.0', redistributable: true }
                }
            ]
        },
        splits: { assignments: { 'service-one': split } },
        dataset: {
            purpose: split === 'train' ? 'fit' : split,
            descriptorTexts: ['Email address \n Electronic address.'],
            services: [
                {
                    serviceId: 'service-one',
                    split,
                    properties: [
                        {
                            fieldId: 'property:service-one/Demo/Contact/Email',
                            targetObserved: true,
                            adjudicationStatus: 'llm-consensus-reviewed',
                            semanticUnknown: false,
                            descriptorIndex: 0
                        },
                        {
                            fieldId: 'property:service-one/Demo/Contact/Other',
                            targetObserved: true,
                            adjudicationStatus: 'llm-consensus-reviewed',
                            semanticUnknown: true,
                            descriptorIndex: null
                        }
                    ]
                }
            ]
        },
        mapping: {
            format: 'mockgen-v3-descriptor-role-mapping',
            version: 1,
            status: 'machine-proposed-unreviewed',
            mappings: { 'Email address': 'email' }
        }
    };
}

test('projects mapped planner fields without converting missing descriptors into role abstentions', async () => {
    const input = await fixture();
    try {
        const result = await convertPlannerServiceV3({ ...input, serviceId: 'service-one', purpose: 'train' });
        assert.deepEqual(
            result.rows.map(({ label }) => label),
            ['email']
        );
        assert.deepEqual(result.skipped, [
            { fieldId: 'property:service-one/Demo/Contact/Other', reason: 'no-reviewed-role-mapping' }
        ]);
        assert.equal(result.rows[0].context.facets.maxLength, 80);
        assert.equal(result.rows[0].context.entityName, 'Contact');
        assert.deepEqual(result.rows[0].context.neighbors, ['ID', 'Other']);
        assert.equal(result.qualification.status, 'unqualified');
        assert.equal(result.rows[0].source.sourceChecksum, input.registry.services[0].source.contentChecksum);
    } finally {
        await rm(input.root, { recursive: true, force: true });
    }
});

test('preserves a holdout split and refuses to relabel it as training', async () => {
    const input = await fixture('unseen-sap-holdout');
    try {
        await assert.rejects(
            convertPlannerServiceV3({ ...input, serviceId: 'service-one', purpose: 'train' }),
            /split is not train/u
        );
        const result = await convertPlannerServiceV3({ ...input, serviceId: 'service-one', purpose: 'evaluation' });
        assert.equal(result.rows[0].group, 'service-one');
        assert.equal(result.partition, 'unseen-sap-holdout');
    } finally {
        await rm(input.root, { recursive: true, force: true });
    }
});

test('keeps the canonical calibration partition separate from training and evaluation', async () => {
    const input = await fixture('calibration');
    try {
        const result = await convertPlannerServiceV3({ ...input, serviceId: 'service-one', purpose: 'calibration' });
        assert.equal(result.partition, 'calibration');
        assert.deepEqual(
            result.rows.map(({ label }) => label),
            ['email']
        );
        await assert.rejects(
            convertPlannerServiceV3({ ...input, serviceId: 'service-one', purpose: 'train' }),
            /split is not train/u
        );
    } finally {
        await rm(input.root, { recursive: true, force: true });
    }
});

test('rejects source corruption before constructing field contexts', async () => {
    const input = await fixture();
    try {
        input.registry.services[0].source.contentChecksum = 'b'.repeat(64);
        await assert.rejects(
            convertPlannerServiceV3({ ...input, serviceId: 'service-one', purpose: 'train' }),
            /source checksum mismatch/u
        );
    } finally {
        await rm(input.root, { recursive: true, force: true });
    }
});

test('rejects a checksum-matching source symlink that escapes the authorized root', async () => {
    const input = await fixture();
    const external = await mkdtemp(join(tmpdir(), 'mockgen-planner-external-'));
    try {
        const externalPath = join(external, 'metadata.xml');
        await writeFile(externalPath, metadata);
        await rm(join(input.root, 'metadata.xml'));
        await symlink(externalPath, join(input.root, 'metadata.xml'));
        await assert.rejects(
            convertPlannerServiceV3({ ...input, serviceId: 'service-one', purpose: 'train' }),
            /source path escapes the source root/u
        );
    } finally {
        await rm(input.root, { recursive: true, force: true });
        await rm(external, { recursive: true, force: true });
    }
});

test('uses the registry source service name for planner field IDs', async () => {
    const input = await fixture();
    try {
        input.registry.services[0].source.serviceName = 'MetadataService';
        input.dataset.services[0].properties[0].fieldId = 'property:MetadataService/Demo/Contact/Email';
        input.dataset.services[0].properties[1].fieldId = 'property:MetadataService/Demo/Contact/Other';
        const result = await convertPlannerServiceV3({ ...input, serviceId: 'service-one', purpose: 'train' });
        assert.deepEqual(
            result.rows.map(({ label }) => label),
            ['email']
        );
    } finally {
        await rm(input.root, { recursive: true, force: true });
    }
});

test('matches CSN-style field IDs without a namespace segment', async () => {
    const input = await fixture();
    try {
        input.dataset.services[0].properties[0].fieldId = 'property:service-one/Contact/Email';
        input.dataset.services[0].properties[1].fieldId = 'property:service-one/Contact/Other';
        const result = await convertPlannerServiceV3({ ...input, serviceId: 'service-one', purpose: 'train' });
        assert.deepEqual(
            result.rows.map(({ label }) => label),
            ['email']
        );
    } finally {
        await rm(input.root, { recursive: true, force: true });
    }
});

test('rejects a planner partition that disagrees with the canonical split assignment', async () => {
    const input = await fixture('unseen-sap-holdout');
    try {
        input.splits.assignments['service-one'] = 'train';
        await assert.rejects(
            convertPlannerServiceV3({ ...input, serviceId: 'service-one', purpose: 'evaluation' }),
            /canonical split mismatch/u
        );
    } finally {
        await rm(input.root, { recursive: true, force: true });
    }
});

test('queues unmapped status fields from the verified source without inventing role labels', async () => {
    const input = await fixture('train');
    try {
        const revisedMetadata = metadata.replaceAll('Other', 'BookingStatus');
        await writeFile(join(input.root, 'metadata.xml'), revisedMetadata);
        input.registry.services[0].source.contentChecksum = createHash('sha256').update(revisedMetadata).digest('hex');
        input.registry.services[0].businessDomainFamily = 'travel-bookings';
        const status = input.dataset.services[0].properties[1];
        status.fieldId = 'property:service-one/Demo/Contact/BookingStatus';
        status.targetObserved = false;
        status.adjudicationStatus = null;
        const result = await convertPlannerServiceV3({
            ...input,
            serviceId: 'service-one',
            purpose: 'train',
            includeReviewQueue: true
        });
        assert.deepEqual(
            result.rows.map(({ label }) => label),
            ['email']
        );
        assert.equal(result.reviewQueue.length, 1);
        assert.equal(result.reviewQueue[0].fieldId, status.fieldId);
        assert.equal(result.reviewQueue[0].candidateRole, null);
        assert.equal(result.reviewQueue[0].reviewStatus, 'pending');
        assert.equal(result.reviewQueue[0].domain, 'travel-bookings');
        assert.equal(result.reviewQueue[0].context.propertyName, 'BookingStatus');
        assert.equal(result.reviewQueue[0].sourceChecksum, input.registry.services[0].source.contentChecksum);
    } finally {
        await rm(input.root, { recursive: true, force: true });
    }
});
