import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import embedding from './embedding';
import { getDataDir } from './utils';

// Export the root data directory as a constant
export const rootDir = getDataDir();
export const embeddingsDir = path.join(rootDir, 'embeddings');

/**
 * Embedded chunk type with content and non-enumerable embedding
 */
export interface EmbeddedChunk {
    content: string;
    embedding?: Float32Array;
    [key: string]: unknown;
}

/**
 * Search result with similarity score
 */
export interface SearchResult extends EmbeddedChunk {
    similarity: number;
}

/**
 * Wrapper object containing embeddings and metadata
 */
export interface EmbeddingsWrapper {
    id?: string;
    embeddings: EmbeddedChunk[];
    description?: string;
    dimensions?: number;
    count?: number;
    [key: string]: unknown;
}

/**
 * Search options
 */
export interface SearchOptions {
    limit?: number;
    weights?: Record<string, number>;
}

/**
 * Store configuration
 */
export interface StoreConfig extends EmbeddingsWrapper {
    id: string;
}

/**
 * Filter configuration for loading embeddings
 */
export interface FilterConfig {
    [key: string]: string | number | boolean | string[] | number[];
}

// Cache for loaded embeddings by ID
const embeddingsCache = new Map<string, EmbeddingsWrapper>();

/**
 * Search for similar content using semantic similarity
 *
 * @param query - Search query text
 * @param embeddings - Array of embedded chunks, array of arrays, wrapper object, or array of wrapper objects to search through
 * @param options - Search options
 * @returns Promise that resolves to chunks sorted by similarity (highest first)
 */
export async function search(
    query: string,
    embeddings: EmbeddedChunk[] | EmbeddedChunk[][] | EmbeddingsWrapper | EmbeddingsWrapper[],
    options: SearchOptions = {}
): Promise<SearchResult[]> {
    const { limit, weights } = options;
    const searchEmbedding = await embedding(query);

    // Handle wrapper object or array of wrapper objects
    let searchData: EmbeddedChunk[] | EmbeddedChunk[][] = embeddings as EmbeddedChunk[] | EmbeddedChunk[][];

    // If it's a single wrapper object with embeddings property, extract the embeddings array
    if (embeddings && !Array.isArray(embeddings) && (embeddings as EmbeddingsWrapper).embeddings) {
        searchData = (embeddings as EmbeddingsWrapper).embeddings;
    }
    // If it's an array of wrapper objects (from load()), extract all embeddings arrays
    else if (Array.isArray(embeddings) && embeddings.length > 0 && (embeddings[0] as EmbeddingsWrapper).embeddings) {
        searchData = (embeddings as EmbeddingsWrapper[]).map((wrapper) => wrapper.embeddings);
    }

    // Handle array of arrays (multiple datasets)
    if (Array.isArray(searchData) && searchData.length > 0 && Array.isArray(searchData[0])) {
        const allScoredChunks: SearchResult[] = [];

        for (const dataset of searchData as EmbeddedChunk[][]) {
            const wrapperId = getWrapperIdForDataset(embeddings, dataset);
            const weight = getWeight(wrapperId, weights);

            const scoredChunks = dataset.map((chunk) => {
                // Create new object with all enumerable properties
                const result: SearchResult = {
                    ...chunk,
                    similarity: cosineSimilarity(searchEmbedding, chunk.embedding!) * weight
                };

                // Copy non-enumerable embedding property if it exists
                if (chunk.embedding) {
                    Object.defineProperty(result, 'embedding', {
                        value: chunk.embedding,
                        writable: true,
                        configurable: true,
                        enumerable: false
                    });
                }

                return result;
            });
            allScoredChunks.push(...scoredChunks);
        }

        // Sort all results by similarity descending
        allScoredChunks.sort((a, b) => b.similarity - a.similarity);

        // Apply limit if specified
        return limit !== undefined ? allScoredChunks.slice(0, limit) : allScoredChunks;
    }

    // Handle single array (existing functionality)
    const wrapperId = (embeddings as EmbeddingsWrapper)?.id || null;
    const weight = getWeight(wrapperId, weights);

    const scoredChunks = (searchData as EmbeddedChunk[]).map((chunk) => {
        // Create new object with all enumerable properties
        const result: SearchResult = {
            ...chunk,
            similarity: cosineSimilarity(searchEmbedding, chunk.embedding!) * weight
        };

        // Copy non-enumerable embedding property if it exists
        if (chunk.embedding) {
            Object.defineProperty(result, 'embedding', {
                value: chunk.embedding,
                writable: true,
                configurable: true,
                enumerable: false
            });
        }

        return result;
    });
    // Sort by similarity descending
    scoredChunks.sort((a, b) => b.similarity - a.similarity);

    // Apply limit if specified
    return limit !== undefined ? scoredChunks.slice(0, limit) : scoredChunks;
}

