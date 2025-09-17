import fs from 'fs/promises';
import { SimpleDocumentIndexer } from '../../../../src/tools/services/indexer-simple';
import { FileStoreService } from '../../../../src/tools/services/filestore';
import { SimpleVectorService } from '../../../../src/tools/services/vector-simple';
import { logger } from '../../../../src/tools/services/utils/logger';
import { resolveEmbeddingsPath } from '../../../../src/utils/embeddings-path';
import type { DocumentMeta } from '../../../../src/tools/services/types/index';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('../../../../src/tools/services/filestore');
jest.mock('../../../../src/tools/services/vector-simple');
jest.mock('../../../../src/tools/services/utils/logger');
jest.mock('../../../../src/utils/embeddings-path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockResolveEmbeddingsPath = resolveEmbeddingsPath as jest.MockedFunction<typeof resolveEmbeddingsPath>;
const mockFileStoreService = FileStoreService as jest.MockedClass<typeof FileStoreService>;
const mockSimpleVectorService = SimpleVectorService as jest.MockedClass<typeof SimpleVectorService>;

describe('SimpleDocumentIndexer', () => {
    let indexer: SimpleDocumentIndexer;
    let mockFileStore: jest.Mocked<FileStoreService>;
    let mockVectorService: jest.Mocked<SimpleVectorService>;

    const mockDoc1: DocumentMeta = {
        id: 'doc1',
        title: 'Guide Document',
        category: 'guides',
        path: 'guides/doc1.md',
        lastModified: new Date('2023-01-01'),
        tags: ['guide', 'help'],
        headers: ['Introduction', 'Getting Started'],
        content: 'This is a guide document',
        excerpt: 'A helpful guide'
    };

    const mockDoc2: DocumentMeta = {
        id: 'doc2',
        title: 'Tutorial Document',
        category: 'tutorials',
        path: 'tutorials/doc2.md',
        lastModified: new Date('2023-01-02'),
        tags: ['tutorial', 'learn'],
        headers: ['Setup', 'Examples'],
        content: 'This is a tutorial document',
        excerpt: 'Learn with this tutorial'
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock constructors to return mock instances
        mockFileStore = {
            initialize: jest.fn().mockResolvedValue(undefined),
            isInitialized: jest.fn().mockReturnValue(true),
            getDocument: jest.fn(),
            getAllDocuments: jest.fn(),
            getDocumentsByCategory: jest.fn(),
            getCategoryNames: jest.fn().mockReturnValue(['Guides', 'Tutorials']),
            getCategoryIds: jest.fn().mockReturnValue(['guides', 'tutorials']),
            getStats: jest.fn().mockReturnValue({
                totalDocuments: 2,
                totalCategories: 2,
                version: '1.0.0',
                generatedAt: '2023-01-01T00:00:00.000Z'
            }),
            clearCache: jest.fn()
        } as any;

        mockVectorService = {
            initialize: jest.fn().mockResolvedValue(undefined),
            isInitialized: jest.fn().mockReturnValue(false),
            getMetadata: jest.fn().mockReturnValue(null),
            findSimilarToDocument: jest.fn(),
            close: jest.fn().mockResolvedValue(undefined)
        } as any;

        mockFileStoreService.mockImplementation(() => mockFileStore);
        mockSimpleVectorService.mockImplementation(() => mockVectorService);

        // Create indexer instance
        indexer = new SimpleDocumentIndexer();
    });

    describe('constructor', () => {
        it('should create instance with default parameters', () => {
            const service = new SimpleDocumentIndexer();
            expect(service).toBeInstanceOf(SimpleDocumentIndexer);
            expect(mockFileStoreService).toHaveBeenCalledWith(undefined);
            expect(mockSimpleVectorService).toHaveBeenCalledWith(undefined);
        });

        it('should create instance with custom paths', () => {
            const docsPath = '/custom/docs';
            const embeddingsPath = '/custom/embeddings';
            const service = new SimpleDocumentIndexer(docsPath, embeddingsPath, true);

            expect(service).toBeInstanceOf(SimpleDocumentIndexer);
            expect(mockFileStoreService).toHaveBeenCalledWith(docsPath);
            expect(mockSimpleVectorService).toHaveBeenCalledWith(embeddingsPath);
        });

        it('should create instance without vector service when disabled', () => {
            // Reset mock call count before this test
            mockFileStoreService.mockClear();
            mockSimpleVectorService.mockClear();

            const service = new SimpleDocumentIndexer(undefined, undefined, false);
            expect(service).toBeInstanceOf(SimpleDocumentIndexer);
            expect(mockFileStoreService).toHaveBeenCalledWith(undefined);
            expect(mockSimpleVectorService).not.toHaveBeenCalled();
        });
    });

    describe('initialize', () => {
        it('should initialize successfully with filestore and vector service', async () => {
            mockVectorService.isInitialized.mockReturnValue(true);
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: true,
                isAvailable: true
            });

            const keywordData = { 'test': ['doc1'], 'guide': ['doc1', 'doc2'] };
            mockFs.readFile.mockResolvedValue(JSON.stringify(keywordData));

            await indexer.initialize();

            expect(mockFileStore.initialize).toHaveBeenCalled();
            expect(mockVectorService.initialize).toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith('Initializing simplified document indexer...');
            expect(mockLogger.log).toHaveBeenCalledWith('✓ Vector search enabled');
            expect(mockLogger.log).toHaveBeenCalledWith('✓ Document indexer initialized');
        });

        it('should skip duplicate initialization', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue('{}');

            await indexer.initialize();
            await indexer.initialize(); // Second call

            expect(mockFileStore.initialize).toHaveBeenCalledTimes(1);
        });

        it('should throw error when filestore initialization fails', async () => {
            const fileStoreError = new Error('Filestore failed');
            mockFileStore.initialize.mockRejectedValue(fileStoreError);

            await expect(indexer.initialize()).rejects.toThrow('Failed to initialize indexer: Error: Filestore failed');
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Filestore initialization failed. Please install @sap-ux/fiori-docs-embeddings for full documentation search capabilities:',
                fileStoreError
            );
        });

        it('should continue when vector service initialization fails', async () => {
            const vectorError = new Error('Vector service failed');
            mockVectorService.initialize.mockRejectedValue(vectorError);
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue('{}');

            await indexer.initialize();

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Vector service initialization failed, disabling vector search. Install @sap-ux/fiori-docs-embeddings for full capabilities:',
                vectorError
            );
            expect(mockLogger.log).toHaveBeenCalledWith('✓ Document indexer initialized');
        });

        it('should handle keyword index loading failure gracefully', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });

            const keywordError = new Error('Keyword file not found');
            mockFs.readFile.mockRejectedValue(keywordError);

            await indexer.initialize();

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Failed to load keyword index, keyword search will be limited:',
                keywordError
            );
            expect(mockLogger.log).toHaveBeenCalledWith('✓ Document indexer initialized');
        });

        it('should handle unavailable embeddings path', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: false
            });

            await indexer.initialize();

            expect(mockLogger.warn).toHaveBeenCalledWith('No data available, keyword search will be disabled');
            expect(mockLogger.log).toHaveBeenCalledWith('✓ Document indexer initialized');
        });
    });

    describe('search', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });

            const keywordData = {
                'guide': ['doc1'],
                'tutorial': ['doc2'],
                'documentation': ['doc1', 'doc2'],
                'help': ['doc1']
            };
            mockFs.readFile.mockResolvedValue(JSON.stringify(keywordData));

            mockFileStore.getDocument.mockImplementation(async (id: string) => {
                if (id === 'doc1') {
                    return mockDoc1;
                }
                if (id === 'doc2') {
                    return mockDoc2;
                }
                return null;
            });

            await indexer.initialize();
        });

        it('should perform keyword search with exact matches', async () => {
            const results = await indexer.search('guide');

            expect(results).toHaveLength(1);
            expect(results[0].document).toEqual(mockDoc1);
            expect(results[0].score).toBe(10);
            expect(results[0].matches).toContain('guide');
        });

        it('should perform search with multiple words', async () => {
            const results = await indexer.search('guide tutorial');

            expect(results).toHaveLength(2);
            expect(results.map((r) => r.document.id)).toContain('doc1');
            expect(results.map((r) => r.document.id)).toContain('doc2');
        });

        it('should perform partial keyword matching', async () => {
            const results = await indexer.search('doc');

            // Should find partial matches in 'documentation'
            expect(results.length).toBeGreaterThan(0);
        });

        it('should respect maxResults parameter', async () => {
            const results = await indexer.search('documentation', 1);

            expect(results).toHaveLength(1);
        });

        it('should filter short words', async () => {
            const results = await indexer.search('a to is'); // All words <= 2 characters

            expect(results).toHaveLength(0);
        });

        it('should sort results by score', async () => {
            const results = await indexer.search('guide documentation');

            expect(results[0].score).toBeGreaterThanOrEqual(results[results.length - 1]?.score || 0);
        });

        it('should accumulate scores for multiple matches', async () => {
            const results = await indexer.search('documentation');

            const docResult = results.find((r) => r.document.id === 'doc1');
            expect(docResult?.score).toBeGreaterThanOrEqual(5); // Should have at least partial match score
        });

        it('should initialize automatically if not initialized', async () => {
            const newIndexer = new SimpleDocumentIndexer();
            const initSpy = jest.spyOn(newIndexer, 'initialize');

            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue('{}');

            await newIndexer.search('test');

            expect(initSpy).toHaveBeenCalled();
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
            mockFs.readFile.mockResolvedValue('{}');
            await indexer.initialize();
        });

        it('should fall back to keyword search when vector service not initialized', async () => {
            mockVectorService.isInitialized.mockReturnValue(false);
            const searchSpy = jest.spyOn(indexer, 'search');

            await indexer.semanticSearch('test query');

            expect(mockLogger.warn).toHaveBeenCalledWith('Vector search not available, falling back to keyword search');
            expect(searchSpy).toHaveBeenCalledWith('test query', 10);
        });

        it('should fall back to keyword search in simplified mode', async () => {
            mockVectorService.isInitialized.mockReturnValue(true);
            const searchSpy = jest.spyOn(indexer, 'search');

            await indexer.semanticSearch('test query');

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Semantic search requires embedding generation - falling back to keyword search'
            );
            expect(searchSpy).toHaveBeenCalledWith('test query', 10);
        });
    });

    describe('docSearch', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue('{}');
            await indexer.initialize();
        });

        it('should delegate to search method', async () => {
            const searchSpy = jest.spyOn(indexer, 'search');

            await indexer.docSearch('test query', 5);

            expect(searchSpy).toHaveBeenCalledWith('test query', 5);
        });
    });

    describe('findSimilarDocuments', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue('{}');
            await indexer.initialize();
        });

        it('should return empty array when vector service not initialized', async () => {
            mockVectorService.isInitialized.mockReturnValue(false);

            const results = await indexer.findSimilarDocuments('doc1');

            expect(results).toEqual([]);
        });

        it('should return similar documents when vector service is available', async () => {
            mockVectorService.isInitialized.mockReturnValue(true);
            mockVectorService.findSimilarToDocument.mockResolvedValue([
                {
                    document: {
                        id: 'doc2',
                        vector: [0.1, 0.2, 0.3],
                        content: 'Similar document content',
                        title: 'Similar Document',
                        category: 'tutorials',
                        path: 'tutorials/similar.md',
                        chunk_index: 0,
                        metadata: {
                            tags: ['similar'],
                            headers: ['Header'],
                            lastModified: new Date('2023-01-01'),
                            wordCount: 50
                        }
                    },
                    score: 0.8,
                    distance: 0.2
                }
            ]);
            mockFileStore.getDocument.mockResolvedValue(mockDoc2);

            const results = await indexer.findSimilarDocuments('doc1');

            expect(results).toHaveLength(1);
            expect(results[0].document).toEqual(mockDoc2);
            expect(results[0].score).toBe(8); // 0.8 * 10
            expect(results[0].matches).toEqual(['similarity']);
        });

        it('should handle vector service errors', async () => {
            mockVectorService.isInitialized.mockReturnValue(true);
            mockVectorService.findSimilarToDocument.mockRejectedValue(new Error('Vector search failed'));

            const results = await indexer.findSimilarDocuments('doc1');

            expect(results).toEqual([]);
            expect(mockLogger.error).toHaveBeenCalledWith('Find similar documents failed:', expect.any(Error));
        });

        it('should skip documents that cannot be retrieved', async () => {
            mockVectorService.isInitialized.mockReturnValue(true);
            mockVectorService.findSimilarToDocument.mockResolvedValue([
                {
                    document: {
                        id: 'nonexistent',
                        vector: [0.1, 0.2, 0.3],
                        content: 'Nonexistent document',
                        title: 'Nonexistent',
                        category: 'test',
                        path: 'test/nonexistent.md',
                        chunk_index: 0,
                        metadata: {
                            tags: ['test'],
                            headers: ['Header'],
                            lastModified: new Date('2023-01-01'),
                            wordCount: 10
                        }
                    },
                    score: 0.8,
                    distance: 0.2
                }
            ]);
            mockFileStore.getDocument.mockResolvedValue(null);

            const results = await indexer.findSimilarDocuments('doc1');

            expect(results).toEqual([]);
        });
    });

    describe('getDocument', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue('{}');
            await indexer.initialize();
        });

        it('should delegate to filestore', async () => {
            mockFileStore.getDocument.mockResolvedValue(mockDoc1);

            const result = await indexer.getDocument('doc1');

            expect(result).toEqual(mockDoc1);
            expect(mockFileStore.getDocument).toHaveBeenCalledWith('doc1');
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
            mockFs.readFile.mockResolvedValue('{}');
            await indexer.initialize();
        });

        it('should delegate to filestore', async () => {
            const mockDocs = [mockDoc1];
            mockFileStore.getDocumentsByCategory.mockResolvedValue(mockDocs);

            const result = await indexer.getDocumentsByCategory('guides');

            expect(result).toEqual(mockDocs);
            expect(mockFileStore.getDocumentsByCategory).toHaveBeenCalledWith('guides');
        });
    });

    describe('getAllDocuments', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue('{}');
            await indexer.initialize();
        });

        it('should delegate to filestore', async () => {
            const mockDocs = [mockDoc1, mockDoc2];
            mockFileStore.getAllDocuments.mockResolvedValue(mockDocs);

            const result = await indexer.getAllDocuments();

            expect(result).toEqual(mockDocs);
            expect(mockFileStore.getAllDocuments).toHaveBeenCalled();
        });
    });

    describe('getCategories', () => {
        it('should return empty array when filestore not initialized', () => {
            mockFileStore.isInitialized.mockReturnValue(false);

            const result = indexer.getCategories();

            expect(result).toEqual([]);
        });

        it('should delegate to filestore when initialized', () => {
            mockFileStore.isInitialized.mockReturnValue(true);

            const result = indexer.getCategories();

            expect(result).toEqual(['Guides', 'Tutorials']);
            expect(mockFileStore.getCategoryNames).toHaveBeenCalled();
        });
    });

    describe('getCategoryIds', () => {
        it('should return empty array when filestore not initialized', () => {
            mockFileStore.isInitialized.mockReturnValue(false);

            const result = indexer.getCategoryIds();

            expect(result).toEqual([]);
        });

        it('should delegate to filestore when initialized', () => {
            mockFileStore.isInitialized.mockReturnValue(true);

            const result = indexer.getCategoryIds();

            expect(result).toEqual(['guides', 'tutorials']);
            expect(mockFileStore.getCategoryIds).toHaveBeenCalled();
        });
    });

    describe('getStats', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValue('{"test": ["doc1"]}');
            await indexer.initialize();
        });

        it('should return comprehensive stats', () => {
            const vectorMetadata = {
                version: '1.0.0',
                createdAt: '2023-01-01T00:00:00.000Z',
                model: 'test-model',
                dimensions: 384,
                totalVectors: 1000,
                totalDocuments: 100,
                chunkSize: 512,
                chunkOverlap: 64
            };
            mockVectorService.getMetadata.mockReturnValue(vectorMetadata);
            mockVectorService.isInitialized.mockReturnValue(true);

            const stats = indexer.getStats();

            expect(stats).toEqual({
                fileStore: {
                    totalDocuments: 2,
                    totalCategories: 2,
                    version: '1.0.0',
                    generatedAt: '2023-01-01T00:00:00.000Z'
                },
                vectorDatabase: vectorMetadata,
                keywordIndex: { terms: 1 },
                capabilities: {
                    keywordSearch: true,
                    semanticSearch: false,
                    docSearch: true,
                    similaritySearch: true
                }
            });
        });

        it('should handle uninitialized filestore', () => {
            mockFileStore.isInitialized.mockReturnValue(false);

            const stats = indexer.getStats();

            expect(stats.fileStore).toBeNull();
        });
    });

    describe('isVectorEnabled', () => {
        it('should return false when vector service not initialized', () => {
            mockVectorService.isInitialized.mockReturnValue(false);

            expect(indexer.isVectorEnabled()).toBe(false);
        });

        it('should return true when vector service is initialized', () => {
            mockVectorService.isInitialized.mockReturnValue(true);

            expect(indexer.isVectorEnabled()).toBe(true);
        });
    });

    describe('hasEnhancedFeatures', () => {
        it('should always return false for simplified indexer', () => {
            expect(indexer.hasEnhancedFeatures()).toBe(false);
        });
    });

    describe('enhanced feature methods', () => {
        it('should throw error for smartCodeSearch', async () => {
            await expect(indexer.smartCodeSearch('query')).rejects.toThrow(
                'Smart code search requires enhanced vector database features. Use regular search_docs instead.'
            );
        });

        it('should throw error for generateCodeSuggestions', async () => {
            await expect(indexer.generateCodeSuggestions('query')).rejects.toThrow(
                'Code suggestions require enhanced vector database features.'
            );
        });

        it('should fall back to similarity search for findSimilarCode', async () => {
            const similarSpy = jest.spyOn(indexer, 'findSimilarDocuments').mockResolvedValue([]);

            await indexer.findSimilarCode('doc1', { limit: 3 });

            expect(similarSpy).toHaveBeenCalledWith('doc1', 3);
        });

        it('should use default limit for findSimilarCode', async () => {
            const similarSpy = jest.spyOn(indexer, 'findSimilarDocuments').mockResolvedValue([]);

            await indexer.findSimilarCode('doc1');

            expect(similarSpy).toHaveBeenCalledWith('doc1', 5);
        });

        it('should throw error for getProgressiveLearningPath', async () => {
            await expect(indexer.getProgressiveLearningPath('topic')).rejects.toThrow(
                'Learning path generation requires enhanced vector database features.'
            );
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
            mockFs.readFile.mockResolvedValue('{}');
            await indexer.initialize();
        });

        it('should close vector service and clear filestore cache', async () => {
            await indexer.close();

            expect(mockVectorService.close).toHaveBeenCalled();
            expect(mockFileStore.clearCache).toHaveBeenCalled();
        });

        it('should handle missing vector service', async () => {
            // Create indexer without vector service
            const indexerNoVector = new SimpleDocumentIndexer(undefined, undefined, false);

            await expect(indexerNoVector.close()).resolves.not.toThrow();
        });

        it('should set initialized to false after close', async () => {
            await indexer.close();

            // Initialize should be callable again
            await indexer.initialize();

            expect(mockFileStore.initialize).toHaveBeenCalledTimes(2);
        });
    });
});
