import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { join } from 'path';

import { FileName, getWebappPath } from '@sap-ux/project-access';

import { addUi5Dependency, isAdpProject } from '../../src/file';

jest.mock('@sap-ux/project-access', () => ({
    ...jest.requireActual('@sap-ux/project-access'),
    getWebappPath: jest.fn()
}));

const mockGetWebappPath = getWebappPath as jest.MockedFunction<typeof getWebappPath>;

describe('File utils', () => {
    test('should return when @ui5/cli version is greater or equal to 3.0.0', () => {
        const fs = create(createStorage());
        jest.spyOn(fs, 'readJSON').mockReturnValue({
            devDependencies: {
                '@ui5/cli': '^3.0.0'
            }
        });
        expect(addUi5Dependency(fs, 'base/path', 'dep')).toBeUndefined();
    });

    describe('isAdpProject', () => {
        let mockFs: ReturnType<typeof create>;
        const mockBasePath = '/test/project';
        const mockWebappPath = '/test/project/webapp';
        const mockManifestPath = join(mockWebappPath, FileName.ManifestAppDescrVar);

        beforeEach(() => {
            jest.clearAllMocks();
            mockFs = create(createStorage());
            mockGetWebappPath.mockResolvedValue(mockWebappPath);
        });

        test('should return true when manifest.appdescr_variant exists in memory', async () => {
            jest.spyOn(mockFs, 'exists').mockReturnValue(true);

            const result = await isAdpProject(mockFs, mockBasePath);

            expect(result).toBe(true);
            expect(mockGetWebappPath).toHaveBeenCalledWith(mockBasePath, mockFs);
            expect(mockFs.exists).toHaveBeenCalledWith(mockManifestPath);
        });

        test('should return false when manifest.appdescr_variant does not exist in memory', async () => {
            jest.spyOn(mockFs, 'exists').mockReturnValue(false);

            const result = await isAdpProject(mockFs, mockBasePath);

            expect(result).toBe(false);
            expect(mockGetWebappPath).toHaveBeenCalledWith(mockBasePath, mockFs);
            expect(mockFs.exists).toHaveBeenCalledWith(mockManifestPath);
        });

        test('should handle getWebappPath errors', async () => {
            const error = new Error('Failed to get webapp path');
            mockGetWebappPath.mockRejectedValue(error);

            await expect(isAdpProject(mockFs, mockBasePath)).rejects.toThrow('Failed to get webapp path');
            expect(mockGetWebappPath).toHaveBeenCalledWith(mockBasePath, mockFs);
        });
    });
});
