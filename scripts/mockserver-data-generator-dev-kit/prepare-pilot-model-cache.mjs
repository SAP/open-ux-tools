#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, realpathSync } from 'node:fs';
import { access, chmod, copyFile, lstat, mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionGenerationConfiguration } from './lib/model-config.mjs';

const BUNDLE_ID = 'mockgen-pilot-int8';
const RUNTIME_VERSION = '1.24.3';
const DEVELOPMENT_ORIGIN = 'https://models.invalid/mockgen-pilot-development';
const LICENSE = Object.freeze({
    name: 'Apache-2.0',
    url: 'https://www.apache.org/licenses/LICENSE-2.0'
});

/**
 * @typedef {object} PilotModelCacheReport
 * @property {'ready'} status cache status
 * @property {'development'} lifecycle manifest lifecycle
 * @property {string} bundleId immutable bundle identifier
 * @property {string} revision immutable bundle revision
 * @property {string} manifestPath generated manifest path
 * @property {string} manifestSha256 generated manifest checksum
 * @property {string} cacheRoot model cache root
 * @property {string} bundleDirectory immutable bundle directory
 * @property {number} expectedBytes verified artifact bytes
 * @property {{classifier: string, sft: string}} componentFingerprints runtime fingerprints
 * @property {{package: string, version: string}} runtime pinned ONNX runtime
 */

function canonicalJson(value) {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
    }
    if (value !== null && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

async function sha256File(filePath) {
    const digest = createHash('sha256');
    for await (const chunk of createReadStream(filePath)) {
        digest.update(chunk);
    }
    return digest.digest('hex');
}

function positiveInteger(value, label) {
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new TypeError(`${label} must be a positive integer`);
    }
    return value;
}

async function validateRoot(root, label) {
    if (!isAbsolute(root)) {
        throw new TypeError(`${label} must be an absolute path`);
    }
    const details = await lstat(root);
    if (!details.isDirectory() || details.isSymbolicLink()) {
        throw new TypeError(`${label} must be a regular non-symbolic-link directory`);
    }
    return realpath(root);
}

async function regularSource(root, relativePath, label) {
    const candidate = join(root, relativePath);
    let details;
    try {
        details = await lstat(candidate);
    } catch {
        throw new TypeError(`${label} must be a readable regular non-symbolic-link file`);
    }
    if (!details.isFile() || details.isSymbolicLink()) {
        throw new TypeError(`${label} must be a readable regular non-symbolic-link file`);
    }
    const canonical = await realpath(candidate);
    if (!canonical.startsWith(`${root}${sep}`)) {
        throw new TypeError(`${label} escapes the pilot root`);
    }
    await access(canonical);
    return canonical;
}

async function exists(filePath) {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function ensureDirectory(directory, label) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const details = await lstat(directory);
    if (!details.isDirectory() || details.isSymbolicLink()) {
        throw new TypeError(`${label} must be a regular non-symbolic-link directory`);
    }
    return realpath(directory);
}

async function prospectiveCanonicalPath(target) {
    let candidate = resolve(target);
    const missingSegments = [];
    while (true) {
        try {
            return join(await realpath(candidate), ...missingSegments);
        } catch (error) {
            if (error?.code !== 'ENOENT') {
                throw error;
            }
            const parent = dirname(candidate);
            if (parent === candidate) {
                throw error;
            }
            missingSegments.unshift(basename(candidate));
            candidate = parent;
        }
    }
}

function isAtOrWithin(candidate, root) {
    return candidate === root || candidate.startsWith(`${root}${sep}`);
}

async function assertOutputsOutsidePilot(pilotRoot, cacheRoot, manifestPath) {
    const [canonicalCache, canonicalManifest] = await Promise.all([
        prospectiveCanonicalPath(cacheRoot),
        prospectiveCanonicalPath(manifestPath)
    ]);
    if (isAtOrWithin(canonicalCache, pilotRoot) || isAtOrWithin(canonicalManifest, pilotRoot)) {
        throw new TypeError('Pilot model outputs must be outside the retained pilot root');
    }
}

