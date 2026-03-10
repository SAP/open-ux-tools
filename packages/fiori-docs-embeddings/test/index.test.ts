import * as path from 'node:path';
import { getDataPath, getEmbeddingsPath, embeddingsIds } from '../src/index';

describe('fiori-docs-embeddings index', () => {
    describe('getDataPath', () => {
        it('should return a path to the data directory', () => {
            const dataPath = getDataPath();
            expect(dataPath).toBeDefined();
            expect(typeof dataPath).toBe('string');
            expect(dataPath.endsWith('data')).toBe(true);
        });

        it('should return an absolute path', () => {
            const dataPath = getDataPath();
            expect(path.isAbsolute(dataPath)).toBe(true);
        });
    });

    describe('getEmbeddingsPath', () => {
        it('should return a path to the embeddings directory', () => {
            const embeddingsPath = getEmbeddingsPath();
            expect(embeddingsPath).toBeDefined();
            expect(typeof embeddingsPath).toBe('string');
            expect(embeddingsPath.endsWith(path.join('data', 'embeddings'))).toBe(true);
        });

        it('should return an absolute path', () => {
            const embeddingsPath = getEmbeddingsPath();
            expect(path.isAbsolute(embeddingsPath)).toBe(true);
        });

        it('should be a subdirectory of getDataPath', () => {
            const dataPath = getDataPath();
            const embeddingsPath = getEmbeddingsPath();
            expect(embeddingsPath.startsWith(dataPath)).toBe(true);
        });
    });

    describe('embeddingsIds', () => {
        it('should be an array with at least one entry', () => {
            expect(Array.isArray(embeddingsIds)).toBe(true);
            expect(embeddingsIds.length).toBeGreaterThan(0);
        });

        it('should have correct structure for each entry', () => {
            embeddingsIds.forEach((entry) => {
                expect(entry).toHaveProperty('id');
                expect(entry).toHaveProperty('path');
                expect(entry).toHaveProperty('weighting');
                expect(typeof entry.id).toBe('string');
                expect(typeof entry.path).toBe('string');
                expect(typeof entry.weighting).toBe('number');
            });
        });

        it('should have the fiori-embeddings entry', () => {
            const fioriEntry = embeddingsIds.find((e) => e.id === 'fiori-embeddings');
            expect(fioriEntry).toBeDefined();
            expect(fioriEntry?.weighting).toBe(1);
        });
    });
});
