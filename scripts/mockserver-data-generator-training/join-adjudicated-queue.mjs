#!/usr/bin/env node
/**
 * Join consensus labels to their contexts, apply the claimable-label rule, and write private
 * training rows, sealed rows and partition id lists. Prints counts only.
 */
import { randomBytes } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { joinAdjudicatedQueue } from './lib/adjudicated-queue-join.mjs';
import { selectClaimableLabels } from './lib/label-set.mjs';
import { createOpaqueIdentity } from './lib/opaque-identity.mjs';
import { buildPartitionManifests } from './lib/partition-manifests.mjs';

const argument = (name) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
};
const packetPath = argument('--packet');
const adjudicationPath = argument('--adjudication');
const registryPath = argument('--registry');
const splitsPath = argument('--splits');
const outputDir = argument('--output-dir');
// Labels the trainer could not support on the previous round; their rows are dropped, never relabelled.
const unclaimed = (argument('--unclaim') ?? '')
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
if (!packetPath || !adjudicationPath || !registryPath || !splitsPath || !outputDir) {
    throw new Error(
        'Usage: join-adjudicated-queue.mjs --packet packet.json --adjudication adjudication.json --registry registry.json --splits splits.json --output-dir DIR [--unclaim label,…]'
    );
}
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const { SEMANTIC_ROLE_REGISTRY } = await import('../../packages/mock-data-generator/dist/index.js');
const saltPath = join(outputDir, 'identity-salt.txt');
const salt = await access(saltPath).then(
    () => readFile(saltPath, 'utf8'),
    async () => {
        const created = randomBytes(32).toString('hex');
        await writeFile(saltPath, created, { encoding: 'utf8', mode: 0o600 });
        return created;
    }
);
const identity = createOpaqueIdentity(salt.trim());
const joined = joinAdjudicatedQueue({
    packet: await readJson(packetPath),
    adjudication: await readJson(adjudicationPath),
    registry: await readJson(registryPath),
    splits: await readJson(splitsPath),
    identity,
    roles: Object.keys(SEMANTIC_ROLE_REGISTRY)
});
const preview = buildPartitionManifests({
    fittingRows: joined.fittingRows,
    sealedRows: joined.sealedRows,
    registryRoles: SEMANTIC_ROLE_REGISTRY
});
const decision = selectClaimableLabels({
    trainLabels: preview.counts.train.labels,
    calibrationLabels: preview.counts.calibration.labels,
    sealedLabels: preview.counts.sealed.labels,
    registryRoles: SEMANTIC_ROLE_REGISTRY,
    unclaimed
});
// A label becomes a training class only when the calibration partition can support it (expected
// floors); rarer labels would add noise classes the head cannot calibrate, so their rows leave the
// fitting set (never relabelled). Among the classes that train, the trainer then decides per label
// whether it routes (measured support and precision) or stays an auxiliary class.
const claimed = new Set(decision.claimed);
const fittingRows = joined.fittingRows.filter((row) => claimed.has(row.label));
for (const row of joined.fittingRows.filter((row) => !claimed.has(row.label))) {
    joined.skipped.push({ itemId: row.id, partition: row.partition, reason: 'label-below-expected-calibration-floor' });
    joined.counts.skipped += 1;
    joined.counts.skippedByReason['label-below-expected-calibration-floor'] =
        (joined.counts.skippedByReason['label-below-expected-calibration-floor'] ?? 0) + 1;
}
const manifests = buildPartitionManifests({
    fittingRows,
    sealedRows: joined.sealedRows,
    registryRoles: SEMANTIC_ROLE_REGISTRY
});
if (manifests.calibrationLabelsAbsentFromTraining.length > 0)
    throw new TypeError('calibration labels absent from training after filtering');
const jsonl = (rows) => `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`;
await writeFile(
    join(outputDir, 'train-calibration.jsonl'),
    jsonl(fittingRows.map(({ partition, domain, agreement, ...row }) => row)),
    'utf8'
);
await writeFile(join(outputDir, 'sealed.jsonl'), jsonl(joined.sealedRows), 'utf8');
await writeFile(join(outputDir, 'train-ids.json'), `${JSON.stringify(manifests.trainIds)}\n`, 'utf8');
await writeFile(join(outputDir, 'calibration-ids.json'), `${JSON.stringify(manifests.calibrationIds)}\n`, 'utf8');
await writeFile(join(outputDir, 'identity-map.json'), `${JSON.stringify(identity.mapping())}\n`, {
    encoding: 'utf8',
    mode: 0o600
});
const summary = {
    joined: joined.counts,
    expectedSupportPreview: { claimable: decision.claimed, belowFloor: decision.dropped },
    blockers: decision.blockers,
    partitions: manifests.counts
};
await writeFile(join(outputDir, 'join-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(summary)}\n`);
if (decision.blockers.length > 0) process.exitCode = 2;