async function sourceLayout(pilotRoot) {
    const repositorySftRoot = 'var/sft/onnx-export';
    const portableSftRoot = 'packages/mockgen-models/llm-model';
    const repositoryLayout = await exists(join(pilotRoot, repositorySftRoot, 'model_int8.onnx'));
    const sftRoot = repositoryLayout ? repositorySftRoot : portableSftRoot;
    return {
        classifier: [
            {
                role: 'encoder',
                path: 'classifier/encoder.onnx',
                source: await regularSource(
                    pilotRoot,
                    'packages/mockgen-models/retrieval-model/model_int8.onnx',
                    'classifier encoder'
                )
            },
            {
                role: 'classifier-head',
                path: 'classifier/head.json',
                source: await regularSource(
                    pilotRoot,
                    'packages/mockgen-core/models/embedding-classifier-head.json',
                    'classifier head'
                )
            },
            {
                role: 'vocabulary',
                path: 'classifier/vocab.txt',
                source: await regularSource(
                    pilotRoot,
                    'packages/mockgen-models/retrieval-model/vocab.txt',
                    'classifier vocabulary'
                )
            }
        ],
        sft: [
            {
                role: 'model',
                path: 'sft/model.onnx',
                source: await regularSource(pilotRoot, `${sftRoot}/model_int8.onnx`, 'SFT INT8 model')
            },
            {
                role: 'tokenizer',
                path: 'sft/tokenizer.json',
                source: await regularSource(pilotRoot, `${sftRoot}/tokenizer.json`, 'SFT tokenizer')
            }
        ],
        configurationSource: await regularSource(
            pilotRoot,
            `${sftRoot}/${repositoryLayout ? 'config.json' : 'manifest.json'}`,
            'SFT configuration'
        ),
        repositoryLayout
    };
}

async function artifact(source) {
    const details = await lstat(source.source);
    return {
        role: source.role,
        path: source.path,
        bytes: details.size,
        sha256: await sha256File(source.source),
        source: source.source
    };
}

function componentFingerprint(files) {
    return sha256(
        canonicalJson(files.map(({ role, path, bytes, sha256: checksum }) => ({ role, path, bytes, sha256: checksum })))
    );
}

function causalNames(prefix, layers) {
    return Array.from({ length: layers }, (_, layer) => [`${prefix}.${layer}.key`, `${prefix}.${layer}.value`]).flat();
}

function manifestFile(file, revision) {
    return {
        role: file.role,
        path: file.path,
        bytes: file.bytes,
        sha256: file.sha256,
        url: `${DEVELOPMENT_ORIGIN}/${revision}/${file.path}`
    };
}

async function verifyDirectory(directory, files) {
    const rootDetails = await lstat(directory);
    if (!rootDetails.isDirectory() || rootDetails.isSymbolicLink()) {
        throw new Error('Staged pilot bundle must be a regular non-symbolic-link directory');
    }
    const canonicalRoot = await realpath(directory);
    for (const file of files) {
        const target = join(directory, file.path);
        const details = await lstat(target);
        const canonicalTarget = await realpath(target);
        if (
            !details.isFile() ||
            details.isSymbolicLink() ||
            !canonicalTarget.startsWith(`${canonicalRoot}${sep}`) ||
            details.size !== file.bytes
        ) {
            throw new Error(`Staged pilot artifact failed validation: ${file.role}`);
        }
        if ((await sha256File(target)) !== file.sha256) {
            throw new Error(`Staged pilot artifact failed checksum validation: ${file.role}`);
        }
    }
}

