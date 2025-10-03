import type { DocumentMeta, SearchResult } from './types/index';
import { FileStoreService } from './filestore';
import { SimpleVectorService } from './vector-simple';
import { logger } from '../../utils/logger';
import { resolveEmbeddingsPath } from '../../utils/embeddings-path';
import fs from 'fs/promises';
import path from 'path';
/**
 *
 */
export class SimpleDocumentIndexer {
    private readonly fileStore: FileStoreService;
    private vectorService: SimpleVectorService | null = null;
    private keywordIndex: Map<string, string[]> = new Map();
    private initialized = false;

    /**
     * Constructor for SimpleDocumentIndexer.
     *
     * @param docsPath Optional custom docs path (will be resolved dynamically)
     * @param embeddingsPath Optional custom embeddings path (will be resolved dynamically)
     * @param vectorEnabled Whether to enable vector search
     */
    constructor(docsPath?: string, embeddingsPath?: string, vectorEnabled: boolean = true) {
        // Paths will be resolved dynamically during initialization
        this.fileStore = new FileStoreService(docsPath);

        if (vectorEnabled) {
            this.vectorService = new SimpleVectorService(embeddingsPath);
        }
    }

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            logger.log('Initializing simplified document indexer...');

            // Initialize filestore
            try {
                await this.fileStore.initialize();
            } catch (error) {
                logger.warn(
                    `Filestore initialization failed. Please install @sap-ux/fiori-docs-embeddings for full documentation search capabilities: ${error}`
                );
                throw error; // Cannot continue without docs
            }

            // Initialize vector service if enabled
            if (this.vectorService) {
                try {
                    await this.vectorService.initialize();
                    logger.log('✓ Vector search enabled');
                } catch (error) {
                    logger.warn(
                        `Vector service initialization failed, disabling vector search. Install @sap-ux/fiori-docs-embeddings for full capabilities: ${error}`
                    );
                    this.vectorService = null;
                }
            }

            // Load keyword search index
            await this.loadKeywordIndex();

