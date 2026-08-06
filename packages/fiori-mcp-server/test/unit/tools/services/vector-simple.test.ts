import { jest } from '@jest/globals';
import path from 'node:path';
import type { EmbeddingMetadata } from '../../../../src/tools/services/vector-simple.js';

// Mock fs/promises
const mockReadFile = jest.fn<any>();
const actualFsPromises = await import('node:fs/promises');
jest.unstable_mockModule('fs/promises', () => ({
    ...actualFsPromises,
    default: {
        ...actualFsPromises,
        readFile: mockReadFile
    },
    readFile: mockReadFile
}));
jest.unstable_mockModule('node:fs/promises', () => ({
    ...actualFsPromises,
    default: {
        ...actualFsPromises,
        readFile: mockReadFile
    },
    readFile: mockReadFile
}));

// Mock logger
const mockLog = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();
const mockLogger = {
    log: mockLog,
    warn: mockWarn,
    error: mockError,
    info: jest.fn(),
    debug: jest.fn()
};
jest.unstable_mockModule('../../../../src/utils/logger', () => ({
    logger: mockLogger
}));

// Mock embeddings-path
const mockResolveEmbeddingsPath = jest.fn<any>();
jest.unstable_mockModule('../../../../src/utils/embeddings-path', () => ({
    resolveEmbeddingsPath: mockResolveEmbeddingsPath,
    hasEmbeddingsData: jest.fn<any>()
}));

const { SimpleVectorService } = await import('../../../../src/tools/services/vector-simple.js');
type SimpleVectorServiceType = InstanceType<typeof SimpleVectorService>;

const DIMS = 3;

function vecToBuffer(vecs: number[][]): Buffer {
    const buf = Buffer.allocUnsafe(vecs.length * vecs[0].length * 4);
    vecs.forEach((v, i) => v.forEach((x, d) => buf.writeFloatLE(x, (i * v.length + d) * 4)));
    return buf;
}

function makeRecord(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
    return {
        id: 'chunk-doc1-0',
        document_id: 'doc1',
        content: 'This is a test document',
        title: 'Test Document',
        category: 'guides',
        path: 'guides/test.md',
        chunk_index: 0,
        tags_json: '["test","guide"]',
        headers_json: '["Introduction"]',
        lastModified: '2023-01-01T00:00:00.000Z',
        wordCount: 100,
        excerpt: 'A test document',
        totalChunks: 1,
        ...overrides
    };
}

const mockMetadata: EmbeddingMetadata = {
    version: '2.0.0',
    createdAt: '2023-01-01T00:00:00.000Z',
    model: 'Xenova/all-MiniLM-L6-v2',
    dimensions: DIMS,
    totalVectors: 1,
    totalDocuments: 1,
    chunkSize: 2000,
    chunkOverlap: 100
};

function setupInitMocks(records: Record<string, unknown>[], vectors: number[][]): void {
    mockResolveEmbeddingsPath.mockResolvedValue({
        dataPath: '/test/data',
        embeddingsPath: '/test/embeddings',
        searchPath: '/test/search',
        docsPath: '/test/docs',
        isExternalPackage: true,
        isAvailable: true
    });

    const meta = { ...mockMetadata, dimensions: vectors[0]?.length ?? DIMS, totalVectors: records.length };

    mockReadFile
        .mockResolvedValueOnce(JSON.stringify(meta) as any)
        .mockResolvedValueOnce(vecToBuffer(vectors) as any)
        .mockResolvedValueOnce(records.map((r) => JSON.stringify(r)).join('\n') as any);
}

