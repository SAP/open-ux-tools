import type { Connection, Table } from '@lancedb/lancedb';
import { connect } from '@lancedb/lancedb';
import type { VectorSearchResult } from './types/vector';
import { logger } from './utils/logger';
import { resolveEmbeddingsPath } from '../../utils/embeddings-path';
import fs from 'fs/promises';
import path from 'path';

export interface EmbeddingMetadata {
    version: string;
    createdAt: string;
    model: string;
    dimensions: number;
    totalVectors: number;
    totalDocuments: number;
    chunkSize: number;
    chunkOverlap: number;
}

/**
 *
 */
export class SimpleVectorService {
    private connection: Connection | null = null;
    private table: Table | null = null;
    private metadata: EmbeddingMetadata | null = null;
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

            if (!pathInfo.isAvailable) {
                throw new Error('No embeddings data available');
            }

            this.dataPath = pathInfo.embeddingsPath;
            logger.log(`Using embeddings path: ${this.dataPath} (external: ${pathInfo.isExternalPackage})`);

            // Load metadata
            const metadataPath = path.join(this.dataPath, 'metadata.json');
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            this.metadata = JSON.parse(metadataContent);

            logger.log(`✓ Embedding metadata loaded:`);
            logger.log(`  Model: ${this?.metadata?.model}`);
            logger.log(`  Dimensions: ${this?.metadata?.dimensions}`);
            logger.log(`  Total vectors: ${this?.metadata?.totalVectors}`);
            logger.log(`  Created: ${this?.metadata?.createdAt}`);

            // Connect to LanceDB
            this.connection = await connect(this.dataPath);
            this.table = await this.connection.openTable('documents');

            logger.log('✓ Vector database loaded and ready');
        } catch (error) {
            throw new Error(`Failed to load vector database: ${error}`);
        }
    }

    /**
     * Performs semantic search using query vector.
     *
     * @param queryVector The query vector for similarity search
     * @param limit Maximum number of results to return
     * @param category Optional category filter
     * @returns Promise resolving to search results
     */
    async semanticSearch(queryVector: number[], limit: number = 10, category?: string): Promise<VectorSearchResult[]> {
        if (!this.table) {
            throw new Error('Vector database not initialized');
        }

        try {
            let query = this.table.vectorSearch(queryVector).limit(limit);

            if (category) {
                query = query.where(`category = "${category}"`);
            }

            const results = await query.toArray();

            return results.map((result: any) => ({
                document: {
                    id: result.document_id, // Use document_id instead of chunk id
                    vector: result.vector,
                    content: result.content,
                    title: result.title,
                    category: result.category,
                    path: result.path,
                    chunk_index: result.chunk_index,
                    metadata: {
                        tags: result.metadata.tags,
                        headers: result.metadata.headers,
                        lastModified: new Date(result.metadata.lastModified),
                        wordCount: result.metadata.wordCount,
                        excerpt: result.metadata.excerpt
                    }
                },
                score: 1 - (result._distance || 0),
                distance: result._distance || 0
            }));
        } catch (error) {
            logger.error('Semantic search failed:', error);
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
    async findSimilarToText(text: string, _limit: number = 5): Promise<VectorSearchResult[]> {
        // For this simplified version, we'll need to generate an embedding for the text
        // This would require having the embedding model available
        // For now, we'll return empty results
        logger.warn('findSimilarToText requires embedding generation - not available in simplified mode');
        return [];
    }

    /**
     * Finds documents similar to the specified document.
     *
     * @param documentId The ID of the reference document
     * @param limit Maximum number of results to return
     * @returns Promise resolving to similar documents
     */
    async findSimilarToDocument(documentId: string, limit: number = 5): Promise<VectorSearchResult[]> {
        if (!this.table) {
            throw new Error('Vector database not initialized');
        }

        try {
            // Find the first chunk of the document to use as reference
            const referenceResults = await this.table
                .search('')
                .where(`document_id = "${documentId}" AND chunk_index = 0`)
                .limit(1)
                .toArray();

            if (referenceResults.length === 0) {
                return [];
            }

            const referenceVector = referenceResults[0].vector;

            // Search for similar documents, excluding the original
            const results = await this.table
                .vectorSearch(referenceVector)
                .where(`document_id != "${documentId}"`)
                .limit(limit * 2) // Get more to account for multiple chunks
                .toArray();

            // Deduplicate by document_id and take best score for each document
            const documentScores = new Map<string, any>();

            for (const result of results) {
                const docId = result.document_id;
                const score = 1 - (result._distance || 0);

                if (!documentScores.has(docId) || documentScores.get(docId).score < score) {
                    documentScores.set(docId, {
                        ...result,
                        score,
                        distance: result._distance || 0
                    });
                }
            }

            // Convert to VectorSearchResult format
            const similarDocs = Array.from(documentScores.values())
                .sort((a, b) => b.score - a.score)
                .slice(0, limit)
                .map((result) => ({
                    document: {
                        id: result.document_id,
                        vector: result.vector,
                        content: result.content,
                        title: result.title,
                        category: result.category,
                        path: result.path,
                        chunk_index: result.chunk_index,
                        metadata: {
                            tags: result.metadata.tags,
                            headers: result.metadata.headers,
                            lastModified: new Date(result.metadata.lastModified),
                            wordCount: result.metadata.wordCount,
                            excerpt: result.metadata.excerpt
                        }
                    },
                    score: result.score,
                    distance: result.distance
                }));

            return similarDocs;
        } catch (error) {
            logger.error('Find similar documents failed:', error);
            return [];
        }
    }

    /**
     * Gets documents by category.
     *
     * @param category The category to filter by
     * @param limit Optional maximum number of results
     * @returns Promise resolving to documents in the category
     */
    async getDocumentsByCategory(category: string, limit?: number): Promise<VectorSearchResult[]> {
        if (!this.table) {
            throw new Error('Vector database not initialized');
        }

        try {
            let query = this.table.search('').where(`category = "${category}" AND chunk_index = 0`); // Only first chunk of each doc

            if (limit) {
                query = query.limit(limit);
            }

            const results = await query.toArray();

            return results.map((result: any) => ({
                document: {
                    id: result.document_id,
                    vector: result.vector,
                    content: result.content,
                    title: result.title,
                    category: result.category,
                    path: result.path,
                    chunk_index: result.chunk_index,
                    metadata: {
                        tags: result.metadata.tags,
                        headers: result.metadata.headers,
                        lastModified: new Date(result.metadata.lastModified),
                        wordCount: result.metadata.wordCount,
                        excerpt: result.metadata.excerpt
                    }
                },
                score: 1.0, // No distance for category queries
                distance: 0
            }));
        } catch (error) {
            logger.error('Get documents by category failed:', error);
            return [];
        }
    }

    /**
     * Gets embedding metadata.
     *
     * @returns The embedding metadata or null
     */
    getMetadata(): EmbeddingMetadata | null {
        return this.metadata;
    }

    /**
     * Checks if the vector store is initialized.
     *
     * @returns True if initialized, false otherwise
     */
    isInitialized(): boolean {
        return this.table !== null && this.metadata !== null;
    }

    async close(): Promise<void> {
        if (this.connection) {
            this.connection = null;
            this.table = null;
            logger.log('Vector database connection closed');
        }
    }
}
