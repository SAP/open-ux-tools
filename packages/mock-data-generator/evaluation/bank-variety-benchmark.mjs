// How varied recognised values are, and how often a bank is too small to fill the requested rows.
// Measures distinct values per recognised column at ten rows per entity (the editor default).
//
// Usage: node bank-variety-benchmark.mjs PACKAGE_ROOT --registry r.json --source-root /abs [--output f]
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const argument = (name, fallback) => {
    const index = process.argv.indexOf(name);
    return index === -1 ? fallback : process.argv[index + 1];
};
const packageRoot = resolve(process.argv[2] ?? '');
const registryPath = argument('--registry');
const sourceRoot = argument('--source-root');
const outputPath = argument('--output');
const api = await import(join(packageRoot, 'dist/public.js'));
const { parseEdmx } = await import(join(packageRoot, 'dist/schema/edmx.js'));
const { parseCsn } = await import(join(packageRoot, 'dist/schema/csn.js'));
const registry = JSON.parse(await readFile(registryPath, 'utf8'));

const byRole = {};
let columns = 0;
let fullyDistinct = 0;
let reducedEntities = 0;
let services = 0;
const failures = {};
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
    let result;
    try {
        result = await api.generateService(
            {
                metadata: { format: service.source.format === 'csn' ? 'csn' : 'edmx', content },
                service: { urlPath: `/${service.id}`, odataVersion: service.source.format === 'csn' ? '4.0' : '2.0' },
                targets,
                existingData: {}
            },
            { pipeline: 'semantic-v2', mode: 'auto', seed: 123, rowsPerEntity: 10, sftBudgetMs: 1 },
            {}
        );
    } catch (error) {
        const reason = String(error?.message ?? error)
            .replace(/[A-Za-z_]+\.[A-Za-z_]+/gu, '<field>')
            .slice(0, 90);
        failures[reason] = (failures[reason] ?? 0) + 1;
        continue;
    }
    services += 1;
    reducedEntities += result.diagnostics.filter(
        ({ code }) => code === 'ROW_COUNT_REDUCED_UNSATISFIABLE_KEY_DOMAIN'
    ).length;
    for (const [key, role] of Object.entries(result.semanticRoles ?? {})) {
        if (!role || role === 'unknown') continue;
        const [resource, property] = key.split('.');
        const rows = result.resources[resource] ?? [];
        if (rows.length < 2) continue;
        const values = rows.map((row) => JSON.stringify(row[property]));
        const distinct = new Set(values).size;
        columns += 1;
        if (distinct === rows.length) fullyDistinct += 1;
        byRole[role] ??= { columns: 0, distinctSum: 0, rowSum: 0 };
        byRole[role].columns += 1;
        byRole[role].distinctSum += distinct;
        byRole[role].rowSum += rows.length;
    }
}
const roles = Object.fromEntries(
    Object.entries(byRole)
        .map(([role, v]) => [
            role,
            { columns: v.columns, distinctPerTenRows: Number(((v.distinctSum / v.rowSum) * 10).toFixed(1)) }
        ])
        .sort((left, right) => right[1].columns - left[1].columns)
);
const report = {
    format: 'mockgen-bank-variety-benchmark',
    version: 1,
    services,
    recognisedColumns: columns,
    fullyDistinctColumnsPct: Number(((fullyDistinct / columns) * 100).toFixed(2)),
    rowCountReducedEntities: reducedEntities,
    failures,
    roles
};
if (outputPath) await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
const summary = Object.fromEntries(Object.entries(report).filter(([key]) => key !== 'roles'));
console.log(JSON.stringify(summary));
console.log(JSON.stringify(Object.fromEntries(Object.entries(roles).slice(0, 25))));
