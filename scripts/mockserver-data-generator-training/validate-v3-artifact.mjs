#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { validateV3Dataset } from './lib/v3-export.mjs';

function argument(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

const artifactPath = argument('--artifact');
const vocabulary = argument('--vocabulary');
const calibrationPath = argument('--calibration');
if (!artifactPath || !vocabulary) {
    throw new Error('Usage: validate-v3-artifact.mjs --artifact export.json --vocabulary vocab.txt');
}
const artifact = JSON.parse(await readFile(artifactPath, 'utf8'));
const calibration = calibrationPath ? JSON.parse(await readFile(calibrationPath, 'utf8')) : undefined;
await validateV3Dataset({ artifact, vocabulary, calibration });
process.stdout.write(`Validated ${artifact.rows.length} rows against local runtime metadata\n`);
