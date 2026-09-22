import assert from 'node:assert/strict';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { convertAuthorizedV3 } from './lib/authorized-v3-converter.mjs';

const mapping = {
    format: 'mockgen-v3-descriptor-role-mapping',
    version: 1,
    status: 'machine-proposed-unreviewed',
    mappings: { 'Email address': 'email' }
};
const graph = {
    nodes: [
        { id: 'entity:s/Contact', kind: 'entity', name: 'Contact' },
        {
            id: 'property:s/Contact/Email',
            kind: 'property',
            name: 'Email',
            entityId: 'entity:s/Contact',
            primitiveType: 'string',
            facets: { nullable: false, isKey: false },
            evidence: { label: 'Email', annotations: [] }
        },
        {
            id: 'property:s/Contact/Other',
            kind: 'property',
            name: 'Other',
            entityId: 'entity:s/Contact',
            primitiveType: 'string',
            facets: {},
            evidence: { label: 'Other', annotations: [] }
        }
    ],
    edges: [],
    provenance: {}
};

test('converts only exact descriptor-positive fields into machine-proposed v3 rows', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-authorized-v3-'));
    try {
        const graphPath = join(root, 'service.json');
        const graphBytes = JSON.stringify(graph);
        await writeFile(graphPath, graphBytes);
        const checksum = (await import('node:crypto')).createHash('sha256').update(graphBytes).digest('hex');
        const service = {
            id: 'public-service',
            source: { uri: 'service.json', format: 'schema-graph', contentChecksum: checksum },
            license: { identifier: 'Apache-2.0', redistributable: true },
            evaluationOnly: false,
            graphFingerprint: 'g'.repeat(64)
        };
        const artifact = await convertAuthorizedV3({
            registry: { services: [service] },
            split: { assignments: { 'public-service': 'train' } },
            catalog: { descriptors: [{ title: 'Email address', positiveFieldKeys: ['property:s/Contact/Email'] }] },
            mapping,
            sourceRoot: root
        });
        assert.equal(artifact.qualification.status, 'unqualified');
        assert.equal(artifact.counts.candidateRows, 1);
        assert.equal(artifact.rows[0].label, 'email');
        assert.equal(artifact.rows[0].context.inputFormat, 'v3');
        assert.equal(artifact.rows[0].context.label, 'Email');
        assert.deepEqual(artifact.rows[0].context.neighbors, ['Other']);
        assert.equal('sourceServiceId' in artifact.rows[0].context, false);
        assert.equal(artifact.rows[0].context.facets.maxLength, undefined);
        assert.equal(artifact.rows[0].source.sourceChecksum, checksum);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('excludes evaluation and pending-license services by default', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-authorized-v3-'));
    try {
        const service = {
            id: 'eval',
            source: { uri: 'missing.json', contentChecksum: 'x' },
            license: { identifier: 'SAP-TERMS-PENDING-DERIVATIVE-TRAINING-REVIEW', redistributable: false },
            evaluationOnly: true
        };
        const artifact = await convertAuthorizedV3({
            registry: { services: [service] },
            split: { assignments: { eval: 'unseen-sap-holdout' } },
            catalog: { descriptors: [] },
            mapping,
            sourceRoot: root
        });
        assert.equal(artifact.rows.length, 0);
        assert.deepEqual(artifact.skipped[0], { id: 'eval', split: 'unseen-sap-holdout', reason: 'not-train' });
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('does not admit internal structural metadata unless explicitly enabled', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-authorized-v3-'));
    try {
        const service = {
            id: 'internal',
            source: { uri: 'missing.json', format: 'schema-graph', contentChecksum: 'x' },
            license: { identifier: 'INTERNAL-OWNER-AUTHORIZATION', redistributable: false },
            trainingAuthorization: { scope: 'structural-metadata-only', privacyReview: { status: 'passed' } }
        };
        const artifact = await convertAuthorizedV3({
            registry: { services: [service] },
            split: { assignments: { internal: 'train' } },
            catalog: { descriptors: [] },
            mapping,
            sourceRoot: root
        });
        assert.equal(artifact.rows.length, 0);
        assert.equal(artifact.skipped[0].reason, 'license-or-authorization');
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('rejects a source symlink escaping the authorized graph root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-authorized-root-'));
    const external = await mkdtemp(join(tmpdir(), 'mockgen-authorized-external-'));
    try {
        const bytes = JSON.stringify(graph);
        const externalPath = join(external, 'service.json');
        await writeFile(externalPath, bytes);
        await symlink(externalPath, join(root, 'service.json'));
        const checksum = (await import('node:crypto')).createHash('sha256').update(bytes).digest('hex');
        await assert.rejects(
            convertAuthorizedV3({
                registry: {
                    services: [
                        {
                            id: 'public-service',
                            source: { uri: 'service.json', format: 'schema-graph', contentChecksum: checksum },
                            license: { identifier: 'Apache-2.0', redistributable: true }
                        }
                    ]
                },
                split: { assignments: { 'public-service': 'train' } },
                catalog: { descriptors: [] },
                mapping,
                sourceRoot: root
            }),
            /source path escapes the source root/u
        );
    } finally {
        await rm(root, { recursive: true, force: true });
        await rm(external, { recursive: true, force: true });
    }
});
