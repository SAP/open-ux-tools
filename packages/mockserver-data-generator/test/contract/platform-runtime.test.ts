import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { loadCausalOnnxBackend, loadOnnxBackend, parseModelManifest } from '../../src/index.js';

interface RuntimePackageMetadata {
    name?: unknown;
    version?: unknown;
}

const require = createRequire(import.meta.url);
const execFile = promisify(execFileCallback);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const runtimeBuilderPath = join(packageRoot, 'scripts', 'build-platform-runtime.mjs');
const MUL_MODEL_BASE64 =
    'CAMSBmNoZW50YTpwChUKAVgKAVcSAVkaBW11bF8xIgNNdWwSCG11bCB0ZXN0KiMIAwgCEAEiGAAAgD8AAABAAABAQAAAgEAAAKBAAADAQEIBV1oTCgFYEg4KDAgBEggKAggDCgIIAmITCgFZEg4KDAgBEggKAggDCgIIAkIECgAQBw==';
const NATIVE_INFERENCE_SCRIPT = `
const { pathToFileURL } = require('node:url');
const modelPath = process.argv[2];
(async () => {
    const imported = await import(pathToFileURL(process.argv[1]).href);
    const runtime = imported.InferenceSession || imported.Tensor ? imported : imported.default;
    const session = await runtime.InferenceSession.create(modelPath);
    try {
        const input = new runtime.Tensor('float32', Float32Array.of(1, 2, 3, 4, 5, 6), [3, 2]);
        const output = await session.run({ X: input });
        process.stdout.write(JSON.stringify({ data: Array.from(output.Y.data), dims: output.Y.dims }));
    } finally {
        await session.release();
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});`;

async function directoryBytes(directory: string): Promise<number> {
    let total = 0;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const entryPath = join(directory, entry.name);
        total += entry.isDirectory() ? await directoryBytes(entryPath) : (await stat(entryPath)).size;
    }
    return total;
}

interface RuntimeArtifactReport {
    bytes: number;
    files: number;
    outputDirectory: string;
    artifact: {
        platform: string;
        architecture: string;
        entry: string;
        fingerprint: string;
        files: ReadonlyArray<{ path: string; bytes: number; sha256: string; url: string }>;
    };
}

interface RuntimeArtifactBuilder {
    buildPlatformRuntimeArtifact(options: {
        outputDirectory: string;
        artifactBaseUrl: string;
        sbomUrl: string;
    }): Promise<RuntimeArtifactReport>;
}

