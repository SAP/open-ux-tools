import { TextEmbeddingService } from '../../../../src/tools/services/text-embedding';

describe('TextEmbeddingService', () => {
    let service: TextEmbeddingService;

    beforeEach(() => {
        service = new TextEmbeddingService();
        jest.clearAllMocks();
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
