// Robustness sweep comparison (metric M9): file-by-file status of a candidate sweep against a
// reference sweep. A new failure is a file that generated in the reference and fails in the candidate.
// Records hold file, status, error code/name and timing only (no values).
//
// Usage: node compare-sweeps.mjs REFERENCE_DIR CANDIDATE_DIR [--output report.json]
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [referenceDir, candidateDir] = process.argv.slice(2);
const outputIndex = process.argv.indexOf('--output');
const outputPath = outputIndex === -1 ? undefined : process.argv[outputIndex + 1];
if (!referenceDir || !candidateDir) {
    throw new TypeError('Usage: compare-sweeps.mjs REFERENCE_DIR CANDIDATE_DIR [--output report.json]');
}

/**
 * The last record per file of a sweep directory's `out-*.jsonl` shards.
 *
 * @param {string} directory sweep output directory
 * @returns {Promise<Map<string, Record<string, unknown>>>} records by file
 */
async function load(directory) {
    const records = new Map();
    for (const name of (await readdir(directory)).filter((entry) => /^out-\d+\.jsonl$/u.test(entry)).sort()) {
        for (const line of (await readFile(join(directory, name), 'utf8')).split('\n')) {
            if (line.trim()) {
                const record = JSON.parse(line);
                records.set(record.file, record);
            }
        }
    }
    return records;
}

const reference = await load(referenceDir);
const candidate = await load(candidateDir);
const both = [...candidate.keys()].filter((file) => reference.has(file));
const failed = (record) => record?.status === 'error';
const newFailures = both.filter((file) => !failed(reference.get(file)) && failed(candidate.get(file)));
const fixed = both.filter((file) => failed(reference.get(file)) && !failed(candidate.get(file)));
const median = (values) => {
    const sorted = [...values].sort((left, right) => left - right);
    return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
};
const report = {
    format: 'mockgen-sweep-comparison',
    reference: { files: reference.size, errors: [...reference.values()].filter(failed).length },
    candidate: { files: candidate.size, errors: [...candidate.values()].filter(failed).length },
    compared: both.length,
    newFailures: newFailures.map((file) => ({
        file,
        code: candidate.get(file)?.code,
        message: candidate.get(file)?.message
    })),
    fixed: fixed.length,
    medianMs: {
        reference: median(both.map((file) => reference.get(file)?.ms ?? 0)),
        candidate: median(both.map((file) => candidate.get(file)?.ms ?? 0))
    }
};
if (outputPath) await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, newFailures: report.newFailures.length }, null, 2));
if (newFailures.length > 0) process.exitCode = 1;
