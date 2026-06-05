#!/usr/bin/env node

import { pipeline, env } from '@huggingface/transformers';
import type { FeatureExtractionPipeline } from '@huggingface/transformers';

import type { Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { ToolsLogger, type Logger } from '@sap-ux/logger';

// Store downloaded models under the package root so the CI cache step can
// target a stable path regardless of the pnpm store layout.
const packageRoot = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
env.cacheDir = path.join(packageRoot, '.cache');

interface ProgressCallback {
    status: string;
    progress?: number;
}

interface EmbeddingConfig {
    embeddingsPath: string;
    model: string;
    chunkSize: number;
    chunkOverlap: number;
    batchSize: number;
}

interface Document {
    id: string;
    title: string;
    content: string;
    category: string;
    path: string;
    tags: string[];
    headers: string[];
    lastModified: string;
    wordCount: number;
    excerpt: string;
}

interface Chunk {
    id: string;
    documentId: string;
    chunkIndex: number;
    content: string;
    title: string;
    category: string;
    path: string;
    metadata: {
        tags: string[];
        headers: string[];
        lastModified: string;
        wordCount: number;
        excerpt: string;
        totalChunks: number;
    };
    vector?: number[];
}

interface EmbeddingMetadata {
    version: string;
    createdAt: string;
    model: string;
    dimensions: number;
    totalVectors: number;
    totalDocuments: number;
    chunkSize: number;
    chunkOverlap: number;
}

/**
 *
 */
class EmbeddingBuilder {
    private readonly config: EmbeddingConfig;
    private pipeline: FeatureExtractionPipeline;
    private readonly documents: Document[];
    private readonly chunks: Chunk[];
    private readonly logger: Logger;

    constructor() {
        this.config = {
            embeddingsPath: './data/embeddings',
            model: 'Xenova/all-MiniLM-L6-v2',
            chunkSize: 2000,
            chunkOverlap: 100,
            batchSize: 20
        };
        this.documents = [];
        this.chunks = [];
        this.logger = new ToolsLogger();
    }

    async initialize(): Promise<void> {
        this.logger.info('🤖 Loading embedding model...');
        this.logger.info(`Model: ${this.config.model}`);

        try {
            this.pipeline = await pipeline('feature-extraction', this.config.model, {
                progress_callback: (progress: ProgressCallback) => {
                    if (progress.status === 'downloading') {
                        this.logger.info(`Downloading: ${Math.round(progress.progress || 0)}%`);
                    }
                }
            });
        } catch (error) {
            this.logger.warn(`Failed to load preferred model (${error.message}), trying fallback...`);
            // Fallback to a simpler model if the main one fails
            this.pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                progress_callback: (progress: ProgressCallback) => {
                    if (progress.status === 'downloading') {
                        this.logger.info(`Fallback model downloading: ${Math.round(progress.progress || 0)}%`);
                    }
                }
            });
        }

        this.logger.info('✓ Embedding model loaded');
    }

    async loadDocuments(): Promise<void> {
        this.logger.info('\n📚 Loading documents...');
        await this.loadLocalDocuments();
    }

    /**
     * Load Local markdown documents from data_local directory.
     * These files use -------------------------------- as chunk delimiters.
     */
    async loadLocalDocuments(): Promise<void> {
        const dataLocalPath = './data_local';

        try {
            const files = await fs.readdir(dataLocalPath);
            const mdFiles = files.filter((file) => file.endsWith('.md'));

            this.logger.info(`Found ${mdFiles.length} markdown files in data_local`);

            for (const file of mdFiles) {
                await this.processLocalMarkdownFile(dataLocalPath, file);
            }

            this.logger.info(`✓ Loaded ${this.documents.length} documents`);
        } catch (error) {
            this.logger.warn(`Failed to read data_local directory: ${error.message}`);
        }
    }

    /**
     * Process a single local markdown file.
     *
     * @param dataLocalPath - Path to the data_local directory
     * @param file - Filename to process
     */
    private async processLocalMarkdownFile(dataLocalPath: string, file: string): Promise<void> {
        try {
            const filePath = path.join(dataLocalPath, file);
            const content = await fs.readFile(filePath, 'utf-8');

            // Split by the delimiter
            const chunks = content.split('--------------------------------').filter((chunk) => chunk.trim());

            this.logger.info(`  ${file}: ${chunks.length} chunks`);

            for (const [index, chunkContent] of chunks.entries()) {
                const doc = this.createDocumentFromChunk(file, index, chunkContent);
                if (doc) {
                    this.documents.push(doc);
                }
            }
        } catch (error) {
            this.logger.warn(`Failed to load local document ${file}: ${error.message}`);
        }
    }

    /**
     * Create a Document from a markdown chunk.
     *
     * @param file - Source filename
     * @param index - Chunk index
     * @param chunkContent - Content of the chunk
     * @returns Document or null if chunk is empty
     */
    private createDocumentFromChunk(file: string, index: number, chunkContent: string): Document | null {
        const trimmedContent = chunkContent.trim();
        if (!trimmedContent) {
            return null;
        }

        // Extract title from **TITLE**
        const titleMatch = trimmedContent.match(/\*\*TITLE\*\*:\s*(.+)/);
        const title = titleMatch ? titleMatch[1].trim() : `${file} - Chunk ${index + 1}`;

        // Extract tags from **TAGS**
        const tagsMatch = trimmedContent.match(/\*\*TAGS\*\*:\s*(.+)/);
        const tags = tagsMatch ? tagsMatch[1].split(',').map((tag) => tag.trim()) : ['fiori', 'elements'];

        // Determine category from filename (remove .md extension and convert to title case)
        const category =
            file
                .replace('.md', '')
                .split(/[-_]/)
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ') ?? 'Fiori Elements';

        return {
            id: `local-${file.replace('.md', '')}-${index}`,
            title,
            content: trimmedContent,
            category,
            path: `data_local/${file}`,
            tags,
            headers: [],
            lastModified: new Date().toISOString(),
            wordCount: trimmedContent.split(/\s+/).length,
            excerpt: trimmedContent.substring(0, 200)
        };
    }

    /**
     * Chunk a document into smaller pieces for embedding.
     *
     * @param doc - Document to chunk
     * @returns Array of document chunks
     */
    chunkDocument(doc: Document): Chunk[] {
        // For simplicity, return the whole document as a single chunk
        return [
            {
                id: `${doc.id}-chunk-0`,
                documentId: doc.id,
                chunkIndex: 0,
                content: doc.content || '',
                title: doc.title,
                category: doc.category,
                path: doc.path,
                metadata: {
                    tags: doc.tags,
                    headers: doc.headers,
                    lastModified: doc.lastModified,
                    wordCount: doc.wordCount,
                    excerpt: doc.excerpt,
                    totalChunks: 1
                }
            }
        ];
    }

    /**
     * Find the best sentence break point in text.
     *
     * @param text - Text to find break point in
     * @returns Index of the best break point
     */
    findSentenceBreak(text: string): number {
        const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
        let bestBreak = -1;

        for (const ender of sentenceEnders) {
            const index = text.lastIndexOf(ender);
            if (index > bestBreak) {
                bestBreak = index + ender.length;
            }
        }

        if (bestBreak === -1) {
            const paragraphBreak = text.lastIndexOf('\n\n');
            if (paragraphBreak > 0) {
                bestBreak = paragraphBreak + 2;
            }
        }

        if (bestBreak === -1) {
            const lineBreak = text.lastIndexOf('\n');
            if (lineBreak > text.length * 0.5) {
                bestBreak = lineBreak + 1;
            }
        }

        return bestBreak > 0 ? bestBreak : text.length;
    }

    async chunkAllDocuments(): Promise<void> {
        this.logger.info('\n✂️  Chunking documents...');

        for (const doc of this.documents) {
            const docChunks = this.chunkDocument(doc);
            this.chunks.push(...docChunks);
        }

        this.logger.info(`✓ Created ${this.chunks.length} chunks from ${this.documents.length} documents`);

        const stats = {
            totalChunks: this.chunks.length,
            averageChunkSize: Math.round(
                this.chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / this.chunks.length
            ),
            singleChunkDocs: this.chunks.filter((chunk) => chunk.metadata.totalChunks === 1).length,
            multiChunkDocs: new Set(
                this.chunks.filter((chunk) => chunk.metadata.totalChunks > 1).map((chunk) => chunk.documentId)
            ).size
        };

        this.logger.info(`📊 Chunk statistics:`);
        this.logger.info(`   Total chunks: ${stats.totalChunks}`);
        this.logger.info(`   Average size: ${stats.averageChunkSize} characters`);
        this.logger.info(`   Single-chunk docs: ${stats.singleChunkDocs}`);
        this.logger.info(`   Multi-chunk docs: ${stats.multiChunkDocs}`);
    }

    /**
     * Generate embedding for text using the transformer pipeline.
     *
     * @param text - Text to generate embedding for
     * @returns Promise resolving to embedding vector
     */
    async generateEmbedding(text: string): Promise<number[]> {
        const cleanText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 8192);

        const result = await this.pipeline(cleanText, { pooling: 'mean', normalize: true });
        return Array.from(result.data);
    }

    async generateAllEmbeddings(): Promise<void> {
        this.logger.info('\n🧠 Generating embeddings...');
        this.logger.info(`Processing ${this.chunks.length} chunks in batches of ${this.config.batchSize}`);

        const batches: Chunk[][] = [];
        for (let i = 0; i < this.chunks.length; i += this.config.batchSize) {
            batches.push(this.chunks.slice(i, i + this.config.batchSize));
        }

        let processedCount = 0;
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];

            // Only show batch progress every 50 batches or for the first few
            if (i < 5 || i % 50 === 0 || i === batches.length - 1) {
                this.logger.info(`Processing batch ${i + 1}/${batches.length} (${batch.length} chunks)`);
            }

            for (const chunk of batch) {
                try {
                    chunk.vector = await this.generateEmbedding(chunk.content);
                    processedCount++;

                    if (processedCount % 200 === 0 || processedCount === this.chunks.length) {
                        const percent = Math.round((processedCount / this.chunks.length) * 100);
                        this.logger.info(`  ✓ Processed ${processedCount}/${this.chunks.length} chunks (${percent}%)`);
                    }
                } catch (error) {
                    this.logger.warn(`Failed to generate embedding for ${chunk.id}: ${error.message}`);
                }
            }
        }

        this.logger.info(`✓ Generated ${processedCount} embeddings`);
    }

    /**
     * Remove stale LanceDB artifacts left by the previous embedding format.
     * Deletes *.lance directories and table_index.json from the embeddings path.
     */
    private async cleanStaleArtifacts(): Promise<void> {
        let entries: Dirent[];
        try {
            entries = await fs.readdir(this.config.embeddingsPath, { withFileTypes: true });
        } catch {
            return; // directory doesn't exist yet — nothing to clean
        }

        for (const entry of entries) {
            const fullPath = path.join(this.config.embeddingsPath, entry.name);
            if (entry.isDirectory() && entry.name.endsWith('.lance')) {
                await fs.rm(fullPath, { recursive: true, force: true });
                this.logger.info(`✓ Removed stale LanceDB directory: ${entry.name}`);
            } else if (entry.isFile() && entry.name === 'table_index.json') {
                await fs.rm(fullPath, { force: true });
                this.logger.info(`✓ Removed stale file: ${entry.name}`);
            }
        }
    }

    /**
     * Create vector database with embeddings.
     *
     * @returns Promise resolving to embedding metadata
     */
    async createVectorDatabase(): Promise<EmbeddingMetadata> {
        this.logger.info('\n💾 Creating vector database...');

        await fs.mkdir(this.config.embeddingsPath, { recursive: true });

        // Remove stale LanceDB artifacts from previous format (*.lance dirs, table_index.json)
        await this.cleanStaleArtifacts();

        const vectorData = this.chunks
            .filter((chunk) => chunk.vector)
            .map((chunk) => ({
                id: chunk.id,
                vector: chunk.vector!,
                content: chunk.content,
                title: chunk.title,
                category: chunk.category,
                path: chunk.path,
                chunk_index: chunk.chunkIndex,
                document_id: chunk.documentId,
                tags_json: JSON.stringify(chunk.metadata.tags || []),
                headers_json: JSON.stringify(chunk.metadata.headers || []),
                lastModified: chunk.metadata.lastModified || '',
                wordCount: chunk.metadata.wordCount || 0,
                excerpt: chunk.metadata.excerpt || '',
                totalChunks: chunk.metadata.totalChunks || 1
            }));

        this.logger.info(`Storing ${vectorData.length} vectors`);

        const dimensions = vectorData.length > 0 ? vectorData[0].vector.length : 384;

        // Filter out any vectors with unexpected dimensions before writing to keep binary and JSONL in sync
        const validVectorData = vectorData.filter((entry, i) => {
            if (entry.vector.length !== dimensions) {
                this.logger.warn(
                    `Vector ${i} has unexpected length ${entry.vector.length} (expected ${dimensions}), skipping`
                );
                return false;
            }
            return true;
        });

        // Write flat binary file: N * D float32 values, row-major
        const binBuffer = Buffer.allocUnsafe(validVectorData.length * dimensions * 4);
        for (let i = 0; i < validVectorData.length; i++) {
            const vec = validVectorData[i].vector;
            for (let d = 0; d < dimensions; d++) {
                binBuffer.writeFloatLE(vec[d], (i * dimensions + d) * 4);
            }
        }
        await fs.writeFile(path.join(this.config.embeddingsPath, 'embeddings.bin'), binBuffer);
        this.logger.info('✓ Wrote embeddings.bin');

        // Write records as newline-delimited JSON (one record per line, no vector field)
        const lines = validVectorData.map(({ vector: _v, ...rec }) => JSON.stringify(rec)).join('\n');
        await fs.writeFile(path.join(this.config.embeddingsPath, 'records.jsonl'), lines);
        this.logger.info('✓ Wrote records.jsonl');

        const metadata: EmbeddingMetadata = {
            version: '2.0.0',
            createdAt: new Date().toISOString(),
            model: this.config.model,
            dimensions,
            totalVectors: validVectorData.length,
            totalDocuments: this.documents.length,
            chunkSize: this.config.chunkSize,
            chunkOverlap: this.config.chunkOverlap
        };

        await fs.writeFile(path.join(this.config.embeddingsPath, 'metadata.json'), JSON.stringify(metadata, null, 2));
        this.logger.info('✓ Created metadata.json');

        return metadata;
    }

    async buildEmbeddings(): Promise<void> {
        this.logger.info('🚀 Starting embedding generation...');

        try {
            await this.initialize();
            await this.loadDocuments();
            await this.chunkAllDocuments();
            await this.generateAllEmbeddings();
            const metadata = await this.createVectorDatabase();

            this.logger.info('\n🎉 Embedding generation completed!');
            this.logger.info(`📊 Summary:`);
            this.logger.info(`   Model: ${metadata.model}`);
            this.logger.info(`   Dimensions: ${metadata.dimensions}`);
            this.logger.info(`   Total vectors: ${metadata.totalVectors}`);
            this.logger.info(`   Total documents: ${metadata.totalDocuments}`);
            this.logger.info(`   Database: ${this.config.embeddingsPath}`);
        } catch (error) {
            this.logger.error(`❌ Embedding generation failed: ${error.message}`);
            if (error.stack) {
                this.logger.error(error.stack);
            }
            process.exit(1);
        }
    }
}

// Export the class
export { EmbeddingBuilder };

// Run the builder
// In ESM, check if this file is being run directly (cross-platform safe)
const isMainModule = fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
    const logger = new ToolsLogger();
    const builder = new EmbeddingBuilder();
    try {
        await builder.buildEmbeddings();
    } catch (error) {
        logger.error(`Build failed: ${error.message}`);
        process.exit(1);
    }
}
