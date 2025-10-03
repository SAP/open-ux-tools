export interface DocumentMeta {
    id: string;
    title: string;
    category: string;
    path: string;
    lastModified: Date;
    tags: string[];
    headers: string[];
    content?: string;
    excerpt?: string;
}

export interface SearchIndex {
    documents: Map<string, DocumentMeta>;
    keywords: Map<string, string[]>;
    categories: Map<string, string[]>;
}

export interface ServerConfig {
    repository: {
        owner: string;
        repo: string;
        branch: string;
        docsPath: string;
    };
    indexing: {
        filePatterns: string[];
        excludePatterns: string[];
        maxFileSize: string;
    };
    server: {
        name: string;
        version: string;
        port?: number;
    };
    github?: {
        token?: string;
    };
    cache?: {
        duration?: number;
    };
    logging?: {
        level?: string;
    };
    vectordb?: {
        enabled: boolean;
        dataPath: string;
        embeddingProvider: 'local' | 'openai';
        embeddingModel: string;
        chunkSize: number;
        chunkOverlap: number;
        indexType: string;
        batchSize?: number;
        codeGeneration?: {
            enabled: boolean;
            dualEmbedding: boolean;
            codeEmbeddingModel: string;
            complexityAnalysis: boolean;
            lazyModelLoading: boolean;
            semanticCodeRatio: number;
            codeEmbeddingBatchSize: number;
        };
    };
    openai?: {
        apiKey?: string;
    };
}

export interface GitHubFile {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string;
    type: string;
    content?: string;
    encoding?: string;
}

export interface GitHubDirectoryResponse {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string | null;
    type: 'file' | 'dir';
}

export interface SearchResult {
    document: DocumentMeta;
    score: number;
    matches: string[];
}
