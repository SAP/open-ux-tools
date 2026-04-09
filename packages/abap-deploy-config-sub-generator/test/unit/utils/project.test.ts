import { jest } from '@jest/globals';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';

const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockGetWebappPath = jest.fn();
const mockLoggerDebug = jest.fn();

jest.unstable_mockModule('fs', () => ({
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    default: {
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync
    }
}));

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    getWebappPath: mockGetWebappPath,
    FileName: {
        ManifestAppDescrVar: 'manifest.appdescr_variant'
    }
}));

jest.unstable_mockModule('@sap-ux/deploy-config-generator-shared', () => ({
    DeploymentGenerator: {
        logger: {
            debug: mockLoggerDebug
        }
    }
}));

const { getVariantNamespace } = await import('../../../src/utils/project');
const { initI18n, t } = await import('../../../src/utils/i18n');
const { FileName } = await import('@sap-ux/project-access');

describe('getVariantNamespace', () => {
    const mockPath = '/test/project';
    const mockWebappPath = '/test/project/webapp';
    const mockManifestPath = join(mockWebappPath, FileName.ManifestAppDescrVar);

    let mockFs: Editor;
    let mockFsExists: jest.Mock;
    let mockFsReadJSON: jest.Mock;

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetWebappPath.mockResolvedValue(mockWebappPath);

        mockFsExists = jest.fn();
        mockFsReadJSON = jest.fn();

        mockFs = {
            exists: mockFsExists,
            readJSON: mockFsReadJSON
        } as unknown as Editor;
    });

    it('should return undefined for S4HC projects', async () => {
        const result = await getVariantNamespace(mockPath, true, mockFs);
        expect(result).toBeUndefined();
        expect(mockGetWebappPath).not.toHaveBeenCalled();
    });

    it('should return namespace from memory', async () => {
        const mockManifest = { namespace: 'apps/workcenter/appVariants/customer.app.variant' };
        mockFsExists.mockReturnValue(true);
        mockFsReadJSON.mockReturnValue(mockManifest);

        const result = await getVariantNamespace(mockPath, false, mockFs);

        expect(result).toBe(mockManifest.namespace);
        expect(mockGetWebappPath).toHaveBeenCalledWith(mockPath, mockFs);
        expect(mockFsExists).toHaveBeenCalledWith(mockManifestPath);
    });

    it('should return undefined when memory file does not exist', async () => {
        mockFsExists.mockReturnValue(false);
        const result = await getVariantNamespace(mockPath, false, mockFs);
        expect(result).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
        mockFsExists.mockImplementation(() => {
            throw new Error('Memory filesystem error');
        });

        const result = await getVariantNamespace(mockPath, false, mockFs);

        expect(result).toBeUndefined();
        expect(mockLoggerDebug).toHaveBeenCalledWith(
            t('debug.lrepNamespaceNotFound', { error: 'Memory filesystem error' })
        );
    });
});
