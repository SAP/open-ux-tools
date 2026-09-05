import { readFile } from 'node:fs/promises';
import type { TextEmbedder } from './embedding-classifier.js';
import { meanPoolAndNormalize } from './minilm-pooling.js';
import { createMiniLmTokenizer } from './minilm-tokenizer.js';

export interface OnnxTensorLike {
    data: BigInt64Array | Float32Array;
    dims: ReadonlyArray<number>;
}

export interface OnnxSessionLike {
    run(feeds: Readonly<Record<string, OnnxTensorLike>>): Promise<Readonly<Record<string, OnnxTensorLike>>>;
    dispose?(): Promise<void> | void;
}

export interface OnnxBackend {
    createSession(modelPath: string): Promise<OnnxSessionLike>;
    tensor(type: 'int64', data: BigInt64Array, dimensions: ReadonlyArray<number>): OnnxTensorLike;
}

export interface MiniLmTextEmbedder extends TextEmbedder {
    dispose(): Promise<void>;
}

export interface CreateMiniLmTextEmbedderOptions {
    modelPath: string;
    vocabularyPath: string;
    hiddenSize: number;
    backend: OnnxBackend;
}

/**
 * Load onnxruntime lazily so the generator package stays usable without a native runtime.
 *
 * @param packageName
 */
export async function loadOnnxBackend(
    packageName: 'onnxruntime-node' | 'onnxruntime-web' = 'onnxruntime-node'
): Promise<OnnxBackend> {
    const runtime = (await import(packageName)) as {
        InferenceSession?: { create(modelPath: string, options?: object): Promise<OnnxSessionLike> };
        Tensor?: new (type: 'int64', data: BigInt64Array, dimensions: ReadonlyArray<number>) => OnnxTensorLike;
    };
    const InferenceSession = runtime.InferenceSession;
    const Tensor = runtime.Tensor;
    if (!InferenceSession?.create || !Tensor) {
        throw new TypeError(`${packageName} does not expose the required ONNX runtime API`);
    }
    return Object.freeze({
        createSession: (modelPath: string) =>
            InferenceSession.create(modelPath, {
                executionProviders: ['cpu'],
                graphOptimizationLevel: 'all',
                executionMode: 'sequential'
            }),
        tensor: (type: 'int64', data: BigInt64Array, dimensions: ReadonlyArray<number>) =>
            new Tensor(type, data, dimensions)
    });
}

/**
 * Create a MiniLM embedder using the exact WordPiece and pooling contracts from the pilot.
 *
 * @param options
 */
export async function createMiniLmTextEmbedder(options: CreateMiniLmTextEmbedderOptions): Promise<MiniLmTextEmbedder> {
    if (!Number.isSafeInteger(options.hiddenSize) || options.hiddenSize <= 0) {
        throw new TypeError('MiniLM hidden size must be a positive integer');
    }
    const tokenizer = createMiniLmTokenizer(await readFile(options.vocabularyPath, 'utf8'));
    const session = await options.backend.createSession(options.modelPath);
    let operationQueue = Promise.resolve();
    let disposePromise: Promise<void> | undefined;
    return Object.freeze({
        embed: async (texts: ReadonlyArray<string>, signal: AbortSignal) => {
            if (disposePromise) {
                throw new Error('MiniLM runtime has been disposed');
            }
            const operation = operationQueue.then(async () => {
                const embeddings: ReadonlyArray<number>[] = [];
                for (const text of texts) {
                    signal.throwIfAborted();
                    const encoded = tokenizer.encodeForModel(text);
                    const sequenceLength = encoded.inputIds.length;
                    const dimensions = [1, sequenceLength];
                    const output = await session.run({
                        'input_ids': options.backend.tensor(
                            'int64',
                            BigInt64Array.from(encoded.inputIds, BigInt),
                            dimensions
                        ),
                        'attention_mask': options.backend.tensor(
                            'int64',
                            BigInt64Array.from(encoded.attentionMask, BigInt),
                            dimensions
                        ),
                        'token_type_ids': options.backend.tensor(
                            'int64',
                            BigInt64Array.from(encoded.tokenTypeIds, BigInt),
                            dimensions
                        )
                    });
                    signal.throwIfAborted();
                    const hidden = output.last_hidden_state;
                    if (!hidden || !(hidden.data instanceof Float32Array)) {
                        throw new TypeError('MiniLM runtime did not return last_hidden_state float data');
                    }
                    embeddings.push(meanPoolAndNormalize(hidden.data, encoded.attentionMask, options.hiddenSize));
                }
                return Object.freeze(embeddings);
            });
            operationQueue = operation.then(
                () => undefined,
                () => undefined
            );
            return operation;
        },
        dispose: async () => {
            disposePromise ??= operationQueue.then(async () => {
                await session.dispose?.();
            });
            await disposePromise;
        }
    });
}
