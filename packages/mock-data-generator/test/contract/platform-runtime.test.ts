import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createOnnxBackend } from '../../src/model/minilm-runtime.js';
import { createCausalOnnxBackend } from '../../src/model/causal-onnx-session.js';

const require = createRequire(import.meta.url);
const execFile = promisify(execFileCallback);
const MUL_MODEL_BASE64 =
    'CAMSBmNoZW50YTpwChUKAVgKAVcSAVkaBW11bF8xIgNNdWwSCG11bCB0ZXN0KiMIAwgCEAEiGAAAgD8AAABAAABAQAAAgEAAAKBAAADAQEIBV1oTCgFYEg4KDAgBEggKAggDCgIIAmITCgFZEg4KDAgBEggKAggDCgIIAkIECgAQBw==';

describe('native ONNX runtime contract', () => {
    test('runs the pinned native runtime and releases sessions through both adapters', async () => {
        expect(require('onnxruntime-node/package.json')).toMatchObject({
            name: 'onnxruntime-node',
            version: '1.24.3'
        });
        const runtime = await import('onnxruntime-node');
        const classifier = createOnnxBackend(runtime, 'onnxruntime-node');
        const sft = createCausalOnnxBackend(runtime, 'onnxruntime-node');
        const integers = classifier.tensor('int64', BigInt64Array.of(7n, 11n), [1, 2]);
        expect(integers.data).toEqual(BigInt64Array.of(7n, 11n));
        expect(integers.dims).toEqual([1, 2]);
        const input = sft.tensor('float32', Float32Array.of(1, 2, 3, 4, 5, 6), [3, 2]);
        const temporary = await mkdtemp(join(tmpdir(), 'mockgen-onnx-'));
        const modelPath = join(temporary, 'mul.onnx');
        try {
            await writeFile(modelPath, Buffer.from(MUL_MODEL_BASE64, 'base64'));
            // Native outputs must stay outside Jest's VM typed-array realm.
            const { stdout } = await execFile(
                process.execPath,
                [
                    '-e',
                    `
                const runtime = require('onnxruntime-node');
                (async () => {
                    const session = await runtime.InferenceSession.create(process.argv[1]);
                    try {
                        const input = new runtime.Tensor('float32', Float32Array.of(1, 2, 3, 4, 5, 6), [3, 2]);
                        const output = await session.run({ X: input });
                        process.stdout.write(JSON.stringify({ data: Array.from(output.Y.data), dims: output.Y.dims }));
                    } finally {
                        await session.release();
                    }
                })().catch(error => { console.error(error); process.exitCode = 1; });
            `,
                    modelPath
                ],
                { timeout: 30_000 }
            );
            expect(JSON.parse(stdout)).toEqual({ data: [1, 4, 9, 16, 25, 36], dims: [3, 2] });
            for (const backend of [classifier, sft]) {
                const session = await backend.createSession(modelPath);
                try {
                    await expect(session.run({})).rejects.toThrow();
                } finally {
                    await session.dispose?.();
                }
                await expect(session.run({ X: input })).rejects.toThrow('Session already disposed');
            }
        } finally {
            await rm(temporary, { recursive: true, force: true });
        }
    });
});
