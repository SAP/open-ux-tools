import * as fs from 'fs';
import * as path from 'path';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import { runBuildAndClean } from '../../../src/base/project-builder';

jest.mock('fs');

const existsSyncMock = fs.existsSync as jest.Mock;
const readdirSyncMock = fs.readdirSync as jest.Mock;
const unlinkSyncMock = fs.unlinkSync as jest.Mock;

const projectPath = '/mock/project/path';
const dirToClean = path.join(projectPath, 'dist');

describe('runBuildAndClean', () => {
    let commandSpy: jest.SpyInstance;

    beforeEach(() => {
        commandSpy = jest.spyOn(CommandRunner.prototype, 'run');

        existsSyncMock.mockImplementation((path: fs.PathLike) => path === dirToClean);
        unlinkSyncMock.mockImplementation(() => {});
        readdirSyncMock.mockImplementation((dirPath: fs.PathLike) => {
            if (dirPath === dirToClean) {
                return [
                    {
                        name: 'file1.js.map',
                        isDirectory: () => false,
                        isFile: () => true
                    },
                    {
                        name: 'file2.js.map',
                        isDirectory: () => false,
                        isFile: () => true
                    }
                ] as unknown as fs.Dirent[];
            }
            return [];
        });

        // Mock `console.log` and `console.warn` to suppress output in the terminal
        console.log = jest.fn();
        console.warn = jest.fn();
        console.error = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should execute the build command and clean up .js.map files', async () => {
        commandSpy.mockResolvedValueOnce('Build completed.');

        await runBuildAndClean(projectPath, dirToClean);

        // Assert the build command was executed
        expect(commandSpy).toHaveBeenCalledWith('npm', ['run', 'build'], { cwd: projectPath });

        // Assert `fs.unlinkSync` was called for each .js.map file
        expect(unlinkSyncMock).toHaveBeenCalledWith(path.join(dirToClean, 'file1.js.map'));
        expect(unlinkSyncMock).toHaveBeenCalledWith(path.join(dirToClean, 'file2.js.map'));
    });

    it('should log a warning if the directory to clean does not exist', async () => {
        commandSpy.mockResolvedValueOnce('Build completed.');
        existsSyncMock.mockReturnValue(false);

        await runBuildAndClean(projectPath, dirToClean);

        expect(console.warn).toHaveBeenCalledWith(`No directory found at ${dirToClean}`);
        expect(unlinkSyncMock).not.toHaveBeenCalled();
    });

    it('should throw an error if the build command fails', async () => {
        const errorMsg = 'Build failed';
        commandSpy.mockRejectedValueOnce(new Error(errorMsg));

        await expect(runBuildAndClean(projectPath, dirToClean)).rejects.toThrow(errorMsg);

        // Ensure no files were deleted
        expect(console.error).toHaveBeenCalledWith(`Error during build and clean: ${errorMsg}`);
        expect(unlinkSyncMock).not.toHaveBeenCalled();
    });

    it('should delete files recursively in subdirectories', async () => {
        commandSpy.mockResolvedValueOnce('Build completed.');
        readdirSyncMock.mockImplementation((dirPath: fs.PathLike) => {
            if (dirPath === dirToClean) {
                return [
                    {
                        name: 'subdir',
                        isDirectory: () => true,
                        isFile: () => false
                    },
                    {
                        name: 'file1.js.map',
                        isDirectory: () => false,
                        isFile: () => true
                    }
                ] as unknown as fs.Dirent[];
            }
            if (dirPath === path.join(dirToClean, 'subdir')) {
                return [
                    {
                        name: 'file2.js.map',
                        isDirectory: () => false,
                        isFile: () => true
                    }
                ] as unknown as fs.Dirent[];
            }
            return [];
        });

        await runBuildAndClean(projectPath, dirToClean);

        // Assert recursive deletion
        expect(unlinkSyncMock).toHaveBeenCalledWith(path.join(dirToClean, 'file1.js.map'));
        expect(unlinkSyncMock).toHaveBeenCalledWith(path.join(dirToClean, 'subdir', 'file2.js.map'));
    });
});
