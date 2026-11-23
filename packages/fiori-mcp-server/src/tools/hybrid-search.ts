import { SimpleVectorService } from './services/vector-simple.js';
import { TextEmbeddingService } from './services/text-embedding.js';
import { logger } from '../utils/logger.js';

export type DocSearchInput = {
    query: string;
    maxResults?: number;
};

export interface SearchResultItem {
    title: string;
    category: string;
    path: string;
    score: number;
    matches: string[];
    excerpt?: string;
    content?: string;
    uri: string;
}

export interface SearchResponseData {
    query: string;
    searchType: 'hybrid' | 'limited_fallback';
    results: SearchResultItem[];
    total: number;
    error?: string;
}

export interface SearchContent {
    type: 'text';
    text: string;
}

export interface SearchResults {
    content: SearchContent[];
}

export type DocSearchOutput = {
    results: SearchResults;
};

/**
 * Performs hybrid search with given parameters.
 *
 * @param params The search input parameters
 * @param resultAsString Whether to return results as string format
 * @returns Promise resolving to hybrid search results
 */
export async function docSearch(
    params: DocSearchInput,
    resultAsString: boolean = false
): Promise<SearchResponseData | string> {
    const { query, maxResults } = params;

    try {
        // Initialize services
        const vectorService = new SimpleVectorService();
        const embeddingService = new TextEmbeddingService();

        await vectorService.initialize();
        await embeddingService.initialize();

        // Convert text query to embedding vector
        const queryVector = await embeddingService.generateEmbedding(query);

        // Perform semantic search with the query vector
        const searchResults = await vectorService.semanticSearch(queryVector, maxResults ?? 10);
        if (resultAsString) {
            let resultString = '';
            for (const [index, result] of searchResults.entries()) {
                resultString += `Result ${index + 1}:\n\n`;
                resultString += `${result.document.content}\n`;
                resultString += '---\n\n';
            }
            return resultString;
        } else {
            // Convert vector search results to the expected format
            return {
                query,
                searchType: 'hybrid',
                results: searchResults.map((result) => ({
                    title: result.document.title,
                    category: result.document.category,
                    path: result.document.path,
                    score: result.score,
                    matches: [], // Vector search doesn't provide specific text matches
                    excerpt: result.document.metadata?.excerpt,
                    content: result.document.content,
                    uri: `sap-fiori://docs/${result.document.category}/${result.document.id}`
                })),
                total: searchResults.length
            };
        }
    } catch (error) {
        logger.warn(`Search failed: ${error}`);
        return {
            query,
            searchType: 'limited_fallback',
            error: 'Search is currently unavailable. The embeddings service failed to initialize.',
            results: [],
            total: 0
        };
    }
}