describe('native ONNX runtime platform contract', () => {
    test('executes the pinned native addon and releases sessions through both MockGen adapters', async () => {
        const runtimePackage = require('onnxruntime-node/package.json') as RuntimePackageMetadata;

        expect(runtimePackage).toMatchObject({
            name: 'onnxruntime-node',
            version: '1.24.3'
        });

        const temporaryDirectory = await mkdtemp(join(tmpdir(), 'mockgen-onnx-platform-'));
        const modelPath = join(temporaryDirectory, 'mul.onnx');
        await writeFile(modelPath, Buffer.from(MUL_MODEL_BASE64, 'base64'));

        try {
            const builder = (await import(pathToFileURL(runtimeBuilderPath).href)) as RuntimeArtifactBuilder;
            const stagedRuntimeRoot = join(temporaryDirectory, 'staged-runtime');
            const report = await builder.buildPlatformRuntimeArtifact({
                outputDirectory: stagedRuntimeRoot,
                artifactBaseUrl: `https://models.example.test/${'a'.repeat(64)}/`,
                sbomUrl: `https://models.example.test/${'a'.repeat(64)}/runtime.spdx.json`
            });
            const repeatedReport = await builder.buildPlatformRuntimeArtifact({
                outputDirectory: join(temporaryDirectory, 'repeated-runtime'),
                artifactBaseUrl: `https://models.example.test/${'a'.repeat(64)}/`,
                sbomUrl: `https://models.example.test/${'a'.repeat(64)}/runtime.spdx.json`
            });
            const stagedRuntimeEntry = join(report.outputDirectory, 'files', report.artifact.entry);
            const { stdout } = await execFile(
                process.execPath,
                ['-e', NATIVE_INFERENCE_SCRIPT, stagedRuntimeEntry, modelPath],
                {
                    timeout: 30_000,
                    maxBuffer: 1024 * 1024
                }
            );

            expect(JSON.parse(stdout)).toEqual({ data: [1, 4, 9, 16, 25, 36], dims: [3, 2] });
            expect(report).toMatchObject({
                bytes: expect.any(Number),
                outputDirectory: stagedRuntimeRoot,
                artifact: {
                    platform: process.platform,
                    architecture: process.arch,
                    entry: expect.stringMatching(/onnxruntime-node\/dist\/index\.js$/u),
                    fingerprint: expect.stringMatching(/^[a-f\d]{64}$/u)
                }
            });
            expect(report.artifact.files).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        path: report.artifact.entry,
                        url: expect.stringMatching(/^https:\/\/models\.example\.test\//u)
                    })
                ])
            );
            expect(repeatedReport).toMatchObject({
                bytes: report.bytes,
                files: report.artifact.files.length,
                artifact: report.artifact
            });
            expect(await directoryBytes(join(stagedRuntimeRoot, 'files'))).toBe(report.bytes);
            expect(report.bytes).toBeLessThanOrEqual(64 * 1024 * 1024);
            expect(() =>
                parseModelManifest({
                    formatVersion: 2,
                    bundleId: 'platform-runtime-contract',
                    revision: 'a'.repeat(64),
                    lifecycle: 'development',
                    components: [
                        {
                            id: 'classifier',
                            kind: 'classifier',
                            version: '1.0.0',
                            fingerprint: 'b'.repeat(64),
                            files: [
                                {
                                    role: 'encoder',
                                    path: 'classifier/model.onnx',
                                    bytes: 1,
                                    sha256: 'c'.repeat(64),
                                    url: `https://models.example.test/${'a'.repeat(64)}/classifier/model.onnx`
                                }
                            ],
                            runtime: {
                                backend: 'onnx',
                                package: 'onnxruntime-node',
                                version: runtimePackage.version,
                                inputs: ['input_ids'],
                                outputs: ['last_hidden_state'],
                                outputFormat: 'embedding-classifier-v2'
                            },
                            license: {
                                name: 'Apache-2.0',
                                url: 'https://models.example.test/license'
                            },
                            modelCardUrl: 'https://models.example.test/model-card'
                        }
                    ],
                    runtimes: [report.artifact]
                })
            ).not.toThrow();
            await expect(
                builder.buildPlatformRuntimeArtifact({
                    outputDirectory: stagedRuntimeRoot,
                    artifactBaseUrl: `https://models.example.test/${'a'.repeat(64)}/`,
                    sbomUrl: `https://models.example.test/${'a'.repeat(64)}/runtime.spdx.json`
                })
            ).rejects.toThrow(/must not already exist/u);
            await expect(
                builder.buildPlatformRuntimeArtifact({
                    outputDirectory: join(temporaryDirectory, 'mutable-runtime'),
                    artifactBaseUrl: 'https://models.example.test/latest/',
                    sbomUrl: `https://models.example.test/${'a'.repeat(64)}/runtime.spdx.json`
                })
            ).rejects.toThrow(/immutable commit or content-hash/u);
            await expect(
                builder.buildPlatformRuntimeArtifact({
                    outputDirectory: 'relative-runtime',
                    artifactBaseUrl: `https://models.example.test/${'a'.repeat(64)}/`,
                    sbomUrl: `https://models.example.test/${'a'.repeat(64)}/runtime.spdx.json`
                })
            ).rejects.toThrow(/absolute path/u);

            const classifierBackend = await loadOnnxBackend('onnxruntime-node');
            const classifierTensor = classifierBackend.tensor('int64', BigInt64Array.of(7n, 11n), [1, 2]);

            expect(classifierTensor.data).toEqual(BigInt64Array.of(7n, 11n));
            expect(classifierTensor.dims).toEqual([1, 2]);

            const sftBackend = await loadCausalOnnxBackend('onnxruntime-node');
            const sftTensor = sftBackend.tensor('float32', Float32Array.of(1, 2, 3, 4, 5, 6), [3, 2]);

            expect(sftTensor.data).toEqual(Float32Array.of(1, 2, 3, 4, 5, 6));
            expect(sftTensor.dims).toEqual([3, 2]);

            for (const backend of [classifierBackend, sftBackend]) {
                const session = await backend.createSession(modelPath);
                try {
                    expect(session.dispose).toEqual(expect.any(Function));
                    await expect(session.run({})).rejects.toThrow();
                } finally {
                    await session.dispose?.();
                }
                await expect(session.run({ X: sftTensor })).rejects.toThrow('Session already disposed');
            }
        } finally {
            await rm(temporaryDirectory, { recursive: true, force: true });
        }
    });
});
