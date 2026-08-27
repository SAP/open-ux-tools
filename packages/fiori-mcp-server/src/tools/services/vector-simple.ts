import type { VectorSearchResult } from './types/vector.js';
import { logger } from '../../utils/logger.js';
import { resolveEmbeddingsPath } from '../../utils/embeddings-path.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface EmbeddingMetadata {
    version: string;
    createdAt: string;
    model: string;
    dimensions: number;
    totalVectors: number;
    totalDocuments: number;
    chunkSize: number;
    chunkOverlap: number;
}

interface VectorRecord {
    id: string;
    content: string;
    title: string;
    category: string;
    path: string;
    chunk_index: number;
    document_id: string;
    tags_json: string;
    headers_json: string;
    lastModified: string;
    wordCount: number;
    excerpt: string;
    totalChunks: number;
}

export class SimpleVectorService {
    private vectors: Float32Array | null = null;
    private records: VectorRecord[] = [];
    private metadata: EmbeddingMetadata | null = null;
    private dimensions = 0;

    async initialize(): Promise<void> {
        try {
            logger.log('Loading vector database from pre-built embeddings...');

            const pathInfo = await resolveEmbeddingsPath();

            if (!pathInfo.isAvailable) {
                throw new Error('No embeddings data available');
            }

            logger.log(`Using embeddings path: ${pathInfo.embeddingsPath} (external: ${pathInfo.isExternalPackage})`);

            const metadataContent = await fs.readFile(path.join(pathInfo.embeddingsPath, 'metadata.json'), 'utf-8');
            this.metadata = JSON.parse(metadataContent);

            logger.log(`✓ Embedding metadata loaded:`);
            logger.log(`  Model: ${this.metadata?.model}`);
            logger.log(`  Dimensions: ${this.metadata?.dimensions}`);
            logger.log(`  Total vectors: ${this.metadata?.totalVectors}`);
            logger.log(`  Created: ${this.metadata?.createdAt}`);

            this.dimensions = this.metadata?.dimensions ?? 384;

            const binBuffer = await fs.readFile(path.join(pathInfo.embeddingsPath, 'embeddings.bin'));
            this.vectors = new Float32Array(binBuffer.buffer, binBuffer.byteOffset, binBuffer.byteLength / 4).slice();

            const recordsContent = await fs.readFile(path.join(pathInfo.embeddingsPath, 'records.jsonl'), 'utf-8');
            this.records = recordsContent
                .split('\n')
                .filter((line) => line.trim())
                .map((line) => JSON.parse(line) as VectorRecord);

            logger.log('✓ Vector database loaded and ready');
        } catch (error) {
            throw new Error(`Failed to load vector database: ${error}`);
        }
    }

    async semanticSearch(queryVector: number[], limit: number = 10, category?: string): Promise<VectorSearchResult[]> {
        if (!this.vectors || this.records.length === 0) {
            throw new Error('Vector database not initialized');
        }

        try {
            const qv = new Float32Array(queryVector);
            const scored: { idx: number; distance: number }[] = [];

            for (let i = 0; i < this.records.length; i++) {
                if (category && this.records[i].category !== category) {
                    continue;
                }
                const distance = this.cosineDistance(qv, i);
                scored.push({ idx: i, distance });
            }

            scored.sort((a, b) => a.distance - b.distance);

            return scored
                .slice(0, limit)
                .map(({ idx, distance }) => this.toSearchResult(this.records[idx], idx, distance));
        } catch (error) {
            logger.error(`Semantic search failed: ${error}`);
            throw new Error(`Semantic search failed: ${error}`);
        }
    }

    async findSimilarToText(_text: string, _limit: number = 5): Promise<VectorSearchResult[]> {
        logger.warn('findSimilarToText requires embedding generation - not available in simplified mode');
        return [];
    }

    async findSimilarToDocument(documentId: string, limit: number = 5): Promise<VectorSearchResult[]> {
        if (!this.vectors || this.records.length === 0) {
            throw new Error('Vector database not initialized');
        }

        try {
            const refIdx = this.records.findIndex((r) => r.document_id === documentId && r.chunk_index === 0);
            if (refIdx === -1) {
                return [];
            }

            const scored: { idx: number; distance: number }[] = [];
            for (let i = 0; i < this.records.length; i++) {
                if (this.records[i].document_id === documentId) {
                    continue;
                }
                scored.push({ idx: i, distance: this.cosineDistance(this.getVector(refIdx), i) });
            }

            // Deduplicate by document_id keeping best (lowest) distance
            const best = new Map<string, { idx: number; distance: number }>();
            for (const entry of scored) {
                const docId = this.records[entry.idx].document_id;
                const existing = best.get(docId);
                if (!existing || entry.distance < existing.distance) {
                    best.set(docId, entry);
                }
            }

            return Array.from(best.values())
                .sort((a, b) => a.distance - b.distance)
                .slice(0, limit)
                .map(({ idx, distance }) => this.toSearchResult(this.records[idx], idx, distance));
        } catch (error) {
            logger.error(`Find similar documents failed: ${error}`);
            return [];
        }
    }

    async getDocumentsByCategory(category: string, limit?: number): Promise<VectorSearchResult[]> {
        if (!this.vectors || this.records.length === 0) {
            throw new Error('Vector database not initialized');
        }

        try {
            let results = this.records
                .map((rec, idx) => ({ rec, idx }))
                .filter(({ rec }) => rec.category === category && rec.chunk_index === 0);

            if (limit) {
                results = results.slice(0, limit);
            }

            return results.map(({ rec, idx }) => this.toSearchResult(rec, idx, 0, 1));
        } catch (error) {
            logger.error(`Get documents by category failed: ${error}`);
            return [];
        }
    }

    getMetadata(): EmbeddingMetadata | null {
        return this.metadata;
    }

    isInitialized(): boolean {
        return this.vectors !== null && this.metadata !== null;
    }

    async close(): Promise<void> {
        this.vectors = null;
        this.records = [];
        this.metadata = null;
        logger.log('Vector database connection closed');
    }

    private getVector(idx: number): Float32Array {
        const offset = idx * this.dimensions;
        return this.vectors!.subarray(offset, offset + this.dimensions);
    }

    private cosineDistance(qv: Float32Array, idx: number): number {
        const dv = this.getVector(idx);
        let dot = 0;
        let normQ = 0;
        let normD = 0;
        for (let d = 0; d < this.dimensions; d++) {
            dot += qv[d] * dv[d];
            normQ += qv[d] * qv[d];
            normD += dv[d] * dv[d];
        }
        const denom = Math.sqrt(normQ) * Math.sqrt(normD);
        return denom === 0 ? 1 : 1 - dot / denom;
    }

    private parseJsonField(jsonString: string): string[] {
        try {
            return jsonString ? JSON.parse(jsonString) : [];
        } catch {
            return [];
        }
    }

    private toSearchResult(rec: VectorRecord, idx: number, distance: number, score?: number): VectorSearchResult {
        const s = score ?? 1 - distance;
        return {
            document: {
                id: rec.document_id,
                vector: [],
                content: rec.content,
                title: rec.title,
                category: rec.category,
                path: rec.path,
                chunk_index: rec.chunk_index,
                metadata: {
                    tags: this.parseJsonField(rec.tags_json) || [],
                    headers: this.parseJsonField(rec.headers_json) || [],
                    lastModified: new Date(rec.lastModified),
                    wordCount: rec.wordCount,
                    excerpt: rec.excerpt
                }
            },
            score: s,
            distance
        };
    }
}
