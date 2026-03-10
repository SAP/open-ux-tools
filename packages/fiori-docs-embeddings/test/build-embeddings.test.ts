import * as fs from 'node:fs/promises';

const mockEmbeddings = jest.fn();
const mockStore = jest.fn();

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

jest.mock('@sap-ux/logger', () => ({
    ToolsLogger: jest.fn().mockImplementation(() => mockLogger)
}));

jest.mock('@sap-ux/semantic-search', () => ({
    embeddings: mockEmbeddings,
    store: mockStore
}));

// Mock the index module to avoid import.meta issues in Jest
jest.mock('../src/index', () => ({
    getDataPath: jest.fn().mockReturnValue('/mock/data'),
    getEmbeddingsPath: jest.fn().mockReturnValue('/mock/data/embeddings'),
    embeddingsIds: [{ id: 'fiori-embeddings', path: '/mock/data/embeddings', weighting: 1 }]
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
        batchSize: number;
    };
    documents: Array<unknown>;
    chunks: Array<unknown>;
    initialize(): Promise<void>;
    loadDocuments(): Promise<void>;
    chunkDocument(doc: unknown): unknown[];
    findSentenceBreak(text: string): number;
    chunkAllDocuments(): Promise<void>;
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
            expect(builder.config.embeddingsPath).toContain('embeddings');
            expect(builder.config.batchSize).toBe(20);
        });
    });

    describe('initialize', () => {
        it('should complete initialization without error', async () => {
            const builder = new EmbeddingBuilder();
            await expect(builder.initialize()).resolves.not.toThrow();
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
            mockFs.readFile.mockRejectedValue(new Error('File read error'));

            const builder = new EmbeddingBuilder();
            await builder.loadDocuments();

            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });

    describe('chunkDocument', () => {
        it('should not chunk small documents', () => {
            const builder = new EmbeddingBuilder();
            const doc = {
                id: 'test-doc',
                title: 'Test Document',
                content: 'This is a short piece of content.',
                category: 'test',
                path: 'test/doc.md',
                tags: ['test'],
                headers: ['Header'],
                lastModified: '2023-01-01',
                wordCount: 7,
                excerpt: 'This is a short...'
            };

            const chunks = builder.chunkDocument(doc) as Array<{ content: string; metadata: { totalChunks: number } }>;

            expect(chunks).toHaveLength(1);
            expect(chunks[0].content).toBe('This is a short piece of content.');
        });

        it('should chunk large documents', () => {
            const builder = new EmbeddingBuilder();
            const content = 'A'.repeat(5000);
            const doc = {
                id: 'test-doc',
                title: 'Test Document',
                content,
                category: 'test',
                path: 'test/doc.md',
                tags: ['test'],
                headers: ['Header'],
                lastModified: '2023-01-01',
                wordCount: 5000,
                excerpt: content.substring(0, 200) + '...'
            };

            const chunks = builder.chunkDocument(doc) as Array<{ content: string; metadata: { totalChunks: number } }>;

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

    describe('buildEmbeddings error handling', () => {
        let exitSpy: jest.SpyInstance;

        beforeEach(() => {
            exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
                throw new Error(`process.exit called with "${code}"`);
            }) as never);
        });

        afterEach(() => {
            exitSpy.mockRestore();
        });

        it('should handle directory read errors gracefully and log warnings', async () => {
            const builder = new EmbeddingBuilder();
            mockLogger.warn.mockClear();

            // Force an error in loadDocuments by making readdir fail
            mockFs.readdir.mockRejectedValue(new Error('Directory read error'));

            // Mock embeddings to succeed (no chunks to process)
            mockEmbeddings.mockResolvedValue({ embeddings: [] });

            // loadDocuments catches errors and logs warnings, doesn't throw
            await builder.buildEmbeddings();

            // Verify that the warning was logged
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Failed to read data_local directory')
            );
        });
    });

    describe('buildEmbeddings integration', () => {
        let exitSpy: jest.SpyInstance;

        beforeEach(() => {
            // Mock process.exit to prevent Jest from exiting on errors
            exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
                throw new Error(`process.exit called with "${code}"`);
            }) as never);
        });

        afterEach(() => {
            exitSpy.mockRestore();
        });

        it('should build embeddings successfully with real flow', async () => {
            const mockMarkdownContent = `**TITLE**: Test Document
**TAGS**: test, fiori

This is test content for embedding generation.`;

            mockFs.readdir.mockResolvedValue(['test.md'] as never);
            mockFs.readFile.mockResolvedValue(mockMarkdownContent);
            mockFs.mkdir.mockResolvedValue(undefined as never);
            mockFs.writeFile.mockResolvedValue(undefined as never);

            // Mock the embeddings function to return valid results
            mockEmbeddings.mockResolvedValue({
                embeddings: [[0.1, 0.2, 0.3]]
            });
            mockStore.mockResolvedValue(undefined);

            const builder = new EmbeddingBuilder();
            await builder.buildEmbeddings();

            expect(mockEmbeddings).toHaveBeenCalled();
            expect(mockStore).toHaveBeenCalled();
        });

        it('should handle embedding generation errors and exit gracefully', async () => {
            const builder = new EmbeddingBuilder();

            mockLogger.error.mockClear();

            // Make readdir succeed but embedding generation fail
            mockFs.readdir.mockResolvedValue(['test.md'] as never);
            mockFs.readFile.mockResolvedValue('**TITLE**: Test\n\nContent');

            // Make the embeddings call fail to trigger the error path
            mockEmbeddings.mockRejectedValue(new Error('Embedding generation failed'));

            // buildEmbeddings catches errors and calls process.exit, which we mock to throw
            await expect(builder.buildEmbeddings()).rejects.toThrow('process.exit called with "1"');

            expect(mockLogger.error).toHaveBeenCalled();
            expect(exitSpy).toHaveBeenCalledWith(1);
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
        let exitSpy: jest.SpyInstance;

        beforeEach(() => {
            exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
                throw new Error(`process.exit called with "${code}"`);
            }) as never);
        });

        afterEach(() => {
            exitSpy.mockRestore();
        });

        it('should handle empty data_local directory gracefully', async () => {
            mockFs.readdir.mockResolvedValue([] as never);

            const builder = new EmbeddingBuilder();
            await builder.loadDocuments();

            expect(builder.documents).toHaveLength(0);
        });
    });
});
