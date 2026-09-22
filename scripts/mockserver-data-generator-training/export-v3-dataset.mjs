#!/usr/bin/env node
import { writeV3Dataset } from './lib/v3-export.mjs';
import { readFile } from 'node:fs/promises';

function argument(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

const input = argument('--input');
const vocabulary = argument('--vocabulary');
const output = argument('--output');
const maxWordPieceTokens = Number(argument('--max-wordpiece-tokens') ?? 64);
const calibrationPath = argument('--calibration');
if (!input || !vocabulary || !output) {
    throw new Error('Usage: export-v3-dataset.mjs --input rows.jsonl --vocabulary vocab.txt --output export.json');
}
const calibration = calibrationPath ? JSON.parse(await readFile(calibrationPath, 'utf8')) : undefined;
const artifact = await writeV3Dataset({ input, vocabulary, output, maxWordPieceTokens, calibration });
process.stdout.write(`Exported ${artifact.rows.length} rows (${artifact.labels.length} labels) to ${output}\n`);
