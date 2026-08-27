import { jest } from '@jest/globals';
import { join } from 'node:path';

const mockFindFioriArtifacts = jest.fn<typeof actualProjectAccess.findFioriArtifacts>();
const mockGetProjectType = jest.fn().mockResolvedValue('EDMXBackend');

const actualProjectAccess = await import('@sap-ux/project-access');
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    findFioriArtifacts: mockFindFioriArtifacts,
    getProjectType: mockGetProjectType
}));

const { listFioriApps } = await import('../../../src/tools/index.js');

describe('listFioriApps', () => {
    const searchPath = ['testApplicationPath'];

    beforeEach(async () => {
        mockFindFioriArtifacts.mockReset();
        mockGetProjectType.mockReset().mockResolvedValue('EDMXBackend');
    });

    test('call with valid app and empty manifest', async () => {
        const appRoot = join('root', 'dummyAppRoot');
        mockFindFioriArtifacts.mockReturnValueOnce(
            Promise.resolve({
                applications: [
                    {
                        appRoot,
                        projectRoot: appRoot,
                        manifest: {}
                    }
                ]
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
        mockFindFioriArtifacts.mockReturnValueOnce(
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
                ]
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
        mockFindFioriArtifacts.mockReturnValueOnce(
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
                ]
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

    test('call with CAP project', async () => {
        const projectRoot = 'dummyRoot';
        const appRoot = 'dummyAppRoot';
        const appRoot2 = 'dummyAppRoot2';
        mockGetProjectType.mockResolvedValue('CAPJava');
        mockFindFioriArtifacts.mockReturnValueOnce(
            Promise.resolve({
                applications: [
                    {
                        appRoot,
                        projectRoot,
                        manifest: {
                            'sap.app': {
                                id: 'dummyApp1'
                            }
                        }
                    },
                    {
                        appRoot: appRoot2,
                        projectRoot,
                        manifest: {
                            'sap.app': {
                                id: 'dummyApp2'
                            }
                        }
                    }
                ]
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
                    projectPath: projectRoot,
                    projectType: 'CAPJava',
                    odataVersion: '4.0'
                },
                {
                    name: 'dummyApp2',
                    appPath: appRoot2,
                    projectPath: projectRoot,
                    projectType: 'CAPJava',
                    odataVersion: '4.0'
                }
            ]
        });
    });
});
