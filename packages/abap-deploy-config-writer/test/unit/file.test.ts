import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { existsSync } from 'fs';

import { FileName } from '@sap-ux/project-access';

import { addUi5Dependency, isAdpProject, isTsProject } from '../../src/file';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn()
}));

const existsSyncMock = existsSync as jest.Mock;

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
        test('should return true when manifest.appdescr_variant exists in memory', () => {
            const fs = create(createStorage());
            const basePath = '/test/project';
            const variantPath = join(basePath, 'webapp', FileName.ManifestAppDescrVar);

            jest.spyOn(fs, 'exists').mockReturnValue(true);

            expect(isAdpProject(fs, basePath)).toBe(true);
            expect(fs.exists).toHaveBeenCalledWith(variantPath);
        });

        test('should return true when manifest.appdescr_variant exists on disk', () => {
            const fs = create(createStorage());
            const basePath = '/test/project';
            const variantPath = join(basePath, 'webapp', FileName.ManifestAppDescrVar);

            jest.spyOn(fs, 'exists').mockReturnValue(false);
            existsSyncMock.mockReturnValue(true);

            expect(isAdpProject(fs, basePath)).toBe(true);
            expect(fs.exists).toHaveBeenCalledWith(variantPath);
            expect(existsSync).toHaveBeenCalledWith(variantPath);
        });

        test('should return false when manifest.appdescr_variant does not exist', () => {
            const fs = create(createStorage());
            const basePath = '/test/project';
            const variantPath = join(basePath, 'webapp', FileName.ManifestAppDescrVar);

            jest.spyOn(fs, 'exists').mockReturnValue(false);
            existsSyncMock.mockReturnValue(false);

            expect(isAdpProject(fs, basePath)).toBe(false);
            expect(fs.exists).toHaveBeenCalledWith(variantPath);
            expect(existsSync).toHaveBeenCalledWith(variantPath);
        });
    });

    describe('isTsProject', () => {
        test('should return true when tsconfig.json exists in memory', () => {
            const fs = create(createStorage());
            const basePath = '/test/project';
            const tsconfigPath = join(basePath, FileName.Tsconfig);

            jest.spyOn(fs, 'exists').mockReturnValue(true);

            expect(isTsProject(fs, basePath)).toBe(true);
            expect(fs.exists).toHaveBeenCalledWith(tsconfigPath);
        });

        test('should return true when tsconfig.json exists on disk', () => {
            const fs = create(createStorage());
            const basePath = '/test/project';
            const tsconfigPath = join(basePath, FileName.Tsconfig);

            jest.spyOn(fs, 'exists').mockReturnValue(false);
            existsSyncMock.mockReturnValue(true);

            expect(isTsProject(fs, basePath)).toBe(true);
            expect(fs.exists).toHaveBeenCalledWith(tsconfigPath);
            expect(existsSync).toHaveBeenCalledWith(tsconfigPath);
        });

        test('should return false when tsconfig.json does not exist', () => {
            const fs = create(createStorage());
            const basePath = '/test/project';
            const tsconfigPath = join(basePath, FileName.Tsconfig);

            jest.spyOn(fs, 'exists').mockReturnValue(false);
            existsSyncMock.mockReturnValue(false);

            expect(isTsProject(fs, basePath)).toBe(false);
            expect(fs.exists).toHaveBeenCalledWith(tsconfigPath);
            expect(existsSync).toHaveBeenCalledWith(tsconfigPath);
        });
    });
});
