import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import * as ort from 'onnxruntime-web';
import { getDataDir } from './utils';

ort.env.debug = false;
ort.env.logLevel = 'error';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const MODEL_DIR = path.join(getDataDir(), 'models', MODEL_NAME.replace('/', '_'));

const FILES = ['onnx/model.onnx', 'tokenizer.json', 'tokenizer_config.json'];
let session: ort.InferenceSession | null = null;
let vocab: Map<string, number> | null = null;
let modelInitPromise: Promise<void> | null = null;

async function saveFile(buffer: ArrayBuffer | string, outputPath: string): Promise<void> {
    if (typeof buffer === 'string') {
        await fs.writeFile(outputPath, buffer);
    } else {
        await fs.writeFile(outputPath, new Uint8Array(buffer));
    }
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to download ${url}, status ${res.status}`);
    }

    if (url.endsWith('.onnx')) {
        const arrayBuffer = await res.arrayBuffer();
        await saveFile(arrayBuffer, outputPath);
    } else if (url.endsWith('.json')) {
        const json = await res.json();
        await saveFile(JSON.stringify(json, null, 2), outputPath);
    } else {
        const text = await res.text();
        await saveFile(text, outputPath);
    }
}

async function downloadModelIfNeeded(): Promise<void> {
    try {
        await fs.access(MODEL_DIR);
    } catch {
        await fs.mkdir(MODEL_DIR, { recursive: true });
    }

    for (const file of FILES) {
        const filePath = path.join(MODEL_DIR, path.basename(file));
        if (!(await fileExists(filePath))) {
            const url = `https://huggingface.co/${MODEL_NAME}/resolve/main/${file}`;
            await downloadFile(url, filePath);
        }
    }
}

async function forceRedownloadModel(): Promise<void> {
    // Reset session and vocab to force reinitialization
    session = null;
    vocab = null;

    // Delete all model files to force re-download
    for (const file of FILES) {
        const filePath = path.join(MODEL_DIR, path.basename(file));
        if (await fileExists(filePath)) {
            await fs.unlink(filePath).catch(() => {});
        }
    }

    // Force re-download
    await downloadModelIfNeeded();
}

interface TokenizerJSON {
    model: {
        vocab: Record<string, number>;
    };
}

async function initializeModelAndVocab(): Promise<void> {
    const modelPath = path.join(MODEL_DIR, 'model.onnx');
    const vocabPath = path.join(MODEL_DIR, 'tokenizer.json');

    const loadModelAndVocab = async () => {
        // Load model as buffer for onnxruntime-web
        const modelBuffer = await fs.readFile(modelPath);

        session = await ort.InferenceSession.create(new Uint8Array(modelBuffer));

        // Try to parse tokenizer JSON
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const tokenizerJson: TokenizerJSON = JSON.parse(await fs.readFile(vocabPath, 'utf-8'));

        // Validate tokenizer structure
        if (!tokenizerJson?.model?.vocab) {
            throw new Error('Invalid tokenizer structure: missing model.vocab');
        }

        // Convert to clean Map to avoid prototype pollution
        const cleanVocab = new Map<string, number>();
        for (const [token, id] of Object.entries(tokenizerJson.model.vocab)) {
            if (typeof id === 'number') {
                cleanVocab.set(token, id);
            }
        }
        vocab = cleanVocab;
    };

    try {
        await loadModelAndVocab();
    } catch (error) {
        // Model or tokenizer is corrupted, force re-download
        await forceRedownloadModel();

        // Retry initialization after re-download
        try {
            await loadModelAndVocab();
        } catch (retryError) {
            throw new Error(
                `Failed to restore valid tokenizer after re-download: ${retryError instanceof Error ? retryError.message : String(retryError)}`
            );
        }
    }
}

/**
 * Basic text normalization similar to BERT
 *
 * @param text
 */
function normalizeText(text: string): string {
    // Convert to NFD normalization (decomposed)
    text = text.normalize('NFD');

    // Remove control characters except whitespace
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ''); // eslint-disable-line no-control-regex

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}

/**
 * BERT-style punctuation detection
 *
 * @param char
 */
function isPunctuation(char: string): boolean {
    const cp = char.codePointAt(0);
    if (!cp) {
        return false;
    }

    // ASCII punctuation
    if ((cp >= 33 && cp <= 47) || (cp >= 58 && cp <= 64) || (cp >= 91 && cp <= 96) || (cp >= 123 && cp <= 126)) {
        return true;
    }

    // Unicode punctuation categories
    const unicodeCat = getUnicodeCategory(char);
    return unicodeCat ? /^P[cdfipeos]$/.test(unicodeCat) : false;
}

/**
 * Simple Unicode category detection (basic implementation)
 *
 * @param char
 */
