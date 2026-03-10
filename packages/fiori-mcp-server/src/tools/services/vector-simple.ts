import { load, search } from '@sap-ux/semantic-search';

import type { SearchResult } from './types/vector';
import { logger } from '../../utils/logger';
import { resolveEmbeddingsPath } from '../../utils/embeddings-path';

/**
 *
 */
export class SimpleVectorService {
    private embeddingsDocs: any[] = [];
    private dataPath: string;

    /**
     * Constructor for SimpleVectorService.
     *
     * @param dataPath Optional custom data path (will be overridden by path resolution)
     */
    constructor(dataPath?: string) {
        // dataPath parameter is kept for compatibility but will be resolved dynamically
        this.dataPath = dataPath || '';
    }

    async initialize(): Promise<void> {
        try {
            logger.log('Loading vector database from pre-built embeddings...');

            // Resolve the embeddings path dynamically
            const pathInfo = await resolveEmbeddingsPath();

            this.dataPath = pathInfo.embeddingsPath;
            logger.log(`Using embeddings path: ${this.dataPath} (external: ${pathInfo.isExternalPackage})`);

            this.embeddingsDocs = await load(this.dataPath);
            logger.log(`✓ Embedding metadata loaded.`);
        } catch (error) {
            throw new Error(`Failed to load embeddings: ${error}`);
        }
    }

    /**
     * Performs semantic search using query vector.
     *
     * @param query The query vector for similarity search
     * @param limit Maximum number of results to return
     * @returns Promise resolving to search results
     */
    async semanticSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
        if (!this.embeddingsDocs || this.embeddingsDocs.length === 0) {
            throw new Error('Embeddings not initialized');
        }

        try {
            const topResults = await search(query, this.embeddingsDocs, { limit });
            return topResults;
        } catch (error) {
            logger.error(`Semantic search failed: ${error}`);
            throw new Error(`Semantic search failed: ${error}`);
        }
    }

    /**
     * Finds documents similar to the given text.
     *
     * @param text The text to find similar documents for
     * @param _limit Maximum number of results to return (unused in simplified mode)
     * @returns Promise resolving to similar documents
     */
    async findSimilarToText(text: string, _limit: number = 5): Promise<SearchResult[]> {
        // For this simplified version, we'll need to generate an embedding for the text
        // This would require having the embedding model available
        // For now, we'll return empty results
        logger.warn('findSimilarToText requires embedding generation - not available in simplified mode');
        return [];
    }

    /**
     * Helper method to parse JSON fields safely.
     *
     * @param jsonString The JSON string to parse
     * @returns Parsed array or null if parsing fails
     */
    private parseJsonField(jsonString: string): string[] | null {
        try {
            return jsonString ? JSON.parse(jsonString) : [];
        } catch {
            return [];
        }
    }

    /**
     * Checks if the vector store is initialized.
     *
     * @returns True if initialized, false otherwise
     */
    isInitialized(): boolean {
        return this.embeddingsDocs.length > 0;
    }

    async close(): Promise<void> {}
}
