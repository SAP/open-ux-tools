import { basename, join } from 'path';
import { getDefaultLaunchConfigOptionsForProject } from '../../src';
import { TestPaths } from '../test-data/utils';

const originalConsoleError = console.error;

beforeEach(() => {
    jest.clearAllMocks();
    console.error = originalConsoleError;
});

afterAll(() => {
    console.error = originalConsoleError;
});

interface Mock {
    mock: { calls: [[string]] };
}

test('Get default options for project', async () => {
    const options = await getDefaultLaunchConfigOptionsForProject(join(TestPaths.feProjects, 'v2lrop'));
    expect(options.name).toBe('Launch Fiori app: v2lrop');
    expect(options.projectRoot).toBe(join(TestPaths.feProjects, 'v2lrop'));
    expect(options.ui5Version).toEqual('latest');
    expect(options.backendConfigs).toEqual([{ path: '/sap', url: 'http://ims.saplabs.com:50017' }]);
});

test('Get default options for invalid project', async () => {
    console.error = jest.fn();
    const defaultConfig = await getDefaultLaunchConfigOptionsForProject('INVALID_PROJECT_PATH');
    expect(defaultConfig).toEqual({
        name: '',
        projectVersion: undefined,
        startFile: undefined,
        projectRoot: 'INVALID_PROJECT_PATH',
        ui5Version: '',
        visible: true
    });
    expect((console.error as unknown as Mock).mock.calls[0][0]).toContain('INVALID_PROJECT_PATH');
});
