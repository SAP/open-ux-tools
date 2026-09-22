#!/usr/bin/env node
/**
 * Build private relevance review candidates and blinded judge batches from approved public values.
 * Output contains raw values and must be written outside the repository.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { checkedGraph } from './lib/incumbent-role-converter.mjs';
import { collectFieldValues, sampleRelevanceCandidates } from './lib/relevance-review-set.mjs';

const argument = (name) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
};
const catalogPath = argument('--catalog');
const valuesRoot = argument('--values-root');
const registryPath = argument('--registry');
const sourceRoot = argument('--source-root');
const partitionsPath = argument('--partitions');
const guidelinePath = argument('--guideline');
const output = argument('--output');
const batchesDir = argument('--batches-dir');
const batchSize = Number(argument('--batch-size') ?? '50');
const seed = argument('--seed') ?? 'mockgen-relevance-v1';
const negativeKind = argument('--negative-kind') ?? 'cross-domain';
if (
    !catalogPath ||
    !valuesRoot ||
    !registryPath ||
    !sourceRoot ||
    !partitionsPath ||
    !guidelinePath ||
    !output ||
    !batchesDir
) {
    throw new Error(
        'Usage: build-relevance-review-set.mjs --catalog catalog.json --values-root DIR --registry registry.json --source-root /abs/incumbent --partitions partitions.json --guideline guideline.md --output candidates.json --batches-dir DIR [--batch-size 50] [--seed S]'
    );
}
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const catalog = await readJson(catalogPath);
const registry = await readJson(registryPath);
const plan = await readJson(partitionsPath);
const guidelineText = await readFile(guidelinePath, 'utf8');
const services = new Map(registry.services.map((service) => [service.id, service]));
const realValuesRoot = await realpath(valuesRoot);

const fieldsByGroup = new Map();
const purposeByGroup = new Map();
const sourceNotes = [];
for (const dataset of catalog.datasets) {
    // Training-approved sources may own or donate to any partition; evaluation-approved sources may
    // only own the sealed partition (checked per partition below) and never donate to fitting rows.
    if (
        dataset.privacyClass !== 'public' ||
        dataset.license?.redistributable !== true ||
        !['generator-training', 'generator-evaluation'].includes(dataset.approval?.purpose)
    ) {
        throw new TypeError(`dataset ${dataset.id} is not an approved public value source`);
    }
    const path = await realpath(resolve(valuesRoot, dataset.source.path));
    if (!path.startsWith(`${realValuesRoot}${sep}`))
        throw new TypeError(`dataset ${dataset.id} escapes the values root`);
    const content = await readFile(path, 'utf8');
    if (sha256(content) !== dataset.source.checksum) throw new TypeError(`dataset ${dataset.id} checksum mismatch`);
    const service = services.get(dataset.serviceId);
    if (!service) throw new TypeError(`dataset service ${dataset.serviceId} is not registered`);
    const graph = await checkedGraph(resolve(sourceRoot), service);
    const rows = content
        .split(/\r?\n/u)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    const fields = collectFieldValues({ serviceGroup: dataset.serviceId, graph, rows });
    fieldsByGroup.set(dataset.serviceId, fields);
    purposeByGroup.set(dataset.serviceId, dataset.approval.purpose);
    sourceNotes.push({
        serviceId: dataset.serviceId,
        eligibleStringFields: fields.size,
        schemaFingerprintMatchesRegistry: service.graphFingerprint === dataset.schemaFingerprint
    });
}
const merged = (groups) =>
    new Map(
        groups.flatMap((group) => {
            const fields = fieldsByGroup.get(group);
            if (!fields) throw new TypeError(`partition references unknown group ${group}`);
            return [...fields].map(([fieldId, entry]) => [`${group}|${fieldId}`, entry]);
        })
    );
const owners = new Set();
const candidates = [];
for (const partition of plan.partitions) {
    for (const group of [...partition.owners, ...partition.donors]) {
        const purpose = purposeByGroup.get(group);
        const ownsSealed = partition.name === 'sealed' && partition.owners.includes(group);
        if (purpose !== 'generator-training' && !(ownsSealed && purpose === 'generator-evaluation')) {
            throw new TypeError(`service group ${group} is not approved for the ${partition.name} partition`);
        }
    }
    for (const group of partition.owners) {
        if (owners.has(group)) throw new TypeError(`group ${group} owns pairs in more than one partition`);
        owners.add(group);
    }
    candidates.push(
        ...sampleRelevanceCandidates({
            partition: partition.name,
            ownerFields: merged(partition.owners),
            donorFields: merged(partition.donors),
            positives: partition.positives,
            negatives: partition.negatives,
            seed: `${seed}|${partition.name}`,
            valuesPerField: partition.valuesPerField ?? 4,
            negativeKind
        })
    );
}
const ordered = [...candidates].sort((a, b) =>
    sha256(`${seed}|order|${a.id}`).localeCompare(sha256(`${seed}|order|${b.id}`))
);
await writeFile(
    output,
    `${JSON.stringify({ format: 'mockgen-relevance-review-candidates', version: 1, privacy: 'contains-raw-public-values', seed, guidelineSha256: sha256(guidelineText), partitions: plan.partitions, sourceNotes, candidates }, null, 2)}\n`,
    'utf8'
);
await mkdir(batchesDir, { recursive: true });
const batchIds = [];
for (let start = 0; start < ordered.length; start += batchSize) {
    const items = ordered.slice(start, start + batchSize);
    const batchId = sha256(items.map((item) => item.id).join('|')).slice(0, 16);
    batchIds.push(batchId);
    await writeFile(
        join(batchesDir, `${batchId}.json`),
        `${JSON.stringify(
            {
                format: 'mockgen-relevance-judge-batch',
                version: 1,
                batchId,
                guidelineSha256: sha256(guidelineText),
                guidelineText,
                items: items.map((item) => ({
                    itemId: item.id,
                    entity: item.pair.entity,
                    resource: item.pair.resource,
                    keyProperty: item.pair.linkedCode.property,
                    field: item.pair.field,
                    value: item.pair.value
                }))
            },
            null,
            2
        )}\n`,
        'utf8'
    );
}
const count = (partition, origin) => candidates.filter((c) => c.partition === partition && c.origin === origin).length;
process.stdout.write(
    `${JSON.stringify({ candidates: candidates.length, batches: batchIds.length, perPartition: Object.fromEntries(plan.partitions.map((p) => [p.name, { observed: count(p.name, 'observed'), crossDomain: count(p.name, 'cross-domain') }])), sourceNotes, batchIds })}\n`
);
