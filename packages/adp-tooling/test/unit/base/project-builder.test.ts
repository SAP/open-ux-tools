import { jest } from '@jest/globals';
import { CommandRunner } from '@sap-ux/nodejs-utils';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { ReaderCollection } from '@ui5/fs';
import type { UI5Config } from '@sap-ux/ui5-config';
import type { UI5YamlCustomTaskConfiguration } from '../../../src/types.js';

const projectPath = '/mock/project/path';

// MOCKS - use jest.unstable_mockModule for ESM compatibility
const mockReadUi5Config = jest.fn() as jest.Mock;
const mockExtractCfBuildTask = jest.fn() as jest.Mock;
const realHelper = await import('../../../src/base/helper.js');
jest.unstable_mockModule('../../../src/base/helper', () => ({
    ...realHelper,
    readUi5Config: mockReadUi5Config,
    extractCfBuildTask: mockExtractCfBuildTask
}));

const mockPreviewManifest = jest.fn() as jest.Mock;
jest.unstable_mockModule('@ui5/task-adaptation', () => ({
    previewManifest: mockPreviewManifest
}));

const { runBuild, getPreviewManifest } = await import('../../../src/base/project-builder.js');

describe('runBuildAndClean', () => {
    let commandSpy: jest.SpyInstance;

    beforeEach(() => {
        commandSpy = jest.spyOn(CommandRunner.prototype, 'run');
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

    it('should execute the build command with environment variables', async () => {
        const env = { testKey: 'testValue' };
        commandSpy.mockResolvedValueOnce('Build completed.');

        await runBuild(projectPath, env);

        expect(commandSpy).toHaveBeenCalledWith('npm', ['run', 'build'], {
            cwd: projectPath,
            env: { ...process.env, ...env }
        });
    });

    it('should throw an error if the build command fails', async () => {
        const errorMsg = 'Build failed';
        commandSpy.mockRejectedValueOnce(new Error(errorMsg));

        await expect(runBuild(projectPath)).rejects.toThrow(errorMsg);

        expect(console.error).toHaveBeenCalledWith(`Error during build and clean: ${errorMsg}`);
    });

    it('should throw an error if the build command fails with environment variables', async () => {
        const errorMsg = 'Build failed with env';
        const env = { NODE_ENV: 'production' };
        commandSpy.mockRejectedValueOnce(new Error(errorMsg));

        await expect(runBuild(projectPath, env)).rejects.toThrow(errorMsg);

        expect(console.error).toHaveBeenCalledWith(`Error during build and clean: ${errorMsg}`);
    });
});

describe('getPreviewManifest', () => {
    const workspace = {} as ReaderCollection;
    const ui5Config = {} as UI5Config;
    const buildTask = {
        module: 'my.cf.app',
        appHostId: 'host-1',
        appName: 'my-app',
        appVersion: '1.0.0'
    } as unknown as UI5YamlCustomTaskConfiguration;

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should build the merged manifest from the ui5.yaml CF build task', async () => {
        const mergedManifest = { 'sap.app': { id: 'my.cf.app' } };
        mockReadUi5Config.mockResolvedValueOnce(ui5Config);
        mockExtractCfBuildTask.mockReturnValueOnce(buildTask);
        mockPreviewManifest.mockResolvedValueOnce(mergedManifest);

        const result = await getPreviewManifest(projectPath, workspace);

        expect(result).toEqual(mergedManifest);
        expect(mockReadUi5Config).toHaveBeenCalledWith(projectPath, 'ui5.yaml');
        expect(mockExtractCfBuildTask).toHaveBeenCalledWith(ui5Config);
        // `module` must be split out into projectNamespace; the rest becomes configuration
        expect(mockPreviewManifest).toHaveBeenCalledWith({
            workspace,
            options: {
                configuration: {
                    appHostId: 'host-1',
                    appName: 'my-app',
                    appVersion: '1.0.0'
                },
                projectNamespace: 'my.cf.app'
            }
        });
    });

    it('should propagate the error when no CF build task is found', async () => {
        mockReadUi5Config.mockResolvedValueOnce(ui5Config);
        mockExtractCfBuildTask.mockImplementationOnce(() => {
            throw new Error('No CF ADP project found');
        });

        await expect(getPreviewManifest(projectPath, workspace)).rejects.toThrow('No CF ADP project found');
        expect(mockPreviewManifest).not.toHaveBeenCalled();
    });

    it('should propagate errors thrown by previewManifest (e.g. empty base app cache)', async () => {
        mockReadUi5Config.mockResolvedValueOnce(ui5Config);
        mockExtractCfBuildTask.mockReturnValueOnce(buildTask);
        mockPreviewManifest.mockRejectedValueOnce(new Error('Base app cache is empty'));

        await expect(getPreviewManifest(projectPath, workspace)).rejects.toThrow('Base app cache is empty');
    });
});
