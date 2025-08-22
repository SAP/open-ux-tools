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

    beforeEach(async () => {
        findFioriArtifactsSpy = jest.spyOn(projectAccess, 'findFioriArtifacts');
    });

    test('call with valid app and empty manifest', async () => {
        const appRoot = join('root', 'dummyAppRoot');
        findFioriArtifactsSpy.mockReturnValueOnce(
            Promise.resolve({
                applications: [
                    {
                        appRoot,
                        manifest: {}
                    }
                ] as unknown as projectAccess.AllAppResults[]
            })
        );
        const apps = await listFioriApps({
            searchPath
        });
        expect(apps).toEqual({
            applications: [{ name: 'dummyAppRoot', path: appRoot, type: 'list-report', version: '4.0' }]
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
                        manifest: {
                            'sap.app': {
                                id: 'dummyApp1'
                            }
                        }
                    },
                    {
                        appRoot: appRoot2,
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
                    path: appRoot,
                    type: 'list-report',
                    version: '4.0'
                },
                {
                    name: 'dummyApp2',
                    path: appRoot2,
                    type: 'list-report',
                    version: '4.0'
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
            applications: [{ name: 'dummyAppId', path: appRoot, type: 'list-report', version: '2.0' }]
        });
    });
});
