#!/usr/bin/env node

import { pipeline } from '@xenova/transformers';
import { connect } from '@lancedb/lancedb';
import fs from 'fs/promises';
import path from 'path';

interface EmbeddingConfig {
    docsPath: string;
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

interface DocumentIndex {
    totalDocuments: number;
    documents: Record<string, string>;
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

interface VectorData {
    id: string;
    vector: number[];
    content: string;
    title: string;
    category: string;
    path: string;
    chunk_index: number;
    document_id: string;
    metadata: {
        tags: string[];
        headers: string[];
        lastModified: string;
        wordCount: number;
        excerpt: string;
        totalChunks: number;
    };
    [key: string]: unknown;
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

class EmbeddingBuilder {
    private config: EmbeddingConfig;
    private pipeline: any;
    private documents: Document[];
    private chunks: Chunk[];

    constructor() {
        this.config = {
            docsPath: './data/docs',
            embeddingsPath: './data/embeddings',
            model: 'Xenova/all-MiniLM-L6-v2',
            chunkSize: 2000, // Increased to reduce number of chunks
            chunkOverlap: 100, // Reduced overlap
            batchSize: 20 // Increased batch size for faster processing
        };
        this.pipeline = null;
        this.documents = [];
        this.chunks = [];
    }

    async initialize(): Promise<void> {
        console.log('🤖 Loading embedding model...');
        console.log(`Model: ${this.config.model}`);

        try {
            this.pipeline = await pipeline('feature-extraction', this.config.model, {
                quantized: false, // Try without quantization first
                progress_callback: (progress: any) => {
                    if (progress.status === 'downloading') {
                        console.log(`Downloading: ${Math.round(progress.progress || 0)}%`);
                    }
                }
            });
        } catch (error) {
            console.warn('Failed to load preferred model, trying fallback...');
            // Fallback to a simpler model if the main one fails
            this.pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                quantized: false,
                progress_callback: (progress: any) => {
                    if (progress.status === 'downloading') {
                        console.log(`Fallback model downloading: ${Math.round(progress.progress || 0)}%`);
                    }
                }
            });
        }

        console.log('✓ Embedding model loaded');
    }

    async loadDocuments(): Promise<void> {
        console.log('\n📚 Loading documents from filestore...');

        const indexPath = path.join(this.config.docsPath, 'index.json');
        const index: DocumentIndex = JSON.parse(await fs.readFile(indexPath, 'utf-8'));

        console.log(`Found ${index.totalDocuments} documents in index`);

        for (const [docId, docPath] of Object.entries(index.documents)) {
            try {
                const fullPath = path.join(this.config.docsPath, docPath);
                const docContent = await fs.readFile(fullPath, 'utf-8');
                const doc: Document = JSON.parse(docContent);
                this.documents.push(doc);
            } catch (error: any) {
                console.warn(`Failed to load document ${docId}:`, error.message);
            }
        }

        console.log(`✓ Loaded ${this.documents.length} documents`);
    }

    chunkDocument(doc: Document): Chunk[] {
        // For small documents, don't chunk at all
        if (!doc.content || doc.content.length <= this.config.chunkSize) {
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

        const chunks: Chunk[] = [];
        const text = doc.content;
        let currentOffset = 0;
        let chunkIndex = 0;

        while (currentOffset < text.length) {
            const endOffset = Math.min(currentOffset + this.config.chunkSize, text.length);
            let chunkText = text.substring(currentOffset, endOffset);

            // Try to break at sentence boundaries
            if (endOffset < text.length) {
                const sentenceBreak = this.findSentenceBreak(chunkText);
                if (sentenceBreak > this.config.chunkSize * 0.7) {
                    chunkText = chunkText.substring(0, sentenceBreak);
                }
            }

            chunks.push({
                id: `${doc.id}-chunk-${chunkIndex}`,
                documentId: doc.id,
                chunkIndex,
                content: chunkText.trim(),
                title: doc.title,
                category: doc.category,
                path: doc.path,
                metadata: {
                    tags: doc.tags,
                    headers: doc.headers,
                    lastModified: doc.lastModified,
                    wordCount: chunkText.trim().split(/\s+/).length,
                    excerpt: chunkText.trim().substring(0, 200) + (chunkText.trim().length > 200 ? '...' : ''),
                    totalChunks: 0 // Will be set after all chunks are created
                }
            });

            currentOffset += Math.max(chunkText.length - this.config.chunkOverlap, 1);
            chunkIndex++;
        }

        // Update total chunks count
        chunks.forEach((chunk) => {
            chunk.metadata.totalChunks = chunks.length;
        });

        return chunks;
    }

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
        console.log('\n✂️  Chunking documents...');

        for (const doc of this.documents) {
            const docChunks = this.chunkDocument(doc);
            this.chunks.push(...docChunks);
        }

        console.log(`✓ Created ${this.chunks.length} chunks from ${this.documents.length} documents`);

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

        console.log(`📊 Chunk statistics:`);
        console.log(`   Total chunks: ${stats.totalChunks}`);
        console.log(`   Average size: ${stats.averageChunkSize} characters`);
        console.log(`   Single-chunk docs: ${stats.singleChunkDocs}`);
        console.log(`   Multi-chunk docs: ${stats.multiChunkDocs}`);
    }