function getUnicodeCategory(char: string): string | null {
    // This is a simplified version - real BERT uses full Unicode database
    // For most common cases, we can use JavaScript's built-in properties
    if (/\p{P}/u.test(char)) {
        return 'P';
    } // Punctuation
    if (/\p{N}/u.test(char)) {
        return 'N';
    } // Number
    if (/\p{L}/u.test(char)) {
        return 'L';
    } // Letter
    if (/\p{M}/u.test(char)) {
        return 'M';
    } // Mark
    if (/\p{S}/u.test(char)) {
        return 'S';
    } // Symbol
    if (/\p{Z}/u.test(char)) {
        return 'Z';
    } // Separator
    return null;
}

/**
 * BERT-style pre-tokenization: split on whitespace and punctuation
 *
 * @param text
 */
function preTokenize(text: string): string[] {
    const tokens: string[] = [];
    let currentToken = '';

    for (const char of text) {
        if (/\s/.test(char)) {
            // Whitespace - finish current token
            if (currentToken) {
                tokens.push(currentToken);
                currentToken = '';
            }
        } else if (isPunctuation(char)) {
            // Punctuation - finish current token and add punctuation as separate token
            if (currentToken) {
                tokens.push(currentToken);
                currentToken = '';
            }
            tokens.push(char);
        } else {
            // Regular character - add to current token
            currentToken += char;
        }
    }

    // Add final token if any
    if (currentToken) {
        tokens.push(currentToken);
    }

    return tokens.filter((token) => token.length > 0);
}

/**
 * True WordPiece tokenization with greedy longest-match algorithm
 *
 * @param token
 * @param vocab
 * @param unkToken
 * @param maxInputCharsPerWord
 */
function wordPieceTokenize(
    token: string,
    vocab: Map<string, number>,
    unkToken = '[UNK]',
    maxInputCharsPerWord = 200
): string[] {
    if (token.length > maxInputCharsPerWord) {
        return [unkToken];
    }

    const outputTokens: string[] = [];
    let start = 0;

    while (start < token.length) {
        let end = token.length;
        let currentSubstring: string | null = null;

        // Greedy longest-match: try longest possible substring first
        while (start < end) {
            let substring = token.substring(start, end);

            // Add ## prefix for continuation tokens (not at word start)
            if (start > 0) {
                substring = '##' + substring;
            }

            if (vocab.has(substring)) {
                currentSubstring = substring;
                break;
            }
            end -= 1;
        }

        if (currentSubstring === null) {
            // No valid substring found, mark as unknown
            return [unkToken];
        }

        outputTokens.push(currentSubstring);
        start = end;
    }

    return outputTokens;
}

interface TokenizationResult {
    tokens: string[];
    ids: number[];
}

/**
 * Main tokenization function that combines all steps
 *
 * @param text
 * @param vocab
 * @param maxLength
 */
function wordPieceTokenizer(text: string, vocab: Map<string, number>, maxLength = 512): TokenizationResult[] {
    const unkToken = '[UNK]';
    const clsToken = '[CLS]';
    const sepToken = '[SEP]';

    // Get special token IDs using Map interface
    const clsId = vocab.get(clsToken) ?? 101;
    const sepId = vocab.get(sepToken) ?? 102;
    const unkId = vocab.get(unkToken) ?? 100;

    // Validate special token IDs
    if (typeof clsId !== 'number' || typeof sepId !== 'number' || typeof unkId !== 'number') {
        throw new Error('Special tokens must have numeric IDs');
    }

    // Step 1: Normalize text
    const normalizedText = normalizeText(text);

    // Step 2: Pre-tokenization (split on whitespace and punctuation)
    const preTokens = preTokenize(normalizedText);

    // Step 3: WordPiece tokenization
    const tokens: string[] = [clsToken];
    const ids: number[] = [clsId];

    for (const preToken of preTokens) {
        // Convert to lowercase for BERT
        const lowercaseToken = preToken.toLowerCase();

        // Apply WordPiece algorithm
        const wordPieceTokens = wordPieceTokenize(lowercaseToken, vocab, unkToken);

        for (const wpToken of wordPieceTokens) {
            const tokenId = vocab.get(wpToken) ?? unkId;
            tokens.push(wpToken);
            ids.push(tokenId);
        }
    }

    // Add SEP token
    tokens.push(sepToken);
    ids.push(sepId);

    // Handle length constraints with chunking
    if (tokens.length <= maxLength) {
        return [{ tokens, ids }];
    }

    // For longer texts, create overlapping chunks
    const maxContentLength = maxLength - 2; // Reserve space for [CLS] and [SEP]
    const overlap = Math.floor(maxContentLength * 0.1); // 10% overlap
    const chunkSize = maxContentLength - overlap;

    const chunks: TokenizationResult[] = [];
    const contentTokens = tokens.slice(1, -1); // Remove [CLS] and [SEP]
    const contentIds = ids.slice(1, -1);

    for (let i = 0; i < contentTokens.length; i += chunkSize) {
        const chunkTokens = [clsToken, ...contentTokens.slice(i, i + maxContentLength - 1), sepToken];
        const chunkIds = [clsId, ...contentIds.slice(i, i + maxContentLength - 1), sepId];

        chunks.push({
            tokens: chunkTokens,
            ids: chunkIds
        });
    }

    return chunks;
}

