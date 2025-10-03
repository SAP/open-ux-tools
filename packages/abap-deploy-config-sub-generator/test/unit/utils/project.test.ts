import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { existsSync, readFileSync } from 'fs';

import { getWebappPath, FileName } from '@sap-ux/project-access';
import { DeploymentGenerator } from '@sap-ux/deploy-config-generator-shared';

import { getVariantNamespace } from '../../../src/utils/project';
import { initI18n, t } from '../../../src/utils/i18n';

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn()
}));

jest.mock('@sap-ux/project-access', () => ({
    getWebappPath: jest.fn(),
    FileName: {
        ManifestAppDescrVar: 'manifest.appdescr_variant'
    }
}));

jest.mock('@sap-ux/deploy-config-generator-shared', () => ({
    DeploymentGenerator: {
        logger: {
            debug: jest.fn()
        }
    }
}));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockGetWebappPath = getWebappPath as jest.MockedFunction<typeof getWebappPath>;

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
        expect(DeploymentGenerator.logger.debug).toHaveBeenCalledWith(
            t('debug.lrepNamespaceNotFound', { error: 'Memory filesystem error' })
        );
    });
});
