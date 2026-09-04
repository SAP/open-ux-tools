#!/usr/bin/env node

import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { artifactRecord, percentile } from './lib/evaluation.mjs';

const REPOSITORY_ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const GENERATOR_ENTRY = join(REPOSITORY_ROOT, 'packages/mockserver-data-generator/dist/index.js');

function parseArguments(argv) {
    const options = { backend: 'native', runs: 50 };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        const value = argv[index + 1];
        if (argument === '--pilot-root' && value) {
            options.pilotRoot = resolve(value);
            index += 1;
        } else if (argument === '--backend' && value) {
            options.backend = value;
            index += 1;
        } else if (argument === '--runs' && value) {
            options.runs = Number.parseInt(value, 10);
            index += 1;
        } else {
            throw new TypeError(`Unknown or incomplete argument: ${argument}`);
        }
    }
    if (!options.pilotRoot) {
        throw new TypeError('--pilot-root is required');
    }
    if (!['native', 'wasm'].includes(options.backend)) {
        throw new TypeError('--backend must be native or wasm');
    }
    if (!Number.isSafeInteger(options.runs) || options.runs < 2) {
        throw new TypeError('--runs must be an integer of at least two');
    }
    return options;
}

async function findWasmEntry() {
    const store = join(REPOSITORY_ROOT, 'node_modules/.pnpm');
    const candidates = (await readdir(store))
        .filter((entry) => entry.startsWith('onnxruntime-web@'))
        .sort()
        .reverse();
    for (const candidate of candidates) {
        const entry = join(store, candidate, 'node_modules/onnxruntime-web/dist/ort.node.min.mjs');
        try {
            const runtime = await import(pathToFileURL(entry).href);
            if (runtime.InferenceSession?.create && runtime.Tensor) {
                return { entry, runtime };
            }
        } catch {
            // Continue to the next fully installed candidate.
        }
    }
    throw new Error('No usable onnxruntime-web installation is available for the bounded benchmark');
}

async function createBackend(generator, name) {
    if (name === 'native') {
        return { backend: await generator.loadOnnxBackend(), runtimeArtifact: undefined };
    }
    const { entry, runtime } = await findWasmEntry();
    runtime.env.wasm.numThreads = 4;
    return {
        backend: Object.freeze({
            createSession: (modelPath) =>
                runtime.InferenceSession.create(modelPath, {
                    executionProviders: ['wasm'],
                    graphOptimizationLevel: 'all'
                }),
            tensor: (type, data, dimensions) => new runtime.Tensor(type, data, dimensions)
        }),
        runtimeArtifact: artifactRecord('onnxruntime-web-entry', entry)
    };
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    const generator = await import(pathToFileURL(GENERATOR_ENTRY).href);
    const encoder = join(options.pilotRoot, 'packages/mockgen-models/retrieval-model/model_int8.onnx');
    const vocabulary = join(options.pilotRoot, 'packages/mockgen-models/retrieval-model/vocab.txt');
    const beforeRss = process.memoryUsage().rss;
    const loadStart = performance.now();
    const { backend, runtimeArtifact } = await createBackend(generator, options.backend);
    const embedder = await generator.createMiniLmTextEmbedder({
        modelPath: encoder,
        vocabularyPath: vocabulary,
        hiddenSize: 384,
        backend
    });
    const loadMs = performance.now() - loadStart;
    const latencies = [];
    try {
        for (let index = 0; index < options.runs; index += 1) {
            const start = performance.now();
            await embedder.embed(
                [`benchmark field ${index} of an Amount (related: currency, company, region)`],
                new AbortController().signal
            );
            latencies.push(performance.now() - start);
        }
    } finally {
        await embedder.dispose();
    }
    process.stdout.write(
        `${JSON.stringify(
            {
                schemaVersion: 1,
                backend: options.backend,
                runs: options.runs,
                artifacts: [
                    artifactRecord('classifier-encoder-int8', encoder),
                    artifactRecord('classifier-vocabulary', vocabulary),
                    ...(runtimeArtifact ? [runtimeArtifact] : [])
                ],
                loadMs,
                latencyMs: { p50: percentile(latencies, 0.5), p95: percentile(latencies, 0.95) },
                rssDeltaBytes: process.memoryUsage().rss - beforeRss,
                processMaxRssBytes: process.resourceUsage().maxRSS * 1024,
                node: process.version,
                platform: `${process.platform}-${process.arch}`
            },
            null,
            2
        )}\n`
    );
}

main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
});