            this.initialized = true;
            logger.log('✓ Document indexer initialized');
        } catch (error) {
            logger.error(
                'Failed to initialize indexer. This may be due to missing @sap-ux/fiori-docs-embeddings package.'
            );
            throw new Error(`Failed to initialize indexer: ${error}`);
        }
    }

    private async loadKeywordIndex(): Promise<void> {
        try {
            // Resolve the search path dynamically
            const pathInfo = await resolveEmbeddingsPath();

            if (!pathInfo.isAvailable) {
                logger.warn('No data available, keyword search will be disabled');
                return;
            }

            const keywordIndexPath = path.join(pathInfo.searchPath, 'keywords.json');
            const keywordContent = await fs.readFile(keywordIndexPath, 'utf-8');
            const keywordData = JSON.parse(keywordContent);

            // Convert object back to Map
            this.keywordIndex = new Map(Object.entries(keywordData));

            logger.log(
                `✓ Loaded keyword index: ${this.keywordIndex.size} terms (external: ${pathInfo.isExternalPackage})`
            );
        } catch (error) {
            logger.warn(`Failed to load keyword index, keyword search will be limited: ${error}`);
        }
    }

    /**
     * Performs keyword-based document search.
     *
     * @param query The search query string
     * @param maxResults Maximum number of results to return (default: 10)
     * @returns Promise resolving to an array of search results with documents and scores
     */
    async search(query: string, maxResults: number = 10): Promise<SearchResult[]> {
        if (!this.initialized) {
            await this.initialize();
        }

        const queryWords = query
            .toLowerCase()
            .split(/\s+/)
            .filter((word) => word.length > 2);
        const results = new Map<string, SearchResult>();

        for (const queryWord of queryWords) {
            // Exact match
            if (this.keywordIndex.has(queryWord)) {
                const docIds = this.keywordIndex.get(queryWord)!;
                await this.addSearchResults(results, docIds, queryWord, 10);
            }

            // Partial match
            for (const [keyword, docIds] of this.keywordIndex.entries()) {
                if (keyword.includes(queryWord) && keyword !== queryWord) {
                    await this.addSearchResults(results, docIds, keyword, 5);
                }
            }
        }

        return Array.from(results.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }

    /**
     *
     * @param results
     * @param docIds
     * @param match
     * @param baseScore
     */
    private async addSearchResults(
        results: Map<string, SearchResult>,
        docIds: string[],
        match: string,
        baseScore: number
    ): Promise<void> {
        for (const docId of docIds) {
            const doc = await this.fileStore.getDocument(docId);
            if (!doc) {
                continue;
            }

            if (!results.has(docId)) {
                results.set(docId, {
                    document: doc,
                    score: 0,
                    matches: []
                });
            }

            const result = results.get(docId)!;
            result.score += baseScore;
            if (!result.matches.includes(match)) {
                result.matches.push(match);
            }
        }
    }

    /**
     * Performs semantic search using vector embeddings (falls back to keyword search in simplified mode).
     *
     * @param query The search query string
     * @param maxResults Maximum number of results to return (default: 10)
     * @returns Promise resolving to an array of search results with documents and scores
     */
    async semanticSearch(query: string, maxResults: number = 10): Promise<SearchResult[]> {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.vectorService?.isInitialized()) {
            logger.warn('Vector search not available, falling back to keyword search');
            return this.search(query, maxResults);
        }

        try {
            // For semantic search, we would need to generate embeddings for the query
            // Since we're in simplified mode without embedding generation,
            // we'll fall back to keyword search for now
            logger.warn('Semantic search requires embedding generation - falling back to keyword search');
            return this.search(query, maxResults);
        } catch (error) {
            logger.error(`Semantic search failed, falling back to keyword search: ${error}`);
            return this.search(query, maxResults);
        }
    }

    /**
     * Performs hybrid search combining keyword and semantic search (currently just keyword search in simplified mode).
     *
     * @param query The search query string
     * @param maxResults Maximum number of results to return (default: 10)
     * @returns Promise resolving to an array of search results with documents and scores
     */
    async docSearch(query: string, maxResults: number = 10): Promise<SearchResult[]> {
        if (!this.initialized) {
            await this.initialize();
        }

        // For now, hybrid search is just keyword search in simplified mode
        // In a full implementation, this would combine keyword + semantic results
        return this.search(query, maxResults);
    }

    /**
     * Finds documents similar to the specified document using vector similarity.
     *
     * @param documentId The ID of the reference document
     * @param maxResults Maximum number of results to return (default: 5)
     * @returns Promise resolving to an array of similar documents with similarity scores
     */
    async findSimilarDocuments(documentId: string, maxResults: number = 5): Promise<SearchResult[]> {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.vectorService?.isInitialized()) {
            return [];
        }

        try {
            const vectorResults = await this.vectorService.findSimilarToDocument(documentId, maxResults);

            const results: SearchResult[] = [];
            for (const vectorResult of vectorResults) {
                const doc = await this.fileStore.getDocument(vectorResult.document.id);
                if (doc) {
                    results.push({
                        document: doc,
                        score: vectorResult.score * 10, // Scale to match keyword scores
                        matches: ['similarity']
                    });
                }
            }

            return results;
        } catch (error) {
            logger.error(`Find similar documents failed: ${error}`);
            return [];
        }
    }

    /**
     * Retrieves a document by its ID.
     *
     * @param id The unique identifier of the document to retrieve
     * @returns Promise resolving to the document metadata or null if not found
     */
    async getDocument(id: string): Promise<DocumentMeta | null> {
        if (!this.initialized) {
            await this.initialize();
        }

        return await this.fileStore.getDocument(id);
    }

    /**
     * Retrieves all documents belonging to a specific category.
     *
     * @param categoryId The ID of the category to filter by
     * @returns Promise resolving to an array of document metadata in the specified category
     */
    async getDocumentsByCategory(categoryId: string): Promise<DocumentMeta[]> {
        if (!this.initialized) {
            await this.initialize();
        }

        return await this.fileStore.getDocumentsByCategory(categoryId);
    }

    /**
     * Retrieves all documents from the indexer.
     *
     * @returns Promise resolving to an array of all document metadata
     */
    async getAllDocuments(): Promise<DocumentMeta[]> {
        if (!this.initialized) {
            await this.initialize();
        }

        return await this.fileStore.getAllDocuments();
    }

    /**
     * Retrieves all available category names.
     *
     * @returns Array of category names
     */
    getCategories(): string[] {
        if (!this.fileStore.isInitialized()) {
            return [];
        }

        return this.fileStore.getCategoryNames();
    }

    /**
     * Retrieves all available category IDs.
     *
     * @returns Array of category IDs
     */
    getCategoryIds(): string[] {
        if (!this.fileStore.isInitialized()) {
            return [];
        }

        return this.fileStore.getCategoryIds();
    }

    /**
     * Retrieves comprehensive statistics about the indexer including filestore, vector database, and capabilities.
     *
     * @returns Object containing detailed statistics about the indexer components and capabilities
     */
    getStats(): {
        fileStore: any;
        vectorDatabase: any;
        keywordIndex: { terms: number };
        capabilities: {
            keywordSearch: boolean;
            semanticSearch: boolean;
            docSearch: boolean;
            similaritySearch: boolean;
        };
    } {
        return {
            fileStore: this.fileStore.isInitialized() ? this.fileStore.getStats() : null,
            vectorDatabase: this.vectorService?.getMetadata() || null,
            keywordIndex: { terms: this.keywordIndex.size },
            capabilities: {
                keywordSearch: true,
                semanticSearch: false, // Disabled in simplified mode
                docSearch: true,
                similaritySearch: this.vectorService?.isInitialized() || false
            }
        };
    }

    /**
     * Checks if vector search capabilities are enabled and initialized.
     *
     * @returns True if vector search is available, false otherwise
     */
    isVectorEnabled(): boolean {
        return this.vectorService?.isInitialized() || false;
    }

    /**
     * Checks if enhanced features are available (always false in simplified indexer).
     *
     * @returns False, as enhanced features are not available in the simplified indexer
     */
    hasEnhancedFeatures(): boolean {
        // Enhanced features are not available in simplified indexer
        // These require the full indexer with EnhancedVectorDBService
        return false;
    }

    /**
     *
     * @param _query
     * @param _options
     */
    async smartCodeSearch(_query: string, _options?: any): Promise<any[]> {
        throw new Error(
            'Smart code search requires enhanced vector database features. Use regular search_docs instead.'
        );
    }

    /**
     *
     * @param _query
     * @param _context
     */
    async generateCodeSuggestions(_query: string, _context?: string): Promise<any> {
        throw new Error('Code suggestions require enhanced vector database features.');
    }

    /**
     * Finds code similar to the specified document (fallback to basic similarity search).
     *
     * @param documentId The ID of the reference document
     * @param options Optional search options including limit
     * @returns Promise resolving to an array of similar documents
     */
    async findSimilarCode(documentId: string, options?: any): Promise<any[]> {
        // Fallback to basic similarity search
        return await this.findSimilarDocuments(documentId, options?.limit || 5);
    }

    /**
     *
     * @param _topic
     * @param _currentLevel
     */
    async getProgressiveLearningPath(_topic: string, _currentLevel?: string): Promise<any[]> {
        throw new Error('Learning path generation requires enhanced vector database features.');
    }

    async close(): Promise<void> {
        if (this.vectorService) {
            await this.vectorService.close();
        }
        this.fileStore.clearCache();
        this.initialized = false;
    }
}
