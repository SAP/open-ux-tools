import { jest } from '@jest/globals';
import type { DocSearchInput, SearchResponseData } from '../../../src/tools/hybrid-search.js';

// Mock the service dependencies
const mockInitializeVector = jest.fn<any>();
const mockSemanticSearch = jest.fn<any>();
const mockIsInitializedVector = jest.fn<any>();
const mockCloseVector = jest.fn<any>();
jest.unstable_mockModule('../../../src/tools/services/vector-simple', () => ({
    SimpleVectorService: jest.fn().mockImplementation(() => ({
        initialize: mockInitializeVector,
        semanticSearch: mockSemanticSearch,
        isInitialized: mockIsInitializedVector,
        close: mockCloseVector
    }))
}));

const mockInitializeEmbed = jest.fn<any>();
const mockGenerateEmbedding = jest.fn<any>();
const mockIsInitializedEmbed = jest.fn<any>();
jest.unstable_mockModule('../../../src/tools/services/text-embedding', () => ({
    TextEmbeddingService: jest.fn().mockImplementation(() => ({
        initialize: mockInitializeEmbed,
        generateEmbedding: mockGenerateEmbedding,
        isInitialized: mockIsInitializedEmbed
    }))
}));

const { docSearch } = await import('../../../src/tools/hybrid-search.js');

