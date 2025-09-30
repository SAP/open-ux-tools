import fs from 'fs/promises';
import path from 'node:path';
import type { FileStoreIndex } from '../../../../src/tools/services/filestore';
import { FileStoreService } from '../../../../src/tools/services/filestore';
import type { DocumentMeta } from '../../../../src/tools/services/types/index';
import { logger } from '../../../../src/utils/logger';
import { resolveEmbeddingsPath } from '../../../../src/utils/embeddings-path';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('../../../../src/utils/logger');
jest.mock('../../../../src/utils/embeddings-path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockResolveEmbeddingsPath = resolveEmbeddingsPath as jest.MockedFunction<typeof resolveEmbeddingsPath>;

describe('FileStoreService', () => {
    let fileStore: FileStoreService;
    const mockDataPath = '/test/docs/path';
    const mockIndexPath = path.join(mockDataPath, 'index.json');

    const mockIndex: FileStoreIndex = {
        version: '1.0.0',
        generatedAt: '2023-01-01T00:00:00.000Z',
        totalDocuments: 2,
        categories: [
            {
                id: 'guides',
                name: 'Guides',
                count: 1,
                documents: ['doc1']
            },
            {
                id: 'tutorials',
                name: 'Tutorials',
                count: 1,
                documents: ['doc2']
            }
        ],
        documents: {
            doc1: 'guides/doc1.json',
            doc2: 'tutorials/doc2.json'
        }
    };

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
        fileStore = new FileStoreService();
    });

    describe('constructor', () => {
        it('should create instance with default data path', () => {
            const service = new FileStoreService();
            expect(service).toBeInstanceOf(FileStoreService);
            expect(service.isInitialized()).toBe(false);
        });

        it('should create instance with custom data path', () => {
            const customPath = '/custom/path';
            const service = new FileStoreService(customPath);
            expect(service).toBeInstanceOf(FileStoreService);
            expect(service.isInitialized()).toBe(false);
        });
    });

    describe('initialize', () => {
        it('should initialize successfully with available embeddings path', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/data/embeddings',
                searchPath: '/test/data/search',
                docsPath: mockDataPath,
                isExternalPackage: true,
                isAvailable: true
            });

            mockFs.readFile.mockResolvedValue(JSON.stringify(mockIndex));

            await fileStore.initialize();

            expect(mockResolveEmbeddingsPath).toHaveBeenCalled();
            expect(mockFs.readFile).toHaveBeenCalledWith(mockIndexPath, 'utf-8');
            expect(mockLogger.log).toHaveBeenCalledWith('Loading documentation from filestore...');
            expect(mockLogger.log).toHaveBeenCalledWith(`Using docs path: ${mockDataPath} (external: true)`);
            expect(mockLogger.log).toHaveBeenCalledWith('✓ Loaded filestore index: 2 documents');
            expect(mockLogger.log).toHaveBeenCalledWith('✓ Categories: 2');
            expect(fileStore.isInitialized()).toBe(true);
        });

        it('should throw error when embeddings path is not available', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/data/embeddings',
                searchPath: '/test/data/search',
                docsPath: mockDataPath,
                isExternalPackage: false,
                isAvailable: false
            });

            await expect(fileStore.initialize()).rejects.toThrow('No documentation data available');
            expect(fileStore.isInitialized()).toBe(false);
        });

        it('should throw error when index file cannot be read', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/data/embeddings',
                searchPath: '/test/data/search',
                docsPath: mockDataPath,
                isExternalPackage: false,
                isAvailable: true
            });

            const readError = new Error('File not found');
            mockFs.readFile.mockRejectedValue(readError);

            await expect(fileStore.initialize()).rejects.toThrow('Failed to load filestore: Error: File not found');
            expect(fileStore.isInitialized()).toBe(false);
        });

        it('should throw error when index JSON is invalid', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/data/embeddings',
                searchPath: '/test/data/search',
                docsPath: mockDataPath,
                isExternalPackage: false,
                isAvailable: true
            });

            mockFs.readFile.mockResolvedValue('invalid json');

            await expect(fileStore.initialize()).rejects.toThrow('Failed to load filestore:');
            expect(fileStore.isInitialized()).toBe(false);
        });
    });

    describe('getDocument', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/data/embeddings',
                searchPath: '/test/data/search',
                docsPath: mockDataPath,
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockIndex));
            await fileStore.initialize();
        });

        it('should throw error when not initialized', async () => {
            const uninitializedStore = new FileStoreService();
            await expect(uninitializedStore.getDocument('doc1')).rejects.toThrow('FileStore not initialized');
        });

        it('should return cached document when available', async () => {
            // First call - document should be loaded and cached
            const doc1Json = JSON.stringify({ ...mockDoc1, lastModified: mockDoc1.lastModified.toISOString() });
            mockFs.readFile.mockResolvedValueOnce(doc1Json);

            const result1 = await fileStore.getDocument('doc1');
            expect(result1).toEqual(mockDoc1);

            // Second call - should return cached version
            const result2 = await fileStore.getDocument('doc1');
            expect(result2).toEqual(mockDoc1);

            // readFile should be called twice: once for index during init, once for document
            expect(mockFs.readFile).toHaveBeenCalledTimes(2);
            expect(mockFs.readFile).toHaveBeenCalledWith(path.join(mockDataPath, 'guides/doc1.json'), 'utf-8');
        });

        it('should return null for non-existent document', async () => {
            const result = await fileStore.getDocument('nonexistent');
            expect(result).toBeNull();
        });

        it('should load and return document successfully', async () => {
            const doc1Json = JSON.stringify({ ...mockDoc1, lastModified: mockDoc1.lastModified.toISOString() });
            mockFs.readFile.mockResolvedValueOnce(doc1Json);

            const result = await fileStore.getDocument('doc1');

            expect(result).toEqual(mockDoc1);
            expect(mockFs.readFile).toHaveBeenCalledWith(path.join(mockDataPath, 'guides/doc1.json'), 'utf-8');
        });

        it('should return null and log warning when document file cannot be read', async () => {
            const readError = new Error('File read error');
            mockFs.readFile.mockRejectedValueOnce(readError);

            const result = await fileStore.getDocument('doc1');

            expect(result).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith(`Failed to load document doc1: ${readError}`);
        });

        it('should parse lastModified date correctly', async () => {
            const docWithStringDate = { ...mockDoc1, lastModified: '2023-01-01T10:30:00.000Z' };
            mockFs.readFile.mockResolvedValueOnce(JSON.stringify(docWithStringDate));

            const result = await fileStore.getDocument('doc1');

            expect(result?.lastModified).toBeInstanceOf(Date);
            expect(result?.lastModified.toISOString()).toBe('2023-01-01T10:30:00.000Z');
        });
    });

    describe('getAllDocuments', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/data/embeddings',
                searchPath: '/test/data/search',
                docsPath: mockDataPath,
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockIndex));
            await fileStore.initialize();
        });

        it('should throw error when not initialized', async () => {
            const uninitializedStore = new FileStoreService();
            await expect(uninitializedStore.getAllDocuments()).rejects.toThrow('FileStore not initialized');
        });

        it('should return all documents', async () => {
            const doc1Json = JSON.stringify({ ...mockDoc1, lastModified: mockDoc1.lastModified.toISOString() });
            const doc2Json = JSON.stringify({ ...mockDoc2, lastModified: mockDoc2.lastModified.toISOString() });

            mockFs.readFile.mockResolvedValueOnce(doc1Json).mockResolvedValueOnce(doc2Json);

            const result = await fileStore.getAllDocuments();

            expect(result).toHaveLength(2);
            expect(result).toEqual(expect.arrayContaining([mockDoc1, mockDoc2]));
        });

        it('should skip documents that cannot be loaded', async () => {
            const doc1Json = JSON.stringify({ ...mockDoc1, lastModified: mockDoc1.lastModified.toISOString() });

            mockFs.readFile.mockResolvedValueOnce(doc1Json).mockRejectedValueOnce(new Error('File not found'));

            const result = await fileStore.getAllDocuments();

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(mockDoc1);
        });
    });

    describe('getDocumentsByCategory', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/data/embeddings',
                searchPath: '/test/data/search',
                docsPath: mockDataPath,
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockIndex));
            await fileStore.initialize();
        });

        it('should throw error when not initialized', async () => {
            const uninitializedStore = new FileStoreService();
            await expect(uninitializedStore.getDocumentsByCategory('guides')).rejects.toThrow(
                'FileStore not initialized'
            );
        });

        it('should return documents for existing category', async () => {
            const doc1Json = JSON.stringify({ ...mockDoc1, lastModified: mockDoc1.lastModified.toISOString() });
            mockFs.readFile.mockResolvedValueOnce(doc1Json);

            const result = await fileStore.getDocumentsByCategory('guides');

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(mockDoc1);
        });

        it('should return empty array for non-existent category', async () => {
            const result = await fileStore.getDocumentsByCategory('nonexistent');
            expect(result).toEqual([]);
        });

        it('should skip documents that cannot be loaded', async () => {
            mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));

            const result = await fileStore.getDocumentsByCategory('guides');

            expect(result).toHaveLength(0);
        });
    });

    describe('getCategories', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/data/embeddings',
                searchPath: '/test/data/search',
                docsPath: mockDataPath,
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockIndex));
            await fileStore.initialize();
        });

        it('should throw error when not initialized', () => {
            const uninitializedStore = new FileStoreService();
            expect(() => uninitializedStore.getCategories()).toThrow('FileStore not initialized');
        });

        it('should return all categories', () => {
            const result = fileStore.getCategories();

            expect(result).toHaveLength(2);
            expect(result).toEqual([
                { id: 'guides', name: 'Guides', count: 1 },
                { id: 'tutorials', name: 'Tutorials', count: 1 }
            ]);
        });
    });

    describe('getCategoryNames', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/data/embeddings',
                searchPath: '/test/data/search',
                docsPath: mockDataPath,
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockIndex));
            await fileStore.initialize();
        });

        it('should return category names', () => {
            const result = fileStore.getCategoryNames();
            expect(result).toEqual(['Guides', 'Tutorials']);
        });
    });

    describe('getCategoryIds', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/data/embeddings',
                searchPath: '/test/data/search',
                docsPath: mockDataPath,
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockIndex));
            await fileStore.initialize();
        });

        it('should return category IDs', () => {
            const result = fileStore.getCategoryIds();
            expect(result).toEqual(['guides', 'tutorials']);
        });
    });

    describe('getStats', () => {
        beforeEach(async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/data/embeddings',
                searchPath: '/test/data/search',
                docsPath: mockDataPath,
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockIndex));
            await fileStore.initialize();
        });

        it('should throw error when not initialized', () => {
            const uninitializedStore = new FileStoreService();
            expect(() => uninitializedStore.getStats()).toThrow('FileStore not initialized');
        });

        it('should return filestore statistics', () => {
            const result = fileStore.getStats();

            expect(result).toEqual({
                totalDocuments: 2,
                totalCategories: 2,
                version: '1.0.0',
                generatedAt: '2023-01-01T00:00:00.000Z'
            });
        });
    });

    describe('isInitialized', () => {
        it('should return false when not initialized', () => {
            expect(fileStore.isInitialized()).toBe(false);
        });

        it('should return true when initialized', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/data/embeddings',
                searchPath: '/test/data/search',
                docsPath: mockDataPath,
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockIndex));

            await fileStore.initialize();

            expect(fileStore.isInitialized()).toBe(true);
        });
    });

    describe('clearCache', () => {
        it('should clear document cache', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/data/embeddings',
                searchPath: '/test/data/search',
                docsPath: mockDataPath,
                isExternalPackage: false,
                isAvailable: true
            });
            mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockIndex));
            await fileStore.initialize();

            // Load a document to populate cache
            const doc1Json = JSON.stringify({ ...mockDoc1, lastModified: mockDoc1.lastModified.toISOString() });
            mockFs.readFile.mockResolvedValueOnce(doc1Json);
            await fileStore.getDocument('doc1');

            // Clear cache
            fileStore.clearCache();

            // Document should be loaded again (not from cache)
            mockFs.readFile.mockResolvedValueOnce(doc1Json);
            const result = await fileStore.getDocument('doc1');

            expect(result).toEqual(mockDoc1);
            // Should be called three times: index during init, first doc load, second doc load after clear
            expect(mockFs.readFile).toHaveBeenCalledTimes(3);
        });
    });
});
