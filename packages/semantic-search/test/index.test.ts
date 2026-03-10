import * as semanticSearch from '../src/index';

describe('index exports', () => {
    it('should export embeddings function', () => {
        expect(semanticSearch.embeddings).toBeDefined();
        expect(typeof semanticSearch.embeddings).toBe('function');
    });

    it('should export search function', () => {
        expect(semanticSearch.search).toBeDefined();
        expect(typeof semanticSearch.search).toBe('function');
    });

    it('should export store function', () => {
        expect(semanticSearch.store).toBeDefined();
        expect(typeof semanticSearch.store).toBe('function');
    });

    it('should export load function', () => {
        expect(semanticSearch.load).toBeDefined();
        expect(typeof semanticSearch.load).toBe('function');
    });

    it('should export register function', () => {
        expect(semanticSearch.register).toBeDefined();
        expect(typeof semanticSearch.register).toBe('function');
    });

    it('should export registered function', () => {
        expect(semanticSearch.registered).toBeDefined();
        expect(typeof semanticSearch.registered).toBe('function');
    });

    it('should export loadRegistered function', () => {
        expect(semanticSearch.loadRegistered).toBeDefined();
        expect(typeof semanticSearch.loadRegistered).toBe('function');
    });

    it('should export clearCache function', () => {
        expect(semanticSearch.clearCache).toBeDefined();
        expect(typeof semanticSearch.clearCache).toBe('function');
    });

    it('should export rootDir constant', () => {
        expect(semanticSearch.rootDir).toBeDefined();
        expect(typeof semanticSearch.rootDir).toBe('string');
    });

    it('should export embeddingsDir constant', () => {
        expect(semanticSearch.embeddingsDir).toBeDefined();
        expect(typeof semanticSearch.embeddingsDir).toBe('string');
    });
});