    async generateEmbedding(text: string): Promise<number[]> {
        const cleanText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 8192);

        const result = await this.pipeline(cleanText, { pooling: 'mean', normalize: true });
        return Array.from(result.data);
    }

    async generateAllEmbeddings(): Promise<void> {
        console.log('\n🧠 Generating embeddings...');
        console.log(`Processing ${this.chunks.length} chunks in batches of ${this.config.batchSize}`);

        const batches: Chunk[][] = [];
        for (let i = 0; i < this.chunks.length; i += this.config.batchSize) {
            batches.push(this.chunks.slice(i, i + this.config.batchSize));
        }

        let processedCount = 0;
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];

            // Only show batch progress every 50 batches or for the first few
            if (i < 5 || i % 50 === 0 || i === batches.length - 1) {
                console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} chunks)`);
            }

            for (const chunk of batch) {
                try {
                    chunk.vector = await this.generateEmbedding(chunk.content);
                    processedCount++;

                    if (processedCount % 200 === 0 || processedCount === this.chunks.length) {
                        const percent = Math.round((processedCount / this.chunks.length) * 100);
                        console.log(`  ✓ Processed ${processedCount}/${this.chunks.length} chunks (${percent}%)`);
                    }
                } catch (error: any) {
                    console.warn(`Failed to generate embedding for ${chunk.id}:`, error.message);
                }
            }
        }

        console.log(`✓ Generated ${processedCount} embeddings`);
    }

    async createVectorDatabase(): Promise<EmbeddingMetadata> {
        console.log('\n💾 Creating vector database...');

        // Ensure embeddings directory exists
        await fs.mkdir(this.config.embeddingsPath, { recursive: true });

        // Connect to LanceDB
        const dbPath = path.resolve(this.config.embeddingsPath);
        const db = await connect(dbPath);

        // Prepare data for LanceDB
        const vectorData: VectorData[] = this.chunks
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
                metadata: {
                    tags: chunk.metadata.tags,
                    headers: chunk.metadata.headers,
                    lastModified: chunk.metadata.lastModified,
                    wordCount: chunk.metadata.wordCount,
                    excerpt: chunk.metadata.excerpt,
                    totalChunks: chunk.metadata.totalChunks
                }
            }));

        console.log(`Storing ${vectorData.length} vectors in LanceDB`);

        // Check if table exists and drop it to ensure clean rebuild
        try {
            const existingTable = await db.openTable('documents');
            if (existingTable) {
                console.log('🗑️  Dropping existing documents table...');
                await db.dropTable('documents');
                console.log('✓ Existing table dropped');
            }
        } catch (error) {
            // Table doesn't exist, which is fine
            console.log('📝 Creating new documents table...');
        }

        // Create new table
        await db.createTable('documents', vectorData);

        console.log('✓ Vector database created');

        // Create metadata file
        const metadata: EmbeddingMetadata = {
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            model: this.config.model,
            dimensions: vectorData.length > 0 ? vectorData[0].vector.length : 384,
            totalVectors: vectorData.length,
            totalDocuments: this.documents.length,
            chunkSize: this.config.chunkSize,
            chunkOverlap: this.config.chunkOverlap
        };

        const metadataPath = path.join(this.config.embeddingsPath, 'metadata.json');
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

        console.log(`✓ Created metadata file: ${metadataPath}`);

        return metadata;
    }

    async buildEmbeddings(): Promise<void> {
        console.log('🚀 Starting embedding generation...');

        try {
            await this.initialize();
            await this.loadDocuments();
            await this.chunkAllDocuments();
            await this.generateAllEmbeddings();
            const metadata = await this.createVectorDatabase();

            console.log('\n🎉 Embedding generation completed!');
            console.log(`📊 Summary:`);
            console.log(`   Model: ${metadata.model}`);
            console.log(`   Dimensions: ${metadata.dimensions}`);
            console.log(`   Total vectors: ${metadata.totalVectors}`);
            console.log(`   Total documents: ${metadata.totalDocuments}`);
            console.log(`   Database: ${this.config.embeddingsPath}`);
        } catch (error: any) {
            console.error('❌ Embedding generation failed:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }
}

// Run the builder
if (import.meta.url === `file://${process.argv[1]}`) {
    const builder = new EmbeddingBuilder();
    builder.buildEmbeddings().catch((error) => {
        console.error('Build failed:', error);
        process.exit(1);
    });
}
