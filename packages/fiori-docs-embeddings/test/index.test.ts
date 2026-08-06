import { getDataPath, getEmbeddingsPath, getSearchPath, getDocsPath, hasEmbeddings } from '../index';

describe('index exports', () => {
    it('exports all declared functions', () => {
        expect(typeof getDataPath).toBe('function');
        expect(typeof getEmbeddingsPath).toBe('function');
        expect(typeof getSearchPath).toBe('function');
        expect(typeof getDocsPath).toBe('function');
        expect(typeof hasEmbeddings).toBe('function');
    });

    it('getDataPath returns a string', () => {
        expect(typeof getDataPath()).toBe('string');
    });

    it('getEmbeddingsPath returns a string', () => {
        expect(typeof getEmbeddingsPath()).toBe('string');
    });

    it('getSearchPath returns a string', () => {
        expect(typeof getSearchPath()).toBe('string');
    });

    it('getDocsPath returns a string', () => {
        expect(typeof getDocsPath()).toBe('string');
    });

    it('hasEmbeddings returns a Promise<boolean>', async () => {
        const result = await hasEmbeddings();
        expect(typeof result).toBe('boolean');
    });
});