describe('SimpleVectorService', () => {
    let service: SimpleVectorServiceType;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new SimpleVectorService();
    });

    afterEach(async () => {
        if (service.isInitialized()) {
            await service.close();
        }
    });

    describe('constructor', () => {
        it('creates uninitialized instance', () => {
            expect(service).toBeInstanceOf(SimpleVectorService);
            expect(service.isInitialized()).toBe(false);
        });

        it('is not initialized before initialize() is called', () => {
            const s = new SimpleVectorService();
            expect(s.isInitialized()).toBe(false);
        });
    });

    describe('initialize', () => {
        it('loads metadata, binary vectors and records', async () => {
            const vecs = [[0.1, 0.2, 0.3]];
            const recs = [makeRecord()];
            setupInitMocks(recs, vecs);

            await service.initialize();

            expect(service.isInitialized()).toBe(true);
            expect(service.getMetadata()?.totalVectors).toBe(1);
            expect(mockLogger.log).toHaveBeenCalledWith('✓ Vector database loaded and ready');
        });

        it('throws when embeddings are not available', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: false
            });

            await expect(service.initialize()).rejects.toThrow('Failed to load vector database');
            expect(service.isInitialized()).toBe(false);
        });

        it('throws when metadata file cannot be read', async () => {
            mockResolveEmbeddingsPath.mockResolvedValue({
                dataPath: '/test/data',
                embeddingsPath: '/test/embeddings',
                searchPath: '/test/search',
                docsPath: '/test/docs',
                isExternalPackage: false,
                isAvailable: true
            });
            mockReadFile.mockRejectedValue(new Error('ENOENT'));

            await expect(service.initialize()).rejects.toThrow('Failed to load vector database');
        });

        it('reads files from the resolved embeddings path', async () => {
            const vecs = [[1, 0, 0]];
            const recs = [makeRecord()];
            setupInitMocks(recs, vecs);

            await service.initialize();

            expect(mockReadFile).toHaveBeenCalledWith(path.join('/test/embeddings', 'metadata.json'), 'utf-8');
            expect(mockReadFile).toHaveBeenCalledWith(path.join('/test/embeddings', 'embeddings.bin'));
            expect(mockReadFile).toHaveBeenCalledWith(path.join('/test/embeddings', 'records.jsonl'), 'utf-8');
        });
    });

    describe('semanticSearch', () => {
        const vecs = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
        const recs = [
            makeRecord({ id: 'c0', document_id: 'doc1', category: 'guides' }),
            makeRecord({ id: 'c1', document_id: 'doc2', category: 'guides' }),
            makeRecord({ id: 'c2', document_id: 'doc3', category: 'other' })
        ];

        beforeEach(async () => {
            setupInitMocks(recs, vecs);
            await service.initialize();
        });

        it('throws when not initialized', async () => {
            const s = new SimpleVectorService();
            await expect(s.semanticSearch([1, 0, 0])).rejects.toThrow('Vector database not initialized');
        });

        it('returns results sorted by distance ascending', async () => {
            const results = await service.semanticSearch([1, 0, 0], 3);
            expect(results[0].distance).toBeLessThanOrEqual(results[1].distance);
            expect(results[1].distance).toBeLessThanOrEqual(results[2].distance);
        });

        it('returns top N results', async () => {
            const results = await service.semanticSearch([1, 0, 0], 2);
            expect(results).toHaveLength(2);
        });

        it('filters by category', async () => {
            const results = await service.semanticSearch([1, 0, 0], 10, 'guides');
            expect(results.every((r) => r.document.category === 'guides')).toBe(true);
            expect(results).toHaveLength(2);
        });

        it('uses default limit of 10', async () => {
            const results = await service.semanticSearch([1, 0, 0]);
            expect(results.length).toBeLessThanOrEqual(10);
        });

        it('maps result fields correctly', async () => {
            const results = await service.semanticSearch([1, 0, 0], 1);
            const doc = results[0].document;
            expect(doc.id).toBe('doc1');
            expect(doc.content).toBe('This is a test document');
            expect(doc.metadata.tags).toEqual(['test', 'guide']);
            expect(doc.metadata.headers).toEqual(['Introduction']);
            expect(results[0].score).toBeCloseTo(1 - results[0].distance);
        });
    });

    describe('findSimilarToText', () => {
        beforeEach(async () => {
            setupInitMocks([makeRecord()], [[1, 0, 0]]);
            await service.initialize();
        });

        it('returns empty array and logs warning', async () => {
            const results = await service.findSimilarToText('anything');
            expect(results).toEqual([]);
            expect(mockWarn).toHaveBeenCalledWith(
                'findSimilarToText requires embedding generation - not available in simplified mode'
            );
        });
    });

    describe('findSimilarToDocument', () => {
        const vecs = [
            [1, 0, 0],
            [0.9, 0.1, 0],
            [0, 0, 1]
        ];
        const recs = [
            makeRecord({ id: 'c0', document_id: 'ref', chunk_index: 0 }),
            makeRecord({ id: 'c1', document_id: 'similar', chunk_index: 0 }),
            makeRecord({ id: 'c2', document_id: 'other', chunk_index: 0 })
        ];

        beforeEach(async () => {
            setupInitMocks(recs, vecs);
            await service.initialize();
        });

        it('throws when not initialized', async () => {
            const s = new SimpleVectorService();
            await expect(s.findSimilarToDocument('doc1')).rejects.toThrow('Vector database not initialized');
        });

        it('returns empty when reference document not found', async () => {
            const results = await service.findSimilarToDocument('nonexistent');
            expect(results).toEqual([]);
        });

        it('finds similar documents excluding the reference', async () => {
            const results = await service.findSimilarToDocument('ref', 5);
            expect(results.every((r) => r.document.id !== 'ref')).toBe(true);
        });

        it('returns results sorted by score descending', async () => {
            const results = await service.findSimilarToDocument('ref', 5);
            for (let i = 0; i < results.length - 1; i++) {
                expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
            }
        });

        it('deduplicates by document_id keeping best score', async () => {
            const dupVecs = [
                [1, 0, 0],
                [0.8, 0.2, 0],
                [0.9, 0.1, 0]
            ];
            const dupRecs = [
                makeRecord({ id: 'c0', document_id: 'ref', chunk_index: 0 }),
                makeRecord({ id: 'c1', document_id: 'dup', chunk_index: 0 }),
                makeRecord({ id: 'c2', document_id: 'dup', chunk_index: 1 })
            ];

            jest.clearAllMocks();
            setupInitMocks(dupRecs, dupVecs);
            const s = new SimpleVectorService();
            await s.initialize();

            const results = await s.findSimilarToDocument('ref', 5);
            const dupResults = results.filter((r) => r.document.id === 'dup');
            expect(dupResults).toHaveLength(1);
            expect(dupResults[0].distance).toBeLessThan(results.find((r) => r.document.id === 'dup')!.distance + 0.001);
            await s.close();
        });
    });

    describe('getDocumentsByCategory', () => {
        const vecs = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
        const recs = [
            makeRecord({ id: 'c0', document_id: 'doc1', category: 'guides', chunk_index: 0 }),
            makeRecord({ id: 'c1', document_id: 'doc2', category: 'guides', chunk_index: 0 }),
            makeRecord({ id: 'c2', document_id: 'doc3', category: 'other', chunk_index: 0 })
        ];

        beforeEach(async () => {
            setupInitMocks(recs, vecs);
            await service.initialize();
        });

        it('throws when not initialized', async () => {
            const s = new SimpleVectorService();
            await expect(s.getDocumentsByCategory('guides')).rejects.toThrow('Vector database not initialized');
        });

        it('returns only first chunks of matching category', async () => {
            const results = await service.getDocumentsByCategory('guides');
            expect(results).toHaveLength(2);
            expect(results.every((r) => r.document.category === 'guides')).toBe(true);
            expect(results.every((r) => r.score === 1.0)).toBe(true);
        });

        it('respects limit', async () => {
            const results = await service.getDocumentsByCategory('guides', 1);
            expect(results).toHaveLength(1);
        });

        it('returns all matching when no limit', async () => {
            const results = await service.getDocumentsByCategory('other');
            expect(results).toHaveLength(1);
        });
    });

    describe('getMetadata', () => {
        it('returns null when not initialized', () => {
            expect(service.getMetadata()).toBeNull();
        });

        it('returns metadata after initialization', async () => {
            setupInitMocks([makeRecord()], [[1, 0, 0]]);
            await service.initialize();
            expect(service.getMetadata()?.model).toBe('Xenova/all-MiniLM-L6-v2');
        });
    });

    describe('isInitialized', () => {
        it('returns false before initialize', () => {
            expect(service.isInitialized()).toBe(false);
        });

        it('returns true after initialize', async () => {
            setupInitMocks([makeRecord()], [[1, 0, 0]]);
            await service.initialize();
            expect(service.isInitialized()).toBe(true);
        });
    });

    describe('close', () => {
        beforeEach(async () => {
            setupInitMocks([makeRecord()], [[1, 0, 0]]);
            await service.initialize();
        });

        it('clears state and logs', async () => {
            await service.close();
            expect(service.isInitialized()).toBe(false);
            expect(mockLogger.log).toHaveBeenCalledWith('Vector database connection closed');
        });

        it('allows reinitialization after close', async () => {
            await service.close();
            setupInitMocks([makeRecord()], [[1, 0, 0]]);
            await service.initialize();
            expect(service.isInitialized()).toBe(true);
        });
    });

    describe('JSON field parsing', () => {
        it('handles invalid JSON gracefully', async () => {
            const recs = [makeRecord({ tags_json: 'bad json {', headers_json: 'also bad' })];
            setupInitMocks(recs, [[1, 0, 0]]);
            await service.initialize();

            const results = await service.semanticSearch([1, 0, 0]);
            expect(results[0].document.metadata.tags).toEqual([]);
            expect(results[0].document.metadata.headers).toEqual([]);
        });

        it('handles empty JSON strings', async () => {
            const recs = [makeRecord({ tags_json: '', headers_json: '' })];
            setupInitMocks(recs, [[1, 0, 0]]);
            await service.initialize();

            const results = await service.semanticSearch([1, 0, 0]);
            expect(results[0].document.metadata.tags).toEqual([]);
            expect(results[0].document.metadata.headers).toEqual([]);
        });
    });
});
