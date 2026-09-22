import { readFile, writeFile } from 'node:fs/promises';
import { convertAuthorizedV3 } from './lib/authorized-v3-converter.mjs';

function argument(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

const registryPath = argument('--registry');
const splitPath = argument('--split');
const catalogPath = argument('--catalog');
const mappingPath = argument('--mapping');
const sourceRoot = argument('--source-root');
const outputPath = argument('--output');
const rowsOutputPath = argument('--rows-output');
if (!registryPath || !splitPath || !catalogPath || !mappingPath || !sourceRoot || !outputPath)
    throw new Error(
        'Usage: convert-authorized-v3.mjs --registry registry.json --split splits.json --catalog catalog.json --mapping mapping.json --source-root /abs/root --output /abs/output.json'
    );
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const artifact = await convertAuthorizedV3({
    registry: await readJson(registryPath),
    split: await readJson(splitPath),
    catalog: await readJson(catalogPath),
    mapping: await readJson(mappingPath),
    sourceRoot,
    includeInternal: process.argv.includes('--include-internal')
});
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
if (rowsOutputPath)
    await writeFile(
        rowsOutputPath,
        `${artifact.rows.map((row) => JSON.stringify(row)).join('\n')}${artifact.rows.length ? '\n' : ''}`,
        'utf8'
    );
