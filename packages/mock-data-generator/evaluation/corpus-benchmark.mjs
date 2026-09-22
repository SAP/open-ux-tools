#!/usr/bin/env node
/**
 * Corpus benchmark: run the full generation pipeline over every checksum-verified service of a
 * source registry and aggregate how each field was resolved.
 *
 * Usage:
 *   node corpus-benchmark.mjs PACKAGE_ROOT --registry registry.json --source-root /abs/root
 *        [--mode deterministic|auto] [--rows N] [--seed N] [--limit N] [--output FILE]
 *
 * Privacy: the report holds counts, identities and checksums only. No generated value and no
 * source content is written to the report or to stdout.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const positional = process.argv.slice(2).filter((value, index, all) => {
    if (value.startsWith('--')) return false;
    const previous = all[index - 1];
    return !(previous?.startsWith('--') && previous !== '--inspect');
});
const argument = (name, fallback) => {
    const index = process.argv.indexOf(name);
    return index > 0 ? process.argv[index + 1] : fallback;
};
const packageRoot = resolve(positional[0] ?? '.');
const registryPath = argument('--registry');
const sourceRoot = argument('--source-root');
const mode = argument('--mode', 'deterministic');
const rowsPerEntity = Number(argument('--rows', '2'));
const seed = Number(argument('--seed', '123'));
const limit = Number(argument('--limit', '0'));
const sftBudgetMs = Number(argument('--sft-budget-ms', '0'));
const outputPath = argument('--output');
if (!registryPath || !sourceRoot) {
    throw new TypeError(
        'Usage: corpus-benchmark.mjs PACKAGE_ROOT --registry r.json --source-root /abs [--mode m] [--rows N] [--output f]'
    );
}

const api = await import(pathToFileURL(join(packageRoot, 'dist/public.js')).href);
const csnModule = await import(pathToFileURL(join(packageRoot, 'dist/schema/csn.js')).href);

/**
 * Entity sets of one service, named exactly as the generator expects its targets.
 *
 * @param {string} format source format
 * @param {string} content source document
 * @returns {Array<{name: string, kind: 'entity-set'}>} generation targets
 */
function targetsOf(format, content) {
    const names =
        format === 'edmx'
            ? [...content.matchAll(/<EntitySet\s+Name="([^"]+)"/gu)].map((match) => match[1])
            : csnModule.parseCsn(content).entities.map((entity) => entity.entitySetName ?? entity.name);
    return [...new Set(names)].map((name) => ({ name, kind: 'entity-set' }));
}
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/** Services whose source this package can parse directly and whose bytes still match the registry. */
const candidates = registry.services.filter((service) => ['edmx', 'csn'].includes(service.source?.format));
const selected = limit > 0 ? candidates.slice(0, limit) : candidates;

const totals = {
    totalFields: 0,
    metadataAccepted: 0,
    classifierAccepted: 0,
    lexicalAccepted: 0,
    abstained: 0,
    providerBound: 0,
    detectedButUnbound: 0
};
const coverage = {
    eligibleFields: 0,
    routedFields: 0,
    formatValidatedFields: 0,
    structuralOnlyFields: 0,
    unsupportedFields: 0,
    evidenceVerifiedFields: 0,
    syntheticUnverifiedFields: 0
};
const services = [];
let attempted = 0;
let generated = 0;
let skipped = 0;
const failures = [];
const elapsed = [];

for (const service of selected) {
    const path = isAbsolute(service.source.uri) ? service.source.uri : join(resolve(sourceRoot), service.source.uri);
    let content;
    try {
        content = await readFile(path, 'utf8');
    } catch {
        skipped += 1;
        continue;
    }
    if (service.source.contentChecksum && sha256(content) !== service.source.contentChecksum) {
        skipped += 1;
        continue;
    }
    let targets;
    try {
        targets = targetsOf(service.source.format, content);
    } catch {
        skipped += 1;
        continue;
    }
    if (targets.length === 0) {
        skipped += 1;
        continue;
    }
    attempted += 1;
    const startedAt = performance.now();
    try {
        const result = await api.generateService(
            {
                metadata: {
                    format: service.source.format === 'csn' ? 'csn' : 'edmx',
                    content
                },
                service: { urlPath: `/${service.id}`, odataVersion: service.source.format === 'csn' ? '4.0' : '2.0' },
                targets,
                existingData: {}
            },
            { pipeline: 'semantic-v2', mode, seed, rowsPerEntity, ...(sftBudgetMs > 0 ? { sftBudgetMs } : {}) },
            {}
        );
        const took = performance.now() - startedAt;
        elapsed.push(took);
        generated += 1;
        for (const key of Object.keys(totals)) totals[key] += result.routing?.[key] ?? 0;
        for (const key of Object.keys(coverage)) coverage[key] += result.semanticCoverage?.[key] ?? 0;
        services.push({
            id: service.id,
            format: service.source.format,
            entities: targets.length,
            fields: result.routing?.totalFields ?? 0,
            providerBound: result.routing?.providerBound ?? 0,
            elapsedMs: Number(took.toFixed(1))
        });
    } catch (error) {
        failures.push({ id: service.id, reason: String(error?.message ?? error).slice(0, 160) });
    }
}

const share = (value) => (totals.totalFields > 0 ? Number(((100 * value) / totals.totalFields).toFixed(2)) : 0);
const sorted = [...elapsed].sort((left, right) => left - right);
const percentile = (fraction) =>
    sorted.length ? Number(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))].toFixed(1)) : 0;
const report = {
    format: 'mockgen-corpus-benchmark',
    version: 1,
    settings: { mode, rowsPerEntity, seed, sftBudgetMs },
    registry: { path: registryPath, services: registry.services.length, parsableSources: candidates.length },
    corpus: { attempted, generated, failed: failures.length, skipped },
    routing: {
        ...totals,
        metadataPct: share(totals.metadataAccepted),
        classifierPct: share(totals.classifierAccepted),
        lexicalPct: share(totals.lexicalAccepted),
        abstainedPct: share(totals.abstained),
        providerBoundPct: share(totals.providerBound)
    },
    semanticCoverage: coverage,
    speed: {
        medianMs: percentile(0.5),
        p90Ms: percentile(0.9),
        maxMs: sorted.length ? Number(sorted.at(-1).toFixed(1)) : 0,
        totalSec: Number((elapsed.reduce((sum, value) => sum + value, 0) / 1000).toFixed(1))
    },
    failures,
    services
};
const line = `${JSON.stringify({ ...report, services: undefined, failures: failures.slice(0, 5) })}\n`;
process.stdout.write(line);
if (outputPath) await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
