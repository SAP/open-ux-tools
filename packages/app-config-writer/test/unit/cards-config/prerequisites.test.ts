import { jest } from '@jest/globals';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';

const mockGetMinimumUI5Version = jest.fn();
const mockGetProjectType = jest.fn();
const mockFindRootsForPath = jest.fn();
const mockReadManifest = jest.fn();

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    getMinimumUI5Version: mockGetMinimumUI5Version,
    getProjectType: mockGetProjectType,
    findRootsForPath: mockFindRootsForPath
}));

jest.unstable_mockModule('../../../src/common/utils.js', () => ({
    readManifest: mockReadManifest
}));

const { checkMinUI5Version } = await import('../../../src/cards-config/prerequisites.js');

describe('cards-config/prerequisites', () => {
    let mockFs: Editor;
    let mockLogger: ToolsLogger;

    beforeEach(() => {
        jest.resetAllMocks();
        mockFs = {} as Editor;
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as unknown as ToolsLogger;

        mockReadManifest.mockResolvedValue({
            manifest: {
                'sap.ui5': {
                    dependencies: {
                        minUI5Version: '1.140.0'
                    }
                }
            }
        });

        // Mock findRootsForPath to return a valid project root
        mockFindRootsForPath.mockResolvedValue({
            projectRoot: '/test/path'
        });
    });

    describe('EDMX projects', () => {
        beforeEach(() => {
            mockGetProjectType.mockResolvedValue('EDMXBackend');
        });

        test('should return true when UI5 version meets minimum requirement (1.136.0)', async () => {
            mockGetMinimumUI5Version.mockReturnValue('1.136.0');

            const result = await checkMinUI5Version('/test/path', mockFs, mockLogger);

            expect(result).toBe(true);
            expect(mockLogger.error).not.toHaveBeenCalled();
        });

        test('should return true when UI5 version exceeds minimum requirement', async () => {
            mockGetMinimumUI5Version.mockReturnValue('1.140.0');

            const result = await checkMinUI5Version('/test/path', mockFs, mockLogger);

            expect(result).toBe(true);
            expect(mockLogger.error).not.toHaveBeenCalled();
        });

        test('should return false and log error when UI5 version is below minimum (1.136.0)', async () => {
            mockGetMinimumUI5Version.mockReturnValue('1.120.0');

            const result = await checkMinUI5Version('/test/path', mockFs, mockLogger);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining(
                    'The card generator is only supported for projects with UI5 version 1.136.0 or higher'
                )
            );
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Detected minimum UI5 version is 1.120.0')
            );
        });
    });

    describe('CAP projects', () => {
        beforeEach(() => {
            mockGetProjectType.mockResolvedValue('CAPNodejs');
        });

        test('should return true when UI5 version meets minimum requirement (1.149.0)', async () => {
            mockGetMinimumUI5Version.mockReturnValue('1.149.0');

            const result = await checkMinUI5Version('/test/path', mockFs, mockLogger);

            expect(result).toBe(true);
            expect(mockLogger.error).not.toHaveBeenCalled();
        });

        test('should return true when UI5 version exceeds minimum requirement', async () => {
            mockGetMinimumUI5Version.mockReturnValue('1.150.0');

            const result = await checkMinUI5Version('/test/path', mockFs, mockLogger);

            expect(result).toBe(true);
            expect(mockLogger.error).not.toHaveBeenCalled();
        });

        test('should return false and log error when UI5 version is below minimum (1.149.0)', async () => {
            mockGetMinimumUI5Version.mockReturnValue('1.140.0');

            const result = await checkMinUI5Version('/test/path', mockFs, mockLogger);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining(
                    'The card generator is only supported for projects with UI5 version 1.149.0 or higher'
                )
            );
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Detected minimum UI5 version is 1.140.0')
            );
        });
    });

    test('should work without logger', async () => {
        mockGetProjectType.mockResolvedValue('EDMXBackend');
        mockGetMinimumUI5Version.mockReturnValue('1.136.0');

        const result = await checkMinUI5Version('/test/path', mockFs);

        expect(result).toBe(true);
    });

    test('should handle missing minUI5Version gracefully', async () => {
        mockGetProjectType.mockResolvedValue('EDMXBackend');
        mockGetMinimumUI5Version.mockReturnValue(undefined);

        const result = await checkMinUI5Version('/test/path', mockFs, mockLogger);

        expect(result).toBe(true);
        expect(mockLogger.error).not.toHaveBeenCalled();
    });
});
