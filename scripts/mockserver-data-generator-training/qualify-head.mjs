#!/usr/bin/env node
/** Promote a trained v3 head to qualified only when every release check passes. */
import { readFile, writeFile } from 'node:fs/promises';
import { qualifyHead } from './lib/qualify-head.mjs';
import { sealedDatasetFingerprint } from './lib/sealed-evaluation.mjs';

const argument = (name) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
};
const paths = Object.fromEntries(
    ['--head', '--sealed-report', '--sealed', '--manifest', '--review-record', '--output'].map((name) => [
        name,
        argument(name)
    ])
);
if (Object.values(paths).some((value) => !value)) {
    throw new Error(
        'Usage: qualify-head.mjs --head head.json --sealed-report report.json --sealed sealed-rows.jsonl --manifest manifest.json --review-record record.json --output qualified-head.json'
    );
}
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const rows = (await readFile(paths['--sealed'], 'utf8'))
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
const qualified = qualifyHead({
    head: await readJson(paths['--head']),
    report: await readJson(paths['--sealed-report']),
    recomputedSealedFingerprint: sealedDatasetFingerprint(rows),
    manifest: await readJson(paths['--manifest']),
    reviewRecord: await readJson(paths['--review-record']),
    qualifiedAt: new Date().toISOString()
});
await writeFile(paths['--output'], `${JSON.stringify(qualified, null, 2)}\n`, 'utf8');
process.stdout.write(
    `${JSON.stringify({ status: qualified.qualification.status, labels: qualified.labels.length, sealedEvaluation: qualified.qualification.sealedEvaluation })}\n`
);
