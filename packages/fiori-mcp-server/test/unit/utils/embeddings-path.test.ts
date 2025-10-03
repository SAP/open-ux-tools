import path from 'path';
import fs from 'fs/promises';
import { resolveEmbeddingsPath, hasEmbeddingsData } from '../../../src/utils/embeddings-path';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('../../../src/utils/logger');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('embeddings-path', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.clearAllMocks();

        // Clear require cache to ensure fresh module loads
        jest.resetModules();
    });

    describe('resolveEmbeddingsPath', () => {
        it('should return external package data when @sap-ux/fiori-docs-embeddings is available', async () => {
            const mockPackageDataPath = '/path/to/external/package/data';
            const mockEmbeddingsPackage = {
                getDataPath: jest.fn().mockReturnValue(mockPackageDataPath)
            };

            // Mock successful require
            jest.doMock('@sap-ux/fiori-docs-embeddings', () => mockEmbeddingsPackage, { virtual: true });

            // Mock fs.access to succeed for external package
            mockFs.access.mockResolvedValue(undefined);

            const result = await resolveEmbeddingsPath();

            expect(result).toEqual({
                dataPath: mockPackageDataPath,
                embeddingsPath: path.join(mockPackageDataPath, 'embeddings'),
                searchPath: path.join(mockPackageDataPath, 'search'),
                docsPath: path.join(mockPackageDataPath, 'docs'),
                isExternalPackage: true,
                isAvailable: true
            });

            expect(mockLogger.log).toHaveBeenCalledWith('✓ Using @sap-ux/fiori-docs-embeddings package');
            expect(mockFs.access).toHaveBeenCalledWith(mockPackageDataPath);
        });

        it('should fall back to local data when external package fails to load', async () => {
            // Mock require failure
            jest.doMock(
                '@sap-ux/fiori-docs-embeddings',
                () => {
                    throw new Error('Module not found');
                },
                { virtual: true }
            );

            // Mock fs.access to succeed for local path
            mockFs.access.mockResolvedValue(undefined);

            const result = await resolveEmbeddingsPath();

            const expectedLocalPath = path.join(__dirname, '../../../src/utils', '../../data');

            expect(result).toEqual({
                dataPath: expectedLocalPath,
                embeddingsPath: path.join(expectedLocalPath, 'embeddings'),
                searchPath: path.join(expectedLocalPath, 'search'),
                docsPath: path.join(expectedLocalPath, 'docs'),
                isExternalPackage: false,
                isAvailable: true
            });

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Could not load @sap-ux/fiori-docs-embeddings package, trying local data...'
            );
            expect(mockLogger.log).toHaveBeenCalledWith('✓ Using local data directory');
        });

        it('should return unavailable when both external package and local data fail', async () => {
            // Mock require failure
            jest.doMock(
                '@sap-ux/fiori-docs-embeddings',
                () => {
                    throw new Error('Module not found');
                },
                { virtual: true }
            );

            // Mock fs.access to fail for both external and local paths
            mockFs.access.mockRejectedValue(new Error('ENOENT: no such file or directory'));

            const result = await resolveEmbeddingsPath();

            const expectedFallbackPath = path.join(__dirname, '../../../src/utils', '../../data');

            expect(result).toEqual({
                dataPath: expectedFallbackPath,
                embeddingsPath: path.join(expectedFallbackPath, 'embeddings'),
                searchPath: path.join(expectedFallbackPath, 'search'),
                docsPath: path.join(expectedFallbackPath, 'docs'),
                isExternalPackage: false,
                isAvailable: false
            });

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Could not load @sap-ux/fiori-docs-embeddings package, trying local data...'
            );
            expect(mockLogger.warn).toHaveBeenCalledWith('Local data directory not available either');
            expect(mockLogger.warn).toHaveBeenCalledWith('⚠️ No embeddings data available - running in limited mode');
        });

        it('should handle package with invalid getDataPath function', async () => {
            const mockInvalidPackage = {
                someOtherMethod: jest.fn()
            };

            // Mock package without getDataPath method
            jest.doMock('@sap-ux/fiori-docs-embeddings', () => mockInvalidPackage, { virtual: true });

            // Mock fs.access to succeed for local path
            mockFs.access.mockResolvedValue(undefined);

            const result = await resolveEmbeddingsPath();

            expect(result.isExternalPackage).toBe(false);
            expect(result.isAvailable).toBe(true);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Could not load @sap-ux/fiori-docs-embeddings package, trying local data...'
            );
        });

        it('should handle external package data path access failure', async () => {
            const mockPackageDataPath = '/path/to/external/package/data';
            const mockEmbeddingsPackage = {
                getDataPath: jest.fn().mockReturnValue(mockPackageDataPath)
            };

            // Mock successful require but failed access
            jest.doMock('@sap-ux/fiori-docs-embeddings', () => mockEmbeddingsPackage, { virtual: true });

            // Mock fs.access to fail for external package, succeed for local
            mockFs.access
                .mockRejectedValueOnce(new Error('ENOENT')) // External package path fails
                .mockResolvedValueOnce(undefined); // Local path succeeds

            const result = await resolveEmbeddingsPath();

            expect(result.isExternalPackage).toBe(false);
            expect(result.isAvailable).toBe(true);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Could not load @sap-ux/fiori-docs-embeddings package, trying local data...'
            );
        });
    });

    describe('hasEmbeddingsData', () => {
        it('should return true when embeddings data is available', async () => {
            const mockEmbeddingsPackage = {
                getDataPath: jest.fn().mockReturnValue('/path/to/data')
            };

            jest.doMock('@sap-ux/fiori-docs-embeddings', () => mockEmbeddingsPackage, { virtual: true });
            mockFs.access.mockResolvedValue(undefined);

            const result = await hasEmbeddingsData();

            expect(result).toBe(true);
        });

        it('should return false when embeddings data is not available', async () => {
            jest.doMock(
                '@sap-ux/fiori-docs-embeddings',
                () => {
                    throw new Error('Module not found');
                },
                { virtual: true }
            );

            mockFs.access.mockRejectedValue(new Error('ENOENT'));

            const result = await hasEmbeddingsData();

            expect(result).toBe(false);
        });
    });
});
