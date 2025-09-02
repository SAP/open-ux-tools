import type { DocSearchInput } from '../../../src/tools/hybrid-search';
import { DocSearchService, docSearch } from '../../../src/tools/hybrid-search';
import { SimpleDocumentIndexer } from '../../../src/tools/services/indexer-simple';

// Mock the SimpleDocumentIndexer
jest.mock('../../../src/tools/services/indexer-simple');

const mockIndexer = SimpleDocumentIndexer as jest.MockedClass<typeof SimpleDocumentIndexer>;

describe('hybrid-search', () => {
    let indexerInstance: jest.Mocked<SimpleDocumentIndexer>;
    let docSearchService: DocSearchService;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset the mock implementation
        mockIndexer.mockReset();
        indexerInstance = {
            docSearch: jest.fn()
        } as any;
        mockIndexer.mockImplementation(() => indexerInstance);
        docSearchService = new DocSearchService(indexerInstance);
    });

    describe('DocSearchService', () => {
        describe('constructor', () => {
            it('should create instance with indexer', () => {
                expect(docSearchService).toBeDefined();
                expect(docSearchService).toBeInstanceOf(DocSearchService);
            });
        });

        describe('performDocSearch', () => {
            it('should perform search with valid parameters', async () => {
                const mockResults = [
                    {
                        document: {
                            id: 'doc1',
                            title: 'Test Document 1',
                            category: 'guides',
                            path: 'docs/test1.md',
                            lastModified: new Date('2023-01-01'),
                            tags: ['tag1', 'tag2'],
                            headers: ['header1', 'header2'],
                            excerpt: 'Test excerpt 1'
                        },
                        score: 0.95,
                        matches: ['keyword1', 'keyword2']
                    },
                    {
                        document: {
                            id: 'doc2',
                            title: 'Test Document 2',
                            category: 'tutorials',
                            path: 'docs/test2.md',
                            lastModified: new Date('2023-01-02'),
                            tags: ['tag3'],
                            headers: ['header3'],
                            excerpt: 'Test excerpt 2'
                        },
                        score: 0.85,
                        matches: ['keyword1']
                    }
                ];

                indexerInstance.docSearch.mockResolvedValue(mockResults);

                const result = await docSearchService.performDocSearch('test query', 5);

                expect(indexerInstance.docSearch).toHaveBeenCalledWith('test query', 5);
                expect(result).toEqual({
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(
                                {
                                    query: 'test query',
                                    searchType: 'hybrid',
                                    results: [
                                        {
                                            title: 'Test Document 1',
                                            category: 'guides',
                                            path: 'docs/test1.md',
                                            score: 0.95,
                                            matches: ['keyword1', 'keyword2'],
                                            excerpt: 'Test excerpt 1',
                                            uri: 'sap-fiori://docs/guides/doc1'
                                        },
                                        {
                                            title: 'Test Document 2',
                                            category: 'tutorials',
                                            path: 'docs/test2.md',
                                            score: 0.85,
                                            matches: ['keyword1'],
                                            excerpt: 'Test excerpt 2',
                                            uri: 'sap-fiori://docs/tutorials/doc2'
                                        }
                                    ],
                                    total: 2
                                },
                                null,
                                2
                            )
                        }
                    ]
                });
            });

            it('should use default maxResults when not provided', async () => {
                const mockResults: any[] = [];
                indexerInstance.docSearch.mockResolvedValue(mockResults);

                await docSearchService.performDocSearch('test query');

                expect(indexerInstance.docSearch).toHaveBeenCalledWith('test query', 10);
            });

            it('should handle empty results', async () => {
                indexerInstance.docSearch.mockResolvedValue([]);

                const result = await docSearchService.performDocSearch('test query');

                expect(result.content[0].text).toContain('"results": []');
                expect(result.content[0].text).toContain('"total": 0');
            });

            it('should validate search parameters with zod', async () => {
                indexerInstance.docSearch.mockResolvedValue([]);

                // Test with valid parameters
                await expect(docSearchService.performDocSearch('valid query', 5)).resolves.toBeDefined();

                // Test empty query should still work (zod allows empty strings)
                await expect(docSearchService.performDocSearch('', 5)).resolves.toBeDefined();
            });
        });
    });

    describe('docSearch function', () => {
        beforeEach(() => {
            // Mock console.warn to avoid test output noise
            jest.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should perform successful search', async () => {
            const mockResults = [
                {
                    document: {
                        id: 'doc1',
                        title: 'Test Doc',
                        category: 'guides',
                        path: 'docs/test.md',
                        lastModified: new Date('2023-01-01'),
                        tags: ['test'],
                        headers: ['header'],
                        excerpt: 'Test excerpt'
                    },
                    score: 0.9,
                    matches: ['test']
                }
            ];

            // Mock the indexer's docSearch method
            const mockDocSearch = jest.fn().mockResolvedValue(mockResults);
            mockIndexer.mockImplementation(
                () =>
                    ({
                        docSearch: mockDocSearch
                    } as any)
            );

            const params: DocSearchInput = {
                query: 'test search',
                maxResults: 5
            };

            const result = await docSearch(params);

            expect(result.results).toBeDefined();
        });

        it('should handle search errors with fallback', async () => {
            // Mock the indexer constructor to throw an error
            mockIndexer.mockImplementation(() => {
                throw new Error('Indexer initialization failed');
            });

            const params: DocSearchInput = {
                query: 'test search',
                maxResults: 5
            };

            const result = await docSearch(params);

            expect(result.results.content).toHaveLength(1);
            expect(result.results.content[0].text).toContain('limited_fallback');
            expect(result.results.content[0].text).toContain('Embeddings data not available');
            expect(result.results.content[0].text).toContain('npm install @sap-ux/fiori-docs-embeddings');
            expect(console.warn).toHaveBeenCalledWith(
                'Embeddings data not available, providing limited search capability:',
                expect.any(Error)
            );
        });

        it('should handle search service errors with fallback', async () => {
            // Mock the indexer to initialize successfully but docSearch to fail
            const mockDocSearch = jest.fn().mockRejectedValue(new Error('Search failed'));
            mockIndexer.mockImplementation(
                () =>
                    ({
                        docSearch: mockDocSearch
                    } as any)
            );

            const params: DocSearchInput = {
                query: 'test search'
            };

            const result = await docSearch(params);

            expect(result.results.content).toHaveLength(1);
            expect(result.results.content[0].text).toContain('limited_fallback');
            expect(result.results.content[0].text).toContain('test search');
        });

        it('should use default maxResults when not provided', async () => {
            const mockResults: any[] = [];
            const mockDocSearch = jest.fn().mockResolvedValue(mockResults);
            mockIndexer.mockImplementation(
                () =>
                    ({
                        docSearch: mockDocSearch
                    } as any)
            );

            const params: DocSearchInput = {
                query: 'test search'
            };

            await docSearch(params);

            // The function should work even without maxResults specified
            expect(mockDocSearch).toHaveBeenCalledWith('test search', 10);
        });
    });
});
