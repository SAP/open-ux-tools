import { z } from 'zod';

import { SimpleDocumentIndexer } from './services/indexer-simple';
import type { SearchResult } from './services/types/index';

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
    async performDocSearch(query: string, maxResults: number = 10): Promise<SearchResponseData> {
        const results = await this.indexer.docSearch(query, maxResults);
        return {
            query: query,
            searchType: 'hybrid',
            results: results.map((r: SearchResult) => ({
                title: r.document.title,
                category: r.document.category,
                path: r.document.path,
                score: r.score,
                matches: r.matches,
                excerpt: r.document.excerpt,
                uri: `sap-fiori://docs/${r.document.category}/${r.document.id}`
            })),
            total: results.length
        };
    }
}

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
    uri: string;
}

export interface SearchResponseData {
    query: string;
    searchType: 'hybrid' | 'limited_fallback';
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
 * @returns Promise resolving to hybrid search results
 */
export async function docSearch(params: DocSearchInput): Promise<SearchResponseData> {
    const { query, maxResults } = params;

    try {
        // Create indexer and search service
        const indexer = new SimpleDocumentIndexer();
        const searchService = new DocSearchService(indexer);

        // Perform the hybrid search logic here
        const results = await searchService.performDocSearch(query, maxResults);

        return results;
    } catch (error) {
        // Fallback when embeddings data is not available
        console.warn('Embeddings data not available, providing limited search capability:', error);

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
