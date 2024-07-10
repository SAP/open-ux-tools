import { getDefaultLaunchConfigOptionsForProject } from '../../src';
import { TestPaths } from '../test-data/utils';

const originalConsoleError = console.error;
interface Mock {
    mock: { calls: [[string]] };
}

describe('project', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.error = originalConsoleError;
    });

    afterAll(() => {
        console.error = originalConsoleError;
    });

    it('should get default options for project (v2)', async () => {
        const options = await getDefaultLaunchConfigOptionsForProject(TestPaths.v2);
        expect(options.name).toBe('Launch Fiori app: fiori-elements-v2');
        expect(options.projectVersion).toBe('2.0');
        expect(options.projectRoot).toBe(TestPaths.v2);
        expect(options.ui5Version).toEqual('latest');
        expect(options.backendConfigs).toEqual([{ path: '/sap', url: 'DUMMY_BACKEND_URL' }]);
    });

    it('should get default options for project (v4)', async () => {
        const options = await getDefaultLaunchConfigOptionsForProject(TestPaths.v4);
        expect(options.name).toBe('Launch Fiori app: fiori-elements-v4');
        expect(options.projectVersion).toBe('4.0');
        expect(options.projectRoot).toBe(TestPaths.v4);
        expect(options.ui5Version).toEqual('latest');
        expect(options.backendConfigs).toEqual([{ path: '/sap', url: 'DUMMY_BACKEND_URL' }]);
    });

    it('should get default options for invalid project', async () => {
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
});
