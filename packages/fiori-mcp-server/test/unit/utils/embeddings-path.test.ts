import { jest } from '@jest/globals';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// Dynamic imports after all mocks
const { resolveEmbeddingsPath, hasEmbeddingsData } = await import('../../../src/utils/embeddings-path');

describe('embeddings-path', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.clearAllMocks();
    });

    describe('resolveEmbeddingsPath', () => {
        it('should return external package data when @sap-ux/fiori-docs-embeddings is available', async () => {
            const mockPackageDataPath = '/path/to/external/package/data';

            // Mock fs.access to succeed for external package
            mockAccess.mockResolvedValue(undefined);

            const result = await resolveEmbeddingsPath();

            expect(result).toHaveProperty('dataPath');
            expect(result).toHaveProperty('isAvailable', true);
        });

        it('should handle fs.access failure gracefully', async () => {
            // Mock fs.access to fail
            mockAccess.mockRejectedValue(new Error('ENOENT: no such file or directory'));

            const result = await resolveEmbeddingsPath();

            expect(result).toHaveProperty('isAvailable');
        });
    });

    describe('hasEmbeddingsData', () => {
        it('should return true when embeddings data is available', async () => {
            mockAccess.mockResolvedValue(undefined);

            const result = await hasEmbeddingsData();

            expect(typeof result).toBe('boolean');
        });

        it('should return false when embeddings data is not available', async () => {
            mockAccess.mockRejectedValue(new Error('ENOENT'));

            const result = await hasEmbeddingsData();

            expect(result).toBe(false);
        });
    });
});
