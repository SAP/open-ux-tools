import fs from 'fs/promises';
import path from 'path';
import type { DocumentMeta } from './types/index';
import { logger } from '../../utils/logger';
import { resolveEmbeddingsPath } from '../../utils/embeddings-path';

export interface FileStoreIndex {
    version: string;
    generatedAt: string;
    totalDocuments: number;
    categories: Array<{
        id: string;
        name: string;
        count: number;
        documents: string[];
    }>;
    documents: Record<string, string>; // docId -> relative path
}

/**
 *
 */
export class FileStoreService {
    private dataPath: string;
    private index: FileStoreIndex | null = null;
    private readonly documentCache = new Map<string, DocumentMeta>();

    /**
     * Constructor for FileStoreService.
     *
     * @param dataPath Optional custom data path (will be resolved dynamically)
     */
    constructor(dataPath?: string) {
        // dataPath parameter is kept for compatibility but will be resolved dynamically
        this.dataPath = dataPath || '';
    }

    async initialize(): Promise<void> {
        try {
            logger.log('Loading documentation from filestore...');

            // Resolve the docs path dynamically
            const pathInfo = await resolveEmbeddingsPath();

            if (!pathInfo.isAvailable) {
                throw new Error('No documentation data available');
            }

            this.dataPath = pathInfo.docsPath;
            logger.log(`Using docs path: ${this.dataPath} (external: ${pathInfo.isExternalPackage})`);

            const indexPath = path.join(this.dataPath, 'index.json');
            const indexContent = await fs.readFile(indexPath, 'utf-8');
            this.index = JSON.parse(indexContent);

            logger.log(`✓ Loaded filestore index: ${this.index!.totalDocuments} documents`);
            logger.log(`✓ Categories: ${this.index!.categories.length}`);
            logger.log(`✓ Generated at: ${this.index!.generatedAt}`);
        } catch (error) {
            throw new Error(`Failed to load filestore: ${error}`);
        }
    }

    /**
     * Retrieves a document by its ID from the filestore.
     *
     * @param id The unique identifier of the document to retrieve
     * @returns Promise resolving to the document metadata or null if not found
     */
    async getDocument(id: string): Promise<DocumentMeta | null> {
        if (!this.index) {
            throw new Error('FileStore not initialized');
        }

        // Check cache first
        if (this.documentCache.has(id)) {
            return this.documentCache.get(id)!;
        }

        // Find document path in index
        const relativePath = this.index.documents[id];
        if (!relativePath) {
            return null;
        }

        try {
            const docPath = path.join(this.dataPath, relativePath);
            const docContent = await fs.readFile(docPath, 'utf-8');
            const doc = JSON.parse(docContent) as DocumentMeta;

            // Parse lastModified as Date
            doc.lastModified = new Date(doc.lastModified);

            // Cache the document
            this.documentCache.set(id, doc);

            return doc;
        } catch (error) {
            logger.warn(`Failed to load document ${id}: ${error}`);
            return null;
        }
    }

    /**
     * Retrieves all documents from the filestore.
     *
     * @returns Promise resolving to an array of all document metadata
     */
    async getAllDocuments(): Promise<DocumentMeta[]> {
        if (!this.index) {
            throw new Error('FileStore not initialized');
        }

        const documents: DocumentMeta[] = [];

        for (const docId of Object.keys(this.index.documents)) {
            const doc = await this.getDocument(docId);
            if (doc) {
                documents.push(doc);
            }
        }

        return documents;
    }

    /**
     * Retrieves all documents belonging to a specific category.
     *
     * @param categoryId The ID of the category to filter by
     * @returns Promise resolving to an array of document metadata in the specified category
     */
    async getDocumentsByCategory(categoryId: string): Promise<DocumentMeta[]> {
        if (!this.index) {
            throw new Error('FileStore not initialized');
        }

        const category = this.index.categories.find((cat) => cat.id === categoryId);
        if (!category) {
            return [];
        }

        const documents: DocumentMeta[] = [];

        for (const docId of category.documents) {
            const doc = await this.getDocument(docId);
            if (doc) {
                documents.push(doc);
            }
        }

        return documents;
    }

    /**
     * Retrieves all available categories with their metadata.
     *
     * @returns Array of category objects containing id, name, and document count
     */
    getCategories(): Array<{ id: string; name: string; count: number }> {
        if (!this.index) {
            throw new Error('FileStore not initialized');
        }

        return this.index.categories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            count: cat.count
        }));
    }

    /**
     * Retrieves the names of all available categories.
     *
     * @returns Array of category names
     */
    getCategoryNames(): string[] {
        return this.getCategories().map((cat) => cat.name);
    }

    /**
     * Retrieves the IDs of all available categories.
     *
     * @returns Array of category IDs
     */
    getCategoryIds(): string[] {
        return this.getCategories().map((cat) => cat.id);
    }

    /**
     * Retrieves statistics about the filestore.
     *
     * @returns Object containing filestore statistics including document count, categories, version, and generation date
     */
    getStats(): {
        totalDocuments: number;
        totalCategories: number;
        version: string;
        generatedAt: string;
    } {
        if (!this.index) {
            throw new Error('FileStore not initialized');
        }

        return {
            totalDocuments: this.index.totalDocuments,
            totalCategories: this.index.categories.length,
            version: this.index.version,
            generatedAt: this.index.generatedAt
        };
    }

    /**
     * Checks if the filestore has been initialized.
     *
     * @returns True if the filestore is initialized, false otherwise
     */
    isInitialized(): boolean {
        return this.index !== null;
    }

    clearCache(): void {
        this.documentCache.clear();
    }
}
