import type { Connection, Table } from '@lancedb/lancedb';
import { connect } from '@lancedb/lancedb';
import type { VectorSearchResult } from './types/vector';
import { logger } from '../../utils/logger';
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
interface TableIndex {
    tables: string[];
    totalTables: number;
    maxVectorsPerTable: number;
    totalVectors: number;
}

/**
 *
 */
export class SimpleVectorService {
    private connection: Connection | null = null;
    private tables: Table[] = [];
    private tableIndex: TableIndex | null = null;
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

            // Load table index to get list of split tables
            const tableIndexPath = path.join(this.dataPath, 'table_index.json');
            try {
                const tableIndexContent = await fs.readFile(tableIndexPath, 'utf-8');
                this.tableIndex = JSON.parse(tableIndexContent);

                // Load all tables
                this.tables = [];
                for (const tableName of this.tableIndex?.tables || []) {
                    const table = await this.connection.openTable(tableName);
                    this.tables.push(table);
                }

                logger.log(`✓ Loaded ${this.tables.length} split tables`);
            } catch {
                // Fallback to single table for backward compatibility
                logger.log('No table index found, trying single table...');
                try {
                    const table = await this.connection.openTable('documents');
                    this.tables = [table];
                    this.tableIndex = {
                        tables: ['documents'],
                        totalTables: 1,
                        maxVectorsPerTable: -1,
                        totalVectors: this.metadata?.totalVectors || 0
                    };
                } catch (fallbackError) {
                    throw new Error(`No tables found: ${fallbackError}`);
                }
            }

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
        if (this.tables.length === 0) {
            throw new Error('Vector database not initialized');
        }

        try {
            // Search across all tables and collect results
            const allResults: any[] = [];

            for (const table of this.tables) {
                let query = table.vectorSearch(queryVector).limit(limit * 2); // Get more from each table

                if (category) {
                    query = query.where(`category = "${category}"`);
                }

                const tableResults = await query.toArray();
                allResults.push(...tableResults);
            }

            // Sort all results by distance and take top results
            allResults.sort((a, b) => (a._distance || 0) - (b._distance || 0));
            const topResults = allResults.slice(0, limit);

            return topResults.map((result: any) => ({
                document: {
                    id: result.document_id, // Use document_id instead of chunk id
                    vector: result.vector,
                    content: result.content,
                    title: result.title,
                    category: result.category,
                    path: result.path,
                    chunk_index: result.chunk_index,
                    metadata: {
                        tags: this.parseJsonField(result.tags_json) || [],
                        headers: this.parseJsonField(result.headers_json) || [],
                        lastModified: new Date(result.lastModified),
                        wordCount: result.wordCount,
                        excerpt: result.excerpt
                    }
                },
                score: 1 - (result._distance || 0),
                distance: result._distance || 0
            }));
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
        if (this.tables.length === 0) {
            throw new Error('Vector database not initialized');
        }

        try {
            // Find the first chunk of the document to use as reference across all tables
            let referenceVector: number[] | null = null;

            for (const table of this.tables) {
                const referenceResults = await table
                    .search('')
                    .where(`document_id = "${documentId}" AND chunk_index = 0`)
                    .limit(1)
                    .toArray();

                if (referenceResults.length > 0) {
                    referenceVector = referenceResults[0].vector;
                    break;
                }
            }

            if (!referenceVector) {
                return [];
            }

            // Search for similar documents across all tables, excluding the original
            const allResults: any[] = [];

            for (const table of this.tables) {
                const results = await table
                    .vectorSearch(referenceVector)
                    .where(`document_id != "${documentId}"`)
                    .limit(limit * 2) // Get more to account for multiple chunks
                    .toArray();

                allResults.push(...results);
            }

            // Deduplicate by document_id and take best score for each document
            const documentScores = new Map<string, any>();

            for (const result of allResults) {
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
                            tags: this.parseJsonField(result.tags_json) || [],
                            headers: this.parseJsonField(result.headers_json) || [],
                            lastModified: new Date(result.lastModified),
                            wordCount: result.wordCount,
                            excerpt: result.excerpt
                        }
                    },
                    score: result.score,
                    distance: result.distance
                }));

            return similarDocs;
        } catch (error) {
            logger.error(`Find similar documents failed: ${error}`);
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
        if (this.tables.length === 0) {
            throw new Error('Vector database not initialized');
        }

        try {
            const allResults: any[] = [];

            for (const table of this.tables) {
                let query = table.search('').where(`category = "${category}" AND chunk_index = 0`); // Only first chunk of each doc

                if (limit) {
                    query = query.limit(Math.ceil(limit / this.tables.length) + 10); // Distribute limit across tables
                }

                const tableResults = await query.toArray();
                allResults.push(...tableResults);
            }

            // Take only the requested limit
            const results = limit ? allResults.slice(0, limit) : allResults;

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
                        tags: this.parseJsonField(result.tags_json) || [],
                        headers: this.parseJsonField(result.headers_json) || [],
                        lastModified: new Date(result.lastModified),
                        wordCount: result.wordCount,
                        excerpt: result.excerpt
                    }
                },
                score: 1.0, // No distance for category queries
                distance: 0
            }));
        } catch (error) {
            logger.error(`Get documents by category failed: ${error}`);
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
        return this.tables.length > 0 && this.metadata !== null;
    }

    async close(): Promise<void> {
        if (this.connection) {
            this.connection = null;
            this.tables = [];
            logger.log('Vector database connection closed');
        }
    }
}
