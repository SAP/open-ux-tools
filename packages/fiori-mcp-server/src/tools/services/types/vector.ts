export interface VectorDocument {
    id: string; // Document ID
    vector: number[]; // Text embeddings (384d or 1536d)
    content: string; // Full document content
    title: string; // Document title
    category: string; // Document category
    path: string; // GitHub file path
    chunk_index: number; // For large documents (0 for single chunk)
    metadata: {
        tags: string[];
        headers: string[];
        lastModified: Date;
        wordCount: number;
        excerpt?: string;
    };
}

export interface VectorSearchResult {
    document: VectorDocument;
    score: number; // Similarity score (0-1)
    distance: number; // Vector distance
}
