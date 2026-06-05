import { jest } from '@jest/globals';
import path from 'node:path';

// Mock fs/promises
const mockAccess = jest.fn<any>();
const actualFsPromises = await import('node:fs/promises');
jest.unstable_mockModule('fs/promises', () => ({
    ...actualFsPromises,
    default: {
        ...actualFsPromises,
        access: mockAccess
    },
    access: mockAccess
}));
jest.unstable_mockModule('node:fs/promises', () => ({
    ...actualFsPromises,
    default: {
        ...actualFsPromises,
        access: mockAccess
    },
    access: mockAccess
}));

// Mock logger
const mockLog = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();
const mockLogger = {
    log: mockLog,
    warn: mockWarn,
    error: mockError,
    info: jest.fn(),
    debug: jest.fn()
};
jest.unstable_mockModule('../../../src/utils/logger', () => ({
    logger: mockLogger
}));

// Mock @sap-ux/fiori-docs-embeddings
jest.unstable_mockModule('@sap-ux/fiori-docs-embeddings', () => ({
    getDataPath: jest.fn().mockReturnValue('/mock/data/path')
}));

const { resolveEmbeddingsPath, hasEmbeddingsData } = await import('../../../src/utils/embeddings-path.js');

describe('embeddings-path', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('resolveEmbeddingsPath', () => {
        it('should return data path from @sap-ux/fiori-docs-embeddings when data is accessible', async () => {
            mockAccess.mockResolvedValue(undefined);

            const result = await resolveEmbeddingsPath();

            expect(result).toEqual({
                dataPath: '/mock/data/path',
                embeddingsPath: path.join('/mock/data/path', 'embeddings'),
                searchPath: path.join('/mock/data/path', 'search'),
                docsPath: path.join('/mock/data/path', 'docs'),
                isExternalPackage: true,
                isAvailable: true
            });

            expect(mockLogger.log).toHaveBeenCalledWith('✓ Using @sap-ux/fiori-docs-embeddings package');
            expect(mockAccess).toHaveBeenCalledWith('/mock/data/path');
        });

        it('should return unavailable when data directory does not exist', async () => {
            mockAccess.mockRejectedValue(new Error('ENOENT: no such file or directory'));

            const result = await resolveEmbeddingsPath();

            expect(result).toEqual({
                dataPath: '/mock/data/path',
                embeddingsPath: path.join('/mock/data/path', 'embeddings'),
                searchPath: path.join('/mock/data/path', 'search'),
                docsPath: path.join('/mock/data/path', 'docs'),
                isExternalPackage: false,
                isAvailable: false
            });

            expect(mockLogger.warn).toHaveBeenCalledWith('⚠️ No embeddings data available - running in limited mode');
        });
    });

    describe('hasEmbeddingsData', () => {
        it('should return true when embeddings data is available', async () => {
            mockAccess.mockResolvedValue(undefined);

            const result = await hasEmbeddingsData();

            expect(result).toBe(true);
        });

        it('should return false when embeddings data is not available', async () => {
            mockAccess.mockRejectedValue(new Error('ENOENT'));

            const result = await hasEmbeddingsData();

            expect(result).toBe(false);
        });
    });
});
