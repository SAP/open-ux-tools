import fs from 'fs/promises';
import path from 'path';
import { connect } from '@lancedb/lancedb';
import type { EmbeddingMetadata } from '../../../../src/tools/services/vector-simple';
import { SimpleVectorService } from '../../../../src/tools/services/vector-simple';
import { logger } from '../../../../src/tools/services/utils/logger';
import { resolveEmbeddingsPath } from '../../../../src/utils/embeddings-path';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('@lancedb/lancedb');
jest.mock('../../../../src/tools/services/utils/logger');
jest.mock('../../../../src/utils/embeddings-path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockConnect = connect as jest.MockedFunction<typeof connect>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockResolveEmbeddingsPath = resolveEmbeddingsPath as jest.MockedFunction<typeof resolveEmbeddingsPath>;

describe('SimpleVectorService', () => {
    let vectorService: SimpleVectorService;
    let mockConnection: any;
    let mockTable: any;

    const mockMetadata: EmbeddingMetadata = {
        version: '1.0.0',
        createdAt: '2023-01-01T00:00:00.000Z',
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        dimensions: 384,
        totalVectors: 1000,
        totalDocuments: 100,
        chunkSize: 512,
        chunkOverlap: 64
    };

    const mockVectorDocument = {
        document_id: 'doc1',
        vector: [0.1, 0.2, 0.3],
        content: 'This is a test document',
        title: 'Test Document',
        category: 'guides',
        path: 'guides/test.md',
        chunk_index: 0,
        metadata: {
            tags: ['test', 'guide'],
            headers: ['Introduction'],
            lastModified: '2023-01-01T00:00:00.000Z',
            wordCount: 100,
            excerpt: 'A test document'
        },
        _distance: 0.1
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock table with chainable methods
        mockTable = {
            vectorSearch: jest.fn().mockReturnThis(),
            search: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn()
        };

        // Setup mock connection
        mockConnection = {
            openTable: jest.fn().mockResolvedValue(mockTable)
        };

        mockConnect.mockResolvedValue(mockConnection);

        vectorService = new SimpleVectorService();
    });

    afterAll(async () => {
        // Ensure all connections are closed to prevent Jest open handles
        if (vectorService && vectorService.isInitialized()) {
            await vectorService.close();
        }
    });

    describe('constructor', () => {
        it('should create instance with default data path', () => {
            const service = new SimpleVectorService();
            expect(service).toBeInstanceOf(SimpleVectorService);
            expect(service.isInitialized()).toBe(false);
        });

        it('should create instance with custom data path', () => {
            const customPath = '/custom/embeddings';
            const service = new SimpleVectorService(customPath);
            expect(service).toBeInstanceOf(SimpleVectorService);
            expect(service.isInitialized()).toBe(false);
        });
    });

    describe('initialize', () => {
        it('should initialize successfully with available embeddings data', async () => {
            const embeddingsPath = '/test/embeddings';
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath,
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: true,
                isAvailable: true
            });

            mockFs.readFile.mockResolvedValue(JSON.stringify(mockMetadata));

            await vectorService.initialize();

            expect(mockResolveEmbeddingsPath).toHaveBeenCalled();
            expect(mockFs.readFile).toHaveBeenCalledWith(path.join(embeddingsPath, 'metadata.json'), 'utf-8');
            expect(mockConnect).toHaveBeenCalledWith(embeddingsPath);
            expect(mockConnection.openTable).toHaveBeenCalledWith('documents');
            expect(mockLogger.log).toHaveBeenCalledWith('Loading vector database from pre-built embeddings...');
            expect(mockLogger.log).toHaveBeenCalledWith(`Using embeddings path: ${embeddingsPath} (external: true)`);
            expect(mockLogger.log).toHaveBeenCalledWith('✓ Vector database loaded and ready');
            expect(vectorService.isInitialized()).toBe(true);
        });

        it('should throw error when embeddings data is not available', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: false
            });

            await expect(vectorService.initialize()).rejects.toThrow(
                'Failed to load vector database: Error: No embeddings data available'
            );
            expect(vectorService.isInitialized()).toBe(false);
        });

        it('should throw error when metadata file cannot be read', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });

            const readError = new Error('Metadata file not found');
            mockFs.readFile.mockRejectedValue(readError);

            await expect(vectorService.initialize()).rejects.toThrow(
                'Failed to load vector database: Error: Metadata file not found'
            );
            expect(vectorService.isInitialized()).toBe(false);
        });

        it('should throw error when LanceDB connection fails', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });

            mockFs.readFile.mockResolvedValue(JSON.stringify(mockMetadata));
            mockConnect.mockRejectedValue(new Error('Connection failed'));

            await expect(vectorService.initialize()).rejects.toThrow(
                'Failed to load vector database: Error: Connection failed'
            );
            expect(vectorService.isInitialized()).toBe(false);
        });

        it('should throw error when table opening fails', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });

            mockFs.readFile.mockResolvedValue(JSON.stringify(mockMetadata));
            mockConnection.openTable.mockRejectedValue(new Error('Table not found'));

            await expect(vectorService.initialize()).rejects.toThrow(
                'Failed to load vector database: Error: Table not found'
            );
            expect(vectorService.isInitialized()).toBe(false);
        });
    });

    describe('semanticSearch', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue(JSON.stringify(mockMetadata));
            await vectorService.initialize();
        });

        it('should throw error when not initialized', async () => {
            const uninitializedService = new SimpleVectorService();
            const queryVector = [0.1, 0.2, 0.3];

            await expect(uninitializedService.semanticSearch(queryVector)).rejects.toThrow(
                'Vector database not initialized'
            );
        });

        it('should perform semantic search successfully', async () => {
            const queryVector = [0.1, 0.2, 0.3];
            const mockResults = [mockVectorDocument];
            mockTable.toArray.mockResolvedValue(mockResults);

            const results = await vectorService.semanticSearch(queryVector, 5);

            expect(mockTable.vectorSearch).toHaveBeenCalledWith(queryVector);
            expect(mockTable.limit).toHaveBeenCalledWith(5);
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                document: {
                    id: 'doc1',
                    vector: [0.1, 0.2, 0.3],
                    content: 'This is a test document',
                    title: 'Test Document',
                    category: 'guides',
                    path: 'guides/test.md',
                    chunk_index: 0,
                    metadata: {
                        tags: ['test', 'guide'],
                        headers: ['Introduction'],
                        lastModified: new Date('2023-01-01T00:00:00.000Z'),
                        wordCount: 100,
                        excerpt: 'A test document'
                    }
                },
                score: 0.9, // 1 - 0.1
                distance: 0.1
            });
        });

        it('should apply category filter when provided', async () => {
            const queryVector = [0.1, 0.2, 0.3];
            mockTable.toArray.mockResolvedValue([]);

            await vectorService.semanticSearch(queryVector, 5, 'guides');

            expect(mockTable.where).toHaveBeenCalledWith('category = "guides"');
        });

        it('should use default limit when not specified', async () => {
            const queryVector = [0.1, 0.2, 0.3];
            mockTable.toArray.mockResolvedValue([]);

            await vectorService.semanticSearch(queryVector);

            expect(mockTable.limit).toHaveBeenCalledWith(10);
        });

        it('should handle search errors', async () => {
            const queryVector = [0.1, 0.2, 0.3];
            const searchError = new Error('Search failed');
            mockTable.toArray.mockRejectedValue(searchError);

            await expect(vectorService.semanticSearch(queryVector)).rejects.toThrow(
                'Semantic search failed: Error: Search failed'
            );
            expect(mockLogger.error).toHaveBeenCalledWith('Semantic search failed:', searchError);
        });

        it('should handle results without distance property', async () => {
            const queryVector = [0.1, 0.2, 0.3];
            const resultWithoutDistance = { ...mockVectorDocument };
            // Remove _distance property to test default handling
            const { _distance, ...resultWithoutDistanceProp } = resultWithoutDistance;
            mockTable.toArray.mockResolvedValue([resultWithoutDistanceProp]);

            const results = await vectorService.semanticSearch(queryVector);

            expect(results[0].score).toBe(1); // 1 - 0
            expect(results[0].distance).toBe(0);
        });
    });

    describe('findSimilarToText', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue(JSON.stringify(mockMetadata));
            await vectorService.initialize();
        });

        it('should return empty results in simplified mode', async () => {
            const results = await vectorService.findSimilarToText('test text');

            expect(results).toEqual([]);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'findSimilarToText requires embedding generation - not available in simplified mode'
            );
        });
    });

    describe('findSimilarToDocument', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue(JSON.stringify(mockMetadata));
            await vectorService.initialize();
        });

        it('should throw error when not initialized', async () => {
            const uninitializedService = new SimpleVectorService();

            await expect(uninitializedService.findSimilarToDocument('doc1')).rejects.toThrow(
                'Vector database not initialized'
            );
        });

        it('should find similar documents successfully', async () => {
            const referenceDoc = { ...mockVectorDocument, document_id: 'doc1', vector: [0.1, 0.2, 0.3] };
            const similarDoc = { ...mockVectorDocument, document_id: 'doc2', _distance: 0.2 };

            // First search: find reference document
            mockTable.toArray
                .mockResolvedValueOnce([referenceDoc]) // Reference document
                .mockResolvedValueOnce([similarDoc]); // Similar documents

            const results = await vectorService.findSimilarToDocument('doc1', 3);

            expect(mockTable.search).toHaveBeenCalledWith('');
            expect(mockTable.where).toHaveBeenCalledWith('document_id = "doc1" AND chunk_index = 0');
            expect(mockTable.vectorSearch).toHaveBeenCalledWith([0.1, 0.2, 0.3]);
            expect(mockTable.where).toHaveBeenCalledWith('document_id != "doc1"');
            expect(mockTable.limit).toHaveBeenCalledWith(6); // 3 * 2

            expect(results).toHaveLength(1);
            expect(results[0].document.id).toBe('doc2');
            expect(results[0].score).toBe(0.8); // 1 - 0.2
            expect(results[0].distance).toBe(0.2);
        });

        it('should return empty array when reference document not found', async () => {
            mockTable.toArray.mockResolvedValueOnce([]); // No reference document found

            const results = await vectorService.findSimilarToDocument('nonexistent');

            expect(results).toEqual([]);
        });

        it('should deduplicate results by document_id', async () => {
            const referenceDoc = { ...mockVectorDocument, document_id: 'doc1', vector: [0.1, 0.2, 0.3] };
            const chunk1 = { ...mockVectorDocument, document_id: 'doc2', chunk_index: 0, _distance: 0.2 };
            const chunk2 = { ...mockVectorDocument, document_id: 'doc2', chunk_index: 1, _distance: 0.1 }; // Better score

            mockTable.toArray.mockResolvedValueOnce([referenceDoc]).mockResolvedValueOnce([chunk1, chunk2]);

            const results = await vectorService.findSimilarToDocument('doc1');

            expect(results).toHaveLength(1);
            expect(results[0].document.id).toBe('doc2');
            expect(results[0].score).toBe(0.9); // Better score from chunk2: 1 - 0.1
            expect(results[0].distance).toBe(0.1);
        });

        it('should handle errors gracefully', async () => {
            const searchError = new Error('Search failed');
            mockTable.toArray.mockRejectedValueOnce(searchError);

            const results = await vectorService.findSimilarToDocument('doc1');

            expect(results).toEqual([]);
            expect(mockLogger.error).toHaveBeenCalledWith('Find similar documents failed:', searchError);
        });

        it('should use default limit when not specified', async () => {
            const referenceDoc = { ...mockVectorDocument, document_id: 'doc1', vector: [0.1, 0.2, 0.3] };
            mockTable.toArray.mockResolvedValueOnce([referenceDoc]).mockResolvedValueOnce([]);

            await vectorService.findSimilarToDocument('doc1');

            expect(mockTable.limit).toHaveBeenCalledWith(10); // 5 * 2
        });
    });

    describe('getDocumentsByCategory', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue(JSON.stringify(mockMetadata));
            await vectorService.initialize();
        });

        it('should throw error when not initialized', async () => {
            const uninitializedService = new SimpleVectorService();

            await expect(uninitializedService.getDocumentsByCategory('guides')).rejects.toThrow(
                'Vector database not initialized'
            );
        });

        it('should get documents by category successfully', async () => {
            const mockResults = [mockVectorDocument];
            mockTable.toArray.mockResolvedValue(mockResults);

            const results = await vectorService.getDocumentsByCategory('guides');

            expect(mockTable.search).toHaveBeenCalledWith('');
            expect(mockTable.where).toHaveBeenCalledWith('category = "guides" AND chunk_index = 0');
            expect(results).toHaveLength(1);
            expect(results[0].document.id).toBe('doc1');
            expect(results[0].score).toBe(1.0);
            expect(results[0].distance).toBe(0);
        });

        it('should apply limit when provided', async () => {
            mockTable.toArray.mockResolvedValue([]);

            await vectorService.getDocumentsByCategory('guides', 10);

            expect(mockTable.limit).toHaveBeenCalledWith(10);
        });

        it('should not apply limit when not provided', async () => {
            mockTable.toArray.mockResolvedValue([]);

            await vectorService.getDocumentsByCategory('guides');

            expect(mockTable.limit).not.toHaveBeenCalled();
        });

        it('should handle search errors gracefully', async () => {
            const searchError = new Error('Category search failed');
            mockTable.toArray.mockRejectedValue(searchError);

            const results = await vectorService.getDocumentsByCategory('guides');

            expect(results).toEqual([]);
            expect(mockLogger.error).toHaveBeenCalledWith('Get documents by category failed:', searchError);
        });
    });

    describe('getMetadata', () => {
        it('should return null when not initialized', () => {
            const result = vectorService.getMetadata();
            expect(result).toBeNull();
        });

        it('should return metadata when initialized', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue(JSON.stringify(mockMetadata));
            await vectorService.initialize();

            const result = vectorService.getMetadata();
            expect(result).toEqual(mockMetadata);
        });
    });

    describe('isInitialized', () => {
        it('should return false when not initialized', () => {
            expect(vectorService.isInitialized()).toBe(false);
        });

        it('should return false when only table is set', async () => {
            // Simulate partial initialization
            vectorService['table'] = mockTable;
            expect(vectorService.isInitialized()).toBe(false);
        });

        it('should return false when only metadata is set', async () => {
            // Simulate partial initialization
            vectorService['metadata'] = mockMetadata;
            expect(vectorService.isInitialized()).toBe(false);
        });

        it('should return true when fully initialized', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue(JSON.stringify(mockMetadata));
            await vectorService.initialize();

            expect(vectorService.isInitialized()).toBe(true);
        });
    });

    describe('close', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue(JSON.stringify(mockMetadata));
            await vectorService.initialize();
        });

        it('should close connection and clear references', async () => {
            await vectorService.close();

            expect(mockLogger.log).toHaveBeenCalledWith('Vector database connection closed');
            expect(vectorService.isInitialized()).toBe(false);
        });

        it('should handle case when connection is null', async () => {
            vectorService['connection'] = null;

            await expect(vectorService.close()).resolves.not.toThrow();
        });

        it('should allow reinitialization after close', async () => {
            await vectorService.close();

            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue(JSON.stringify(mockMetadata));

            await vectorService.initialize();

            expect(vectorService.isInitialized()).toBe(true);
        });
    });
});
