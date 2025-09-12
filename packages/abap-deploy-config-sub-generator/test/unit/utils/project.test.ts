import { join } from 'path';
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

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetWebappPath.mockResolvedValue(mockWebappPath);
    });

    it('should return undefined for S4HC projects', async () => {
        const result = await getVariantNamespace(mockPath, true);

        expect(result).toBeUndefined();
        expect(mockGetWebappPath).not.toHaveBeenCalled();
        expect(mockExistsSync).not.toHaveBeenCalled();
    });

    it('should return namespace from manifest.appdescr_variant file', async () => {
        const mockManifest = {
            namespace: 'apps/workcenter/appVariants/customer.app.variant'
        };

        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(JSON.stringify(mockManifest));

        const result = await getVariantNamespace(mockPath, false);

        expect(result).toBe('apps/workcenter/appVariants/customer.app.variant');
        expect(mockGetWebappPath).toHaveBeenCalledWith(mockPath);
        expect(mockExistsSync).toHaveBeenCalledWith(mockManifestPath);
        expect(mockReadFileSync).toHaveBeenCalledWith(mockManifestPath, 'utf-8');
    });

    it('should return undefined when manifest file does not exist', async () => {
        mockExistsSync.mockReturnValue(false);

        const result = await getVariantNamespace(mockPath, false);

        expect(result).toBeUndefined();
        expect(mockGetWebappPath).toHaveBeenCalledWith(mockPath);
        expect(mockExistsSync).toHaveBeenCalledWith(mockManifestPath);
        expect(mockReadFileSync).not.toHaveBeenCalled();
    });

    it('should handle JSON parsing errors gracefully', async () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue('invalid json content');

        const result = await getVariantNamespace(mockPath, false);

        expect(result).toBeUndefined();
        expect(mockGetWebappPath).toHaveBeenCalledWith(mockPath);
        expect(mockExistsSync).toHaveBeenCalledWith(mockManifestPath);
        expect(mockReadFileSync).toHaveBeenCalledWith(mockManifestPath, 'utf-8');
        expect(DeploymentGenerator.logger.debug).toHaveBeenCalledWith(
            t('debug.lrepNamespaceNotFound', {
                error: 'Unexpected token \'i\', "invalid json content" is not valid JSON'
            })
        );
    });
});
