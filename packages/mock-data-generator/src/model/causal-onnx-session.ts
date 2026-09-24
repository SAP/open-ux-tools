import { availableParallelism } from 'node:os';
import type { CausalLmInputs, CausalLmSession } from './causal-text-runtime.js';

// A 135M-parameter decoder stops gaining from threads well before 4 on this runtime, and more
// threads than cores (a 2-core workspace) only add contention.
const MAXIMUM_INTRA_OP_THREADS = 4;

/**
 * Native threads for the causal model: at most 4, and never more than the cores available.
 *
 * @param cores cores available to this process
 * @returns intra-op thread count
 */
export function causalIntraOpThreads(cores: number = availableParallelism()): number {
    return Math.max(1, Math.min(MAXIMUM_INTRA_OP_THREADS, Math.floor(cores)));
}

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

interface CausalOnnxRuntimeModule {
    InferenceSession?: { create(modelPath: string, options?: object): Promise<NativeCausalOnnxSession> };
    Tensor?: new (
        type: 'int64' | 'float32',
        data: BigInt64Array | Float32Array,
        dimensions: ReadonlyArray<number>
    ) => CausalOnnxTensor;
    default?: CausalOnnxRuntimeModule;
}

/**
 * Adapt an already integrity-verified runtime module to the causal backend.
 *
 * @param module imported runtime module
 * @param label privacy-safe source label for diagnostics
 */
export function createCausalOnnxBackend(module: unknown, label: string): CausalOnnxBackend {
    const imported = module as CausalOnnxRuntimeModule;
    const runtime = imported.InferenceSession || imported.Tensor ? imported : imported.default;
    const InferenceSession = runtime?.InferenceSession;
    const Tensor = runtime?.Tensor;
    if (!InferenceSession?.create || !Tensor) {
        throw new TypeError(`${label} does not expose the required causal ONNX API`);
    }
    return Object.freeze({
        createSession: async (modelPath: string) => {
            const session = await InferenceSession.create(modelPath, {
                executionProviders: ['cpu'],
                graphOptimizationLevel: 'all',
                executionMode: 'sequential',
                enableCpuMemArena: true,
                enableMemPattern: true,
                intraOpNumThreads: causalIntraOpThreads(),
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

export async function loadCausalOnnxBackend(
    packageName: 'onnxruntime-node' | 'onnxruntime-web' = 'onnxruntime-node'
): Promise<CausalOnnxBackend> {
    return createCausalOnnxBackend(await import(packageName), packageName);
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
            const batchSize = input.batchSize ?? 1;
            const sequenceLength = input.inputIds.length / batchSize;
            const attentionLength = input.attentionMask.length / batchSize;
            if (
                !Number.isSafeInteger(batchSize) ||
                batchSize <= 0 ||
                !Number.isSafeInteger(sequenceLength) ||
                sequenceLength <= 0 ||
                !Number.isSafeInteger(attentionLength) ||
                input.positionIds.length !== input.inputIds.length
            ) {
                throw new TypeError('causal ONNX inputs do not match their batch size');
            }
            const feeds: Record<string, CausalOnnxTensor> = {
                'input_ids': options.backend.tensor('int64', BigInt64Array.from(input.inputIds, BigInt), [
                    batchSize,
                    sequenceLength
                ]),
                'attention_mask': options.backend.tensor('int64', BigInt64Array.from(input.attentionMask, BigInt), [
                    batchSize,
                    attentionLength
                ]),
                'position_ids': options.backend.tensor('int64', BigInt64Array.from(input.positionIds, BigInt), [
                    batchSize,
                    sequenceLength
                ])
            };
            for (let layer = 0; layer < options.config.numLayers; layer += 1) {
                const previous = input.pastKeyValues.get(layer);
                const divisor = batchSize * options.config.numKeyValueHeads * options.config.headDimension;
                const pastLength = previous ? previous.key.length / divisor : 0;
                if (!Number.isSafeInteger(pastLength)) {
                    throw new TypeError('causal ONNX KV cache has an invalid shape');
                }
                const dimensions = [
                    batchSize,
                    options.config.numKeyValueHeads,
                    pastLength,
                    options.config.headDimension
                ];
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
            const outputBatchSize = logits.dims[0];
            const outputSequenceLength = logits.dims[1];
            const vocabularySize = logits.dims[2];
            if (
                outputBatchSize !== batchSize ||
                !outputSequenceLength ||
                !vocabularySize ||
                logits.data.length !== batchSize * outputSequenceLength * vocabularySize
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
            // A graph that emits only the last position (sequence length 1) needs no selection.
            const lastLogits = new Float32Array(batchSize * vocabularySize);
            for (let row = 0; row < batchSize; row += 1) {
                const start = (row * outputSequenceLength + outputSequenceLength - 1) * vocabularySize;
                lastLogits.set(logits.data.subarray(start, start + vocabularySize), row * vocabularySize);
            }
            return Object.freeze({ lastLogits, presentKeyValues });
        },
        dispose: async () => {
            await session.dispose?.();
        }
    });
}
