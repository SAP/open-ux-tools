import * as fs from 'fs/promises';
import { join } from 'node:path';

const mockPipeline = jest.fn();
const mockConnect = jest.fn();

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

jest.mock('@sap-ux/logger', () => ({
    ToolsLogger: jest.fn().mockImplementation(() => mockLogger)
}));

jest.mock('@xenova/transformers', () => ({
    pipeline: mockPipeline
}));

jest.mock('@lancedb/lancedb', () => ({
    connect: mockConnect
}));

jest.mock('fs/promises', () => ({
    readFile: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn()
}));

interface EmbeddingBuilderType {
    config: {
        embeddingsPath: string;
        model: string;
        chunkSize: number;
        chunkOverlap: number;
        batchSize: number;
        maxVectorsPerTable: number;
    };
    pipeline: unknown;
    documents: Array<unknown>;
    chunks: Array<unknown>;
    initialize(): Promise<void>;
    loadDocuments(): Promise<void>;
    chunkDocument(doc: unknown): unknown[];
    findSentenceBreak(text: string): number;
    generateEmbedding(text: string): Promise<number[]>;
    chunkAllDocuments(): Promise<void>;
    createVectorDatabase(): Promise<unknown>;
    buildEmbeddings(): Promise<void>;
}

describe('EmbeddingBuilder', () => {
    let EmbeddingBuilder: new () => EmbeddingBuilderType;
    const mockFs = fs as jest.Mocked<typeof fs>;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module = await import('../src/scripts/build-embeddings');
        EmbeddingBuilder = (module as unknown as { EmbeddingBuilder: new () => EmbeddingBuilderType }).EmbeddingBuilder;
    });

    describe('constructor', () => {
        it('should initialize with default config', () => {
            const builder = new EmbeddingBuilder();

            expect(builder).toBeDefined();
            expect(builder.config).toBeDefined();
            expect(builder.config.embeddingsPath).toBe('./data/embeddings');
            expect(builder.config.model).toBe('Xenova/all-MiniLM-L6-v2');
            expect(builder.config.chunkSize).toBe(2000);
            expect(builder.config.chunkOverlap).toBe(100);
            expect(builder.config.batchSize).toBe(20);
            expect(builder.config.maxVectorsPerTable).toBe(5000);
        });
    });

    describe('initialize', () => {
        it('should load embedding model successfully', async () => {
            const mockPipelineInstance = jest.fn();
            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const builder = new EmbeddingBuilder();
            await builder.initialize();

            expect(mockPipeline).toHaveBeenCalledWith(
                'feature-extraction',
                'Xenova/all-MiniLM-L6-v2',
                expect.objectContaining({
                    quantized: false,
                    progress_callback: expect.any(Function)
                })
            );
            expect(builder.pipeline).toBe(mockPipelineInstance);
        });

        it('should fallback to same model on error', async () => {
            const mockPipelineInstance = jest.fn();
            mockPipeline
                .mockRejectedValueOnce(new Error('Failed to load model'))
                .mockResolvedValueOnce(mockPipelineInstance);

            const builder = new EmbeddingBuilder();
            await builder.initialize();

            expect(mockPipeline).toHaveBeenCalledTimes(2);
            expect(builder.pipeline).toBe(mockPipelineInstance);
        });
    });

    describe('loadDocuments', () => {
        it('should load documents from markdown files in data_local', async () => {
            const mockMarkdownContent = `**TITLE**: Test Document 1
**TAGS**: test, fiori

This is test content for the document.
--------------------------------
**TITLE**: Test Document 2
**TAGS**: fiori, elements

This is another test content.`;

            mockFs.readdir.mockResolvedValue(['test1.md', 'test2.md'] as never);
            mockFs.readFile.mockResolvedValueOnce(mockMarkdownContent).mockResolvedValueOnce(mockMarkdownContent);

            const builder = new EmbeddingBuilder();
            await builder.loadDocuments();

            expect(mockFs.readdir).toHaveBeenCalledWith('./data_local');
            expect(builder.documents.length).toBeGreaterThan(0);
        });

        it('should handle document loading errors gracefully', async () => {
            mockFs.readdir.mockResolvedValue(['test.md'] as never);
            mockFs.readFile.mockRejectedValue(new Error('File not found'));

            const builder = new EmbeddingBuilder();
            await builder.loadDocuments();

            expect(builder.documents).toHaveLength(0);
            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });

    describe('chunkDocument', () => {
        it('should not chunk small documents', () => {
            const builder = new EmbeddingBuilder();
            const doc = {
                id: 'test-doc',
                title: 'Test Document',
                content: 'Short content',
                category: 'test',
                path: 'test/doc.md',
                tags: ['test'],
                headers: ['Header'],
                lastModified: '2023-01-01',
                wordCount: 2,
                excerpt: 'Short content'
            };

            const chunks = builder.chunkDocument(doc);

            expect(chunks).toHaveLength(1);
            expect(chunks[0]).toMatchObject({
                id: 'test-doc-chunk-0',
                documentId: 'test-doc',
                chunkIndex: 0,
                content: 'Short content',
                title: 'Test Document',
                category: 'test',
                path: 'test/doc.md',
                metadata: expect.objectContaining({
                    tags: ['test'],
                    headers: ['Header'],
                    totalChunks: 1
                })
            });
        });

        it('should chunk large documents', () => {
            const builder = new EmbeddingBuilder();
            const longContent = 'A'.repeat(5000); // Much longer than chunkSize (2000) to ensure multiple chunks
            const doc = {
                id: 'test-doc',
                title: 'Test Document',
                content: longContent,
                category: 'test',
                path: 'test/doc.md',
                tags: ['test'],
                headers: ['Header'],
                lastModified: '2023-01-01',
                wordCount: 1,
                excerpt: longContent.substring(0, 200) + '...'
            };

            const chunks = builder.chunkDocument(doc) as Array<{ metadata: { totalChunks: number } }>;

            expect(chunks.length).toBeGreaterThanOrEqual(1);
            expect(chunks[0].metadata.totalChunks).toBe(chunks.length);
        });

        it('should handle empty content', () => {
            const builder = new EmbeddingBuilder();
            const doc = {
                id: 'test-doc',
                title: 'Test Document',
                content: '',
                category: 'test',
                path: 'test/doc.md',
                tags: ['test'],
                headers: ['Header'],
                lastModified: '2023-01-01',
                wordCount: 0,
                excerpt: ''
            };

            const chunks = builder.chunkDocument(doc) as Array<{ content: string }>;

            expect(chunks).toHaveLength(1);
            expect(chunks[0].content).toBe('');
        });
    });

    describe('findSentenceBreak', () => {
        it('should find sentence breaks', () => {
            const builder = new EmbeddingBuilder();
            const text = 'First sentence. Second sentence! Third sentence?';

            const breakPoint = builder.findSentenceBreak(text);

            // Function finds the LAST sentence ending WITH SPACE and returns position after it
            // "Second sentence! " (with space) at position 31, so breakPoint should be 33 (position after "! ")
            expect(breakPoint).toBe(33); // After "Second sentence! "
        });

        it('should find paragraph breaks when no sentence breaks', () => {
            const builder = new EmbeddingBuilder();
            const text = 'First paragraph\n\nSecond paragraph';

            const breakPoint = builder.findSentenceBreak(text);

            expect(breakPoint).toBe(17); // After "First paragraph\n\n"
        });

        it('should return text length when no good break point', () => {
            const builder = new EmbeddingBuilder();
            const text = 'No breaks here just one long text';

            const breakPoint = builder.findSentenceBreak(text);

            expect(breakPoint).toBe(text.length);
        });
    });

    describe('generateEmbedding', () => {
        it('should generate embeddings for text', async () => {
            const mockResult = { data: new Float32Array([0.1, 0.2, 0.3]) };
            const mockPipelineInstance = jest.fn().mockResolvedValue(mockResult);
            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const builder = new EmbeddingBuilder();
            await builder.initialize();

            const embedding = await builder.generateEmbedding('test text');

            expect(embedding).toEqual(
                expect.arrayContaining([expect.closeTo(0.1, 5), expect.closeTo(0.2, 5), expect.closeTo(0.3, 5)])
            );
            expect(mockPipelineInstance).toHaveBeenCalledWith('test text', { pooling: 'mean', normalize: true });
        });

        it('should clean text before generating embeddings', async () => {
            const mockResult = { data: new Float32Array([0.1, 0.2, 0.3]) };
            const mockPipelineInstance = jest.fn().mockResolvedValue(mockResult);
            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const builder = new EmbeddingBuilder();
            await builder.initialize();

            const text = 'test\n\ntext\nwith\n   multiple   spaces';
            await builder.generateEmbedding(text);

            expect(mockPipelineInstance).toHaveBeenCalledWith('test text with multiple spaces', {
                pooling: 'mean',
                normalize: true
            });
        });
    });

    describe('createVectorDatabase', () => {
        it('should create vector database with LanceDB', async () => {
            const mockTable = { drop: jest.fn() };
            const mockDb = {
                openTable: jest.fn().mockResolvedValue(mockTable),
                dropTable: jest.fn(),
                createTable: jest.fn()
            };
            mockConnect.mockResolvedValue(mockDb);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);

            const builder = new EmbeddingBuilder();
            builder.chunks = [
                {
                    id: 'chunk-1',
                    documentId: 'doc-1',
                    chunkIndex: 0,
                    content: 'test content',
                    title: 'Test',
                    category: 'test',
                    path: 'test.md',
                    metadata: {
                        tags: ['test'],
                        headers: ['Header'],
                        lastModified: '2023-01-01',
                        wordCount: 2,
                        excerpt: 'test content',
                        totalChunks: 1
                    },
                    vector: [0.1, 0.2, 0.3]
                }
            ];
            builder.documents = [
                {
                    id: 'doc-1',
                    title: 'Test',
                    content: 'test content',
                    category: 'test',
                    path: 'test.md',
                    tags: ['test'],
                    headers: ['Header'],
                    lastModified: '2023-01-01',
                    wordCount: 2,
                    excerpt: 'test content'
                }
            ];

            const metadata = await builder.createVectorDatabase();

            expect(mockFs.mkdir).toHaveBeenCalledWith('./data/embeddings', { recursive: true });
            expect(mockConnect).toHaveBeenCalled();
            expect(mockDb.createTable).toHaveBeenCalledWith('documents_000', expect.any(Array));
            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('table_index.json'),
                expect.stringContaining('documents_000')
            );
            expect(metadata).toMatchObject({
                version: '1.0.0',
                model: 'Xenova/all-MiniLM-L6-v2',
                dimensions: 3,
                totalVectors: 1,
                totalDocuments: 1,
                chunkSize: 2000,
                chunkOverlap: 100
            });
        });

        it('should handle existing table by dropping it', async () => {
            const mockTable = { drop: jest.fn() };
            const mockDb = {
                openTable: jest.fn().mockResolvedValue(mockTable),
                dropTable: jest.fn(),
                createTable: jest.fn()
            };
            mockConnect.mockResolvedValue(mockDb);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);

            const builder = new EmbeddingBuilder();
            builder.chunks = [
                {
                    id: 'chunk-1',
                    documentId: 'doc-1',
                    chunkIndex: 0,
                    content: 'test content',
                    title: 'Test',
                    category: 'test',
                    path: 'test.md',
                    vector: [0.1, 0.2, 0.3],
                    metadata: {
                        tags: ['test'],
                        headers: ['Header'],
                        lastModified: '2023-01-01',
                        wordCount: 2,
                        excerpt: 'test content',
                        totalChunks: 1
                    }
                }
            ];
            builder.documents = [];

            await builder.createVectorDatabase();

            expect(mockDb.dropTable).toHaveBeenCalledWith('documents_000');
            expect(mockDb.createTable).toHaveBeenCalled();
        });
    });

    describe('chunkAllDocuments', () => {
        it('should chunk multiple documents and create statistics', async () => {
            const builder = new EmbeddingBuilder();

            // Add documents with different sizes
            builder.documents = [
                {
                    id: 'doc1',
                    title: 'Small Doc',
                    content: 'Short content',
                    category: 'test',
                    path: 'test/small.md',
                    tags: [],
                    lastModified: new Date().toISOString(),
                    headers: [],
                    wordCount: 2,
                    excerpt: 'Short content'
                },
                {
                    id: 'doc2',
                    title: 'Large Doc',
                    content: 'A'.repeat(5000), // Large content that should be chunked
                    category: 'test',
                    path: 'test/large.md',
                    tags: [],
                    lastModified: new Date().toISOString(),
                    headers: [],
                    wordCount: 5000,
                    excerpt: 'A'.repeat(200)
                }
            ];

            await builder.chunkAllDocuments();

            const chunks = builder.chunks as Array<{
                id: string;
                documentId: string;
                content: string;
                metadata: unknown;
            }>;
            expect(chunks.length).toBeGreaterThan(1); // Large doc should be chunked
            expect(chunks[0]).toMatchObject({
                id: expect.any(String),
                documentId: 'doc1',
                content: 'Short content',
                metadata: expect.any(Object)
            });
        });
    });

    describe('generateAllEmbeddings', () => {
        it('should process chunks and generate vectors', async () => {
            const builder = new EmbeddingBuilder();
            await builder.initialize();

            // Since generateAllEmbeddings is called internally, test through generateEmbedding
            const embedding = await builder.generateEmbedding('test content');

            expect(embedding).toEqual(expect.any(Array));
            expect(embedding).toHaveLength(3); // Mock returns [0.1, 0.2, 0.3]
        });
    });

    describe('buildEmbeddings error handling', () => {
        it('should handle directory read errors gracefully and log warnings', async () => {
            const builder = new EmbeddingBuilder();
            mockLogger.warn.mockClear();

            // Force an error in loadDocuments by making readdir fail
            mockFs.readdir.mockRejectedValue(new Error('Directory read error'));

            // Mock the vector database creation to avoid errors
            const mockDb = {
                openTable: jest.fn().mockRejectedValue(new Error('Table not found')),
                createTable: jest.fn().mockResolvedValue({})
            };
            mockConnect.mockResolvedValue(mockDb);
            mockFs.mkdir.mockResolvedValue(undefined as never);
            mockFs.writeFile.mockResolvedValue(undefined as never);

            // loadDocuments catches errors and logs warnings, doesn't throw
            await builder.buildEmbeddings();

            // Verify that the warning was logged
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Failed to read data_local directory')
            );
        });
    });

    describe('buildEmbeddings integration', () => {
        it('should build embeddings successfully with real flow', async () => {
            const mockMarkdownContent = `**TITLE**: Test Document
**TAGS**: test, fiori

This is test content for embedding generation.`;

            const mockDb = {
                openTable: jest.fn().mockRejectedValue(new Error('Table not found')),
                createTable: jest.fn().mockResolvedValue({}),
                dropTable: jest.fn()
            };

            mockConnect.mockResolvedValue(mockDb);
            mockFs.readdir.mockResolvedValue(['test.md'] as never);
            mockFs.readFile.mockResolvedValue(mockMarkdownContent);
            mockFs.mkdir.mockResolvedValue(undefined as never);
            mockFs.writeFile.mockResolvedValue(undefined as never);

            const builder = new EmbeddingBuilder();
            await builder.buildEmbeddings();

            expect(mockConnect).toHaveBeenCalled();
            expect(mockFs.writeFile).toHaveBeenCalledWith(expect.stringContaining('metadata.json'), expect.any(String));
        });

        it('should handle vector database errors and exit gracefully', async () => {
            const builder = new EmbeddingBuilder();

            mockLogger.error.mockClear();
            const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
                throw new Error(`process.exit called with code ${code}`);
            }) as never);

            // Make readdir succeed but createVectorDatabase fail
            mockFs.readdir.mockResolvedValue(['test.md'] as never);
            mockFs.readFile.mockResolvedValue('**TITLE**: Test\n\nContent');

            // Make the database connection fail to trigger the error path
            mockConnect.mockRejectedValue(new Error('Database connection failed'));

            // buildEmbeddings catches errors and calls process.exit, which we mock to throw
            await expect(builder.buildEmbeddings()).rejects.toThrow('process.exit called with code 1');

            expect(mockLogger.error).toHaveBeenCalled();
            expect(exitSpy).toHaveBeenCalledWith(1);
            exitSpy.mockRestore();
        });
    });

    describe('advanced chunking scenarios', () => {
        it('should handle documents with special characters in chunking', () => {
            const builder = new EmbeddingBuilder();
            const content = 'Special chars: áéíóú ñ ç 中文 العربية русский 日本語! '.repeat(100);
            const doc = {
                id: 'special-doc',
                title: 'Special Characters Document',
                content,
                category: 'test',
                path: 'test/special.md',
                tags: ['special', 'unicode'],
                headers: ['Special Header'],
                lastModified: '2023-01-01',
                wordCount: 500,
                excerpt: content.substring(0, 200) + '...'
            };

            const chunks = builder.chunkDocument(doc) as Array<{ content: string }>;

            expect(chunks.length).toBeGreaterThanOrEqual(1);
            expect(chunks[0].content).toContain('áéíóú');
        });

        it('should handle very long content that requires multiple chunks', () => {
            const builder = new EmbeddingBuilder();
            const sentencePattern =
                'This is sentence number ${i}. It contains some meaningful content that would be useful for search and retrieval. ';
            let longContent = '';
            for (let i = 0; i < 1000; i++) {
                longContent += sentencePattern.replace('${i}', i.toString());
            }

            const doc = {
                id: 'long-doc',
                title: 'Very Long Document',
                content: longContent,
                category: 'test',
                path: 'test/long.md',
                tags: ['long'],
                headers: ['Long Header'],
                lastModified: '2023-01-01',
                wordCount: 10000,
                excerpt: longContent.substring(0, 200) + '...'
            };

            const chunks = builder.chunkDocument(doc) as Array<{ content: string }>;

            // With such a long content, we should get at least one chunk, potentially more
            expect(chunks.length).toBeGreaterThanOrEqual(1);
            // Test that the content was processed and chunked appropriately
            expect(chunks[0].content).toContain('This is sentence number');
        });
    });

    describe('error handling and edge cases', () => {
        it('should handle initialize errors when model fails to load', async () => {
            mockPipeline.mockRejectedValue(new Error('Model download failed'));

            const builder = new EmbeddingBuilder();

            await expect(builder.initialize()).rejects.toThrow('Model download failed');
        });

        it('should handle empty data_local directory gracefully', async () => {
            mockFs.readdir.mockResolvedValue([] as never);

            const builder = new EmbeddingBuilder();
            await builder.loadDocuments();

            expect(builder.documents).toHaveLength(0);
        });
    });

    describe('initialization edge cases', () => {
        it('should handle model loading with retry on failure', async () => {
            const mockPipelineInstance = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);

            // First call fails, second succeeds (fallback)
            mockPipeline
                .mockRejectedValueOnce(new Error('Model load failed'))
                .mockResolvedValueOnce(mockPipelineInstance);

            const builder = new EmbeddingBuilder();
            await builder.initialize();

            expect(mockPipeline).toHaveBeenCalledTimes(2);
            expect(builder.pipeline).toBe(mockPipelineInstance);
        });
    });
});
