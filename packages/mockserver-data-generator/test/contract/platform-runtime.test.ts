import { execFile as execFileCallback } from 'node:child_process';
import { copyFile, cp, mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { loadCausalOnnxBackend, loadOnnxBackend } from '../../src/index.js';

interface RuntimePackageMetadata {
    name?: unknown;
    version?: unknown;
}

const require = createRequire(import.meta.url);
const execFile = promisify(execFileCallback);
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

async function stageCurrentRuntime(runtimeEntry: string, destination: string): Promise<string> {
    const runtimeRoot = dirname(dirname(runtimeEntry));
    const runtimeRequire = createRequire(runtimeEntry);
    const commonEntry = runtimeRequire.resolve('onnxruntime-common');
    const commonRoot = dirname(dirname(dirname(commonEntry)));
    const runtimeDestination = join(destination, 'node_modules', 'onnxruntime-node');
    const commonDestination = join(destination, 'node_modules', 'onnxruntime-common');
    await mkdir(runtimeDestination, { recursive: true });
    await Promise.all([
        cp(join(runtimeRoot, 'dist'), join(runtimeDestination, 'dist'), { recursive: true }),
        cp(
            join(runtimeRoot, 'bin', 'napi-v6', process.platform, process.arch),
            join(runtimeDestination, 'bin', 'napi-v6', process.platform, process.arch),
            { recursive: true }
        ),
        copyFile(join(runtimeRoot, 'package.json'), join(runtimeDestination, 'package.json')),
        cp(commonRoot, commonDestination, { recursive: true })
    ]);
    return join(runtimeDestination, 'dist', 'index.js');
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
            const runtimeEntry = require.resolve('onnxruntime-node');
            const stagedRuntimeRoot = join(temporaryDirectory, 'staged-runtime');
            const stagedRuntimeEntry = await stageCurrentRuntime(runtimeEntry, stagedRuntimeRoot);
            const { stdout } = await execFile(
                process.execPath,
                ['-e', NATIVE_INFERENCE_SCRIPT, stagedRuntimeEntry, modelPath],
                {
                    timeout: 30_000,
                    maxBuffer: 1024 * 1024
                }
            );

            expect(JSON.parse(stdout)).toEqual({ data: [1, 4, 9, 16, 25, 36], dims: [3, 2] });
            expect(await directoryBytes(stagedRuntimeRoot)).toBeLessThanOrEqual(64 * 1024 * 1024);

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
