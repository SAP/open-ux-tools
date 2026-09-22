#!/usr/bin/env node
/**
 * Scaling benchmark: generation time against dataset size for one service, with the language model
 * tier disabled so the measurement isolates the deterministic pipeline.
 *
 * Usage:
 *   node scaling-benchmark.mjs PACKAGE_ROOT METADATA_FILE edmx|csn 2.0|4.0
 *        [--rows 1,2,5,10,25,50,100] [--seed N] [--repeat N] [--output FILE]
 *
 * Privacy: counts and timings only; no generated value is written or printed.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const positional = process.argv.slice(2).filter((value, index, all) => {
    if (value.startsWith('--')) return false;
    const previous = all[index - 1];
    return !previous?.startsWith('--');
});
const argument = (name, fallback) => {
    const index = process.argv.indexOf(name);
    return index > 0 ? process.argv[index + 1] : fallback;
};
const [packageRoot, metadataPath, format, odataVersion] = positional;
if (!packageRoot || !metadataPath || !format || !odataVersion) {
    throw new TypeError(
        'Usage: scaling-benchmark.mjs PACKAGE_ROOT METADATA edmx|csn 2.0|4.0 [--rows list] [--repeat N] [--output FILE]'
    );
}
const rowCounts = argument('--rows', '1,2,5,10,25,50,100')
    .split(',')
    .map((value) => Number(value.trim()));
const seed = Number(argument('--seed', '123'));
const repeat = Number(argument('--repeat', '3'));
const outputPath = argument('--output');

const root = resolve(packageRoot);
const api = await import(pathToFileURL(join(root, 'dist/public.js')).href);
const content = await readFile(resolve(metadataPath), 'utf8');
const targets =
    format === 'edmx'
        ? [...new Set([...content.matchAll(/<EntitySet\s+Name="([^"]+)"/gu)].map((match) => match[1]))]
        : [
              ...new Set(
                  (await import(pathToFileURL(join(root, 'dist/schema/csn.js')).href))
                      .parseCsn(content)
                      .entities.map((entity) => entity.entitySetName ?? entity.name)
              )
          ];
const request = {
    metadata: { format, content },
    service: { urlPath: '/scaling', odataVersion },
    targets: targets.map((name) => ({ name, kind: 'entity-set' })),
    existingData: {}
};

const points = [];
for (const rowsPerEntity of rowCounts) {
    const samples = [];
    let rows = 0;
    for (let attempt = 0; attempt < repeat; attempt += 1) {
        const startedAt = performance.now();
        const result = await api.generateService(
            request,
            { pipeline: 'semantic-v2', mode: 'deterministic', seed, rowsPerEntity },
            {}
        );
        samples.push(performance.now() - startedAt);
        rows = Object.values(result.resources ?? {}).reduce(
            (sum, value) => sum + (Array.isArray(value) ? value.length : 0),
            0
        );
    }
    const best = Math.min(...samples);
    points.push({
        rowsPerEntity,
        generatedRows: rows,
        medianMs: Number(samples.sort((left, right) => left - right)[Math.floor(samples.length / 2)].toFixed(1)),
        bestMs: Number(best.toFixed(1)),
        msPerRow: rows > 0 ? Number((best / rows).toFixed(3)) : 0
    });
}

const report = {
    format: 'mockgen-scaling-benchmark',
    version: 1,
    settings: { seed, repeat, mode: 'deterministic', entities: targets.length },
    points
};
process.stdout.write(`${JSON.stringify(report)}\n`);
if (outputPath) await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
