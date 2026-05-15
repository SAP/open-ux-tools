import { jest } from '@jest/globals';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock logger
const mockLog = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();
const mockInfo = jest.fn();
const mockDebug = jest.fn();
jest.unstable_mockModule('../../../src/utils/logger', () => ({
    logger: {
        log: mockLog,
        warn: mockWarn,
        error: mockError,
        info: mockInfo,
        debug: mockDebug
    }
}));

// Mock fs/promises
const mockAccess = jest.fn<any>();
const mockReadFile = jest.fn<any>();
const mockReaddir = jest.fn<any>();
const actualFsPromises = await import('node:fs/promises');
jest.unstable_mockModule('fs/promises', () => ({
    ...actualFsPromises,
    default: {
        ...actualFsPromises,
        access: mockAccess,
        readFile: mockReadFile,
        readdir: mockReaddir
    },
    access: mockAccess,
    readFile: mockReadFile,
    readdir: mockReaddir
}));
jest.unstable_mockModule('node:fs/promises', () => ({
    ...actualFsPromises,
    default: {
        ...actualFsPromises,
        access: mockAccess,
        readFile: mockReadFile,
        readdir: mockReaddir
    },
    access: mockAccess,
    readFile: mockReadFile,
    readdir: mockReaddir
}));

// Configurable mock for the external embeddings package
let mockEmbeddingsModule: any = null;
jest.unstable_mockModule('@sap-ux/fiori-docs-embeddings', () => {
    if (mockEmbeddingsModule === null) {
        throw new Error('Module not found');
    }
    return mockEmbeddingsModule;
});

// Dynamic imports after all mocks
const { resolveEmbeddingsPath, hasEmbeddingsData } = await import('../../../src/utils/embeddings-path');

describe('embeddings-path', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.resetAllMocks();
        jest.clearAllMocks();
        mockEmbeddingsModule = null;
    });

    describe('resolveEmbeddingsPath', () => {
        it('should return external package data when @sap-ux/fiori-docs-embeddings is available', async () => {
            const mockPackageDataPath = '/path/to/external/package/data';
            mockEmbeddingsModule = { getDataPath: () => mockPackageDataPath };

            // Mock fs.access to succeed for external package
            mockAccess.mockResolvedValue(undefined);

            const result = await resolveEmbeddingsPath();

            expect(result).toEqual({
                dataPath: mockPackageDataPath,
                embeddingsPath: path.join(mockPackageDataPath, 'embeddings'),
                searchPath: path.join(mockPackageDataPath, 'search'),
                docsPath: path.join(mockPackageDataPath, 'docs'),
                isExternalPackage: true,
                isAvailable: true
            });

            expect(mockLog).toHaveBeenCalledWith('✓ Using @sap-ux/fiori-docs-embeddings package');
            expect(mockAccess).toHaveBeenCalledWith(mockPackageDataPath);
        });

        it('should fall back to local data when external package fails to load', async () => {
            // External package not available (mockEmbeddingsModule = null → throws)
            mockAccess.mockResolvedValue(undefined);

            const result = await resolveEmbeddingsPath();

            expect(result.isExternalPackage).toBe(false);
            expect(result.isAvailable).toBe(true);
            expect(mockWarn).toHaveBeenCalledWith(
                'Could not load @sap-ux/fiori-docs-embeddings package, trying local data...'
            );
            expect(mockLog).toHaveBeenCalledWith('✓ Using local data directory');
        });

        it('should return unavailable when both external package and local data fail', async () => {
            // External package not available
            // Local path also not accessible
            mockAccess.mockRejectedValue(new Error('ENOENT: no such file or directory'));

            const result = await resolveEmbeddingsPath();

            expect(result.isExternalPackage).toBe(false);
            expect(result.isAvailable).toBe(false);
            expect(mockWarn).toHaveBeenCalledWith(
                'Could not load @sap-ux/fiori-docs-embeddings package, trying local data...'
            );
            expect(mockWarn).toHaveBeenCalledWith('Local data directory not available either');
            expect(mockWarn).toHaveBeenCalledWith('⚠️ No embeddings data available - running in limited mode');
        });

        it('should handle package with invalid getDataPath function', async () => {
            // Package exists but without getDataPath method
            mockEmbeddingsModule = { someOtherMethod: () => {} };

            // Mock fs.access to succeed for local path
            mockAccess.mockResolvedValue(undefined);

            const result = await resolveEmbeddingsPath();

            expect(result.isExternalPackage).toBe(false);
            expect(result.isAvailable).toBe(true);
            expect(mockWarn).toHaveBeenCalledWith(
                'Could not load @sap-ux/fiori-docs-embeddings package, trying local data...'
            );
        });

        it('should handle external package data path access failure', async () => {
            const mockPackageDataPath = '/path/to/external/package/data';
            mockEmbeddingsModule = { getDataPath: () => mockPackageDataPath };

            // External package path fails, local path succeeds
            mockAccess.mockRejectedValueOnce(new Error('ENOENT')).mockResolvedValueOnce(undefined);

            const result = await resolveEmbeddingsPath();

            expect(result.isExternalPackage).toBe(false);
            expect(result.isAvailable).toBe(true);
            expect(mockWarn).toHaveBeenCalledWith(
                'Could not load @sap-ux/fiori-docs-embeddings package, trying local data...'
            );
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
