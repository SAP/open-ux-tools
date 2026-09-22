#!/usr/bin/env node
/**
 * Paired fixed-input replay for MockGen artifacts.
 *
 * Runs one service fixture through a package root with empty authored data and fixed settings,
 * then prints privacy-safe counts, hashes and diagnostic codes. Works for the current package
 * and for installed prereleases (API 1 or API 2). Never prints row values.
 *
 * Usage: node paired-replay.mjs PACKAGE_ROOT METADATA_FILE edmx|csn 2.0|4.0 [--mode deterministic|auto] [--seed N] [--rows N] [--inspect] [--sft-budget-ms N] [--output FILE]
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const positional = process.argv
    .slice(2)
    .filter(
        (value, index, all) =>
            !value.startsWith('--') &&
            !(index > 0 && all[index - 1].startsWith('--') && !['--inspect'].includes(all[index - 1]))
    );
const [packageRoot, metadataPath, format, protocol] = positional;
const argument = (name, fallback) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? fallback : process.argv[index + 1];
};
const mode = argument('--mode', 'deterministic');
const seed = Number(argument('--seed', '123'));
const rowsPerEntity = Number(argument('--rows', '1'));
const inspect = process.argv.includes('--inspect');
const sftBudgetMs = Number(argument('--sft-budget-ms', '120000'));
const output = argument('--output', undefined);
if (
    !packageRoot ||
    !metadataPath ||
    !['edmx', 'csn'].includes(format) ||
    !['2.0', '4.0'].includes(protocol) ||
    !['deterministic', 'auto', 'learned'].includes(mode)
) {
    throw new TypeError(
        'Usage: node paired-replay.mjs PACKAGE_ROOT METADATA_FILE edmx|csn 2.0|4.0 [--mode deterministic|auto|learned] [--seed N] [--rows N] [--inspect] [--sft-budget-ms N] [--output FILE]'
    );
}
const digest = (value) => createHash('sha256').update(value).digest('hex');
const root = resolve(packageRoot);
const metadata = await readFile(resolve(metadataPath), 'utf8');
const modulePath = (relativePath) => pathToFileURL(resolve(root, relativePath)).href;
const publicModule = await import(modulePath('dist/public.js'));
const info = publicModule.getMockDataGeneratorInfo();

/**
 *
 */
async function targetNames() {
    if (format === 'edmx') {
        return [...metadata.matchAll(/<EntitySet\s+Name="([^"]+)"/gu)].map((match) => match[1]);
    }
    const csnModule = await import(modulePath('dist/schema/csn.js'));
    const parsed = csnModule.parseCsn(metadata);
    return parsed.entities.map((entity) => entity.entitySetName ?? entity.name);
}

const targets = (await targetNames()).map((name) => ({ name, kind: 'entity-set' }));
const request = {
    metadata: { format, content: metadata },
    service: { urlPath: `/paired/${basename(metadataPath)}`, odataVersion: protocol },
    targets,
    existingData: {}
};
const options = { mode, seed, rowsPerEntity, sftBudgetMs, sftTimeoutMs: Math.min(30_000, sftBudgetMs) };
const started = performance.now();
const record = {
    format: 'mockgen-paired-replay',
    version: 1,
    artifact: {
        root,
        name: info.name ?? null,
        version: info.version ?? null,
        apiVersion: info.apiVersion ?? null,
        modelRevision: info.model?.revision ?? null
    },
    fixture: {
        name: basename(metadataPath),
        format,
        protocol,
        metadataSha256: digest(metadata),
        targets: targets.length
    },
    settings: {
        mode,
        seed,
        rowsPerEntity,
        sftBudgetMs,
        operation: inspect ? 'inspectService' : 'generateService',
        authoredEvidenceSha256: digest('{}')
    }
};
const generator = await publicModule.createMockDataGenerator({ executionMode: 'api' });
try {
    if (inspect) {
        const inspection = await generator.inspectService(request, options, {});
        record.outcome = 'completed';
        record.inspection = {
            executionMode: inspection.executionMode ?? null,
            pipeline: inspection.pipeline ?? null,
            coverage: inspection.coverage ?? null,
            acceptedRoles: Array.isArray(inspection.acceptedRoles)
                ? inspection.acceptedRoles.length
                : inspection.acceptedRoles
                  ? Object.keys(inspection.acceptedRoles).length
                  : null,
            rawCandidates: Array.isArray(inspection.rawClassifierCandidates)
                ? inspection.rawClassifierCandidates.length
                : null,
            diagnosticCodes: (inspection.diagnostics ?? []).map((entry) => entry.code),
            artifactIdentity: inspection.artifactIdentity ?? null,
            generatedResources: Array.isArray(inspection.generatedResources)
                ? inspection.generatedResources.length
                : null
        };
    } else {
        const result = await generator.generateService(request, options);
        record.outcome = 'completed';
        record.generation = {
            executionMode: result.executionMode ?? null,
            generatedCount: Object.keys(result.resources ?? {}).length,
            rowCount: Object.values(result.resources ?? {}).reduce(
                (sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0),
                0
            ),
            generatedSha256: digest(JSON.stringify(result.resources ?? {})),
            routing: result.routing ?? null,
            semanticCoverage: result.semanticCoverage ?? null,
            validation: result.validation ?? null,
            capabilities: result.capabilities ?? null,
            sft: result.statistics?.sft ?? null,
            diagnosticCodes: (result.diagnostics ?? []).map((entry) => entry.code)
        };
    }
} catch (error) {
    record.outcome = 'rejected';
    record.error = String(error?.message ?? error)
        .split('\n')[0]
        .slice(0, 200);
} finally {
    record.elapsedMs = Math.round(performance.now() - started);
    record.rssMb = Math.round(process.memoryUsage().rss / 1048576);
    await generator.dispose?.();
}
const line = `${JSON.stringify(record)}\n`;
if (output) await writeFile(output, line, 'utf8');
process.stdout.write(line);
