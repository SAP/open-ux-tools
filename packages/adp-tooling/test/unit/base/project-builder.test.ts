import { CommandRunner } from '@sap-ux/nodejs-utils';

import { runBuild } from '../../../src/base/project-builder';

const projectPath = '/mock/project/path';

describe('runBuildAndClean', () => {
    let commandSpy: jest.SpyInstance;

    beforeEach(() => {
        commandSpy = jest.spyOn(CommandRunner.prototype, 'run');

        // Mock `console.log` and `console.warn` to suppress output in the terminal
        console.log = jest.fn();
        console.warn = jest.fn();
        console.error = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should execute the build command', async () => {
        commandSpy.mockResolvedValueOnce('Build completed.');

        await runBuild(projectPath);

        expect(commandSpy).toHaveBeenCalledWith('npm', ['run', 'build'], { cwd: projectPath });
    });

    it('should throw an error if the build command fails', async () => {
        const errorMsg = 'Build failed';
        commandSpy.mockRejectedValueOnce(new Error(errorMsg));

        await expect(runBuild(projectPath)).rejects.toThrow(errorMsg);

        expect(console.error).toHaveBeenCalledWith(`Error during build and clean: ${errorMsg}`);
    });
});
