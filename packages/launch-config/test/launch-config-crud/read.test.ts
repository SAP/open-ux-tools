import { join } from 'path';
import { getAllLaunchConfigs, getLaunchConfigs, getLaunchConfigByName, getLaunchConfigFiles } from '../../src';
import { TestPaths } from '../test-data/utils';

const originalConsoleError = console.error;

beforeEach(() => {
    jest.clearAllMocks();
    console.error = originalConsoleError;
});

test('Get launch config files', () => {
    const launchConfigs = getLaunchConfigFiles(TestPaths.workspaceRoots);
    expect(launchConfigs).toEqual([
        join(TestPaths.feProjects, '.vscode', 'launch.json'),
        join(TestPaths.freestyleProjects, '.vscode', 'launch.json')
    ]);
});

test('Get all launch configurations', async () => {
    const allLaunchConfigs = await getLaunchConfigs(TestPaths.feProjects);
    expect(allLaunchConfigs?.length).toBe(6);
});

test('Get all launch configurations from dummy path', async () => {
    const allLaunchConfigs = await getLaunchConfigs('dummy');
    expect(allLaunchConfigs).toBeUndefined();
});

test('Throw an error if launch.json is invalid', async () => {
    try {
        await getLaunchConfigs(TestPaths.invalidJson);
    } catch (error) {
        expect(error).toBeDefined();
    }
});

test('Get launch configurations info', async () => {
    let allLaunchConfigs = await getAllLaunchConfigs(TestPaths.workspaceRoots);

    expect(allLaunchConfigs.length).toBe(2);
    expect(allLaunchConfigs[0].launchConfigs[0].name).toBe('Start v2lrop');
    expect(allLaunchConfigs[1].launchConfigs[0].name).toBe('Start freestyle');

    allLaunchConfigs = await getAllLaunchConfigs(TestPaths.freestyleProjects);
    expect(allLaunchConfigs[0].launchConfigs[0].name).toBe('Start freestyle');
});

test('Get launch config by name', async () => {
    const launchConfig = await getLaunchConfigByName(TestPaths.feProjectsLaunchConfig, 'Start v2lrop');
    expect(launchConfig).toMatchSnapshot();
});

test('Try to get invalid launch config', async () => {
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
