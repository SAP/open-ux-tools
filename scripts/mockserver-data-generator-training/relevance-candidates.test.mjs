import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { extractRelevanceCandidates } from './lib/extract-relevance-candidates.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

async function fixture() {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-relevance-'));
    const relativePath = 'service.jsonl';
    const content =
        [
            JSON.stringify({
                entityId: 'entity:demo/Orders',
                values: {
                    'property:demo/Orders/ID': 'secret-id',
                    'property:demo/Orders/Status': 'Open',
                    'property:demo/Orders/Amount': 12.5
                }
            }),
            JSON.stringify({
                entityId: 'entity:demo/Orders',
                values: { 'property:demo/Orders/Status': 'Closed' }
            })
        ].join('\n') + '\n';
    await writeFile(join(root, relativePath), content);
    const catalog = {
        version: 1,
        datasets: [
            {
                id: 'demo-service',
                serviceId: 'demo-service',
                privacyClass: 'public',
                license: { identifier: 'MIT', redistributable: true },
                approval: { purpose: 'generator-training' },
                source: { path: relativePath, checksum: sha256(content), format: 'mockgen-value-jsonl' }
            }
        ]
    };
    return { root, catalog };
}

test('emits unqualified privacy-safe candidates without review labels or raw values', async () => {
    const { root, catalog } = await fixture();
    const packet = await extractRelevanceCandidates({ catalog, sourceRoot: root });
    assert.equal(packet.qualification.status, 'unqualified');
    assert.equal(packet.qualification.reviewed, false);
    assert.equal(packet.rows.length, 4);
    assert.equal(packet.rows[0].serviceGroup, 'demo-service');
    assert.equal(packet.rows[0].relevant, null);
    assert.equal('value' in packet.rows[0].pair, false);
    assert.match(packet.rows[0].pair.valueDigest, /^[a-f0-9]{64}$/u);
    assert.deepEqual(packet.rows[0].pair.valueShape, { kind: 'string', length: 9 });
});

test('suggests service splits only when an explicit service map is supplied', async () => {
    const { root, catalog } = await fixture();
    const packet = await extractRelevanceCandidates({
        catalog,
        sourceRoot: root,
        splitByService: { 'demo-service': 'calibration' }
    });
    assert.deepEqual([...new Set(packet.rows.map((row) => row.suggestedSplit))], ['calibration']);
});

test('rejects non-redistributable or checksum-mismatched sources', async () => {
    const { root, catalog } = await fixture();
    await assert.rejects(
        extractRelevanceCandidates({
            catalog: {
                datasets: [
                    { ...catalog.datasets[0], license: { identifier: 'fixture-test-only', redistributable: false } }
                ]
            },
            sourceRoot: root
        }),
        /redistributable/u
    );
    await assert.rejects(
        extractRelevanceCandidates({
            catalog: {
                datasets: [
                    { ...catalog.datasets[0], source: { ...catalog.datasets[0].source, checksum: sha256('wrong') } }
                ]
            },
            sourceRoot: root
        }),
        /checksum/u
    );
});

test('does not permit catalog paths outside the source root', async () => {
    const { root, catalog } = await fixture();
    await mkdir(join(root, 'nested'));
    await assert.rejects(
        extractRelevanceCandidates({
            catalog: {
                datasets: [
                    { ...catalog.datasets[0], source: { ...catalog.datasets[0].source, path: '../outside.jsonl' } }
                ]
            },
            sourceRoot: root
        }),
        /source root/u
    );
});

test('does not follow a catalog symlink outside the source root', async () => {
    const { root, catalog } = await fixture();
    const outside = await mkdtemp(join(tmpdir(), 'mockgen-relevance-outside-'));
    const content = await readFile(join(root, 'service.jsonl'));
    await writeFile(join(outside, 'service.jsonl'), content);
    await symlink(join(outside, 'service.jsonl'), join(root, 'linked.jsonl'));
    await assert.rejects(
        extractRelevanceCandidates({
            catalog: {
                datasets: [
                    {
                        ...catalog.datasets[0],
                        source: { ...catalog.datasets[0].source, path: 'linked.jsonl' }
                    }
                ]
            },
            sourceRoot: root
        }),
        /source root/u
    );
});
