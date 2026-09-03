import { jest } from '@jest/globals';
import type { PreviewManifestInput } from '../../../src/types/index.js';

// Mock @sap-ux/adp-tooling helpers used by validateManifest
const mockReadUi5Config = jest.fn<any>();
const mockExtractCfBuildTask = jest.fn<any>();
const mockExtractAdpConfig = jest.fn<any>();
const mockGetVariant = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    readUi5Config: mockReadUi5Config,
    extractCfBuildTask: mockExtractCfBuildTask,
    extractAdpConfig: mockExtractAdpConfig,
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

describe('validateManifest (preview_manifest)', () => {
    const params: PreviewManifestInput = { appPath: '/test/adp/project' };
    const configuration = { appName: 'appName', appHostId: 'appHostId', moduleName: 'moduleName' };
    const variant = { id: 'customer.application.variant.id' };
    const mergedManifest = { 'sap.app': { id: variant.id } };
    const readerHandle = { reader: true };
    const workspaceHandle = { byGlob: jest.fn(), write: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockReadUi5Config.mockResolvedValue({});
        mockExtractCfBuildTask.mockReturnValue(configuration);
        mockGetVariant.mockResolvedValue(variant);
        mockCreateReader.mockReturnValue(readerHandle);
        mockCreateWorkspace.mockReturnValue(workspaceHandle);
        mockPreviewManifest.mockResolvedValue(mergedManifest);
    });

    it('returns the merged manifest as a formatted JSON string', async () => {
        const result = await validateManifest(params);
        expect(result).toBe(JSON.stringify(mergedManifest, null, 2));
    });

    it('builds the reader over webapp with a virBasePath derived from the variant id', async () => {
        await validateManifest(params);
        expect(mockCreateReader).toHaveBeenCalledWith(
            expect.objectContaining({
                fsBasePath: expect.stringContaining('webapp'),
                virBasePath: '/'
            })
        );
        expect(mockCreateWorkspace).toHaveBeenCalledWith({ reader: readerHandle });
    });

    it('passes the workspace and the same namespace to previewManifest', async () => {
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

    it('propagates the "No CF or ABAP ADP project found" error when neither config is found', async () => {
        mockExtractCfBuildTask.mockImplementation(() => {
            throw new Error('No CF ADP project found');
        });
        mockExtractAdpConfig.mockReturnValue(undefined);
        await expect(validateManifest(params)).rejects.toThrow('No CF or ABAP ADP project found');
        expect(mockPreviewManifest).not.toHaveBeenCalled();
    });

    it('falls back to ABAP config when CF task is not found', async () => {
        const abapTarget = { url: 'https://xyz.abap-system.com', client: '200' };
        mockExtractCfBuildTask.mockImplementation(() => {
            throw new Error('No CF ADP project found');
        });
        mockExtractAdpConfig.mockReturnValue({ target: abapTarget });
        await validateManifest(params);
        expect(mockPreviewManifest).toHaveBeenCalledWith(
            expect.objectContaining({
                workspace: workspaceHandle,
                options: {
                    configuration: { target: abapTarget, type: 'abap' },
                    projectNamespace: 'customer/application/variant/id'
                }
            })
        );
    });
});
