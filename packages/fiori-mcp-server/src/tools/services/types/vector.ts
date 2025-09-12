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

export interface EmbeddingProvider {
    name: string;
    dimensions: number;
    /**
     *
     */
    generateEmbedding(text: string): Promise<number[]>;
    /**
     *
     */
    generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
}

export interface CodeGenerationConfig {
    enabled: boolean;
    dualEmbedding: boolean;
    codeEmbeddingModel: string;
    complexityAnalysis: boolean;
    lazyModelLoading: boolean;
    semanticCodeRatio: number;
    codeEmbeddingBatchSize: number;
}

export interface VectorDBConfig {
    enabled: boolean;
    dataPath: string;
    embeddingProvider: 'local' | 'openai';
    embeddingModel: string;
    chunkSize: number;
    chunkOverlap: number;
    indexType: string;
    batchSize?: number;
    codeGeneration?: CodeGenerationConfig;
}

export interface ChunkMetadata {
    documentId: string;
    chunkIndex: number;
    startOffset: number;
    endOffset: number;
    totalChunks: number;
}

export interface DocumentChunk {
    id: string; // format is: {documentId}-chunk-{index}
    content: string; // Chunk text content
    metadata: ChunkMetadata;
}

export interface CodeAwareChunk extends DocumentChunk {
    codeType: 'documentation' | 'code_sample' | 'api_definition' | 'configuration';
    programmingLanguage?: string;
    framework?: string;
    apiPattern?: string;
    complexity: 'beginner' | 'intermediate' | 'advanced';
    codeBlocks: CodeBlock[];
}

export interface CodeBlock {
    language?: string;
    content: string;
    startLine: number;
    endLine: number;
    type: 'inline' | 'block' | 'function' | 'class' | 'config';
}

export interface CodeMetadata {
    type: 'documentation' | 'code_sample' | 'api_definition' | 'configuration';
    language?: string;
    framework?: string;
    complexity: 'beginner' | 'intermediate' | 'advanced';
    patterns: string[];
    templates: TemplateInfo[];
}

export interface TemplateInfo {
    name: string;
    description: string;
    variables: string[];
    framework?: string;
}

export interface CodeRequirements {
    language?: string;
    framework?: string;
    complexity?: string;
    pattern?: string;
}

export interface CodeAwareVectorDocument extends VectorDocument {
    semanticVector: number[]; // Conceptual understanding (384d)
    codeVector?: number[]; // Code pattern matching (768d)
    codeMetadata?: CodeMetadata;
}

export interface VectorIndex {
    totalDocuments: number;
    totalChunks: number;
    embeddingDimensions: number;
    lastUpdated: Date;
    provider: string;
    model: string;
}