describe('hybrid-search', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
            mockInitializeVector.mockResolvedValue(undefined);
            mockInitializeEmbed.mockResolvedValue(undefined);
            mockGenerateEmbedding.mockResolvedValue(mockQueryVector);
            mockSemanticSearch.mockResolvedValue(mockSearchResults);

            const result = (await docSearch(mockSearchParams, false)) as SearchResponseData;

            expect(mockInitializeVector).toHaveBeenCalledTimes(1);
            expect(mockInitializeEmbed).toHaveBeenCalledTimes(1);
            expect(mockGenerateEmbedding).toHaveBeenCalledWith('test query');
            expect(mockSemanticSearch).toHaveBeenCalledWith(mockQueryVector, 5);

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

            mockInitializeVector.mockResolvedValue(undefined);
            mockInitializeEmbed.mockResolvedValue(undefined);
            mockGenerateEmbedding.mockResolvedValue(mockQueryVector);
            mockSemanticSearch.mockResolvedValue(mockSearchResults);

            await docSearch(paramsWithoutMaxResults, false);

            expect(mockSemanticSearch).toHaveBeenCalledWith(mockQueryVector, 10);
        });

        it('should return results as formatted string when resultAsString is true', async () => {
            mockInitializeVector.mockResolvedValue(undefined);
            mockInitializeEmbed.mockResolvedValue(undefined);
            mockGenerateEmbedding.mockResolvedValue(mockQueryVector);
            mockSemanticSearch.mockResolvedValue(mockSearchResults);

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
                        }
                    }
                }
            ];

            mockInitializeVector.mockResolvedValue(undefined);
            mockInitializeEmbed.mockResolvedValue(undefined);
            mockGenerateEmbedding.mockResolvedValue(mockQueryVector);
            mockSemanticSearch.mockResolvedValue(resultsWithoutExcerpt);

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

            mockInitializeVector.mockResolvedValue(undefined);
            mockInitializeEmbed.mockResolvedValue(undefined);
            mockGenerateEmbedding.mockResolvedValue(mockQueryVector);
            mockSemanticSearch.mockResolvedValue(resultsWithNullMetadata);

            const result = (await docSearch(mockSearchParams, false)) as SearchResponseData;

            expect(result.results[0].excerpt).toBeUndefined();
        });

        it('should return fallback response when vector service initialization fails', async () => {
            mockInitializeVector.mockRejectedValue(new Error('Vector service init failed'));

            const result = (await docSearch(mockSearchParams, false)) as SearchResponseData;

            expect(result).toEqual({
                query: 'test query',
                searchType: 'limited_fallback',
                error: 'Search is currently unavailable. The embeddings service failed to initialize.',
                results: [],
                total: 0
            });

            expect(mockGenerateEmbedding).not.toHaveBeenCalled();
            expect(mockSemanticSearch).not.toHaveBeenCalled();
        });

        it('should return fallback response when embedding service initialization fails', async () => {
            mockInitializeVector.mockResolvedValue(undefined);
            mockInitializeEmbed.mockRejectedValue(new Error('Embedding service init failed'));

            const result = (await docSearch(mockSearchParams, false)) as SearchResponseData;

            expect(result).toEqual({
                query: 'test query',
                searchType: 'limited_fallback',
                error: 'Search is currently unavailable. The embeddings service failed to initialize.',
                results: [],
                total: 0
            });
        });

        it('should return fallback response when embedding generation fails', async () => {
            mockInitializeVector.mockResolvedValue(undefined);
            mockInitializeEmbed.mockResolvedValue(undefined);
            mockGenerateEmbedding.mockRejectedValue(new Error('Embedding generation failed'));

            const result = (await docSearch(mockSearchParams, false)) as SearchResponseData;

            expect(result.searchType).toBe('limited_fallback');
            expect(result.error).toBeDefined();
            expect(result.results).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('should return fallback response when semantic search fails', async () => {
            mockInitializeVector.mockResolvedValue(undefined);
            mockInitializeEmbed.mockResolvedValue(undefined);
            mockGenerateEmbedding.mockResolvedValue(mockQueryVector);
            mockSemanticSearch.mockRejectedValue(new Error('Semantic search failed'));

            const result = (await docSearch(mockSearchParams, false)) as SearchResponseData;

            expect(result.searchType).toBe('limited_fallback');
            expect(result.error).toBeDefined();
            expect(result.results).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('should handle empty search results', async () => {
            mockInitializeVector.mockResolvedValue(undefined);
            mockInitializeEmbed.mockResolvedValue(undefined);
            mockGenerateEmbedding.mockResolvedValue(mockQueryVector);
            mockSemanticSearch.mockResolvedValue([]);

            const result = (await docSearch(mockSearchParams, false)) as SearchResponseData;

            expect(result.searchType).toBe('hybrid');
            expect(result.results).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('should handle string result format with empty results', async () => {
            mockInitializeVector.mockResolvedValue(undefined);
            mockInitializeEmbed.mockResolvedValue(undefined);
            mockGenerateEmbedding.mockResolvedValue(mockQueryVector);
            mockSemanticSearch.mockResolvedValue([]);

            const result = (await docSearch(mockSearchParams, true)) as string;

            expect(typeof result).toBe('string');
            expect(result).toBe('');
        });

        it('should handle maxResults parameter correctly', async () => {
            const paramsWithMaxResults: DocSearchInput = {
                query: 'test query',
                maxResults: 15
            };

            mockInitializeVector.mockResolvedValue(undefined);
            mockInitializeEmbed.mockResolvedValue(undefined);
            mockGenerateEmbedding.mockResolvedValue(mockQueryVector);
            mockSemanticSearch.mockResolvedValue(mockSearchResults);

            await docSearch(paramsWithMaxResults, false);

            expect(mockSemanticSearch).toHaveBeenCalledWith(mockQueryVector, 15);
        });

        it('should handle different query strings', async () => {
            const differentParams: DocSearchInput = {
                query: 'how to configure SAP Fiori elements',
                maxResults: 3
            };

            mockInitializeVector.mockResolvedValue(undefined);
            mockInitializeEmbed.mockResolvedValue(undefined);
            mockGenerateEmbedding.mockResolvedValue(mockQueryVector);
            mockSemanticSearch.mockResolvedValue(mockSearchResults);

            const result = (await docSearch(differentParams, false)) as SearchResponseData;

            expect(mockGenerateEmbedding).toHaveBeenCalledWith('how to configure SAP Fiori elements');
            expect(result.query).toBe('how to configure SAP Fiori elements');
        });
    });
});