/**
 * Generate embeddings for text chunks
 *
 * @param chunks - Array of strings or objects with content property
 * @param config - Optional config object with id, description, and other metadata
 * @returns Returns wrapper object { embeddings, id?, ...metadata }
 */
export async function embeddings(
    chunks: (string | Partial<EmbeddedChunk>)[],
    config?: Partial<EmbeddingsWrapper>
): Promise<EmbeddingsWrapper> {
    const result: EmbeddedChunk[] = [];

    for (const chunk of chunks) {
        // Handle both string and object formats
        if (typeof chunk === 'string') {
            const embeddingVector = await embedding(chunk);
            const chunkObj: EmbeddedChunk = { content: chunk };
            Object.defineProperty(chunkObj, 'embedding', {
                value: embeddingVector,
                writable: true,
                configurable: true,
                enumerable: false
            });
            result.push(chunkObj);
        } else if (chunk && typeof chunk === 'object' && typeof chunk.content === 'string') {
            const content = chunk.content;
            const embeddingVector = await embedding(content);
            // Preserve all original properties and add embedding
            const chunkObj: EmbeddedChunk = { ...chunk } as EmbeddedChunk;
            Object.defineProperty(chunkObj, 'embedding', {
                value: embeddingVector,
                writable: true,
                configurable: true,
                enumerable: false
            });
            result.push(chunkObj);
        } else {
            // Handle edge case where content is undefined - preserve original behavior
            const content = (chunk as Partial<EmbeddedChunk>)?.content;
            const embeddingVector = await embedding(content || '');
            const chunkObj: EmbeddedChunk = { content: content || '' };
            Object.defineProperty(chunkObj, 'embedding', {
                value: embeddingVector,
                writable: true,
                configurable: true,
                enumerable: false
            });
            result.push(chunkObj);
        }
    }

    // Always return wrapper object with embeddings
    return {
        embeddings: result,
        ...(config || {})
    };
}

/**
 * Store embeddings to disk
 *
 * @param dir - Directory where to store the embeddings
 * @param config - Wrapper object from embeddings() with {id, embeddings, ...metadata}
 * @returns Promise<void>
 */
export async function store(dir: string, config: StoreConfig): Promise<void> {
    // Validate config format
    if (!config || !config.id || !config.embeddings || !Array.isArray(config.embeddings)) {
        throw new Error('Invalid config format: must have id and embeddings array');
    }

    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });

    const basePath = path.join(dir, config.id);

    // Extract metadata (everything except embeddings)
    const metadata: Partial<EmbeddingsWrapper> = { ...config };
    delete metadata.embeddings;

    // Add dimensions and count if not already present
    if (config.embeddings.length > 0 && config.embeddings[0].embedding) {
        metadata.dimensions = config.embeddings[0].embedding.length;
    }
    metadata.count = config.embeddings.length;

    // Write metadata file
    await fs.writeFile(`${basePath}.meta.json`, JSON.stringify(metadata, null, 2));

    // Write JSON file with content (enumerable properties only)
    await fs.writeFile(`${basePath}.json`, JSON.stringify(config.embeddings, null, 2));

    // Write binary file with embeddings
    const embeddingCount = config.embeddings.length;
    const embeddingDim = config.embeddings[0]?.embedding?.length || 0;
    const totalFloats = embeddingCount * embeddingDim;
    const buffer = new Float32Array(totalFloats);

    for (let i = 0; i < embeddingCount; i++) {
        const embeddingVec = config.embeddings[i].embedding;
        if (embeddingVec) {
            buffer.set(embeddingVec, i * embeddingDim);
        }
    }

    await fs.writeFile(`${basePath}.bin`, new Uint8Array(buffer.buffer));
}

/**
 * Load embeddings from disk
 *
 * @param dir - Directory where to search for embeddings
 * @param config - Optional config object for filtering for metadata
 * @returns Array of wrapper objects {id, embeddings, ...metadata}
 */
