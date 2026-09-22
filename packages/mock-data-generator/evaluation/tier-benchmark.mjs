// Corpus-wide value-tier accounting: how much of each generated dataset every tier writes,
// and why the typed floor gets what it gets. Counts value slots (rows x properties), not fields.
//
// Usage: node tier-benchmark.mjs PACKAGE_ROOT --registry r.json --source-root /abs [--rows N] [--sft-budget-ms N] [--output f]
import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { join, resolve } from 'node:path';

const argument = (name, fallback) => {
    const index = process.argv.indexOf(name);
    return index === -1 ? fallback : process.argv[index + 1];
};

const packageRoot = resolve(process.argv[2] ?? '');
const registryPath = argument('--registry');
const sourceRoot = argument('--source-root');
const rowsPerEntity = Number(argument('--rows', '2'));
const sftBudgetMs = Number(argument('--sft-budget-ms', '0'));
const outputPath = argument('--output');
if (!packageRoot || !registryPath || !sourceRoot) {
    throw new TypeError(
        'Usage: tier-benchmark.mjs PACKAGE_ROOT --registry r.json --source-root /abs [--rows N] [--output f]'
    );
}

const api = await import(join(packageRoot, 'dist/public.js'));
const { parseEdmx } = await import(join(packageRoot, 'dist/schema/edmx.js'));
const { parseCsn } = await import(join(packageRoot, 'dist/schema/csn.js'));
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const candidates = registry.services.filter((service) => ['edmx', 'csn'].includes(service.source?.format));

const totals = { authored: 0, declared: 0, recognised: 0, model: 0, typed: 0, structural: 0, slots: 0 };
const typedCause = { protocol: 0, key: 0, boolean: 0, addressable: 0 };
const addressableTypes = {};
const services = [];
let generated = 0;
let failed = 0;
const failures = [];

for (const service of candidates) {
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
    const startedAt = performance.now();
    try {
        const result = await api.generateService(
            {
                metadata: { format: service.source.format === 'csn' ? 'csn' : 'edmx', content },
                service: { urlPath: `/${service.id}`, odataVersion: service.source.format === 'csn' ? '4.0' : '2.0' },
                targets,
                existingData: {}
            },
            {
                pipeline: 'semantic-v2',
                mode: 'auto',
                seed: 123,
                rowsPerEntity,
                ...(sftBudgetMs > 0 ? { sftBudgetMs } : {})
            },
            {}
        );
        generated += 1;
        const tiers = result.tiers ?? {};
        for (const key of Object.keys(totals)) totals[key] += tiers[key] ?? 0;

        // Attribute the typed floor. Structural foreign keys are already their own bucket.
        const structural = new Set();
        for (const relationship of graph.relationships ?? []) {
            for (const mapping of relationship.mappings) {
                structural.add(`${relationship.fromEntitySet}.${mapping.sourceProperty}`);
            }
        }
        const roles = result.semanticRoles ?? {};
        const local = { protocol: 0, key: 0, boolean: 0, addressable: 0 };
        for (const entity of graph.entities) {
            const rows = result.resources[entity.entitySetName] ?? [];
            if (rows.length === 0) continue;
            const protocol = entity.entitySetName.startsWith('SAP__');
            for (const property of entity.properties) {
                const id = `${entity.entitySetName}.${property.name}`;
                if (structural.has(id)) continue;
                const role = roles[id];
                if (role && role !== 'unknown') continue;
                if (protocol) local.protocol += rows.length;
                else if (property.isKey) local.key += rows.length;
                else if (property.primitiveType === 'bool') local.boolean += rows.length;
                else {
                    local.addressable += rows.length;
                    addressableTypes[property.primitiveType] =
                        (addressableTypes[property.primitiveType] ?? 0) + rows.length;
                }
            }
        }
        // The generator's own split counts published typed cells; the role walk above also counts
        // fields that a concept or the fine-tuned tier filled (their role stays `unknown`), so it only
        // backs the per-type breakdown and results from generators that predate `typedFloor`.
        if (result.typedFloor) {
            local.protocol = result.typedFloor.protocol;
            local.key = result.typedFloor.keys;
            local.boolean = result.typedFloor.booleans;
            local.addressable = result.typedFloor.addressable;
        }
        for (const key of Object.keys(typedCause)) typedCause[key] += local[key];
        services.push({
            id: service.id,
            slots: tiers.slots ?? 0,
            recognised: tiers.recognised ?? 0,
            model: tiers.model ?? 0,
            typed: tiers.typed ?? 0,
            ...local,
            elapsedMs: Number((performance.now() - startedAt).toFixed(1))
        });
    } catch (error) {
        failed += 1;
        failures.push({ id: service.id, reason: String(error?.message ?? error).slice(0, 200) });
    }
}

const nonStructural = totals.slots - totals.structural;
const pct = (value) => Number(((value / nonStructural) * 100).toFixed(2));
const report = {
    format: 'mockgen-tier-benchmark',
    version: 1,
    settings: { rowsPerEntity, seed: 123, sftBudgetMs },
    corpus: { attempted: candidates.length, generated, failed },
    totals,
    shares: {
        recognised: pct(totals.recognised),
        model: pct(totals.model),
        typed: pct(totals.typed),
        declared: pct(totals.declared),
        authored: pct(totals.authored)
    },
    typedCause,
    typedCauseShareOfTyped: Object.fromEntries(
        Object.entries(typedCause).map(([key, value]) => [key, Number(((value / totals.typed) * 100).toFixed(2))])
    ),
    addressableByPrimitiveType: addressableTypes,
    failures,
    services: services.sort((left, right) => right.typed - left.typed)
};
if (outputPath) await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
const summary = Object.fromEntries(Object.entries(report).filter(([key]) => key !== 'services'));
console.log(JSON.stringify(summary, null, 2));
