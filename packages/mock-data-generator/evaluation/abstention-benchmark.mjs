// Why addressable cells miss the recognition tier, across the whole corpus.
// Counts value slots (rows x properties) per abstention reason, excluding keys, booleans,
// protocol artifacts and relationally assigned foreign keys.
//
// Usage: node abstention-benchmark.mjs PACKAGE_ROOT --registry r.json --source-root /abs [--rows N] [--output f]
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const argument = (name, fallback) => {
    const index = process.argv.indexOf(name);
    return index === -1 ? fallback : process.argv[index + 1];
};
const packageRoot = resolve(process.argv[2] ?? '');
const registryPath = argument('--registry');
const sourceRoot = argument('--source-root');
const rowsPerEntity = Number(argument('--rows', '2'));
const outputPath = argument('--output');

const api = await import(join(packageRoot, 'dist/public.js'));
const { parseEdmx } = await import(join(packageRoot, 'dist/schema/edmx.js'));
const { parseCsn } = await import(join(packageRoot, 'dist/schema/csn.js'));
const registry = JSON.parse(await readFile(registryPath, 'utf8'));

const reasons = {};
const reasonFields = {};
const detectedButDemoted = {};
const topAbstainedNames = {};
let addressableSlots = 0;
let generated = 0;

for (const service of registry.services.filter((entry) => ['edmx', 'csn'].includes(entry.source?.format))) {
    let content;
    let graph;
    try {
        content = await readFile(join(sourceRoot, service.source.uri), 'utf8');
        graph = service.source.format === 'csn' ? parseCsn(content) : parseEdmx(content);
    } catch {
        continue;
    }
    const targets = [...new Set(graph.entities.map((entity) => entity.entitySetName))].map((name) => ({
        name,
        kind: 'entity-set'
    }));
    if (targets.length === 0) continue;
    const structural = new Set();
    for (const relationship of graph.relationships ?? []) {
        for (const mapping of relationship.mappings) {
            structural.add(`${relationship.fromEntitySet}.${mapping.sourceProperty}`);
        }
    }
    let report;
    try {
        report = await api.inspectService(
            {
                metadata: { format: service.source.format === 'csn' ? 'csn' : 'edmx', content },
                service: { urlPath: `/${service.id}`, odataVersion: service.source.format === 'csn' ? '4.0' : '2.0' },
                targets,
                existingData: {}
            },
            { pipeline: 'semantic-v2', mode: 'auto', seed: 123, rowsPerEntity },
            {}
        );
    } catch {
        continue;
    }
    generated += 1;
    const rowsOf = new Map(graph.entities.map((entity) => [entity.entitySetName, entity.properties.length]));
    for (const decision of report.fieldDecisions ?? []) {
        if (decision.acceptedRole && decision.acceptedRole !== 'unknown') continue;
        if (decision.isKey || decision.primitiveType === 'bool') continue;
        if (decision.resource.startsWith('SAP__')) continue;
        if (structural.has(`${decision.resource}.${decision.property}`)) continue;
        if (!rowsOf.has(decision.resource)) continue;
        const slots = rowsPerEntity;
        addressableSlots += slots;
        const reason = decision.abstentionReason ?? 'unspecified';
        reasons[reason] = (reasons[reason] ?? 0) + slots;
        reasonFields[reason] = (reasonFields[reason] ?? 0) + 1;
        if (decision.detectedRole && decision.detectedRole !== 'unknown') {
            detectedButDemoted[decision.detectedRole] = (detectedButDemoted[decision.detectedRole] ?? 0) + 1;
        }
        const token = String(decision.property)
            .replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
            .toLowerCase();
        topAbstainedNames[token] = (topAbstainedNames[token] ?? 0) + 1;
    }
}

const sorted = (record, limit) =>
    Object.fromEntries(
        Object.entries(record)
            .sort((left, right) => right[1] - left[1])
            .slice(0, limit)
    );
const report = {
    format: 'mockgen-abstention-benchmark',
    version: 1,
    settings: { rowsPerEntity, seed: 123 },
    servicesInspected: generated,
    addressableSlots,
    slotsByReason: sorted(reasons, 20),
    fieldsByReason: sorted(reasonFields, 20),
    demotedDetectedRoles: sorted(detectedButDemoted, 20),
    mostCommonAbstainedPropertyNames: sorted(topAbstainedNames, 40)
};
if (outputPath) await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