export async function load(dir: string, config?: FilterConfig): Promise<EmbeddingsWrapper[]> {
    // Check if path exists
    try {
        await fs.access(dir);
    } catch {
        throw new Error('Path does not exist');
    }

    // Find all .meta.json files
    const files = await fs.readdir(dir);
    const metaFiles = files.filter((f) => f.endsWith('.meta.json'));

    if (metaFiles.length === 0) {
        return [];
    }

    // Load and filter metadata
    const results: EmbeddingsWrapper[] = [];

    for (const metaFile of metaFiles) {
        const baseName = metaFile.replace('.meta.json', '');
        const basePath = path.join(dir, baseName);

        // Always load metadata from disk first
        const metaContent = await fs.readFile(`${basePath}.meta.json`, 'utf-8');
        const metadata = JSON.parse(metaContent) as EmbeddingsWrapper;

        // Apply filtering if config is provided
        if (config && !matchesFilter(metadata, config)) {
            continue;
        }

        // Check cache by ID
        const cachedEntry = metadata.id ? embeddingsCache.get(metadata.id) : undefined;

        if (cachedEntry) {
            // Cache hit - use cached data
            results.push(cachedEntry);
            continue;
        }

        // Cache miss - load from disk
        // Load JSON data
        const jsonContent = await fs.readFile(`${basePath}.json`, 'utf-8');
        const jsonData = JSON.parse(jsonContent) as Partial<EmbeddedChunk>[];

        // Load binary data
        const binBuffer = await fs.readFile(`${basePath}.bin`);
        const float32Array = new Float32Array(binBuffer.buffer, binBuffer.byteOffset, binBuffer.byteLength / 4);

        // Reconstruct embeddings
        const embeddingDim = metadata.dimensions || 0;
        const embeddingsArray: EmbeddedChunk[] = [];

        for (let i = 0; i < jsonData.length; i++) {
            const chunk = jsonData[i];
            const embeddingStart = i * embeddingDim;
            const embeddingEnd = embeddingStart + embeddingDim;
            const embeddingVector = float32Array.slice(embeddingStart, embeddingEnd);

            // Create chunk object with all properties from JSON
            const chunkObj: EmbeddedChunk = { ...chunk } as EmbeddedChunk;

            // Add non-enumerable embedding property
            Object.defineProperty(chunkObj, 'embedding', {
                value: embeddingVector,
                writable: true,
                configurable: true,
                enumerable: false
            });

            embeddingsArray.push(chunkObj);
        }

        // Build result object
        const loadedData: EmbeddingsWrapper = {
            ...metadata,
            embeddings: embeddingsArray
        };

        // Store in cache
        if (metadata.id) {
            embeddingsCache.set(metadata.id, loadedData);
        }

        results.push(loadedData);
    }

    return results;
}

/**
 * Clear the embeddings cache
 *
 * @param id - Optional ID to clear specific entry, or clear all if omitted
 */
export function clearCache(id?: string): void {
    if (id) {
        embeddingsCache.delete(id);
    } else {
        embeddingsCache.clear();
    }
}

/**
 * Register embeddings by creating a symlink in embeddingsDir
 *
 * @param embeddingPath - Path to the embedding files to register
 * @param registryDir - Optional registry directory (defaults to embeddingsDir)
 * @returns Promise<void>
 */
export async function register(embeddingPath: string, registryDir: string = embeddingsDir): Promise<void> {
    // Ensure registry directory exists
    await fs.mkdir(registryDir, { recursive: true });

    // Get the absolute path
    const absolutePath = path.isAbsolute(embeddingPath) ? embeddingPath : path.resolve(embeddingPath);

    // Check if the source path exists
    try {
        await fs.access(absolutePath);
    } catch {
        throw new Error(`Path does not exist: ${absolutePath}`);
    }

    // Create unique symlink name from hash of the absolute path
    const symlinkName = hashPath(absolutePath);
    const symlinkPath = path.join(registryDir, symlinkName);

    // Check if symlink already exists
    try {
        await fs.access(symlinkPath);
        // If it exists, remove it first
        await fs.unlink(symlinkPath);
    } catch {
        // Symlink doesn't exist, which is fine
    }

    // Create the symlink
    await fs.symlink(absolutePath, symlinkPath, 'dir');
}

/**
 * Process all registered embeddings (from symlinks in embeddingsDir)
 *
 * @param config - Optional config object for filtering metadata
 * @param registryDir - Optional registry directory (defaults to embeddingsDir)
 * @param metadataOnly - If true, only load metadata without embeddings
 * @returns Array of wrapper objects or metadata objects
 */
