import { SimpleVectorService } from './services/vector-simple';
import { TextEmbeddingService } from './services/text-embedding';
import { logger } from '../utils/logger';

export type DocSearchInput = {
    query: string;
    maxResults?: number;
};

export interface SearchResultItem {
    similarity: number;
    content?: string;
}

export interface SearchResponseData {
    query: string;
    searchType: 'semantic' | 'limited_fallback';
    results: SearchResultItem[];
    total: number;
    error?: string;
    suggestion?: string;
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

        // Perform semantic search with the query
        const searchResults = await vectorService.semanticSearch(query, maxResults ?? 10);
        if (resultAsString) {
            let resultString = '';
            for (const [index, result] of searchResults.entries()) {
                resultString += `Result ${index + 1}:\n\n`;
                resultString += `${result.content}\n`;
                resultString += '---\n\n';
            }
            return resultString;
        } else {
            return {
                query,
                searchType: 'semantic',
                results: searchResults.map((result) => ({
                    similarity: result.similarity,
                    content: result.content
                })),
                total: searchResults.length
            };
        }
    } catch (error) {
        // Fallback when embeddings data is not available
        logger.warn(`Embeddings data not available, providing limited search capability: ${error}`);
        return {
            query,
            searchType: 'limited_fallback',
            error: 'Embeddings data not available. Please install @sap-ux/fiori-docs-embeddings for full search capabilities.',
            results: [],
            total: 0,
            suggestion: 'Try running: npm install -g @sap-ux/fiori-docs-embeddings'
        };
    }
}
