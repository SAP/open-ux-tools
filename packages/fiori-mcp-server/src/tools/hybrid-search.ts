import { z } from 'zod';

import { SimpleDocumentIndexer } from './services/indexer-simple';

/**
 *
 */
export class DocSearchService {
    private readonly indexer: SimpleDocumentIndexer;

    /**
     *
     * @param indexer
     */
    constructor(indexer: SimpleDocumentIndexer) {
        this.indexer = indexer;
    }

    /**
     * Performs hybrid search combining different search strategies.
     *
     * @param query The search query string
     * @param maxResults Maximum number of results to return
     * @returns Promise resolving to search results
     */
    async performDocSearch(query: string, maxResults: number = 10): Promise<any> {
        // Implement the hybrid search logic here
        const searchSchema = z.object({
            query: z.string(),
            maxResults: z.number().optional().default(10)
        });

        const validatedParams = searchSchema.parse({ query, maxResults });
        const results = await this.indexer.docSearch(validatedParams.query, validatedParams.maxResults);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            query: validatedParams.query,
                            searchType: 'hybrid',
                            results: results.map((r: any) => ({
                                title: r.document.title,
                                category: r.document.category,
                                path: r.document.path,
                                score: r.score,
                                matches: r.matches,
                                excerpt: r.document.excerpt,
                                uri: `sap-fiori://docs/${r.document.category}/${r.document.id}`
                            })),
                            total: results.length
                        },
                        null,
                        2
                    )
                }
            ]
        };
    }
}

export type DocSearchInput = {
    query: string;
    maxResults?: number;
};

export type DocSearchOutput = {
    results: any;
};

/**
 * Performs hybrid search with given parameters.
 *
 * @param params The search input parameters
 * @returns Promise resolving to hybrid search results
 */
export async function docSearch(params: DocSearchInput): Promise<DocSearchOutput> {
    const { query, maxResults } = params;

    try {
        // Create indexer and search service
        const indexer = new SimpleDocumentIndexer();
        const searchService = new DocSearchService(indexer);

        // Perform the hybrid search logic here
        const results = await searchService.performDocSearch(query, maxResults);

        return {
            results
        };
    } catch (error) {
        // Fallback when embeddings data is not available
        console.warn('Embeddings data not available, providing limited search capability:', error);

        return {
            results: {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                query,
                                searchType: 'limited_fallback',
                                error: 'Embeddings data not available. Please install @sap-ux/fiori-docs-embeddings for full search capabilities.',
                                results: [],
                                total: 0,
                                suggestion: 'Try running: npm install @sap-ux/fiori-docs-embeddings'
                            },
                            null,
                            2
                        )
                    }
                ]
            }
        };
    }
}
