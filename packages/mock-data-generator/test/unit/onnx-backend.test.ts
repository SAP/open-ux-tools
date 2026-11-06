import { createCausalOnnxBackend } from '../../src/model/causal-onnx-session.js';
import { createOnnxBackend } from '../../src/model/minilm-runtime.js';

/**
 * A stand-in for the native module: `InferenceSession` is a class with a static `create`, as in
 * onnxruntime-node.
 *
 * @returns the module and the recorded session options
 */
function nativeModule(): { module: Record<string, unknown>; created: Array<{ path: string; options: unknown }> } {
    const created: Array<{ path: string; options: unknown }> = [];
    const release = jest.fn();
    class InferenceSession {
        static async create(
            path: string,
            options: unknown
        ): Promise<{ run: () => Promise<object>; release: () => void }> {
            created.push({ path, options });
            return { run: async () => ({}), release };
        }
    }
    class Tensor {
        constructor(
            readonly type: string,
            readonly data: BigInt64Array | Float32Array,
            readonly dims: ReadonlyArray<number>
        ) {}
    }
    return { module: { InferenceSession, Tensor }, created };
}

describe('shared ONNX backend', () => {
    it('opens classifier and causal sessions with their own native options', async () => {
        // Given a native module exposing a session class and a tensor class
        const { module, created } = nativeModule();
        // When each model kind opens a session
        await createOnnxBackend(module, 'native').createSession('encoder.onnx');
        await createCausalOnnxBackend(module, 'native').createSession('model.onnx');
        // Then the encoder runs sequentially and the decoder adds arenas and bounded threads
        expect(created).toEqual([
            {
                path: 'encoder.onnx',
                options: { executionProviders: ['cpu'], graphOptimizationLevel: 'all', executionMode: 'sequential' }
            },
            {
                path: 'model.onnx',
                options: expect.objectContaining({
                    executionProviders: ['cpu'],
                    enableCpuMemArena: true,
                    enableMemPattern: true,
                    interOpNumThreads: 1,
                    intraOpNumThreads: expect.any(Number)
                })
            }
        ]);
    });

    it('reads the API from the default export of a CommonJS interop module', async () => {
        // Given a module whose API sits on its default export
        const { module, created } = nativeModule();
        // When a backend is built from it and creates a tensor and a session
        const backend = createOnnxBackend({ default: module }, 'native');
        const tensor = backend.tensor('int64', new BigInt64Array([1n]), [1, 1]);
        const session = await backend.createSession('encoder.onnx');
        await session.dispose?.();
        // Then the native classes are used
        expect(tensor.dims).toEqual([1, 1]);
        expect(created).toHaveLength(1);
    });

    it('names the missing API with the label and model kind', () => {
        // Given modules without a session factory or tensor class
        const { module } = nativeModule();
        const withoutTensor = { InferenceSession: module.InferenceSession };
        // When backends are built from them
        // Then each model kind reports the missing API
        expect(() => createOnnxBackend({}, 'verified native runtime')).toThrow(
            'verified native runtime does not expose the required ONNX runtime API'
        );
        expect(() => createCausalOnnxBackend(withoutTensor, 'verified native runtime')).toThrow(
            'verified native runtime does not expose the required causal ONNX API'
        );
        expect(() => createOnnxBackend(undefined, 'native')).toThrow(TypeError);
        expect(() => createOnnxBackend({ InferenceSession: {}, Tensor: class {} }, 'native')).toThrow(TypeError);
    });
});
