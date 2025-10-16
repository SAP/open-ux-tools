import type { DocSearchInput, SearchResponseData } from '../../../src/tools/hybrid-search';
import { docSearch } from '../../../src/tools/hybrid-search';
import { SimpleVectorService } from '../../../src/tools/services/vector-simple';
import { TextEmbeddingService } from '../../../src/tools/services/text-embedding';

// Mock the service dependencies
jest.mock('../../../src/tools/services/vector-simple');
jest.mock('../../../src/tools/services/text-embedding');

const MockedSimpleVectorService = SimpleVectorService as jest.MockedClass<typeof SimpleVectorService>;
const MockedTextEmbeddingService = TextEmbeddingService as jest.MockedClass<typeof TextEmbeddingService>;

describe('hybrid-search', () => {
    let mockVectorService: jest.Mocked<SimpleVectorService>;
    let mockEmbeddingService: jest.Mocked<TextEmbeddingService>;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Create mocked instances
        mockVectorService = {
            initialize: jest.fn(),
            semanticSearch: jest.fn(),
            isInitialized: jest.fn(),
            close: jest.fn()
        } as any;

        mockEmbeddingService = {
            initialize: jest.fn(),
            generateEmbedding: jest.fn(),
            isInitialized: jest.fn()
        } as any;

        // Mock the constructor calls to return our mocked instances
        MockedSimpleVectorService.mockImplementation(() => mockVectorService);
        MockedTextEmbeddingService.mockImplementation(() => mockEmbeddingService);
    });

    describe('docSearch', () => {
        const mockSearchParams: DocSearchInput = {
            query: 'test query',
            maxResults: 5
        };

        const mockQueryVector = [0.1, 0.2, 0.3, 0.4, 0.5];

        const mockSearchResults = [
            {
                score: 0.95,
                distance: 0.05,
                document: {
                    id: 'doc1',
                    vector: [0.1, 0.2, 0.3],
                    title: 'Test Document 1',
                    category: 'guides',
                    path: 'guides/test1.md',
                    content: 'This is the content of test document 1',
                    chunk_index: 0,
                    metadata: {
                        tags: ['guide', 'test'],
                        headers: ['Introduction'],
                        lastModified: new Date('2023-01-01'),
                        wordCount: 100,
                        excerpt: 'This is an excerpt of test document 1'
                    }
                }
            },
            {
                score: 0.87,
                distance: 0.13,
                document: {
                    id: 'doc2',
                    vector: [0.4, 0.5, 0.6],
                    title: 'Test Document 2',
                    category: 'tutorials',
                    path: 'tutorials/test2.md',
                    content: 'This is the content of test document 2',
                    chunk_index: 0,
                    metadata: {
                        tags: ['tutorial', 'test'],
                        headers: ['Getting Started'],
                        lastModified: new Date('2023-01-02'),
                        wordCount: 150,
                        excerpt: 'This is an excerpt of test document 2'
                    }
                }
            }
        ];

        it('should perform successful hybrid search and return structured results', async () => {
            // Setup mocks for successful path
            mockVectorService.initialize.mockResolvedValue();
            mockEmbeddingService.initialize.mockResolvedValue();
            mockEmbeddingService.generateEmbedding.mockResolvedValue(mockQueryVector);
            mockVectorService.semanticSearch.mockResolvedValue(mockSearchResults);

            const result = (await docSearch(mockSearchParams, false)) as SearchResponseData;

            // Verify service initialization
            expect(mockVectorService.initialize).toHaveBeenCalledTimes(1);
            expect(mockEmbeddingService.initialize).toHaveBeenCalledTimes(1);

            // Verify embedding generation
            expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith('test query');

            // Verify semantic search
            expect(mockVectorService.semanticSearch).toHaveBeenCalledWith(mockQueryVector, 5);

            // Verify result structure
            expect(result).toEqual({
                query: 'test query',
                searchType: 'hybrid',
                results: [
                    {
                        title: 'Test Document 1',
                        category: 'guides',
                        path: 'guides/test1.md',
                        score: 0.95,
                        matches: [],
                        excerpt: 'This is an excerpt of test document 1',
                        content: 'This is the content of test document 1',
                        uri: 'sap-fiori://docs/guides/doc1'
                    },
                    {
                        title: 'Test Document 2',
                        category: 'tutorials',
                        path: 'tutorials/test2.md',
                        score: 0.87,
                        matches: [],
                        excerpt: 'This is an excerpt of test document 2',
                        content: 'This is the content of test document 2',
                        uri: 'sap-fiori://docs/tutorials/doc2'
                    }
                ],
                total: 2
            });
        });

        it('should use default maxResults value when not provided', async () => {
            const paramsWithoutMaxResults: DocSearchInput = {
                query: 'test query'
            };

            mockVectorService.initialize.mockResolvedValue();
            mockEmbeddingService.initialize.mockResolvedValue();
            mockEmbeddingService.generateEmbedding.mockResolvedValue(mockQueryVector);
            mockVectorService.semanticSearch.mockResolvedValue(mockSearchResults);

            await docSearch(paramsWithoutMaxResults, false);

            expect(mockVectorService.semanticSearch).toHaveBeenCalledWith(mockQueryVector, 10);
        });

        it('should return results as formatted string when resultAsString is true', async () => {
            mockVectorService.initialize.mockResolvedValue();
            mockEmbeddingService.initialize.mockResolvedValue();
            mockEmbeddingService.generateEmbedding.mockResolvedValue(mockQueryVector);
            mockVectorService.semanticSearch.mockResolvedValue(mockSearchResults);

            const result = (await docSearch(mockSearchParams, true)) as string;

            expect(typeof result).toBe('string');
            expect(result).toContain('Result 1:');
            expect(result).toContain('Result 2:');
            expect(result).toContain('This is the content of test document 1');
            expect(result).toContain('This is the content of test document 2');
            expect(result).toContain('---');
        });

        it('should handle documents without metadata excerpt', async () => {
            const resultsWithoutExcerpt = [
                {
                    score: 0.95,
                    distance: 0.05,
                    document: {
                        id: 'doc1',
                        vector: [0.1, 0.2, 0.3],
                        title: 'Test Document 1',
                        category: 'guides',
                        path: 'guides/test1.md',
                        content: 'This is the content of test document 1',
                        chunk_index: 0,
                        metadata: {
                            tags: ['guide'],
                            headers: ['Introduction'],
                            lastModified: new Date('2023-01-01'),
                            wordCount: 100
                            // No excerpt
                        }
                    }
                }
            ];

            mockVectorService.initialize.mockResolvedValue();
            mockEmbeddingService.initialize.mockResolvedValue();
            mockEmbeddingService.generateEmbedding.mockResolvedValue(mockQueryVector);
            mockVectorService.semanticSearch.mockResolvedValue(resultsWithoutExcerpt);

            const result = (await docSearch(mockSearchParams, false)) as SearchResponseData;

            expect(result.results[0].excerpt).toBeUndefined();
        });

        it('should handle documents with null metadata', async () => {
            const resultsWithNullMetadata = [
                {
                    score: 0.95,
                    distance: 0.05,
                    document: {
                        id: 'doc1',
                        vector: [0.1, 0.2, 0.3],
                        title: 'Test Document 1',
                        category: 'guides',
                        path: 'guides/test1.md',
                        content: 'This is the content of test document 1',
                        chunk_index: 0,
                        metadata: null as any
                    }
                }
            ];

            mockVectorService.initialize.mockResolvedValue();
            mockEmbeddingService.initialize.mockResolvedValue();
            mockEmbeddingService.generateEmbedding.mockResolvedValue(mockQueryVector);
            mockVectorService.semanticSearch.mockResolvedValue(resultsWithNullMetadata);

            const result = (await docSearch(mockSearchParams, false)) as SearchResponseData;

            expect(result.results[0].excerpt).toBeUndefined();
        });

        it('should return fallback response when vector service initialization fails', async () => {
            mockVectorService.initialize.mockRejectedValue(new Error('Vector service init failed'));

            const result = (await docSearch(mockSearchParams, false)) as SearchResponseData;

            expect(result).toEqual({
                query: 'test query',
                searchType: 'limited_fallback',
                error: 'Embeddings data not available. Please install @sap-ux/fiori-docs-embeddings for full search capabilities.',
                results: [],
                total: 0,
                suggestion: 'Try running: npm install -g @sap-ux/fiori-docs-embeddings'
            });

            // Should not call further methods after initialization failure
            expect(mockEmbeddingService.generateEmbedding).not.toHaveBeenCalled();
            expect(mockVectorService.semanticSearch).not.toHaveBeenCalled();
        });

        it('should return fallback response when embedding service initialization fails', async () => {
            mockVectorService.initialize.mockResolvedValue();
            mockEmbeddingService.initialize.mockRejectedValue(new Error('Embedding service init failed'));

            const result = (await docSearch(mockSearchParams, false)) as SearchResponseData;

            expect(result).toEqual({
                query: 'test query',
                searchType: 'limited_fallback',
                error: 'Embeddings data not available. Please install @sap-ux/fiori-docs-embeddings for full search capabilities.',
                results: [],
                total: 0,
                suggestion: 'Try running: npm install -g @sap-ux/fiori-docs-embeddings'
            });
        });

        it('should return fallback response when embedding generation fails', async () => {
            mockVectorService.initialize.mockResolvedValue();
            mockEmbeddingService.initialize.mockResolvedValue();
            mockEmbeddingService.generateEmbedding.mockRejectedValue(new Error('Embedding generation failed'));

            const result = (await docSearch(mockSearchParams, false)) as SearchResponseData;

            expect(result.searchType).toBe('limited_fallback');
            expect(result.error).toBeDefined();
            expect(result.results).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('should return fallback response when semantic search fails', async () => {
            mockVectorService.initialize.mockResolvedValue();
            mockEmbeddingService.initialize.mockResolvedValue();
            mockEmbeddingService.generateEmbedding.mockResolvedValue(mockQueryVector);
            mockVectorService.semanticSearch.mockRejectedValue(new Error('Semantic search failed'));

            const result = (await docSearch(mockSearchParams, false)) as SearchResponseData;

            expect(result.searchType).toBe('limited_fallback');
            expect(result.error).toBeDefined();
            expect(result.results).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('should handle empty search results', async () => {
            mockVectorService.initialize.mockResolvedValue();
            mockEmbeddingService.initialize.mockResolvedValue();
            mockEmbeddingService.generateEmbedding.mockResolvedValue(mockQueryVector);
            mockVectorService.semanticSearch.mockResolvedValue([]);

            const result = (await docSearch(mockSearchParams, false)) as SearchResponseData;

            expect(result.searchType).toBe('hybrid');
            expect(result.results).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('should handle string result format with empty results', async () => {
            mockVectorService.initialize.mockResolvedValue();
            mockEmbeddingService.initialize.mockResolvedValue();
            mockEmbeddingService.generateEmbedding.mockResolvedValue(mockQueryVector);
            mockVectorService.semanticSearch.mockResolvedValue([]);

            const result = (await docSearch(mockSearchParams, true)) as string;

            expect(typeof result).toBe('string');
            expect(result).toBe('');
        });

        it('should handle maxResults parameter correctly', async () => {
            const paramsWithMaxResults: DocSearchInput = {
                query: 'test query',
                maxResults: 15
            };

            mockVectorService.initialize.mockResolvedValue();
            mockEmbeddingService.initialize.mockResolvedValue();
            mockEmbeddingService.generateEmbedding.mockResolvedValue(mockQueryVector);
            mockVectorService.semanticSearch.mockResolvedValue(mockSearchResults);

            await docSearch(paramsWithMaxResults, false);

            expect(mockVectorService.semanticSearch).toHaveBeenCalledWith(mockQueryVector, 15);
        });

        it('should handle different query strings', async () => {
            const differentParams: DocSearchInput = {
                query: 'how to configure SAP Fiori elements',
                maxResults: 3
            };

            mockVectorService.initialize.mockResolvedValue();
            mockEmbeddingService.initialize.mockResolvedValue();
            mockEmbeddingService.generateEmbedding.mockResolvedValue(mockQueryVector);
            mockVectorService.semanticSearch.mockResolvedValue(mockSearchResults);

            const result = (await docSearch(differentParams, false)) as SearchResponseData;

            expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith('how to configure SAP Fiori elements');
            expect(result.query).toBe('how to configure SAP Fiori elements');
        });
    });
});