/**
 * Process embeddings for multiple chunks and combine them
 *
 * @param chunks
 * @param session
 */
async function processChunkedEmbeddings(
    chunks: TokenizationResult[],
    session: ort.InferenceSession
): Promise<Float32Array> {
    const embeddings: Float32Array[] = [];

    for (const chunk of chunks) {
        const { ids } = chunk;

        // ONNX Runtime input tensors must be int64 (BigInt64Array)
        // Add validation for token IDs before converting to BigInt
        const validIds = ids.filter((id) => {
            const isValid = typeof id === 'number' && !isNaN(id) && isFinite(id);
            if (!isValid) {
                throw new Error(`Invalid token ID detected: ${id} (type: ${typeof id})`);
            }
            return isValid;
        });

        if (validIds.length !== ids.length) {
            throw new Error(`Found ${ids.length - validIds.length} invalid token IDs`);
        }

        const inputIds = new BigInt64Array(validIds.map((i) => BigInt(i)));
        const attentionMask = new BigInt64Array(validIds.length).fill(BigInt(1));
        const tokenTypeIds = new BigInt64Array(validIds.length).fill(BigInt(0));

        const inputTensor = new ort.Tensor('int64', inputIds, [1, validIds.length]);
        const attentionTensor = new ort.Tensor('int64', attentionMask, [1, validIds.length]);
        const tokenTypeTensor = new ort.Tensor('int64', tokenTypeIds, [1, validIds.length]);

        const feeds = {
            input_ids: inputTensor,
            attention_mask: attentionTensor,
            token_type_ids: tokenTypeTensor
        };

        const results = await session.run(feeds);
        const lastHiddenState = results['last_hidden_state'];
        const [, sequenceLength, hiddenSize] = lastHiddenState.dims as number[];
        const embeddingData = lastHiddenState.data as Float32Array;

        // Apply mean pooling across the sequence dimension
        const pooledEmbedding = new Float32Array(hiddenSize);
        for (let i = 0; i < hiddenSize; i++) {
            let sum = 0;
            for (let j = 0; j < sequenceLength; j++) {
                sum += embeddingData[j * hiddenSize + i];
            }
            pooledEmbedding[i] = sum / sequenceLength;
        }

        embeddings.push(pooledEmbedding);
    }

    // If multiple chunks, average the embeddings
    if (embeddings.length === 1) {
        return embeddings[0];
    }

    const hiddenSize = embeddings[0].length;
    const avgEmbedding = new Float32Array(hiddenSize);

    // Average across all chunks
    for (let i = 0; i < hiddenSize; i++) {
        let sum = 0;
        for (const embedding of embeddings) {
            sum += embedding[i];
        }
        avgEmbedding[i] = sum / embeddings.length;
    }

    return avgEmbedding;
}

export function resetSession(): void {
    session = null;
    vocab = null;
    modelInitPromise = null;
}

export default async function embedding(text: string): Promise<Float32Array> {
    // Lazy initialize model only when embedding function is called
    if (!modelInitPromise) {
        modelInitPromise = (async () => {
            try {
                await downloadModelIfNeeded();
                await initializeModelAndVocab();
            } catch (error) {
                // Reset promise on failure so it can be retried
                modelInitPromise = null;
                throw error;
            }
        })();
    }

    // Wait for the model to be initialized
    await modelInitPromise;

    if (!session || !vocab) {
        await initializeModelAndVocab();
    }

    if (!vocab) {
        throw new Error('Vocab not initialized');
    }

    const chunks = wordPieceTokenizer(text, vocab);

    /**
     * Normalize embedding to unit length
     *
     * @param embedding - Embedding vector to normalize
     * @returns Normalized embedding
     */
    function normalizeEmbedding(embedding: Float32Array): Float32Array {
        let norm = 0;
        for (let i = 0; i < embedding.length; i++) {
            norm += embedding[i] * embedding[i];
        }
        norm = Math.sqrt(norm);

        const normalized = new Float32Array(embedding.length);
        for (let i = 0; i < embedding.length; i++) {
            normalized[i] = embedding[i] / norm;
        }
        return normalized;
    }

    try {
        if (!session) {
            throw new Error('Session not initialized');
        }
        const pooledEmbedding = await processChunkedEmbeddings(chunks, session);
        return normalizeEmbedding(pooledEmbedding);
    } catch {
        // If inference fails, it might be due to model corruption
        // Try to recover by re-downloading and reinitializing

        await forceRedownloadModel();
        await initializeModelAndVocab();

        const retryPooledEmbedding = await processChunkedEmbeddings(chunks, session!);
        return normalizeEmbedding(retryPooledEmbedding);
    }
}
