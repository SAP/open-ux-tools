#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { extractRelevanceCandidates } from './lib/extract-relevance-candidates.mjs';

function argument(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

const catalogPath = argument('--catalog');
const sourceRoot = argument('--source-root');
const output = argument('--output');
const splitPath = argument('--split-by-service');
if (!catalogPath || !sourceRoot || !output) {
    throw new Error(
        'Usage: extract-relevance-candidates.mjs --catalog catalog.json --source-root values-directory --output review-packet.json [--split-by-service service-splits.json]'
    );
}
const [catalog, splitByService] = await Promise.all([
    readFile(catalogPath, 'utf8').then(JSON.parse),
    splitPath ? readFile(splitPath, 'utf8').then(JSON.parse) : {}
]);
const packet = await extractRelevanceCandidates({ catalog, sourceRoot, splitByService });
await writeFile(output, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
process.stdout.write(`Wrote ${packet.rows.length} unqualified review candidates to ${output}\n`);