async function processRegistered(
    config?: FilterConfig,
    registryDir: string = embeddingsDir,
    metadataOnly = false
): Promise<EmbeddingsWrapper[]> {
    // Ensure registry directory exists
    try {
        await fs.mkdir(registryDir, { recursive: true });
    } catch {
        // Directory might already exist
    }

    // Read all items in registry directory
    let items: string[];
    try {
        items = await fs.readdir(registryDir);
    } catch {
        return [];
    }

    const results: EmbeddingsWrapper[] = [];

    // Process each item
    for (const item of items) {
        const itemPath = path.join(registryDir, item);

        // Check if it's a symlink
        let stats;
        try {
            stats = await fs.lstat(itemPath);
        } catch {
            continue;
        }

        if (stats.isSymbolicLink()) {
            // Resolve the symlink target
            let targetPath: string;
            try {
                targetPath = await fs.readlink(itemPath);
                // Make it absolute if it's relative
                if (!path.isAbsolute(targetPath)) {
                    targetPath = path.resolve(path.dirname(itemPath), targetPath);
                }
            } catch {
                continue;
            }

            // Load data from the target path
            try {
                if (metadataOnly) {
                    // Load only metadata
                    const files = await fs.readdir(targetPath);
                    const metaFiles = files.filter((f) => f.endsWith('.meta.json'));

                    for (const metaFile of metaFiles) {
                        const metaPath = path.join(targetPath, metaFile);
                        const metaContent = await fs.readFile(metaPath, 'utf-8');
                        const metadata = JSON.parse(metaContent) as EmbeddingsWrapper;

                        // Apply filtering if config is provided
                        if (config && !matchesFilter(metadata, config)) {
                            continue;
                        }

                        results.push(metadata);
                    }
                } else {
                    // Load full embeddings
                    const loaded = await load(targetPath, config);
                    results.push(...loaded);
                }
            } catch {
                // Skip if loading fails
                continue;
            }
        }
    }

    return results;
}

/**
 * Get metadata for all registered embeddings without loading the actual embeddings
 *
 * @param config - Optional config object for filtering metadata (same as load())
 * @param registryDir - Optional registry directory (defaults to embeddingsDir)
 * @returns Array of metadata objects from all registered embeddings
 */
export async function registered(config?: FilterConfig, registryDir?: string): Promise<EmbeddingsWrapper[]> {
    return processRegistered(config, registryDir, true);
}

/**
 * Load all registered embeddings (from symlinks in embeddingsDir)
 *
 * @param config - Optional config object for filtering metadata (same as load())
 * @param registryDir - Optional registry directory (defaults to embeddingsDir)
 * @returns Array of wrapper objects from all registered embeddings
 */
export async function loadRegistered(config?: FilterConfig, registryDir?: string): Promise<EmbeddingsWrapper[]> {
    return processRegistered(config, registryDir, false);
}

/**
 * Check if metadata matches filter config
 *
 * @param metadata - Metadata to check
 * @param filterConfig - Filter configuration
 * @returns True if matches
 */
function matchesFilter(metadata: EmbeddingsWrapper, filterConfig: FilterConfig): boolean {
    // For each property in filter config
    for (const key in filterConfig) {
        const filterValue = filterConfig[key];
        const metaValue = metadata[key];

        // If filter value is an array, check if at least one element matches
        if (Array.isArray(filterValue)) {
            // Meta value should be an array and have at least one common element
            if (!Array.isArray(metaValue)) {
                return false;
            }
            const hasMatch = filterValue.some((fv) => (metaValue as unknown[]).includes(fv));
            if (!hasMatch) {
                return false;
            }
        } else {
            // Direct comparison
            if (metaValue !== filterValue) {
                return false;
            }
        }
    }

    return true;
}

/**
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity between vectors (0-1)
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (normA * normB);
}

/**
 * Create a hash from a path for unique symlink naming
 *
 * @param targetPath - Path to hash
 * @returns Short hash string
 */
function hashPath(targetPath: string): string {
    return crypto.createHash('sha256').update(targetPath).digest('hex').substring(0, 12);
}

/**
 * Get weight for a wrapper ID
 *
 * @param wrapperId - The wrapper object ID
 * @param weights - Weights map { wrapperId: weight }
 * @returns Weight value (defaults to 1.0)
 */
function getWeight(wrapperId: string | null, weights?: Record<string, number>): number {
    if (!weights || !wrapperId) {
        return 1.0;
    }
    return weights[wrapperId] || 1.0;
}

/**
 * Map dataset back to its wrapper ID
 *
 * @param embeddings - Original embeddings input
 * @param dataset - Dataset to find ID for
 * @returns Wrapper ID or null
 */
function getWrapperIdForDataset(
    embeddings: EmbeddedChunk[] | EmbeddedChunk[][] | EmbeddingsWrapper | EmbeddingsWrapper[],
    dataset: EmbeddedChunk[]
): string | null {
    if (Array.isArray(embeddings)) {
        for (const wrapper of embeddings) {
            if ((wrapper as EmbeddingsWrapper).embeddings === dataset) {
                return (wrapper as EmbeddingsWrapper).id || null;
            }
        }
    }
    return null;
}