async function publishCache(cacheRoot, bundleId, revision, files, generatedConfiguration) {
    const bundleRoot = await ensureDirectory(join(cacheRoot, bundleId), 'pilot bundle cache root');
    if (!bundleRoot.startsWith(`${cacheRoot}${sep}`)) {
        throw new TypeError('pilot bundle cache root escapes the selected model cache');
    }
    const destination = join(bundleRoot, revision);
    if (await exists(destination)) {
        await verifyDirectory(destination, files);
        return destination;
    }
    const temporary = join(bundleRoot, `.${revision}.partial-${process.pid}-${randomUUID()}`);
    try {
        await mkdir(temporary, { mode: 0o700 });
        for (const file of files) {
            const target = join(temporary, file.path);
            await mkdir(dirname(target), { recursive: true, mode: 0o700 });
            if (file.source) {
                await copyFile(file.source, target);
            } else {
                await writeFile(target, generatedConfiguration, { flag: 'wx', mode: 0o600 });
            }
            await chmod(target, 0o600);
        }
        await verifyDirectory(temporary, files);
        try {
            await rename(temporary, destination);
        } catch (error) {
            if (error?.code !== 'EEXIST' && error?.code !== 'ENOTEMPTY') {
                throw error;
            }
            await verifyDirectory(destination, files);
        }
        return destination;
    } finally {
        await rm(temporary, { recursive: true, force: true });
    }
}

async function publishManifest(manifestPath, source) {
    if (await exists(manifestPath)) {
        const details = await lstat(manifestPath);
        if (!details.isFile() || details.isSymbolicLink()) {
            throw new TypeError('Model manifest output must be a regular non-symbolic-link file');
        }
        const existing = await readFile(manifestPath, 'utf8');
        if (existing !== source) {
            throw new Error('Existing model manifest does not match the retained pilot artifacts');
        }
        return;
    }
    try {
        await writeFile(manifestPath, source, { flag: 'wx', mode: 0o600 });
    } catch (error) {
        if (error?.code !== 'EEXIST' || (await readFile(manifestPath, 'utf8')) !== source) {
            throw error;
        }
    }
}

/**
 * Stage the retained pilot classifier and INT8 SFT artifacts into the production
 * cache contract without adding model files to the repository.
 *
 * @param {object} options bridge options
 * @param {string} options.pilotRoot pilot repository or extracted pilot-bundle root
 * @param {string} options.cacheRoot destination production model cache
 * @param {string} options.manifestPath destination production-format manifest
 * @returns {Promise<PilotModelCacheReport>} development bundle report
 */
