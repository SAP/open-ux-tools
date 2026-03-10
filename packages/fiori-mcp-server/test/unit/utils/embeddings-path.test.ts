import { resolveEmbeddingsPath } from '../../../src/utils/embeddings-path';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

// Mock the @sap-ux/fiori-docs-embeddings module
jest.mock('@sap-ux/fiori-docs-embeddings', () => ({
    getDataPath: jest.fn(),
    getEmbeddingsPath: jest.fn()
}));

// eslint-disable-next-line import/no-unresolved -- Mocked module
import { getDataPath, getEmbeddingsPath } from '@sap-ux/fiori-docs-embeddings';

const mockGetDataPath = getDataPath as jest.MockedFunction<typeof getDataPath>;
const mockGetEmbeddingsPath = getEmbeddingsPath as jest.MockedFunction<typeof getEmbeddingsPath>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('embeddings-path', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('resolveEmbeddingsPath', () => {
        it('should return external package data when @sap-ux/fiori-docs-embeddings is available', async () => {
            const mockPackageDataPath = '/path/to/external/package/data';
            const mockPackageEmbeddingsPath = '/path/to/external/package/embeddings';

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

        it('should fall back to limited mode when external package functions are not available', async () => {
            // Mock the functions to return undefined (simulating unavailable package)
            mockGetDataPath.mockReturnValue(undefined as any);
            mockGetEmbeddingsPath.mockReturnValue(undefined as any);

            const result = await resolveEmbeddingsPath();

            expect(result.isExternalPackage).toBe(true);
            expect(result.dataPath).toBe('');
            expect(result.embeddingsPath).toBe('');
        });

        it('should handle package returning null values', async () => {
            mockGetDataPath.mockReturnValue(null as any);
            mockGetEmbeddingsPath.mockReturnValue(null as any);

            const result = await resolveEmbeddingsPath();

            expect(result).toEqual({
                dataPath: '',
                embeddingsPath: '',
                isExternalPackage: true,
                isAvailable: true
            });
        });

        it('should return limited mode when package throws an error', async () => {
            // Make the function throw to simulate invalid package
            mockGetDataPath.mockImplementation(() => {
                throw new Error('Package not found');
            });

            const result = await resolveEmbeddingsPath();

            expect(result.isExternalPackage).toBe(false);
            expect(result.isAvailable).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });
});
