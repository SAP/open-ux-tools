import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { getAllLaunchConfigs, getLaunchConfigs, getLaunchConfigByName, getLaunchJSONFilePaths } from '../../src';
import { TestPaths } from '../test-data/utils';

const originalConsoleError = console.error;

describe('read', () => {
    const memFs = create(createStorage());
    beforeEach(() => {
        jest.clearAllMocks();
        console.error = originalConsoleError;
    });

    it('should return launch configuration files', async () => {
        const launchConfigs = await getLaunchJSONFilePaths(TestPaths.workspaceRoots, memFs);
        expect(launchConfigs).toEqual([
            join(TestPaths.feProjects, '.vscode', 'launch.json'),
            join(TestPaths.freestyleProjects, '.vscode', 'launch.json')
        ]);
    });

    it('should return all launch configurations', async () => {
        const allLaunchConfigs = await getLaunchConfigs(TestPaths.feProjects);
        expect(allLaunchConfigs?.length).toBe(6);
    });

    it('should not return launch configurations from dummy path', async () => {
        const allLaunchConfigs = await getLaunchConfigs('dummy');
        expect(allLaunchConfigs).toBeUndefined();
    });

    it('should throw an error if launch.json is invalid', async () => {
        try {
            await getLaunchConfigs(TestPaths.invalidJson);
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    it('should return launch configurations info', async () => {
        let allLaunchConfigs = await getAllLaunchConfigs(TestPaths.workspaceRoots);

        expect(allLaunchConfigs.length).toBe(2);
        expect(allLaunchConfigs[0].launchConfigs[0].name).toBe('Start v2lrop');
        expect(allLaunchConfigs[1].launchConfigs[0].name).toBe('Start freestyle');

        allLaunchConfigs = await getAllLaunchConfigs(TestPaths.freestyleProjects);
        expect(allLaunchConfigs[0].launchConfigs[0].name).toBe('Start freestyle');
    });

    it('should return launch config by name', async () => {
        const launchConfig = await getLaunchConfigByName(TestPaths.feProjectsLaunchConfig, 'Start v2lrop');
        expect(launchConfig).toMatchSnapshot();
    });

    it('should try to get invalid launch config', async () => {
        console.error = jest.fn();
        try {
            await getLaunchConfigByName('WRONG_PATH', 'Start v2lrop');
            fail('Get a launch config from non existing path did not threw error.');
        } catch (error) {
            expect(error.message).toContain('WRONG_PATH');
        }
        expect(console.error).toBeCalledTimes(1);

        jest.clearAllMocks();

        try {
            await getLaunchConfigByName(TestPaths.feProjectsLaunchConfig, 'NON EXISTING CONFIG');
            fail('Get a launch config from non existing path did not threw error.');
        } catch (error) {
            expect(error.message).toContain('NON EXISTING CONFIG');
        }
        expect(console.error).toBeCalledTimes(1);
    });
});
