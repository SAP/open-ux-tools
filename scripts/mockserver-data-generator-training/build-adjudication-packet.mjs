#!/usr/bin/env node
/**
 * Build the role adjudication packet and self-contained judge batch files from review queues.
 * Structural metadata only. Output must live outside the repository when internal queues are included.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { buildAdjudicationPacket, batchPacket } from './lib/adjudication-packet.mjs';

const values = (name) => process.argv.flatMap((value, index) => (value === name ? [process.argv[index + 1]] : []));
const argument = (name) => values(name)[0];
const queuePaths = values('--queue');
const guidelinePath = argument('--guideline');
const output = argument('--output');
const batchesDir = argument('--batches-dir');
const batchSize = Number(argument('--batch-size') ?? '25');
if (queuePaths.length === 0 || !guidelinePath || !output || !batchesDir) {
    throw new Error(
        'Usage: build-adjudication-packet.mjs --queue q.json [--queue …] --guideline guideline.md --output packet.json --batches-dir DIR [--batch-size 25]'
    );
}
const runtime = await import('../../packages/mock-data-generator/dist/index.js');
const roles = Object.keys(runtime.SEMANTIC_ROLE_REGISTRY).sort();
const statusRoles = roles.filter((role) => runtime.SEMANTIC_ROLE_REGISTRY[role].family === 'status');
const mapping = JSON.parse(await readFile(new URL('./v3-descriptor-role-mapping.json', import.meta.url), 'utf8'));
const mappedRoles = [...new Set(Object.values(mapping.mappings))].filter((role) => roles.includes(role));
const guidelineText = await readFile(guidelinePath, 'utf8');
const queues = await Promise.all(queuePaths.map(async (path) => JSON.parse(await readFile(path, 'utf8'))));
const packet = buildAdjudicationPacket({
    queues,
    roles,
    suggestedRoles: [...statusRoles, ...mappedRoles],
    guidelineText,
    serialize: runtime.serializeFieldContextV3
});
packet.registryFingerprint = runtime.SEMANTIC_ROLE_REGISTRY_FINGERPRINT;
await writeFile(output, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
await mkdir(batchesDir, { recursive: true });
const batches = batchPacket(packet, batchSize);
for (const batch of batches) {
    await writeFile(
        join(batchesDir, `${batch.batchId}.json`),
        `${JSON.stringify(
            {
                format: 'mockgen-role-judge-batch',
                version: 1,
                batchId: batch.batchId,
                guidelineSha256: packet.guidelineSha256,
                guidelineText,
                candidateRoles: packet.candidateRoles,
                items: batch.items.map((item) => ({
                    itemId: item.itemId,
                    context: item.context,
                    serialized: item.serialized
                }))
            },
            null,
            2
        )}\n`,
        'utf8'
    );
}
const partitions = packet.items.reduce(
    (acc, item) => ({ ...acc, [item.partition]: (acc[item.partition] ?? 0) + 1 }),
    {}
);
process.stdout.write(
    `${JSON.stringify({ items: packet.items.length, partitions, batches: batches.length, batchSize, guidelineSha256: packet.guidelineSha256, registryFingerprint: packet.registryFingerprint.slice(0, 12), statusRoles, suggested: packet.candidateRoles.suggested.length, registered: packet.candidateRoles.registered.length })}\n`
);
