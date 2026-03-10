import { resolveEmbeddingsPath } from '../../../src/utils/embeddings-path';
import { logger } from '../../../src/utils/logger';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

jest.mock('node:fs', () => ({
    existsSync: jest.fn()
}));

// Mock the @sap-ux/fiori-docs-embeddings module
jest.mock('@sap-ux/fiori-docs-embeddings', () => ({
    getDataPath: jest.fn(),
    getEmbeddingsPath: jest.fn()
}));

import { getDataPath, getEmbeddingsPath } from '@sap-ux/fiori-docs-embeddings';

const mockGetDataPath = getDataPath as jest.MockedFunction<typeof getDataPath>;
const mockGetEmbeddingsPath = getEmbeddingsPath as jest.MockedFunction<typeof getEmbeddingsPath>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('embeddings-path', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('resolveEmbeddingsPath', () => {
        it('should return bundled data when dist/data/embeddings exists', async () => {
            // Bundled data exists
            mockExistsSync.mockReturnValue(true);

            const result = await resolveEmbeddingsPath();

            expect(result.isExternalPackage).toBe(false);
            expect(result.isAvailable).toBe(true);
            expect(result.dataPath).toContain('data');
            expect(result.embeddingsPath).toContain(path.join('data', 'embeddings'));
            expect(mockLogger.log).toHaveBeenCalledWith('✓ Using bundled embeddings data');
        });

        it('should fall back to external package when bundled data does not exist', async () => {
            const mockPackageDataPath = '/path/to/external/package/data';
            const mockPackageEmbeddingsPath = '/path/to/external/package/embeddings';

            // First call (bundled) returns false, second call (external package) returns true
            mockExistsSync
                .mockReturnValueOnce(false) // bundled data check
                .mockReturnValueOnce(true); // external package check

            mockGetDataPath.mockReturnValue(mockPackageDataPath);
            mockGetEmbeddingsPath.mockReturnValue(mockPackageEmbeddingsPath);

            const result = await resolveEmbeddingsPath();

            expect(result).toEqual({
                dataPath: mockPackageDataPath,
                embeddingsPath: mockPackageEmbeddingsPath,
                isExternalPackage: true,
                isAvailable: true
            });

            expect(mockLogger.log).toHaveBeenCalledWith('✓ Using embeddings package');
        });

        it('should return limited mode when neither bundled nor external data exists', async () => {
            // Neither bundled nor external package data exists
            mockExistsSync.mockReturnValue(false);
            mockGetDataPath.mockReturnValue('/nonexistent/path');
            mockGetEmbeddingsPath.mockReturnValue('/nonexistent/embeddings');

            const result = await resolveEmbeddingsPath();

            expect(result.isExternalPackage).toBe(false);
            expect(result.isAvailable).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith('⚠️ No embeddings data available - running in limited mode');
        });

        it('should return limited mode when external package throws an error', async () => {
            // Bundled data doesn't exist
            mockExistsSync.mockReturnValue(false);

            // External package throws
            mockGetDataPath.mockImplementation(() => {
                throw new Error('Package not found');
            });

            const result = await resolveEmbeddingsPath();

            expect(result.isExternalPackage).toBe(false);
            expect(result.isAvailable).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith('⚠️ No embeddings data available - running in limited mode');
        });
    });
});
