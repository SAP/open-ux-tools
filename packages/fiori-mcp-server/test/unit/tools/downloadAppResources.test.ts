import { jest } from '@jest/globals';
import type { DownloadAppResourcesInput } from '../../../src/types/index.js';

// Mock @sap-ux/adp-tooling helpers used by validateManifest
const mockReadUi5Config = jest.fn<any>();
const mockExtractCfBuildTask = jest.fn<any>();
const mockGetVariant = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    readUi5Config: mockReadUi5Config,
    extractCfBuildTask: mockExtractCfBuildTask,
    getVariant: mockGetVariant
}));

// Mock @ui5/fs resource factory
const mockCreateReader = jest.fn<any>();
const mockCreateWorkspace = jest.fn<any>();
jest.unstable_mockModule('@ui5/fs/resourceFactory', () => ({
    createReader: mockCreateReader,
    createWorkspace: mockCreateWorkspace
}));

// Mock @ui5/task-adaptation downloadAppResources
const mockDownloadAppResources = jest.fn<any>();
jest.unstable_mockModule('@ui5/task-adaptation', () => ({
    downloadAppResources: mockDownloadAppResources
}));

const { downloadBaseAppResources } = await import('../../../src/tools/download-app-resources.js');

describe('downloadBaseAppResources (download_app_resources)', () => {
    const params: DownloadAppResourcesInput = { appPath: '/test/adp/project' };
    const configuration = { appName: 'REPO_NAME', appHostId: 'HOST_ID', moduleName: 'my.module' };
    const variant = { id: 'customer.com.sap.application.variant.id' };
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
        mockDownloadAppResources.mockResolvedValue(mergedManifest);
    });

    it('returns a JSON string indicating files were written', async () => {
        const result = await downloadBaseAppResources(params);
        expect(result).toBe(JSON.stringify({ filesWritten: true }));
    });

    it('builds the reader over webapp with virBasePath of "/"', async () => {
        await downloadBaseAppResources(params);
        expect(mockCreateReader).toHaveBeenCalledWith(
            expect.objectContaining({
                fsBasePath: expect.stringContaining('webapp'),
                virBasePath: '/'
            })
        );
        expect(mockCreateWorkspace).toHaveBeenCalledWith({ reader: readerHandle });
    });

    it('passes the workspace and configuration to downloadAppResources without projectNamespace', async () => {
        await downloadBaseAppResources(params);
        expect(mockDownloadAppResources).toHaveBeenCalledWith(
            expect.objectContaining({
                workspace: workspaceHandle,
                options: {
                    configuration
                }
            }),
            expect.stringContaining('.contexts')
        );
    });

    it('propagates the "No CF ADP project found" error for non-CF projects', async () => {
        mockExtractCfBuildTask.mockImplementation(() => {
            throw new Error('No CF ADP project found');
        });
        await expect(downloadBaseAppResources(params)).rejects.toThrow('No CF ADP project found');
        expect(mockDownloadAppResources).not.toHaveBeenCalled();
    });
});
