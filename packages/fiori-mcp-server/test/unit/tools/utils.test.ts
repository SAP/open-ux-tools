import * as openUxProjectAccessDependency from '@sap-ux/project-access';
import { resolveApplication } from '../../../src/tools/utils';
import { join } from 'path';

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/project-access') as object)
}));

describe('resolveApplication', () => {
    const appPath = join('folder', 'dummy', 'app');
    const findProjectRootSpy: jest.SpyInstance = jest.spyOn(openUxProjectAccessDependency, 'findProjectRoot');
    const createApplicationAccessSpy: jest.SpyInstance = jest.spyOn(
        openUxProjectAccessDependency,
        'createApplicationAccess'
    );
    const getProjectSpy: jest.SpyInstance = jest.spyOn(openUxProjectAccessDependency, 'getProject');
    const mockCreateApplicationAccess = (appIds: string[] = [''], appId = '') => {
        createApplicationAccessSpy.mockImplementation((root: string) => {
            const apps: { [key: string]: {} } = {};
            for (const appId of appIds) {
                apps[appId] = {};
            }
            if (appId) {
                root = root.slice(0, root.length - appId.length - 1);
            }
            return {
                getAppId: () => appId,
                project: {
                    root: root,
                    apps
                }
            };
        });
        getProjectSpy.mockResolvedValue({
            root: appPath,
            apps: {},
            projectType: 'CAPNodejs'
        });
    };
    beforeEach(async () => {
        findProjectRootSpy.mockImplementation(async (path: string): Promise<string> => path);
        mockCreateApplicationAccess([''], '');
    });

    test('Root and app paths are matching', async () => {
        const application = await resolveApplication(appPath);
        expect(application?.appId).toEqual('');
        expect(application?.root).toEqual(appPath);
    });

    test('Root and app paths are different', async () => {
        mockCreateApplicationAccess([join('dummy', 'app'), join('dummy', 'app2')], join('dummy', 'app'));
        findProjectRootSpy.mockResolvedValue('folder');
        const application = await resolveApplication(appPath);
        expect(application?.appId).toEqual(join('dummy', 'app'));
        expect(application?.root).toEqual('folder');
    });

    test('No any app', async () => {
        mockCreateApplicationAccess([]);
        const application = await resolveApplication(appPath);
        expect(application?.appId).toEqual('');
        expect(application?.root).toEqual(appPath);
    });

    test('No app found, but root exists', async () => {
        createApplicationAccessSpy.mockImplementation(() => {
            throw new Error('Dummy');
        });
        findProjectRootSpy.mockResolvedValue(appPath);

        const application = await resolveApplication(appPath);
        expect(application?.root).toEqual(appPath);
        expect(application?.applicationAccess).toEqual(undefined);
    });

    test('Error thrown while searching application', async () => {
        createApplicationAccessSpy.mockImplementation(() => {
            throw new Error('Dummy');
        });
        const application = await resolveApplication(appPath);
        expect(application?.appId).toEqual('');
        expect(application?.root).toEqual(appPath);
    });

    test('Error thrown while getting app and project', async () => {
        getProjectSpy.mockImplementation(() => {
            throw new Error('Dummy');
        });
        createApplicationAccessSpy.mockImplementation(() => {
            throw new Error('Dummy');
        });
        const application = await resolveApplication(appPath);
        expect(application).toEqual(undefined);
    });
});
