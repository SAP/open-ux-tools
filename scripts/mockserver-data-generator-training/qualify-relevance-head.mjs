#!/usr/bin/env node
/** Promote a trained relevance head to qualified only when every release check passes. */
import { readFile, writeFile } from 'node:fs/promises';
import { qualifyRelevanceHead } from './lib/qualify-relevance-head.mjs';

const argument = (name) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
};
const names = [
    '--head',
    '--report',
    '--dataset',
    '--train-ids',
    '--calibration-ids',
    '--sealed-ids',
    '--classifier-head',
    '--review-record',
    '--output'
];
const paths = Object.fromEntries(names.map((name) => [name, argument(name)]));
if (Object.values(paths).some((value) => !value))
    throw new Error(`Usage: qualify-relevance-head.mjs ${names.map((name) => `${name} FILE`).join(' ')}`);
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const classifierHead = await readJson(paths['--classifier-head']);
const qualified = qualifyRelevanceHead({
    head: await readJson(paths['--head']),
    report: await readJson(paths['--report']),
    rows: await readJson(paths['--dataset']),
    partitions: {
        train: await readJson(paths['--train-ids']),
        calibration: await readJson(paths['--calibration-ids']),
        sealed: await readJson(paths['--sealed-ids'])
    },
    contract: {
        encoderSha256: classifierHead.encoderSha256,
        vocabularySha256: classifierHead.tokenizerSha256,
        embeddingDimension: classifierHead.dim
    },
    reviewRecord: await readJson(paths['--review-record']),
    qualifiedAt: new Date().toISOString()
});
await writeFile(paths['--output'], `${JSON.stringify(qualified, null, 2)}\n`, 'utf8');
process.stdout.write(
    `${JSON.stringify({ status: qualified.qualification.status, sealedEvaluation: qualified.qualification.sealedEvaluation })}\n`
);
