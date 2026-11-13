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
    const fingerprintChecks = [
        { path: options.modelPath, expected: options.expectedEncoderSha256 },
        { path: options.vocabularyPath, expected: options.expectedVocabularySha256 }
    ].filter((check): check is { path: string; expected: string } => Boolean(check.path && check.expected));
    // The artifacts are hashed concurrently; the outcomes are judged in artifact order, so the reported failure
    // is the same as for one check after the other.
    const digests = await Promise.allSettled(fingerprintChecks.map(({ path }) => sha256File(path)));
    for (const [index, digest] of digests.entries()) {
        if (digest.status === 'rejected') {
            throw digest.reason;
        }
        if (digest.value !== fingerprintChecks[index].expected) {
            throw new TypeError('MiniLM artifact fingerprint mismatch');
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
                    const feeds = {
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
                    };
                    // One ONNX session embeds one text at a time.
                    const output = await session.run(feeds); // NOSONAR: sequential, one ONNX session
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
