#!/usr/bin/env node
// Produces the model files that are not tracked in git, then checks every model file against the
// manifest. Run from the package directory before packing: `pnpm build:models [--python <exe>]`.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MODELS = resolve('resources', 'models');
const ENCODER_REPOSITORY = 'Xenova/all-MiniLM-L6-v2';
const ENCODER_REVISION = '751bff37182d3f1213fa05d7196b954e230abad9';
/** Model files downloaded unchanged from the public encoder repository: manifest path → upstream path. */
const DOWNLOADS = new Map([
    ['classifier/encoder.onnx', 'onnx/model_quantized.onnx'],
    ['classifier/vocab.txt', 'vocab.txt']
]);

/**
 * SHA-256 of a file, or undefined when it does not exist.
 *
 * @param {string} path file path
 * @returns {string | undefined} hex digest
 */
function fileSha256(path) {
    return existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : undefined;
}

/**
 * The files the manifest pins, by path below resources/models.
 *
 * @returns {Map<string, string>} path → expected SHA-256
 */
function pinnedFiles() {
    const manifest = JSON.parse(readFileSync(join(MODELS, 'manifest.json'), 'utf8'));
    return new Map(manifest.components.flatMap(({ files }) => files.map(({ path, sha256 }) => [path, sha256])));
}

/**
 * Download a file of the pinned encoder revision.
 *
 * @param {string} upstreamPath path in the repository
 * @param {string} target local file
 */
async function download(upstreamPath, target) {
    const url = `https://huggingface.co/${ENCODER_REPOSITORY}/resolve/${ENCODER_REVISION}/${upstreamPath}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`download of ${url} failed: HTTP ${response.status}`);
    }
    writeFileSync(target, Buffer.from(await response.arrayBuffer()));
}

/**
 * Value of a `--name value` command-line option.
 *
 * @param {string} name option name
 * @param {string} fallback default value
 * @returns {string} the value
 */
function option(name, fallback) {
    const index = process.argv.indexOf(`--${name}`);
    return index > 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const pinned = pinnedFiles();
for (const [path, upstreamPath] of DOWNLOADS) {
    const target = join(MODELS, path);
    if (fileSha256(target) !== pinned.get(path)) {
        console.log(`downloading ${path}`);
        await download(upstreamPath, target);
    }
}
if (['sft/model.onnx', 'sft/tokenizer.json'].some((path) => fileSha256(join(MODELS, path)) !== pinned.get(path))) {
    console.log('building sft/model.onnx and sft/tokenizer.json');
    execFileSync(
        option('python', 'python3'),
        [
            join('training', 'row-model', 'export.py'),
            '--adapter',
            join('training', 'row-model', 'adapter'),
            '--out',
            join(MODELS, 'sft')
        ],
        { stdio: 'inherit' }
    );
}
const mismatches = [...pinned]
    .filter(([path, sha256]) => fileSha256(join(MODELS, path)) !== sha256)
    .map(([path]) => path);
if (mismatches.length > 0) {
    console.error(`model files do not match resources/models/manifest.json: ${mismatches.join(', ')}`);
    process.exit(1);
}
console.log(`all ${pinned.size} model files match the manifest`);
