import * as projectAccess from '@sap-ux/project-access';
import { listFioriApps } from '../../../src/tools';
import { join } from 'path';

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/project-access') as object)
}));

describe('listFioriApps', () => {
    const searchPath = ['testApplicationPath'];
    let findFioriArtifactsSpy: jest.SpyInstance;
    let getProjectTypeSpy: jest.SpyInstance;

    beforeEach(async () => {
        findFioriArtifactsSpy = jest.spyOn(projectAccess, 'findFioriArtifacts');
        getProjectTypeSpy = jest.spyOn(projectAccess, 'getProjectType').mockResolvedValue('EDMXBackend');
    });

    test('call with valid app and empty manifest', async () => {
        const appRoot = join('root', 'dummyAppRoot');
        findFioriArtifactsSpy.mockReturnValueOnce(
            Promise.resolve({
                applications: [
                    {
                        appRoot,
                        projectRoot: appRoot,
                        manifest: {}
                    }
                ] as unknown as projectAccess.AllAppResults[]
            })
        );
        const apps = await listFioriApps({
            searchPath
        });
        expect(apps).toEqual({
            applications: [
                {
                    name: 'dummyAppRoot',
                    appPath: appRoot,
                    projectPath: appRoot,
                    projectType: 'EDMXBackend',
                    odataVersion: '4.0'
                }
            ]
        });
    });

    test('call with multiple apps', async () => {
        const appRoot = 'dummyAppRoot';
        const appRoot2 = 'dummyAppRoot2';
        findFioriArtifactsSpy.mockReturnValueOnce(
            Promise.resolve({
                applications: [
                    {
                        appRoot,
                        projectRoot: appRoot,
                        manifest: {
                            'sap.app': {
                                id: 'dummyApp1'
                            }
                        }
                    },
                    {
                        appRoot: appRoot2,
                        projectRoot: appRoot2,
                        manifest: {
                            'sap.app': {
                                id: 'dummyApp2'
                            }
                        }
                    }
                ] as unknown as projectAccess.AllAppResults[]
            })
        );
        const apps = await listFioriApps({
            searchPath
        });
        expect(apps).toEqual({
            applications: [
                {
                    name: 'dummyApp1',
                    appPath: appRoot,
                    projectPath: appRoot,
                    projectType: 'EDMXBackend',
                    odataVersion: '4.0'
                },
                {
                    name: 'dummyApp2',
                    appPath: appRoot2,
                    projectPath: appRoot2,
                    projectType: 'EDMXBackend',
                    odataVersion: '4.0'
                }
            ]
        });
    });

    test('call with valid app and manifest', async () => {
        const appRoot = 'dummyAppRoot';
        findFioriArtifactsSpy.mockReturnValueOnce(
            Promise.resolve({
                applications: [
                    {
                        appRoot,
                        projectRoot: appRoot,
                        manifest: {
                            'sap.app': {
                                id: 'dummyAppId',
                                dataSources: {
                                    mainService: {
                                        settings: {
                                            odataVersion: '2.0'
                                        }
                                    }
                                }
                            }
                        }
                    }
                ] as unknown as projectAccess.AllAppResults[]
            })
        );
        const apps = await listFioriApps({
            searchPath
        });
        expect(apps).toEqual({
            applications: [
                {
                    name: 'dummyAppId',
                    appPath: appRoot,
                    projectPath: appRoot,
                    projectType: 'EDMXBackend',
                    odataVersion: '2.0'
                }
            ]
        });
    });
});