export async function preparePilotModelCache({ pilotRoot, cacheRoot, manifestPath }) {
    const canonicalPilotRoot = await validateRoot(pilotRoot, 'pilot root');
    if (!isAbsolute(cacheRoot) || !isAbsolute(manifestPath)) {
        throw new TypeError('cacheRoot and manifestPath must be absolute paths');
    }
    const requestedCacheRoot = resolve(cacheRoot);
    const requestedManifestPath = resolve(manifestPath);
    await assertOutputsOutsidePilot(canonicalPilotRoot, requestedCacheRoot, requestedManifestPath);
    const layout = await sourceLayout(canonicalPilotRoot);
    const configuration = productionGenerationConfiguration(
        await readFile(layout.configurationSource, 'utf8'),
        layout.repositoryLayout
    );
    const configurationSource = `${JSON.stringify(configuration, null, 2)}\n`;
    const classifierFiles = [];
    for (const source of layout.classifier) {
        classifierFiles.push(await artifact(source));
    }
    const sftFiles = [];
    for (const source of layout.sft) {
        sftFiles.push(await artifact(source));
    }
    sftFiles.push({
        role: 'generation-config',
        path: 'sft/generation-config.json',
        bytes: Buffer.byteLength(configurationSource),
        sha256: sha256(configurationSource)
    });
    const classifierFingerprint = componentFingerprint(classifierFiles);
    const sftFingerprint = componentFingerprint(sftFiles);
    const revision = sha256(
        canonicalJson({
            bundleId: BUNDLE_ID,
            runtime: { package: 'onnxruntime-node', version: RUNTIME_VERSION },
            classifierFingerprint,
            sftFingerprint
        })
    );
    const runtime = { backend: 'onnx', package: 'onnxruntime-node', version: RUNTIME_VERSION };
    const manifest = {
        formatVersion: 1,
        bundleId: BUNDLE_ID,
        revision,
        lifecycle: 'development',
        components: [
            {
                id: 'semantic-classifier',
                kind: 'classifier',
                version: 'pilot-calibrated-v2',
                fingerprint: classifierFingerprint,
                files: classifierFiles.map((file) => manifestFile(file, revision)),
                runtime: {
                    ...runtime,
                    inputs: ['input_ids', 'attention_mask', 'token_type_ids'],
                    outputs: ['last_hidden_state'],
                    outputFormat: 'embedding-classifier-v2'
                },
                license: LICENSE,
                modelCardUrl: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2'
            },
            {
                id: 'row-generator',
                kind: 'sft',
                version: 'pilot-smollm2-135m-int8',
                fingerprint: sftFingerprint,
                files: sftFiles.map((file) => manifestFile(file, revision)),
                runtime: {
                    ...runtime,
                    inputs: [
                        'input_ids',
                        'attention_mask',
                        'position_ids',
                        ...causalNames('past_key_values', configuration.numHiddenLayers)
                    ],
                    outputs: ['logits', ...causalNames('present', configuration.numHiddenLayers)],
                    outputFormat: 'row-object-v1'
                },
                license: LICENSE,
                modelCardUrl:
                    'https://github.com/SAP/open-ux-tools/blob/main/docs/quality/mockserver-data-generator-model-evaluation.md'
            }
        ]
    };
    const manifestSource = `${JSON.stringify(manifest, null, 2)}\n`;
    const allFiles = [...classifierFiles, ...sftFiles];
    const canonicalCacheRoot = await ensureDirectory(requestedCacheRoot, 'model cache root');
    const manifestParent = await ensureDirectory(dirname(requestedManifestPath), 'model manifest parent');
    const canonicalManifestPath = join(manifestParent, basename(requestedManifestPath));
    await assertOutputsOutsidePilot(canonicalPilotRoot, canonicalCacheRoot, canonicalManifestPath);
    const bundleDirectory = await publishCache(
        canonicalCacheRoot,
        manifest.bundleId,
        manifest.revision,
        allFiles,
        configurationSource
    );
    await publishManifest(canonicalManifestPath, manifestSource);
    return {
        status: 'ready',
        lifecycle: manifest.lifecycle,
        bundleId: manifest.bundleId,
        revision: manifest.revision,
        manifestPath: canonicalManifestPath,
        manifestSha256: sha256(manifestSource),
        cacheRoot: canonicalCacheRoot,
        bundleDirectory,
        expectedBytes: allFiles.reduce((sum, file) => sum + file.bytes, 0),
        componentFingerprints: { classifier: classifierFingerprint, sft: sftFingerprint },
        runtime: { package: runtime.package, version: runtime.version }
    };
}

function valueOption(argv, name) {
    const index = argv.indexOf(name);
    return index < 0 ? undefined : argv[index + 1];
}

export function parseArguments(argv) {
    const argumentsWithoutSeparator = argv[0] === '--' ? argv.slice(1) : argv;
    const pilotRoot = valueOption(argumentsWithoutSeparator, '--pilot-root');
    const cacheRoot = valueOption(argumentsWithoutSeparator, '--cache');
    const manifestPath = valueOption(argumentsWithoutSeparator, '--manifest-out');
    if (!pilotRoot || !cacheRoot || !manifestPath) {
        throw new TypeError(
            'Usage: prepare-pilot-model-cache.mjs --pilot-root <absolute-path> --cache <absolute-path> --manifest-out <absolute-path>'
        );
    }
    const expectedArguments = new Set(['--pilot-root', '--cache', '--manifest-out']);
    for (let index = 0; index < argumentsWithoutSeparator.length; index += 2) {
        if (!expectedArguments.has(argumentsWithoutSeparator[index]) || !argumentsWithoutSeparator[index + 1]) {
            throw new TypeError(`Unknown or incomplete argument: ${String(argumentsWithoutSeparator[index])}`);
        }
    }
    return { pilotRoot, cacheRoot, manifestPath };
}

function isMainModule() {
    if (!process.argv[1]) return false;
    try {
        return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
    } catch {
        return false;
    }
}

if (isMainModule()) {
    preparePilotModelCache(parseArguments(process.argv.slice(2)))
        .then((report) => process.stdout.write(`${JSON.stringify(report, null, 2)}\n`))
        .catch((error) => {
            process.stderr.write(
                `MockGen pilot-model preparation failed: ${error instanceof Error ? error.message : String(error)}\n`
            );
            process.exitCode = 1;
        });
}
