import { jest } from '@jest/globals';
import type { DownloadAppResourcesInput } from '../../../src/types/index.js';

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

// Mock @ui5/task-adaptation downloadAppResources
const mockDownloadAppResources = jest.fn<any>();
jest.unstable_mockModule('@ui5/task-adaptation', () => ({
    downloadAppResources: mockDownloadAppResources
}));

const { downloadBaseAppResources } = await import('../../../src/tools/download-app-resources.js');

describe('downloadBaseAppResources (download_app_resources)', () => {
    const params: DownloadAppResourcesInput = { appPath: '/test/adp/project' };
    const configuration = { appName: 'appName', appHostId: 'appHostId', moduleName: 'moduleName' };
    const variant = { id: 'customer.application.variant.id' };
    const readerHandle = { reader: true };
    const workspaceHandle = { byGlob: jest.fn(), write: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        mockReadUi5Config.mockResolvedValue({});
        mockExtractCfBuildTask.mockReturnValue(configuration);
        mockExtractAdpConfig.mockReturnValue(undefined);
        mockGetVariant.mockResolvedValue(variant);
        mockCreateReader.mockReturnValue(readerHandle);
        mockCreateWorkspace.mockReturnValue(workspaceHandle);
        mockDownloadAppResources.mockResolvedValue(undefined);
    });

    it('returns a JSON string indicating files were written and the target path', async () => {
        const result = await downloadBaseAppResources(params);
        expect(result).toBe(JSON.stringify({ filesWritten: true, path: `${params.appPath}/.contexts/` }));
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
        mockExtractAdpConfig.mockReturnValue(undefined);
        await expect(downloadBaseAppResources(params)).rejects.toThrow('No CF or ABAP ADP project found');
        expect(mockDownloadAppResources).not.toHaveBeenCalled();
    });

    it('falls back to ABAP config when CF task is not found', async () => {
        const abapTarget = { url: 'https://xyz.abap-system.com', client: '200' };
        mockExtractCfBuildTask.mockImplementation(() => {
            throw new Error('No CF ADP project found');
        });
        mockExtractAdpConfig.mockReturnValue({ target: abapTarget });
        await downloadBaseAppResources(params);
        expect(mockDownloadAppResources).toHaveBeenCalledWith(
            expect.objectContaining({
                workspace: workspaceHandle,
                options: {
                    configuration: { target: abapTarget, type: 'abap' }
                }
            }),
            expect.stringContaining('.contexts')
        );
    });
});
