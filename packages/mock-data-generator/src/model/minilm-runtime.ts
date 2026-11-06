import { readFile } from 'node:fs/promises';
import type { TextEmbedder } from './embedding-classifier.js';
import { meanPoolAndNormalize } from './minilm-pooling.js';
import { createMiniLmTokenizer } from './minilm-tokenizer.js';
import { createOnnxRuntimeBackend, type OnnxBackend } from './onnx-backend.js';
import { sha256File } from '../hash.js';

export type { OnnxBackend, OnnxTensorLike } from './onnx-backend.js';

interface MiniLmTextEmbedder extends TextEmbedder {
    dispose(): Promise<void>;
}

interface CreateMiniLmTextEmbedderOptions {
    modelPath: string;
    vocabularyPath: string;
    hiddenSize: number;
    backend: OnnxBackend;
    maxWordPieceTokens?: number;
    expectedEncoderSha256?: string;
    expectedVocabularySha256?: string;
}

/**
 * Adapt an already integrity-verified runtime module to the classifier backend: sequential, fully
 * optimized CPU sessions for the sentence encoder.
 *
 * @param module imported runtime module
 * @param label privacy-safe source label for diagnostics
 * @returns the classifier backend
 */
export function createOnnxBackend(module: unknown, label: string): OnnxBackend {
    return createOnnxRuntimeBackend(module, label, {
        requiredApi: 'ONNX runtime API',
        sessionOptions: () => ({
            executionProviders: ['cpu'],
            graphOptimizationLevel: 'all',
            executionMode: 'sequential'
        })
    });
}

/**
 * Create a MiniLM embedder using the model's WordPiece and pooling contracts.
 *
 * @param options
 */
export async function createMiniLmTextEmbedder(options: CreateMiniLmTextEmbedderOptions): Promise<MiniLmTextEmbedder> {
    if (!Number.isSafeInteger(options.hiddenSize) || options.hiddenSize <= 0) {
        throw new TypeError('MiniLM hidden size must be a positive integer');
    }
    for (const [path, expected] of [
        [options.modelPath, options.expectedEncoderSha256],
        [options.vocabularyPath, options.expectedVocabularySha256]
    ]) {
        if (path && expected) {
            if ((await sha256File(path)) !== expected) {
                throw new TypeError('MiniLM artifact fingerprint mismatch');
            }
        }
    }
    const tokenizer = createMiniLmTokenizer(await readFile(options.vocabularyPath, 'utf8'), options.maxWordPieceTokens);
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
