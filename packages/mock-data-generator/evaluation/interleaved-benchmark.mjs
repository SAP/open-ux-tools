// Paired measurement of several builds under the same machine load.
//
// The fine-tuned tier is time-budgeted, so its share depends on how busy the machine is. Running build
// A over the corpus and then build B compares two different machines. This driver runs
// `tier-benchmark.mjs` for every variant on the same small chunk of services before moving on, rotating
// which variant goes first, so each variant sees the same load within a few minutes. Every variant keeps
// its own resumable records file; a final pass per variant folds the records into its summary.
//
// Usage:
//   node interleaved-benchmark.mjs --variant NAME=PACKAGE_ROOT [--variant ...] --registry r.json
//        --source-root /abs --profile two-row|editor --out-dir DIR [--chunk 5] [--only ids.json]
//        [--rows-for ids.json] [-- extra tier-benchmark arguments]
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const separator = process.argv.indexOf('--');
const own = separator === -1 ? process.argv.slice(2) : process.argv.slice(2, separator);
const extra = separator === -1 ? [] : process.argv.slice(separator + 1);
const values = (name) => own.flatMap((argument, index) => (argument === name ? [own[index + 1]] : []));
const flag = (name, fallback) => values(name)[0] ?? fallback;

const variants = values('--variant').map((entry) => {
    const at = entry.indexOf('=');
    return { name: entry.slice(0, at), root: resolve(entry.slice(at + 1)) };
});
const registry = flag('--registry');
const sourceRoot = flag('--source-root');
const profile = flag('--profile', 'two-row');
const outDir = flag('--out-dir');
const chunkSize = Number(flag('--chunk', '5'));
const rowsFor = flag('--rows-for');
if (variants.length === 0 || !registry || !sourceRoot || !outDir) {
    throw new TypeError(
        'Usage: interleaved-benchmark.mjs --variant NAME=ROOT ... --registry r.json --source-root /abs --out-dir DIR'
    );
}
if (variants.some(({ name }) => !/^[\w.-]+$/u.test(name))) {
    throw new TypeError('Variant names may contain letters, digits, dots, dashes and underscores only');
}

const benchmark = join(dirname(fileURLToPath(import.meta.url)), 'tier-benchmark.mjs');
await mkdir(outDir, { recursive: true });
const only = flag('--only') ? new Set(JSON.parse(await readFile(flag('--only'), 'utf8'))) : undefined;
const ids = JSON.parse(await readFile(registry, 'utf8'))
    .services.filter((service) => ['edmx', 'csn'].includes(service.source?.format))
    .map(({ id }) => id)
    .filter((id) => !only || only.has(id));
const allPath = join(outDir, 'ids.json');
await writeFile(allPath, JSON.stringify(ids));

/**
 * Runs the tier benchmark for one variant on the given id list.
 *
 * @param {{name: string, root: string}} variant build to measure
 * @param {string} onlyPath id list file
 * @param {boolean} summary whether to write the summary file
 * @returns {number} exit status
 */
function run(variant, onlyPath, summary) {
    const base = join(outDir, `${profile}-${variant.name}`);
    const result = spawnSync(
        process.execPath,
        [
            '--max-old-space-size=6144',
            benchmark,
            variant.root,
            '--registry',
            registry,
            '--source-root',
            sourceRoot,
            '--profile',
            profile,
            '--only',
            onlyPath,
            '--records',
            `${base}.rec.jsonl`,
            '--fields',
            `${base}.fields.jsonl`,
            ...(rowsFor ? ['--rows-out', `${base}.rows.jsonl`, '--rows-for', rowsFor] : []),
            ...(summary ? ['--output', `${base}.json`] : []),
            ...extra
        ],
        { stdio: ['ignore', 'ignore', 'inherit'] }
    );
    return result.status ?? 1;
}

const chunkPath = join(outDir, 'chunk.json');
for (let offset = 0, round = 0; offset < ids.length; offset += chunkSize, round += 1) {
    await writeFile(chunkPath, JSON.stringify(ids.slice(offset, offset + chunkSize)));
    for (let step = 0; step < variants.length; step += 1) {
        const variant = variants[(round + step) % variants.length];
        const status = run(variant, chunkPath, false);
        process.stdout.write(
            `${JSON.stringify({ event: 'chunk', profile, variant: variant.name, offset, status, at: new Date().toISOString() })}\n`
        );
    }
}
for (const variant of variants) {
    const status = run(variant, allPath, true);
    process.stdout.write(`${JSON.stringify({ event: 'summary', profile, variant: variant.name, status })}\n`);
}
