import type { CausalLmInputs, CausalLmSession } from './causal-text-runtime.js';

export interface CausalOnnxTensor {
    data: BigInt64Array | Float32Array;
    dims: ReadonlyArray<number>;
}

export interface CausalOnnxSession {
    run(feeds: Readonly<Record<string, CausalOnnxTensor>>): Promise<Readonly<Record<string, CausalOnnxTensor>>>;
    dispose?(): Promise<void> | void;
}

interface NativeCausalOnnxSession {
    run(feeds: Readonly<Record<string, CausalOnnxTensor>>): Promise<Readonly<Record<string, CausalOnnxTensor>>>;
    release(): Promise<void> | void;
}

export interface CausalOnnxBackend {
    createSession(modelPath: string): Promise<CausalOnnxSession>;
    tensor(
        type: 'int64' | 'float32',
        data: BigInt64Array | Float32Array,
        dimensions: ReadonlyArray<number>
    ): CausalOnnxTensor;
}

export interface CausalOnnxConfig {
    numLayers: number;
    numKeyValueHeads: number;
    headDimension: number;
}

export interface CreateCausalOnnxSessionOptions {
    modelPath: string;
    config: CausalOnnxConfig;
    backend: CausalOnnxBackend;
}

export async function loadCausalOnnxBackend(
    packageName: 'onnxruntime-node' | 'onnxruntime-web' = 'onnxruntime-node'
): Promise<CausalOnnxBackend> {
    const runtime = (await import(packageName)) as {
        InferenceSession?: { create(modelPath: string, options?: object): Promise<NativeCausalOnnxSession> };
        Tensor?: new (
            type: 'int64' | 'float32',
            data: BigInt64Array | Float32Array,
            dimensions: ReadonlyArray<number>
        ) => CausalOnnxTensor;
    };
    const InferenceSession = runtime.InferenceSession;
    const Tensor = runtime.Tensor;
    if (!InferenceSession?.create || !Tensor) {
        throw new TypeError(`${packageName} does not expose the required causal ONNX API`);
    }
    return Object.freeze({
        createSession: async (modelPath: string) => {
            const session = await InferenceSession.create(modelPath, {
                executionProviders: ['cpu'],
                graphOptimizationLevel: 'all',
                executionMode: 'sequential',
                enableCpuMemArena: true,
                enableMemPattern: true,
                intraOpNumThreads: 4,
                interOpNumThreads: 1
            });
            return Object.freeze({
                run: (feeds: Readonly<Record<string, CausalOnnxTensor>>) => session.run(feeds),
                dispose: () => session.release()
            });
        },
        tensor: (type: 'int64' | 'float32', data: BigInt64Array | Float32Array, dimensions: ReadonlyArray<number>) =>
            new Tensor(type, data, dimensions)
    });
}

function validateConfig(config: CausalOnnxConfig): void {
    if (
        !Number.isSafeInteger(config.numLayers) ||
        config.numLayers <= 0 ||
        !Number.isSafeInteger(config.numKeyValueHeads) ||
        config.numKeyValueHeads <= 0 ||
        !Number.isSafeInteger(config.headDimension) ||
        config.headDimension <= 0
    ) {
        throw new TypeError('causal ONNX dimensions must be positive integers');
    }
}

/**
 * Adapt an optimum merged prefill/decode graph to the causal runtime contract.
 *
 * @param options
 */
export async function createCausalOnnxSession(options: CreateCausalOnnxSessionOptions): Promise<CausalLmSession> {
    validateConfig(options.config);
    const session = await options.backend.createSession(options.modelPath);
    return Object.freeze({
        run: async (input: CausalLmInputs) => {
            const sequenceLength = input.inputIds.length;
            const feeds: Record<string, CausalOnnxTensor> = {
                'input_ids': options.backend.tensor('int64', BigInt64Array.from(input.inputIds, BigInt), [
                    1,
                    sequenceLength
                ]),
                'attention_mask': options.backend.tensor('int64', BigInt64Array.from(input.attentionMask, BigInt), [
                    1,
                    input.attentionMask.length
                ]),
                'position_ids': options.backend.tensor('int64', BigInt64Array.from(input.positionIds, BigInt), [
                    1,
                    sequenceLength
                ])
            };
            for (let layer = 0; layer < options.config.numLayers; layer += 1) {
                const previous = input.pastKeyValues.get(layer);
                const divisor = options.config.numKeyValueHeads * options.config.headDimension;
                const pastLength = previous ? previous.key.length / divisor : 0;
                if (!Number.isSafeInteger(pastLength)) {
                    throw new TypeError('causal ONNX KV cache has an invalid shape');
                }
                const dimensions = [1, options.config.numKeyValueHeads, pastLength, options.config.headDimension];
                feeds[`past_key_values.${layer}.key`] = options.backend.tensor(
                    'float32',
                    previous?.key ?? new Float32Array(),
                    dimensions
                );
                feeds[`past_key_values.${layer}.value`] = options.backend.tensor(
                    'float32',
                    previous?.value ?? new Float32Array(),
                    dimensions
                );
            }

            const output = await session.run(feeds);
            const logits = output.logits;
            if (!logits || !(logits.data instanceof Float32Array) || logits.dims.length !== 3) {
                throw new TypeError('causal ONNX session did not return three-dimensional float logits');
            }
            const outputSequenceLength = logits.dims[1];
            const vocabularySize = logits.dims[2];
            if (
                !outputSequenceLength ||
                !vocabularySize ||
                logits.data.length !== outputSequenceLength * vocabularySize
            ) {
                throw new TypeError('causal ONNX logits have an invalid shape');
            }
            const presentKeyValues = new Map();
            for (let layer = 0; layer < options.config.numLayers; layer += 1) {
                const key = output[`present.${layer}.key`];
                const value = output[`present.${layer}.value`];
                if (!key || !value || !(key.data instanceof Float32Array) || !(value.data instanceof Float32Array)) {
                    throw new TypeError(`causal ONNX session is missing present.${layer}.key/value output`);
                }
                presentKeyValues.set(layer, { key: key.data, value: value.data });
            }
            return Object.freeze({
                lastLogits: logits.data.slice(
                    (outputSequenceLength - 1) * vocabularySize,
                    outputSequenceLength * vocabularySize
                ),
                presentKeyValues
            });
        },
        dispose: async () => {
            await session.dispose?.();
        }
    });
}
