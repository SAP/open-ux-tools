import { TextEmbeddingService } from '../../../../src/tools/services/text-embedding';

// Mock the transformers module
jest.mock('@xenova/transformers');

import * as transformersModule from '@xenova/transformers';
const mockTransformers = transformersModule as jest.Mocked<typeof transformersModule>;

describe('TextEmbeddingService', () => {
    let service: TextEmbeddingService;

    beforeEach(() => {
        service = new TextEmbeddingService();
        jest.clearAllMocks();

        // Reset the mock to its default working state
        const createMockPipelineInstance = () =>
            jest.fn().mockResolvedValue({
                data: new Float32Array(384).fill(0).map(() => Math.random() - 0.5)
            }) as unknown as ReturnType<typeof transformersModule.pipeline>;
        mockTransformers.pipeline.mockImplementation(createMockPipelineInstance);
    });

    describe('initialize', () => {
        it('should initialize successfully', async () => {
            await expect(service.initialize()).resolves.not.toThrow();
            expect(service.isInitialized()).toBe(true);
        });

        it('should not reinitialize if already initialized', async () => {
            await service.initialize();
            const firstInitialized = service.isInitialized();

            await service.initialize();
            expect(service.isInitialized()).toBe(firstInitialized);
        });

        it('should handle pipeline creation errors gracefully', async () => {
            // Mock pipeline creation to fail
            mockTransformers.pipeline.mockRejectedValue(new Error('Pipeline creation failed'));

            const newService = new TextEmbeddingService();
            await expect(newService.initialize()).rejects.toThrow('Failed to initialize text embedding service');
        });
    });

    describe('generateEmbedding', () => {
        beforeEach(async () => {
            await service.initialize();
        });

        it('should generate embedding for valid text', async () => {
            const text = 'This is a test text for embedding generation';
            const embedding = await service.generateEmbedding(text);

            expect(embedding).toBeDefined();
            expect(Array.isArray(embedding)).toBe(true);
            expect(embedding.length).toBe(384); // MiniLM-L6-v2 dimensions
        });

        it('should handle long text by truncating', async () => {
            const longText = 'a'.repeat(10000); // Longer than 8192 chars
            const embedding = await service.generateEmbedding(longText);

            expect(embedding).toBeDefined();
            expect(Array.isArray(embedding)).toBe(true);
        });

        it('should normalize text by removing extra whitespace', async () => {
            const textWithWhitespace = 'This   is\n\na   test\n\n\ntext';
            const embedding = await service.generateEmbedding(textWithWhitespace);

            expect(embedding).toBeDefined();
            expect(Array.isArray(embedding)).toBe(true);
        });

        it('should throw error for empty text', async () => {
            await expect(service.generateEmbedding('')).rejects.toThrow('Empty text provided for embedding');
            await expect(service.generateEmbedding('   ')).rejects.toThrow('Empty text provided for embedding');
        });

        it('should throw error if not initialized', async () => {
            const uninitializedService = new TextEmbeddingService();
            await expect(uninitializedService.generateEmbedding('test')).rejects.toThrow(
                'Text embedding service not initialized'
            );
        });

        it('should handle embedding generation errors', async () => {
            await service.initialize();

            // Replace the resolved pipeline with one that throws
            service['pipeline'] = jest.fn().mockRejectedValue(new Error('Embedding generation failed'));

            await expect(service.generateEmbedding('test')).rejects.toThrow('Failed to generate embedding');
        });

        it('should handle pipeline result processing', async () => {
            await service.initialize();

            service['pipeline'] = jest.fn().mockResolvedValue({
                data: new Float32Array([0.1, 0.2, 0.3])
            });

            const result = await service.generateEmbedding('test');
            expect(result).toHaveLength(3);
            expect(result[0]).toBeCloseTo(0.1, 5);
            expect(result[1]).toBeCloseTo(0.2, 5);
            expect(result[2]).toBeCloseTo(0.3, 5);
        });
    });

    describe('isInitialized', () => {
        it('should return false initially', () => {
            expect(service.isInitialized()).toBe(false);
        });

        it('should return true after initialization', async () => {
            await service.initialize();
            expect(service.isInitialized()).toBe(true);
        });
    });
});
