/**
 * Text embedding service for converting text queries to vectors.
 */

/**
 * Simple text embedding service that uses the same model as the build process.
 */
export class TextEmbeddingService {
    private pipeline: any = null;
    private initialized = false;

    /**
     * Initialize the embedding pipeline.
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            // Dynamically import the ES Module
            const { pipeline } = await import('@xenova/transformers');

            // Use the same model as the build process
            this.pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                quantized: false
            });

            this.initialized = true;
        } catch (error) {
            throw new Error(
                `Failed to initialize text embedding service: ${error}. Make sure @xenova/transformers is available.`
            );
        }
    }

    /**
     * Generate embedding vector for the given text.
     *
     * @param text - Text to convert to embedding
     * @returns Promise resolving to embedding vector
     */
    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.initialized || !this.pipeline) {
            throw new Error('Text embedding service not initialized. Call initialize() first.');
        }

        try {
            // Clean and normalize text like in the build process
            const cleanText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 8192);

            if (!cleanText) {
                throw new Error('Empty text provided for embedding');
            }

            // Generate embedding with same settings as build process
            const result = await this.pipeline(cleanText, {
                pooling: 'mean',
                normalize: true
            });

            return Array.from(result.data);
        } catch (error) {
            throw new Error(`Failed to generate embedding: ${error}`);
        }
    }

    /**
     * Check if the service is initialized and ready.
     *
     * @returns True if initialized, false otherwise
     */
    isInitialized(): boolean {
        return this.initialized;
    }
}
