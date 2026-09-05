import { createRequire } from 'node:module';
import { loadCausalOnnxBackend, loadOnnxBackend } from '../../src/index.js';

interface RuntimePackageMetadata {
    name?: unknown;
    version?: unknown;
}

const require = createRequire(import.meta.url);

describe('native ONNX runtime platform contract', () => {
    test('loads the pinned native addon and exposes both MockGen tensor adapters', async () => {
        const runtimePackage = require('onnxruntime-node/package.json') as RuntimePackageMetadata;

        expect(runtimePackage).toMatchObject({
            name: 'onnxruntime-node',
            version: '1.24.3'
        });

        const classifierBackend = await loadOnnxBackend('onnxruntime-node');
        const classifierTensor = classifierBackend.tensor('int64', BigInt64Array.of(7n, 11n), [1, 2]);

        expect(classifierTensor.data).toEqual(BigInt64Array.of(7n, 11n));
        expect(classifierTensor.dims).toEqual([1, 2]);

        const sftBackend = await loadCausalOnnxBackend('onnxruntime-node');
        const sftTensor = sftBackend.tensor('float32', Float32Array.of(0.25, 0.75), [1, 2]);

        expect(sftTensor.data).toEqual(Float32Array.of(0.25, 0.75));
        expect(sftTensor.dims).toEqual([1, 2]);
    });
});
