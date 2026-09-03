import { jest } from '@jest/globals';
import type { Editor } from 'mem-fs-editor';

const mockGetMinimumUI5Version = jest.fn();
const mockGetProjectType = jest.fn();
const mockFindProjectRoot = jest.fn();
const mockReadManifest = jest.fn();
const mockCheckCdsUi5PluginEnabled = jest.fn();

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    getMinimumUI5Version: mockGetMinimumUI5Version,
    getProjectType: mockGetProjectType,
    findProjectRoot: mockFindProjectRoot,
    checkCdsUi5PluginEnabled: mockCheckCdsUi5PluginEnabled
}));

jest.unstable_mockModule('../../../src/common/utils.js', () => ({
    readManifest: mockReadManifest
}));

const { ensureMinUI5Version, ensureCdsPluginUi5 } = await import('../../../src/cards-config/prerequisites.js');

describe('cards-config/prerequisites', () => {
    let mockFs: Editor;

    beforeEach(() => {
        jest.resetAllMocks();
        mockFs = {} as Editor;

        mockReadManifest.mockResolvedValue({
            manifest: {
                'sap.ui5': {
                    dependencies: {
                        minUI5Version: '1.140.0'
                    }
                }
            }
        });

        // Mock findProjectRoot to return a valid project root
        mockFindProjectRoot.mockResolvedValue('/test/path');
    });

    describe('EDMX projects', () => {
        beforeEach(() => {
            mockGetProjectType.mockResolvedValue('EDMXBackend');
        });

        test('should not throw when UI5 version meets minimum requirement (1.121.0)', async () => {
            mockGetMinimumUI5Version.mockReturnValue('1.121.0');

            await expect(ensureMinUI5Version('/test/path', mockFs)).resolves.toBeUndefined();
        });

        test('should not throw when UI5 version exceeds minimum requirement', async () => {
            mockGetMinimumUI5Version.mockReturnValue('1.140.0');

            await expect(ensureMinUI5Version('/test/path', mockFs)).resolves.toBeUndefined();
        });

        test('should throw error when UI5 version is below minimum (1.121.0)', async () => {
            mockGetMinimumUI5Version.mockReturnValue('1.120.0');

            await expect(ensureMinUI5Version('/test/path', mockFs)).rejects.toThrow(
                'The card generator is only supported for projects with a minimum SAPUI5 version of 1.121.0 or higher. The detected minimum SAPUI5 version is 1.120.0'
            );
        });
    });

    describe('CAP projects', () => {
        beforeEach(() => {
            mockGetProjectType.mockResolvedValue('CAPNodejs');
        });

        test('should not throw when UI5 version meets minimum requirement (1.149.0)', async () => {
            mockGetMinimumUI5Version.mockReturnValue('1.149.0');

            await expect(ensureMinUI5Version('/test/path', mockFs)).resolves.toBeUndefined();
        });

        test('should not throw when UI5 version exceeds minimum requirement', async () => {
            mockGetMinimumUI5Version.mockReturnValue('1.150.0');

            await expect(ensureMinUI5Version('/test/path', mockFs)).resolves.toBeUndefined();
        });

        test('should throw error when UI5 version is below minimum (1.149.0)', async () => {
            mockGetMinimumUI5Version.mockReturnValue('1.140.0');

            await expect(ensureMinUI5Version('/test/path', mockFs)).rejects.toThrow(
                'The card generator is only supported for projects with a minimum SAPUI5 version of 1.149.0'
            );
        });
    });

    test('should handle missing minUI5Version gracefully', async () => {
        mockGetProjectType.mockResolvedValue('EDMXBackend');
        mockGetMinimumUI5Version.mockReturnValue(undefined);

        await expect(ensureMinUI5Version('/test/path', mockFs)).resolves.toBeUndefined();
    });
});

describe('ensureCdsPluginUi5', () => {
    let mockFs: Editor;

    beforeEach(() => {
        jest.resetAllMocks();
        mockFs = {} as Editor;
    });

    test('should not throw when cds-plugin-ui5 is enabled', async () => {
        mockCheckCdsUi5PluginEnabled.mockResolvedValue(true);

        await expect(ensureCdsPluginUi5('/cap/root', mockFs)).resolves.toBeUndefined();
    });

    test('should throw when cds-plugin-ui5 is not enabled', async () => {
        mockCheckCdsUi5PluginEnabled.mockResolvedValue(false);

        await expect(ensureCdsPluginUi5('/cap/root', mockFs)).rejects.toThrow(
            "The cards-editor command requires 'cds-plugin-ui5' to be installed and enabled in the CAP root package.json."
        );
    });

    test('should pass capRoot and fs to checkCdsUi5PluginEnabled', async () => {
        mockCheckCdsUi5PluginEnabled.mockResolvedValue(true);

        await ensureCdsPluginUi5('/cap/root', mockFs);

        expect(mockCheckCdsUi5PluginEnabled).toHaveBeenCalledWith('/cap/root', mockFs);
    });
});
