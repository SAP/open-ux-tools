import { load, search } from '@sap-ux/semantic-search';
import { SimpleVectorService } from '../../../../src/tools/services/vector-simple';
import { logger } from '../../../../src/utils/logger';
import { resolveEmbeddingsPath } from '../../../../src/utils/embeddings-path';

// Mock dependencies
jest.mock('@sap-ux/semantic-search', () => ({
    load: jest.fn(),
    search: jest.fn()
}));
jest.mock('../../../../src/utils/logger', () => ({
    logger: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));
jest.mock('../../../../src/utils/embeddings-path');

const mockLoad = load as jest.MockedFunction<typeof load>;
const mockSearch = search as jest.MockedFunction<typeof search>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockResolveEmbeddingsPath = resolveEmbeddingsPath as jest.MockedFunction<typeof resolveEmbeddingsPath>;

describe('SimpleVectorService', () => {
    let vectorService: SimpleVectorService;

    const mockEmbeddingsDocs = [
        { content: 'Test document 1', embedding: new Float32Array([0.1, 0.2, 0.3]) },
        { content: 'Test document 2', embedding: new Float32Array([0.4, 0.5, 0.6]) }
    ];

    const mockSearchResults = [
        { content: 'Test document 1', similarity: 0.95 },
        { content: 'Test document 2', similarity: 0.85 }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        vectorService = new SimpleVectorService();
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
                isExternalPackage: true,
                isAvailable: true
            });

            mockLoad.mockResolvedValue(mockEmbeddingsDocs as any);

            await vectorService.initialize();

            expect(mockResolveEmbeddingsPath).toHaveBeenCalled();
            expect(mockLoad).toHaveBeenCalledWith(embeddingsPath);
            expect(mockLogger.log).toHaveBeenCalledWith('Loading vector database from pre-built embeddings...');
            expect(mockLogger.log).toHaveBeenCalledWith(`Using embeddings path: ${embeddingsPath} (external: true)`);
            expect(mockLogger.log).toHaveBeenCalledWith('✓ Embedding metadata loaded.');
            expect(vectorService.isInitialized()).toBe(true);
        });

        it('should initialize successfully with non-external package', async () => {
            const embeddingsPath = '/test/embeddings';
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath,
                isExternalPackage: false,
                isAvailable: true
            });

            mockLoad.mockResolvedValue(mockEmbeddingsDocs as any);

            await vectorService.initialize();

            expect(mockLogger.log).toHaveBeenCalledWith(`Using embeddings path: ${embeddingsPath} (external: false)`);
            expect(vectorService.isInitialized()).toBe(true);
        });

        it('should throw error when load fails', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                isExternalPackage: false,
                isAvailable: true
            });

            const loadError = new Error('Failed to load');
            mockLoad.mockRejectedValue(loadError);

            await expect(vectorService.initialize()).rejects.toThrow(
                'Failed to load embeddings: Error: Failed to load'
            );
            expect(vectorService.isInitialized()).toBe(false);
        });

        it('should throw error when resolveEmbeddingsPath fails', async () => {
            const resolveError = new Error('Path resolution failed');
            mockResolveEmbeddingsPath.mockRejectedValue(resolveError);

            await expect(vectorService.initialize()).rejects.toThrow(
                'Failed to load embeddings: Error: Path resolution failed'
            );
            expect(vectorService.isInitialized()).toBe(false);
        });
    });

    describe('semanticSearch', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                isExternalPackage: false,
                isAvailable: true
            });
            mockLoad.mockResolvedValue(mockEmbeddingsDocs as any);
            await vectorService.initialize();
        });

        it('should throw error when not initialized', async () => {
            // Clear mocks and create a fresh instance without initialization
            jest.clearAllMocks();
            mockLoad.mockResolvedValue([]);
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                isExternalPackage: false,
                isAvailable: true
            });

            const uninitializedService = new SimpleVectorService();
            // Don't call initialize, so embeddingsDocs stays empty

            await expect(uninitializedService.semanticSearch('test query')).rejects.toThrow(
                'Embeddings not initialized'
            );
        });

        it('should perform semantic search successfully', async () => {
            mockSearch.mockResolvedValue(mockSearchResults as any);

            const results = await vectorService.semanticSearch('test query', 5);

            expect(mockSearch).toHaveBeenCalledWith('test query', mockEmbeddingsDocs, { limit: 5 });
            expect(results).toEqual(mockSearchResults);
        });

        it('should use default limit when not specified', async () => {
            mockSearch.mockResolvedValue(mockSearchResults as any);

            await vectorService.semanticSearch('test query');

            expect(mockSearch).toHaveBeenCalledWith('test query', mockEmbeddingsDocs, { limit: 10 });
        });

        it('should handle search errors', async () => {
            const searchError = new Error('Search failed');
            mockSearch.mockRejectedValue(searchError);

            await expect(vectorService.semanticSearch('test query')).rejects.toThrow(
                'Semantic search failed: Error: Search failed'
            );
            expect(mockLogger.error).toHaveBeenCalledWith(`Semantic search failed: ${searchError}`);
        });

        it('should return empty results when search returns empty', async () => {
            mockSearch.mockResolvedValue([]);

            const results = await vectorService.semanticSearch('no matches');

            expect(results).toEqual([]);
        });
    });

    describe('findSimilarToText', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                isExternalPackage: false,
                isAvailable: true
            });
            mockLoad.mockResolvedValue(mockEmbeddingsDocs as any);
            await vectorService.initialize();
        });

        it('should return empty results in simplified mode', async () => {
            const results = await vectorService.findSimilarToText('test text');

            expect(results).toEqual([]);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'findSimilarToText requires embedding generation - not available in simplified mode'
            );
        });

        it('should return empty results with custom limit', async () => {
            const results = await vectorService.findSimilarToText('test text', 10);

            expect(results).toEqual([]);
            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });

    describe('isInitialized', () => {
        it('should return false when not initialized', () => {
            expect(vectorService.isInitialized()).toBe(false);
        });

        it('should return true when initialized with documents', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                isExternalPackage: false,
                isAvailable: true
            });
            mockLoad.mockResolvedValue(mockEmbeddingsDocs as any);

            await vectorService.initialize();

            expect(vectorService.isInitialized()).toBe(true);
        });

        it('should return false when initialized with empty documents array', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                isExternalPackage: false,
                isAvailable: true
            });
            mockLoad.mockResolvedValue([]);

            await vectorService.initialize();

            expect(vectorService.isInitialized()).toBe(false);
        });
    });

    describe('close', () => {
        it('should complete without error', async () => {
            await expect(vectorService.close()).resolves.not.toThrow();
        });

        it('should complete without error after initialization', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                isExternalPackage: false,
                isAvailable: true
            });
            mockLoad.mockResolvedValue(mockEmbeddingsDocs as any);

            await vectorService.initialize();
            await expect(vectorService.close()).resolves.not.toThrow();
        });
    });

    describe('edge cases', () => {
        it('should handle multiple initializations', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                isExternalPackage: false,
                isAvailable: true
            });
            mockLoad.mockResolvedValue(mockEmbeddingsDocs as any);

            await vectorService.initialize();
            await vectorService.initialize(); // Second initialization

            expect(mockLoad).toHaveBeenCalledTimes(2);
            expect(vectorService.isInitialized()).toBe(true);
        });

        it('should handle search with special characters in query', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                isExternalPackage: false,
                isAvailable: true
            });
            mockLoad.mockResolvedValue(mockEmbeddingsDocs as any);
            mockSearch.mockResolvedValue(mockSearchResults as any);

            await vectorService.initialize();

            const specialQuery = 'test @#$%^&*() query with "quotes"';
            await vectorService.semanticSearch(specialQuery);

            expect(mockSearch).toHaveBeenCalledWith(specialQuery, mockEmbeddingsDocs, { limit: 10 });
        });

        it('should handle empty query string', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                isExternalPackage: false,
                isAvailable: true
            });
            mockLoad.mockResolvedValue(mockEmbeddingsDocs as any);
            mockSearch.mockResolvedValue([]);

            await vectorService.initialize();

            const results = await vectorService.semanticSearch('');

            expect(mockSearch).toHaveBeenCalledWith('', mockEmbeddingsDocs, { limit: 10 });
            expect(results).toEqual([]);
        });

        it('should handle very large limit values', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                isExternalPackage: false,
                isAvailable: true
            });
            mockLoad.mockResolvedValue(mockEmbeddingsDocs as any);
            mockSearch.mockResolvedValue(mockSearchResults as any);

            await vectorService.initialize();

            await vectorService.semanticSearch('test', 10000);

            expect(mockSearch).toHaveBeenCalledWith('test', mockEmbeddingsDocs, { limit: 10000 });
        });

        it('should handle zero limit', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                isExternalPackage: false,
                isAvailable: true
            });
            mockLoad.mockResolvedValue(mockEmbeddingsDocs as any);
            mockSearch.mockResolvedValue([]);

            await vectorService.initialize();

            await vectorService.semanticSearch('test', 0);

            expect(mockSearch).toHaveBeenCalledWith('test', mockEmbeddingsDocs, { limit: 0 });
        });
    });
});
