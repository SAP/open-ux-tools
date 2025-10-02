import { getUI5Versions } from '@sap-ux/ui5-info';
import { ToolsLogger } from '@sap-ux/logger';
import { getNpmAvailableUI5Versions } from '../../src/utils';

// Mock dependencies
jest.mock('@sap-ux/ui5-info');
jest.mock('@sap-ux/logger');

describe('utils', () => {
    const mockGetUI5Versions = getUI5Versions as jest.MockedFunction<typeof getUI5Versions>;
    const mockToolsLogger = ToolsLogger as jest.MockedClass<typeof ToolsLogger>;
    const mockWarn = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockWarn.mockClear();
        mockToolsLogger.mockImplementation(
            () =>
                ({
                    warn: mockWarn
                } as any)
        );
    });

    describe('getNpmAvailableUI5Versions', () => {
        const mockNpmVersions = [
            { version: '1.120.0', maintained: true },
            { version: '1.108.0', maintained: true },
            { version: '1.96.0', maintained: true }
        ];

        const mockFallbackVersions = [
            { version: '1.121.0', maintained: true },
            { version: '1.120.0', maintained: true },
            { version: '1.108.0', maintained: true }
        ];

        it('should successfully retrieve npm-available UI5 versions with default options', async () => {
            mockGetUI5Versions.mockResolvedValue(mockNpmVersions);

            const result = await getNpmAvailableUI5Versions();

            expect(result).toEqual(mockNpmVersions);
            expect(mockGetUI5Versions).toHaveBeenCalledWith({
                onlyVersionNumbers: true,
                onlyNpmVersion: true
            });
            expect(mockWarn).not.toHaveBeenCalled();
        });

        it('should successfully retrieve npm-available UI5 versions with custom filter options', async () => {
            mockGetUI5Versions.mockResolvedValue(mockNpmVersions);
            const filterOptions = {
                includeMaintained: true,
                useCache: false
            };

            const result = await getNpmAvailableUI5Versions(filterOptions);

            expect(result).toEqual(mockNpmVersions);
            expect(mockGetUI5Versions).toHaveBeenCalledWith({
                ...filterOptions,
                onlyVersionNumbers: true,
                onlyNpmVersion: true
            });
            expect(mockWarn).not.toHaveBeenCalled();
        });

        it('should merge filter options with npm-specific options', async () => {
            mockGetUI5Versions.mockResolvedValue(mockNpmVersions);
            const filterOptions = {
                includeMaintained: true,
                useCache: true,
                onlyVersionNumbers: false, // This should be overridden
                onlyNpmVersion: false // This should be overridden
            };

            const result = await getNpmAvailableUI5Versions(filterOptions);

            expect(result).toEqual(mockNpmVersions);
            expect(mockGetUI5Versions).toHaveBeenCalledWith({
                includeMaintained: true,
                useCache: true,
                onlyVersionNumbers: true, // Should be forced to true
                onlyNpmVersion: true // Should be forced to true
            });
        });

        it('should fall back to standard UI5 versions when npm query fails with Error object', async () => {
            const networkError = new Error('Network connection failed');
            mockGetUI5Versions.mockRejectedValueOnce(networkError).mockResolvedValueOnce(mockFallbackVersions);

            const result = await getNpmAvailableUI5Versions();

            expect(result).toEqual(mockFallbackVersions);
            expect(mockGetUI5Versions).toHaveBeenCalledTimes(2);
            expect(mockGetUI5Versions).toHaveBeenNthCalledWith(1, {
                onlyVersionNumbers: true,
                onlyNpmVersion: true
            });
            expect(mockGetUI5Versions).toHaveBeenNthCalledWith(2, {});
            expect(mockWarn).toHaveBeenCalledWith(
                'Failed to retrieve npm-available UI5 versions. Error: Network connection failed. Falling back to standard UI5 versions.'
            );
        });

        it('should fall back to standard UI5 versions when npm query fails with non-Error object', async () => {
            const stringError = 'String error message';
            mockGetUI5Versions.mockRejectedValueOnce(stringError).mockResolvedValueOnce(mockFallbackVersions);

            const result = await getNpmAvailableUI5Versions();

            expect(result).toEqual(mockFallbackVersions);
            expect(mockWarn).toHaveBeenCalledWith(
                'Failed to retrieve npm-available UI5 versions. Error: String error message. Falling back to standard UI5 versions.'
            );
        });

        it('should fall back with custom filter options when npm query fails', async () => {
            const filterOptions = {
                includeMaintained: true,
                useCache: false
            };
            const networkError = new Error('Connection timeout');
            mockGetUI5Versions.mockRejectedValueOnce(networkError).mockResolvedValueOnce(mockFallbackVersions);

            const result = await getNpmAvailableUI5Versions(filterOptions);

            expect(result).toEqual(mockFallbackVersions);
            expect(mockGetUI5Versions).toHaveBeenCalledTimes(2);
            expect(mockGetUI5Versions).toHaveBeenNthCalledWith(1, {
                ...filterOptions,
                onlyVersionNumbers: true,
                onlyNpmVersion: true
            });
            expect(mockGetUI5Versions).toHaveBeenNthCalledWith(2, filterOptions);
            expect(mockWarn).toHaveBeenCalledWith(
                'Failed to retrieve npm-available UI5 versions. Error: Connection timeout. Falling back to standard UI5 versions.'
            );
        });

        it('should fall back with empty options when filterOptions is undefined and npm query fails', async () => {
            const networkError = new Error('Registry unavailable');
            mockGetUI5Versions.mockRejectedValueOnce(networkError).mockResolvedValueOnce(mockFallbackVersions);

            const result = await getNpmAvailableUI5Versions(undefined);

            expect(result).toEqual(mockFallbackVersions);
            expect(mockGetUI5Versions).toHaveBeenNthCalledWith(2, {});
        });

        it('should handle fallback when first call returns empty array', async () => {
            mockGetUI5Versions.mockResolvedValueOnce([]).mockResolvedValueOnce(mockFallbackVersions);

            const result = await getNpmAvailableUI5Versions();

            // First call should succeed and return empty array
            expect(result).toEqual([]);
            expect(mockGetUI5Versions).toHaveBeenCalledTimes(1);
            expect(mockWarn).not.toHaveBeenCalled();
        });
    });
});
