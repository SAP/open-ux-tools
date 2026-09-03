import { jest } from '@jest/globals';
import type { PreviewManifestInput } from '../../../src/types/index.js';

// Mock @sap-ux/adp-tooling helpers used by validateManifest
const mockReadUi5Config = jest.fn<any>();
const mockResolveAdpConfiguration = jest.fn<any>();
const mockGetVariant = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    readUi5Config: mockReadUi5Config,
    resolveAdpConfiguration: mockResolveAdpConfiguration,
    getVariant: mockGetVariant
}));

// Mock @ui5/fs resource factory
const mockCreateReader = jest.fn<any>();
const mockCreateWorkspace = jest.fn<any>();
jest.unstable_mockModule('@ui5/fs/resourceFactory', () => ({
    createReader: mockCreateReader,
    createWorkspace: mockCreateWorkspace
}));

// Mock @ui5/task-adaptation previewManifest
const mockPreviewManifest = jest.fn<any>();
jest.unstable_mockModule('@ui5/task-adaptation', () => ({
    previewManifest: mockPreviewManifest
}));

const { validateManifest } = await import('../../../src/tools/preview-manifest.js');

describe('validateManifest', () => {
    const params: PreviewManifestInput = { appPath: '/test/adp/project' };
    const configuration = { appName: 'appName', appHostId: 'appHostId', moduleName: 'moduleName' };
    const variant = { id: 'customer.application.variant.id' };
    const mergedManifest = { 'sap.app': { id: variant.id } };
    const readerHandle = { reader: true };
    const workspaceHandle = { byGlob: jest.fn(), write: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockReadUi5Config.mockResolvedValue({});
        mockResolveAdpConfiguration.mockReturnValue(configuration);
        mockGetVariant.mockResolvedValue(variant);
        mockCreateReader.mockReturnValue(readerHandle);
        mockCreateWorkspace.mockReturnValue(workspaceHandle);
        mockPreviewManifest.mockResolvedValue(mergedManifest);
    });

    it('returns the merged manifest as a JSON string', async () => {
        const result = await validateManifest(params);
        expect(result).toMatchObject({
            functionalityId: 'preview-manifest',
            status: 'Success',
            message: JSON.stringify(mergedManifest, null, 2),
            appPath: params.appPath,
            changes: []
        });
        expect(typeof result.timestamp).toBe('string');
    });

    it('builds the reader over webapp with virBasePath of "/"', async () => {
        await validateManifest(params);
        expect(mockCreateReader).toHaveBeenCalledWith(
            expect.objectContaining({
                fsBasePath: expect.stringContaining('webapp'),
                virBasePath: '/'
            })
        );
        expect(mockCreateWorkspace).toHaveBeenCalledWith({ reader: readerHandle });
    });

    it('passes the workspace and project namespace to previewManifest', async () => {
        await validateManifest(params);
        expect(mockPreviewManifest).toHaveBeenCalledWith(
            expect.objectContaining({
                workspace: workspaceHandle,
                options: {
                    configuration,
                    projectNamespace: 'customer/application/variant/id'
                }
            })
        );
    });

    it('propagates errors from resolveAdpConfiguration', async () => {
        mockResolveAdpConfiguration.mockImplementation(() => {
            throw new Error('No CF or ABAP ADP project found');
        });
        await expect(validateManifest(params)).rejects.toThrow('No CF or ABAP ADP project found');
        expect(mockPreviewManifest).not.toHaveBeenCalled();
    });

    it('returns error status when previewManifest throws', async () => {
        mockPreviewManifest.mockRejectedValue(new Error('Base app not cached'));
        const result = await validateManifest(params);
        expect(result).toMatchObject({
            functionalityId: 'preview-manifest',
            status: 'Error',
            message: 'Base app not cached',
            appPath: params.appPath,
            changes: []
        });
    });
});
