import fs from 'fs/promises';
import path from 'path';
import { connect } from '@lancedb/lancedb';
import type { EmbeddingMetadata } from '../../../../src/tools/services/vector-simple';
import { SimpleVectorService } from '../../../../src/tools/services/vector-simple';
import { logger } from '../../../../src/utils/logger';
import { resolveEmbeddingsPath } from '../../../../src/utils/embeddings-path';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('@lancedb/lancedb');
jest.mock('../../../../src/utils/logger');
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
        tags_json: '["test", "guide"]',
        headers_json: '["Introduction"]',
        lastModified: '2023-01-01T00:00:00.000Z',
        wordCount: 100,
        excerpt: 'A test document',
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

    // Helper function to setup standard initialization mocks
    const setupInitializationMocks = () => {
        mockResolveEmbeddingsPath.mockResolvedValue({
            dataPath: '/test/data',
            embeddingsPath: '/test/embeddings',
            searchPath: '/test/search',
            docsPath: '/test/docs',
            isExternalPackage: false,
            isAvailable: true
        });

        // Mock table index file
        const mockTableIndex = {
            tables: ['documents_000'],
            totalTables: 1,
            maxVectorsPerTable: 5000,
            totalVectors: 5000
        };

        mockFs.readFile
            .mockResolvedValueOnce(JSON.stringify(mockMetadata)) // metadata.json
            .mockResolvedValueOnce(JSON.stringify(mockTableIndex)); // table_index.json
    };

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

            // Mock table index file
            const mockTableIndex = {
                tables: ['documents_000', 'documents_001'],
                totalTables: 2,
                maxVectorsPerTable: 5000,
                totalVectors: 10000
            };

            mockFs.readFile
                .mockResolvedValueOnce(JSON.stringify(mockMetadata)) // metadata.json
                .mockResolvedValueOnce(JSON.stringify(mockTableIndex)); // table_index.json

            await vectorService.initialize();

            expect(mockResolveEmbeddingsPath).toHaveBeenCalled();
            expect(mockFs.readFile).toHaveBeenCalledWith(path.join(embeddingsPath, 'metadata.json'), 'utf-8');
            expect(mockFs.readFile).toHaveBeenCalledWith(path.join(embeddingsPath, 'table_index.json'), 'utf-8');
            expect(mockConnect).toHaveBeenCalledWith(embeddingsPath);
            expect(mockConnection.openTable).toHaveBeenCalledWith('documents_000');
            expect(mockConnection.openTable).toHaveBeenCalledWith('documents_001');
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

            mockFs.readFile
                .mockResolvedValueOnce(JSON.stringify(mockMetadata)) // metadata.json succeeds
                .mockRejectedValueOnce(new Error('Table index not found')); // table_index.json fails

            mockConnection.openTable.mockRejectedValue(new Error('Table not found'));

            await expect(vectorService.initialize()).rejects.toThrow(
                'Failed to load vector database: Error: No tables found: Error: Table not found'
            );
            expect(vectorService.isInitialized()).toBe(false);
        });

        it('should fallback to single table when table index is not available', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });

            mockFs.readFile
                .mockResolvedValueOnce(JSON.stringify(mockMetadata)) // metadata.json succeeds
                .mockRejectedValueOnce(new Error('Table index not found')); // table_index.json fails

            // Mock successful fallback to single table
            mockConnection.openTable.mockResolvedValue(mockTable);

            await vectorService.initialize();

            expect(mockFs.readFile).toHaveBeenCalledTimes(2);
            expect(mockConnection.openTable).toHaveBeenCalledWith('documents');
            expect(vectorService.isInitialized()).toBe(true);
        });
    });

    describe('semanticSearch', () => {
        beforeEach(async () => {
            setupInitializationMocks();
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
            expect(mockTable.limit).toHaveBeenCalledWith(10); // 5 * 2 for multiple tables
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

            expect(mockTable.limit).toHaveBeenCalledWith(20); // 10 * 2 for multiple tables
        });

        it('should handle search errors', async () => {
            const queryVector = [0.1, 0.2, 0.3];
            const searchError = new Error('Search failed');
            mockTable.toArray.mockRejectedValue(searchError);

            await expect(vectorService.semanticSearch(queryVector)).rejects.toThrow(
                'Semantic search failed: Error: Search failed'
            );
            expect(mockLogger.error).toHaveBeenCalledWith(`Semantic search failed: ${searchError}`);
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
            setupInitializationMocks();
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
            setupInitializationMocks();
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
            expect(mockLogger.error).toHaveBeenCalledWith(`Find similar documents failed: ${searchError}`);
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
            setupInitializationMocks();
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

            expect(mockTable.limit).toHaveBeenCalledWith(20); // Math.ceil(10/1) + 10 = 20
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
            expect(mockLogger.error).toHaveBeenCalledWith(`Get documents by category failed: ${searchError}`);
        });
    });

    describe('getMetadata', () => {
        it('should return null when not initialized', () => {
            const result = vectorService.getMetadata();
            expect(result).toBeNull();
        });

        it('should return metadata when initialized', async () => {
            setupInitializationMocks();
            await vectorService.initialize();

            const result = vectorService.getMetadata();
            expect(result).toEqual(mockMetadata);
        });
    });

    describe('isInitialized', () => {
        it('should return false when not initialized', () => {
            expect(vectorService.isInitialized()).toBe(false);
        });

        it('should return false when only tables is set', async () => {
            // Simulate partial initialization
            vectorService['tables'] = [mockTable];
            expect(vectorService.isInitialized()).toBe(false);
        });

        it('should return false when only metadata is set', async () => {
            // Simulate partial initialization
            vectorService['metadata'] = mockMetadata;
            expect(vectorService.isInitialized()).toBe(false);
        });

        it('should return true when fully initialized', async () => {
            setupInitializationMocks();
            await vectorService.initialize();

            expect(vectorService.isInitialized()).toBe(true);
        });
    });

    describe('parseJsonField', () => {
        beforeEach(async () => {
            setupInitializationMocks();
            await vectorService.initialize();
        });

        it('should parse valid JSON strings correctly', async () => {
            // Create a mock result with valid JSON
            const mockResults = [
                {
                    ...mockVectorDocument,
                    tags_json: '["tag1", "tag2"]',
                    headers_json: '["header1", "header2"]'
                }
            ];
            mockTable.toArray.mockResolvedValue(mockResults);

            const results = await vectorService.semanticSearch([0.1, 0.2, 0.3]);

            expect(results[0].document.metadata.tags).toEqual(['tag1', 'tag2']);
            expect(results[0].document.metadata.headers).toEqual(['header1', 'header2']);
        });

        it('should handle invalid JSON gracefully', async () => {
            // Create a mock result with invalid JSON
            const mockResults = [
                {
                    ...mockVectorDocument,
                    tags_json: 'invalid json {',
                    headers_json: 'also invalid ['
                }
            ];
            mockTable.toArray.mockResolvedValue(mockResults);

            const results = await vectorService.semanticSearch([0.1, 0.2, 0.3]);

            // Should return empty arrays when JSON parsing fails
            expect(results[0].document.metadata.tags).toEqual([]);
            expect(results[0].document.metadata.headers).toEqual([]);
        });

        it('should handle empty strings correctly', async () => {
            // Create a mock result with empty JSON strings
            const mockResults = [
                {
                    ...mockVectorDocument,
                    tags_json: '',
                    headers_json: null
                }
            ];
            mockTable.toArray.mockResolvedValue(mockResults);

            const results = await vectorService.semanticSearch([0.1, 0.2, 0.3]);

            // Should return empty arrays for empty/null strings
            expect(results[0].document.metadata.tags).toEqual([]);
            expect(results[0].document.metadata.headers).toEqual([]);
        });
    });

    describe('findSimilarToDocument edge cases', () => {
        beforeEach(async () => {
            setupInitializationMocks();
            await vectorService.initialize();
        });

        it('should handle multiple documents with different scores and sort correctly', async () => {
            const referenceDoc = { ...mockVectorDocument, document_id: 'doc1', vector: [0.1, 0.2, 0.3] };

            // Create multiple similar documents with different scores
            const doc2 = { ...mockVectorDocument, document_id: 'doc2', _distance: 0.5 }; // score: 0.5
            const doc3 = { ...mockVectorDocument, document_id: 'doc3', _distance: 0.1 }; // score: 0.9 (best)
            const doc4 = { ...mockVectorDocument, document_id: 'doc4', _distance: 0.3 }; // score: 0.7

            mockTable.toArray
                .mockResolvedValueOnce([referenceDoc]) // Reference document
                .mockResolvedValueOnce([doc2, doc3, doc4]); // Similar documents in unsorted order

            const results = await vectorService.findSimilarToDocument('doc1', 3);

            expect(results).toHaveLength(3);
            // Should be sorted by score (descending): doc3 (0.9), doc4 (0.7), doc2 (0.5)
            expect(results[0].document.id).toBe('doc3');
            expect(results[0].score).toBe(0.9);
            expect(results[1].document.id).toBe('doc4');
            expect(results[1].score).toBe(0.7);
            expect(results[2].document.id).toBe('doc2');
            expect(results[2].score).toBe(0.5);
        });

        it('should handle empty results when no similar documents found in any table', async () => {
            const referenceDoc = { ...mockVectorDocument, document_id: 'doc1', vector: [0.1, 0.2, 0.3] };

            mockTable.toArray
                .mockResolvedValueOnce([referenceDoc]) // Reference document found
                .mockResolvedValueOnce([]); // No similar documents found

            const results = await vectorService.findSimilarToDocument('doc1', 5);

            expect(results).toHaveLength(0);
        });
    });

    describe('semantic search edge cases', () => {
        beforeEach(async () => {
            setupInitializationMocks();
            await vectorService.initialize();
        });

        it('should handle results with undefined distance values', async () => {
            const resultWithoutDistance = {
                ...mockVectorDocument,
                _distance: undefined // Test undefined distance
            };
            mockTable.toArray.mockResolvedValue([resultWithoutDistance]);

            const results = await vectorService.semanticSearch([0.1, 0.2, 0.3]);

            expect(results[0].score).toBe(1); // 1 - 0 (default)
            expect(results[0].distance).toBe(0);
        });

        it('should sort results correctly when distances are the same', async () => {
            const result1 = { ...mockVectorDocument, document_id: 'doc1', _distance: 0.5 };
            const result2 = { ...mockVectorDocument, document_id: 'doc2', _distance: 0.5 };
            const result3 = { ...mockVectorDocument, document_id: 'doc3', _distance: 0.3 };

            mockTable.toArray.mockResolvedValue([result1, result2, result3]);

            const results = await vectorService.semanticSearch([0.1, 0.2, 0.3], 3);

            // Should be sorted by distance (ascending): doc3 (0.3), then doc1 and doc2 (0.5 each)
            expect(results[0].document.id).toBe('doc3');
            expect(results[0].distance).toBe(0.3);
            expect(results[1].distance).toBe(0.5);
            expect(results[2].distance).toBe(0.5);
        });
    });

    describe('getDocumentsByCategory edge cases', () => {
        beforeEach(async () => {
            setupInitializationMocks();
            await vectorService.initialize();
        });

        it('should handle metadata with missing totalVectors in fallback mode', async () => {
            // This test covers the fallback logic where totalVectors might be undefined
            const metadataWithoutTotal = {
                version: '1.0.0',
                createdAt: '2023-01-01T00:00:00.000Z',
                model: 'test-model',
                dimensions: 384,
                totalDocuments: 100,
                chunkSize: 512,
                chunkOverlap: 50
                // totalVectors is missing
            };

            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });

            mockFs.readFile
                .mockResolvedValueOnce(JSON.stringify(metadataWithoutTotal)) // metadata.json without totalVectors
                .mockRejectedValueOnce(new Error('Table index not found')); // table_index.json fails

            // Mock successful fallback to single table
            mockConnection.openTable.mockResolvedValue(mockTable);

            await vectorService.initialize();

            expect(vectorService.isInitialized()).toBe(true);
            // Should handle missing totalVectors gracefully with || 0
        });

        it('should handle no limit provided with multiple tables', async () => {
            // Setup multiple tables for this test
            const additionalTable = {
                search: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn(),
                toArray: jest.fn().mockResolvedValue([])
            } as any;

            // Mock having multiple tables
            vectorService['tables'] = [mockTable, additionalTable];

            await vectorService.getDocumentsByCategory('guides'); // No limit provided

            // When no limit is provided, limit should not be called
            expect(mockTable.limit).not.toHaveBeenCalled();
            expect(additionalTable.limit).not.toHaveBeenCalled();
        });
    });

    describe('semantic search with category filtering', () => {
        beforeEach(async () => {
            setupInitializationMocks();
            await vectorService.initialize();
        });

        it('should handle category filter in multiple table scenario', async () => {
            // Setup multiple tables for this test
            const additionalTable = {
                vectorSearch: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                toArray: jest.fn().mockResolvedValue([])
            } as any;

            // Make sure both tables return the chain correctly
            mockTable.toArray.mockResolvedValue([mockVectorDocument]);
            additionalTable.toArray.mockResolvedValue([]);

            // Mock having multiple tables
            vectorService['tables'] = [mockTable, additionalTable];

            const queryVector = [0.1, 0.2, 0.3];
            await vectorService.semanticSearch(queryVector, 5, 'guides');

            // Verify category filter was applied to both tables
            expect(mockTable.where).toHaveBeenCalledWith('category = "guides"');
            expect(additionalTable.where).toHaveBeenCalledWith('category = "guides"');
        });

        it('should handle semantic search without category filter', async () => {
            const queryVector = [0.1, 0.2, 0.3];
            mockTable.toArray.mockResolvedValue([mockVectorDocument]);

            await vectorService.semanticSearch(queryVector, 5); // No category filter

            // Verify no where clause was applied when no category filter
            expect(mockTable.where).not.toHaveBeenCalled();
        });
    });

    describe('findSimilarToDocument with multiple tables', () => {
        beforeEach(async () => {
            setupInitializationMocks();
            await vectorService.initialize();
        });

        it('should search across multiple tables for reference document', async () => {
            // Setup multiple tables
            const table1 = {
                search: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                toArray: jest.fn().mockResolvedValue([]), // No reference doc in table1
                vectorSearch: jest.fn().mockReturnThis()
            } as any;

            const table2 = {
                search: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                toArray: jest
                    .fn()
                    .mockResolvedValue([{ ...mockVectorDocument, document_id: 'ref-doc', vector: [0.1, 0.2, 0.3] }]), // Reference doc found in table2
                vectorSearch: jest.fn().mockReturnThis()
            } as any;

            // Mock having multiple tables
            vectorService['tables'] = [table1, table2];

            // Mock the vector search results for both tables
            table1.toArray.mockResolvedValueOnce([]).mockResolvedValueOnce([]); // No ref doc, no similar docs
            table2.toArray
                .mockResolvedValueOnce([{ ...mockVectorDocument, document_id: 'ref-doc', vector: [0.1, 0.2, 0.3] }])
                .mockResolvedValueOnce([{ ...mockVectorDocument, document_id: 'similar-doc', _distance: 0.2 }]); // Ref doc found, similar docs found

            const results = await vectorService.findSimilarToDocument('ref-doc', 5);

            // Should search all tables for reference document
            expect(table1.search).toHaveBeenCalledWith('');
            expect(table2.search).toHaveBeenCalledWith('');

            // Should find similar documents after finding reference
            expect(results).toHaveLength(1);
            expect(results[0].document.id).toBe('similar-doc');
        });
    });

    describe('edge cases for better branch coverage', () => {
        beforeEach(async () => {
            setupInitializationMocks();
            await vectorService.initialize();
        });

        it('should handle documents with same score but different document IDs', async () => {
            const doc1 = { ...mockVectorDocument, document_id: 'doc1', _distance: 0.5 };
            const doc2 = { ...mockVectorDocument, document_id: 'doc1', _distance: 0.3 }; // Same doc, better score
            const doc3 = { ...mockVectorDocument, document_id: 'doc2', _distance: 0.4 };

            const referenceDoc = { ...mockVectorDocument, document_id: 'ref-doc', vector: [0.1, 0.2, 0.3] };

            mockTable.toArray
                .mockResolvedValueOnce([referenceDoc]) // Reference document
                .mockResolvedValueOnce([doc1, doc2, doc3]); // Similar documents with duplicates

            const results = await vectorService.findSimilarToDocument('ref-doc', 5);

            // Should only have 2 unique documents, with the best score for doc1
            expect(results).toHaveLength(2);
            expect(results[0].document.id).toBe('doc1');
            expect(results[0].score).toBe(0.7); // 1 - 0.3 (better distance)
            expect(results[1].document.id).toBe('doc2');
            expect(results[1].score).toBe(0.6); // 1 - 0.4
        });

        it('should handle getDocumentsByCategory with no limit and single result', async () => {
            mockTable.toArray.mockResolvedValue([mockVectorDocument]);

            const results = await vectorService.getDocumentsByCategory('guides');

            expect(results).toHaveLength(1);
            expect(results[0].document.category).toBe('guides');
            expect(results[0].score).toBe(1.0); // No distance for category queries
        });

        it('should handle semantic search with multiple chunks of same document', async () => {
            const chunk1 = { ...mockVectorDocument, document_id: 'doc1', chunk_index: 0, _distance: 0.1 };
            const chunk2 = { ...mockVectorDocument, document_id: 'doc1', chunk_index: 1, _distance: 0.2 };
            const chunk3 = { ...mockVectorDocument, document_id: 'doc2', chunk_index: 0, _distance: 0.15 };

            mockTable.toArray.mockResolvedValue([chunk1, chunk2, chunk3]);

            const results = await vectorService.semanticSearch([0.1, 0.2, 0.3], 10);

            // Should return all chunks sorted by distance
            expect(results).toHaveLength(3);
            expect(results[0].document.id).toBe('doc1'); // chunk_index: 0, distance: 0.1
            expect(results[0].document.chunk_index).toBe(0);
            expect(results[1].document.id).toBe('doc2'); // chunk_index: 0, distance: 0.15
            expect(results[2].document.id).toBe('doc1'); // chunk_index: 1, distance: 0.2
        });

        it('should handle parseJsonField returning null values correctly', async () => {
            // Test the || [] fallback in parseJsonField usage
            const resultWithNullJson = {
                ...mockVectorDocument,
                tags_json: null, // This will cause parseJsonField to return null
                headers_json: null
            };
            mockTable.toArray.mockResolvedValue([resultWithNullJson]);

            const results = await vectorService.getDocumentsByCategory('guides');

            // Should handle null parseJsonField results with || [] fallback
            expect(results[0].document.metadata.tags).toEqual([]);
            expect(results[0].document.metadata.headers).toEqual([]);
        });

        it('should handle documentScores map logic correctly in findSimilarToDocument', async () => {
            const referenceDoc = { ...mockVectorDocument, document_id: 'ref-doc', vector: [0.1, 0.2, 0.3] };

            // Create scenario where map has and doesn't have document IDs
            const existingDoc = { ...mockVectorDocument, document_id: 'existing-doc', _distance: 0.5 }; // score: 0.5
            const newDoc = { ...mockVectorDocument, document_id: 'new-doc', _distance: 0.3 }; // score: 0.7
            const betterExistingDoc = { ...mockVectorDocument, document_id: 'existing-doc', _distance: 0.2 }; // score: 0.8

            mockTable.toArray
                .mockResolvedValueOnce([referenceDoc]) // Reference document
                .mockResolvedValueOnce([existingDoc, newDoc, betterExistingDoc]); // Results with duplicates

            const results = await vectorService.findSimilarToDocument('ref-doc', 5);

            // Should handle both !documentScores.has(docId) and documentScores.get(docId).score < score branches
            expect(results).toHaveLength(2);
            expect(results[0].document.id).toBe('existing-doc');
            expect(results[0].score).toBe(0.8); // Best score for existing-doc
            expect(results[1].document.id).toBe('new-doc');
            expect(results[1].score).toBe(0.7);
        });

        it('should handle edge cases in conditionals', async () => {
            // Test edge cases for conditional branches that may not be covered
            const mockResult = {
                ...mockVectorDocument,
                _distance: null as any, // Test null distance
                tags_json: 'invalid', // This will trigger catch block
                headers_json: '' // Empty string
            };

            mockTable.toArray.mockResolvedValue([mockResult]);

            const results = await vectorService.semanticSearch([0.1, 0.2, 0.3]);

            // Should handle null distance gracefully
            expect(results[0].distance).toBe(0);
            expect(results[0].score).toBe(1);
            // Should handle invalid JSON and empty strings gracefully
            expect(results[0].document.metadata.tags).toEqual([]);
            expect(results[0].document.metadata.headers).toEqual([]);
        });
    });

    describe('close', () => {
        beforeEach(async () => {
            setupInitializationMocks();
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

            // Setup fresh mocks for reinitialization
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });

            const mockTableIndex = {
                tables: ['documents_000'],
                totalTables: 1,
                maxVectorsPerTable: 5000,
                totalVectors: 5000
            };

            mockFs.readFile
                .mockResolvedValueOnce(JSON.stringify(mockMetadata)) // metadata.json
                .mockResolvedValueOnce(JSON.stringify(mockTableIndex)); // table_index.json

            await vectorService.initialize();

            expect(vectorService.isInitialized()).toBe(true);
        });
    });
});
