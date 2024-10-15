import path, { join, sep } from 'path';
import * as childProcess from 'child_process';
import { create as createStorage, type Store } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import * as projectModuleMock from '../../src/project/module-loader';
import type { Package } from '../../src';
import { FileName } from '../../src/constants';
import { clearCdsModuleCache, clearGlobalCdsModulePromiseCache, getCapServiceName } from '../../src/project/cap';
import {
    getCapCustomPaths,
    getCapEnvironment,
    getCdsFiles,
    getCdsRoots,
    getCdsServices,
    isCapNodeJsProject,
    isCapJavaProject,
    getCapModelAndServices,
    getCapProjectType,
    readCapServiceMetadataEdmx,
    toReferenceUri,
    isCapProject,
    deleteCapApp
} from '../../src';
import * as file from '../../src/file';
import os from 'os';
import type { Logger } from '@sap-ux/logger';
import { promises as fs } from 'fs';
import { deleteFile, readFile, readJSON } from '../../src/file';
import * as search from '../../src/project/search';

jest.mock('child_process');
const childProcessMock = jest.mocked(childProcess, { shallow: true });
const jestEnvForMock = jest.fn().mockImplementation(() => ({
    'for': jestEnvForMock,
    folders: {
        app: 'MY_APP',
        db: 'MY_DB',
        srv: 'MY_SRV'
    }
}));
const jestMockEnv = {
    'for': jestEnvForMock
};

describe('Test getCapProjectType() & isCapProject()', () => {
    test('Test if valid CAP Node.js project is recognized', async () => {
        const capPath = join(__dirname, '..', 'test-data', 'project', 'find-all-apps', 'CAP', 'CAPnode_mix');
        expect(await getCapProjectType(capPath)).toBe('CAPNodejs');
        expect(await isCapProject(capPath)).toBe(true);
    });

    test('Test if valid CAP Java project is recognized', async () => {
        const capPath = join(__dirname, '..', 'test-data', 'project', 'find-all-apps', 'CAP', 'CAPJava_mix');
        expect(await getCapProjectType(capPath)).toBe('CAPJava');
        expect(await isCapProject(capPath)).toBe(true);
    });

    test('Test if invalid CAP project is recognized', async () => {
        expect(await getCapProjectType('INVALID_PROJECT')).toBeUndefined();
        expect(await isCapProject('INVALID_PROJECT')).toBe(false);
    });
});

describe('Test isCapNodeJsProject()', () => {
    test('Test if valid CAP node.js project is recognized', async () => {
        const packageJson = await file.readJSON<Package>(
            join(__dirname, '..', 'test-data', 'project', 'find-all-apps', 'CAP', 'CAPnode_mix', FileName.Package)
        );
        expect(isCapNodeJsProject(packageJson)).toBeTruthy();
    });

    test('Test if invalid CAP node.js project is recognized', async () => {
        const packageJson: Package = {};
        expect(isCapNodeJsProject(packageJson)).toBeFalsy();
    });
});

describe('Test isCapJavaProject()', () => {
    test('Test if valid CAP Java project is recognized', async () => {
        expect(
            await isCapJavaProject(join(__dirname, '..', 'test-data', 'project', 'find-all-apps', 'CAP', 'CAPJava_mix'))
        ).toBeTruthy();
    });

    test('Test if invalid CAP Java project is recognized', async () => {
        expect(
            await isCapJavaProject(join(__dirname, '..', 'test-data', 'project', 'find-all-apps', 'CAP', 'CAPnode_mix'))
        ).toBeFalsy();
    });
});

describe('Test getCapModelAndServices()', () => {
    afterEach(() => {
        jest.clearAllMocks();
        clearGlobalCdsModulePromiseCache();
    });

    test('Get valid model and services, mock cds with local cds from devDependencies Updated API available in @sap/cds: 7.8.0', async () => {
        // Mock setup
        const cdsMock = {
            env: jestMockEnv,
            load: jest.fn().mockImplementation(() => Promise.resolve('MODEL')),
            compile: {
                to: {
                    serviceinfo: jest.fn().mockImplementation(() => [
                        {
                            'name': 'Forwardslash',
                            'endpoints': [
                                {
                                    'path': 'odata/service/with/forwardslash/',
                                    'kind': 'odata'
                                }
                            ]
                        },
                        {
                            'name': 'Backslash',
                            'endpoints': [
                                {
                                    'path': '\\odata\\service\\with\\backslash/',
                                    'kind': 'odata'
                                }
                            ]
                        },
                        {
                            'name': 'withRuntime',
                            'endpoints': [
                                {
                                    'path': 'url',
                                    'kind': 'odata'
                                }
                            ],
                            'runtime': 'Node.js'
                        }
                    ])
                }
            },
            home: '/path/to/cds/home',
            version: '7.0.0',
            root: '/path/to/cds/root'
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => Promise.resolve(cdsMock));

        // Test execution
        const capMS = await getCapModelAndServices('PROJECT_ROOT');

        // Check results
        expect(capMS).toEqual({
            model: 'MODEL',
            services: [
                {
                    'name': 'Forwardslash',
                    'urlPath': 'odata/service/with/forwardslash/'
                },
                {
                    'name': 'Backslash',
                    'urlPath': 'odata/service/with/backslash/'
                },
                {
                    'name': 'withRuntime',
                    'urlPath': 'url',
                    'runtime': 'Node.js'
                }
            ],
            cdsVersionInfo: {
                home: '/path/to/cds/home',
                version: '7.0.0',
                root: '/path/to/cds/root'
            }
        });
        expect(cdsMock.load).toBeCalledWith(
            [join('PROJECT_ROOT', 'MY_APP'), join('PROJECT_ROOT', 'MY_SRV'), join('PROJECT_ROOT', 'MY_DB')],
            { root: 'PROJECT_ROOT' }
        );
        expect(cdsMock.compile.to.serviceinfo).toBeCalledWith('MODEL', { root: 'PROJECT_ROOT' });
    });

    test('Get valid model and services, mock cds with local cds from devDependencies Updated API available in @sap/cds: 7.8.0, no odata kind in endpoints', async () => {
        // Mock setup
        const cdsMock = {
            env: jestMockEnv,
            load: jest.fn().mockImplementation(() => Promise.resolve('MODEL')),
            compile: {
                to: {
                    serviceinfo: jest.fn().mockImplementation(() => [
                        {
                            'name': 'Forwardslash',
                            'urlPath': 'odata/service/with/forwardslash/',
                            'endpoints': [
                                {
                                    'path': 'rest/service/with/forwardslash/',
                                    'kind': 'rest'
                                }
                            ]
                        },
                        {
                            'name': 'Backslash',
                            'urlPath': '\\odata\\service\\with\\backslash/',
                            'endpoints': [
                                {
                                    'path': '\\rest\\service\\with\\backslash/',
                                    'kind': 'rest'
                                }
                            ]
                        },
                        {
                            'name': 'withRuntime',
                            'urlPath': 'url',
                            'endpoints': [
                                {
                                    'path': 'url',
                                    'kind': 'rest'
                                }
                            ],
                            'runtime': 'Node.js'
                        }
                    ])
                }
            },
            home: '/path/to/cds/home',
            version: '7.0.0',
            root: '/path/to/cds/root'
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => Promise.resolve(cdsMock));

        // Test execution
        const capMS = await getCapModelAndServices('PROJECT_ROOT');

        // Check results
        expect(capMS).toEqual({
            model: 'MODEL',
            services: [
                {
                    'name': 'Forwardslash',
                    'urlPath': 'odata/service/with/forwardslash/'
                },
                {
                    'name': 'Backslash',
                    'urlPath': 'odata/service/with/backslash/'
                },
                {
                    'name': 'withRuntime',
                    'urlPath': 'url',
                    'runtime': 'Node.js'
                }
            ],
            cdsVersionInfo: {
                home: '/path/to/cds/home',
                version: '7.0.0',
                root: '/path/to/cds/root'
            }
        });
        expect(cdsMock.load).toBeCalledWith(
            [join('PROJECT_ROOT', 'MY_APP'), join('PROJECT_ROOT', 'MY_SRV'), join('PROJECT_ROOT', 'MY_DB')],
            { root: 'PROJECT_ROOT' }
        );
        expect(cdsMock.compile.to.serviceinfo).toBeCalledWith('MODEL', { root: 'PROJECT_ROOT' });
    });

    test('Get valid model and services, mock cds with local cds from devDependencies Before @sap/cds: 7.8.0', async () => {
        // Mock setup
        const cdsMock = {
            env: jestMockEnv,
            load: jest.fn().mockImplementation(() => Promise.resolve('MODEL')),
            compile: {
                to: {
                    serviceinfo: jest.fn().mockImplementation(() => [
                        {
                            'name': 'Forwardslash',
                            'urlPath': 'odata/service/with/forwardslash/'
                        },
                        {
                            'name': 'Backslash',
                            'urlPath': '\\odata\\service\\with\\backslash/'
                        },
                        {
                            'name': 'withRuntime',
                            'urlPath': 'url',
                            'runtime': 'Node.js'
                        }
                    ])
                }
            },
            home: '/path/to/cds/home',
            version: '7.0.0',
            root: '/path/to/cds/root'
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => Promise.resolve(cdsMock));

        // Test execution
        const capMS = await getCapModelAndServices('PROJECT_ROOT');

        // Check results
        expect(capMS).toEqual({
            model: 'MODEL',
            services: [
                {
                    'name': 'Forwardslash',
                    'urlPath': 'odata/service/with/forwardslash/'
                },
                {
                    'name': 'Backslash',
                    'urlPath': 'odata/service/with/backslash/'
                },
                {
                    'name': 'withRuntime',
                    'urlPath': 'url',
                    'runtime': 'Node.js'
                }
            ],
            cdsVersionInfo: {
                home: '/path/to/cds/home',
                version: '7.0.0',
                root: '/path/to/cds/root'
            }
        });
        expect(cdsMock.load).toBeCalledWith(
            [join('PROJECT_ROOT', 'MY_APP'), join('PROJECT_ROOT', 'MY_SRV'), join('PROJECT_ROOT', 'MY_DB')],
            { root: 'PROJECT_ROOT' }
        );
        expect(cdsMock.compile.to.serviceinfo).toBeCalledWith('MODEL', { root: 'PROJECT_ROOT' });
    });

    test('Get model and services, but services are empty', async () => {
        // Mock setup
        const cdsMock = {
            env: {
                'for': () => ({
                    folders: {
                        app: 'APP',
                        db: 'DB',
                        srv: 'SRV'
                    }
                })
            },
            load: jest.fn().mockImplementation(() => Promise.resolve('MODEL_NO_SERVICES')),
            compile: {
                to: {
                    serviceinfo: jest.fn().mockImplementation(() => null)
                }
            }
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => Promise.resolve(cdsMock));

        // Test execution
        const capMS = await getCapModelAndServices('ROOT_PATH');

        // Check results
        expect(capMS.services).toEqual([]);
        expect(capMS.cdsVersionInfo).toEqual({
            home: undefined,
            version: undefined,
            root: undefined
        });
        expect(cdsMock.compile.to.serviceinfo).toBeCalledWith('MODEL_NO_SERVICES', { root: 'ROOT_PATH' });
    });

    test('Get model and services filtered by db, but services are empty', async () => {
        // Mock setup
        const cdsMock = {
            env: {
                'for': () => ({
                    folders: {
                        app: 'APP',
                        db: 'DB',
                        srv: 'SRV'
                    }
                })
            },
            load: jest.fn().mockImplementation(() => Promise.resolve('MODEL_NO_SERVICES')),
            compile: {
                to: {
                    serviceinfo: jest.fn().mockImplementation(() => null)
                }
            }
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => Promise.resolve(cdsMock));

        // Test execution
        const capMS = await getCapModelAndServices('ROOT_PATH');

        // Check results
        expect(capMS.model).toEqual('MODEL_NO_SERVICES');
        expect(capMS.services).toEqual([]);
        expect(capMS.cdsVersionInfo).toEqual({
            home: undefined,
            version: undefined,
            root: undefined
        });
        expect(cdsMock.compile.to.serviceinfo).toBeCalledWith('MODEL_NO_SERVICES', { root: 'ROOT_PATH' });
    });

    test('Get model and service', async () => {
        // Mock setup
        const cdsMock = {
            env: {
                'for': () => ({
                    folders: {
                        app: 'APP',
                        db: 'DB',
                        srv: 'SRV'
                    }
                })
            },
            load: jest.fn().mockImplementation(() => Promise.resolve('MODEL_NO_SERVICES')),
            compile: {
                to: {
                    serviceinfo: jest.fn().mockImplementation(() => null)
                }
            },
            home: '/cds/home/path',
            version: '7.4.2'
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => Promise.resolve(cdsMock));

        const mockLogger: Logger = {
            info: jest.fn().mockImplementation(() => null)
        } as unknown as Logger;
        const loggerSpy = jest.spyOn(mockLogger, 'info');
        // Test execution with object param
        const projectRoot = '/some/test/path';
        const capMS = await getCapModelAndServices({ projectRoot, logger: mockLogger });

        expect(capMS.services).toEqual([]);
        expect(cdsMock.compile.to.serviceinfo).toBeCalledWith('MODEL_NO_SERVICES', { root: projectRoot });
        expect(loggerSpy).toHaveBeenNthCalledWith(1, expect.stringContaining("'cds.home': /cds/home/path"));
        expect(loggerSpy).toHaveBeenNthCalledWith(2, expect.stringContaining("'cds.version': 7.4.2"));
        expect(loggerSpy).toHaveBeenNthCalledWith(3, expect.stringContaining("'cds.root':"));
    });

    test('Get model and service, fallback to global install, no cds dependency in project', async () => {
        // Mock setup
        const cdsMock = {
            load: jest.fn().mockResolvedValue('MODEL'),
            compile: {
                to: {
                    serviceinfo: jest.fn().mockResolvedValue([])
                }
            },
            env: jestMockEnv
        };
        jest.spyOn(childProcessMock, 'spawn').mockReturnValueOnce(getChildProcessMock('home: /global/cds'));
        jest.spyOn(projectModuleMock, 'loadModuleFromProject')
            .mockRejectedValueOnce('ERROR')
            .mockResolvedValue(cdsMock);

        // Test execution with object param
        const projectRoot = '/some/test/path';
        const capMS = await getCapModelAndServices(projectRoot);
        expect(capMS.model).toEqual('MODEL');
    });

    test('Get model and service with mismatching major versions of global cds and project cds', async () => {
        // Mock setup
        const cdsMock = {
            load: jest.fn().mockResolvedValue('MODEL'),
            compile: {
                to: {
                    serviceinfo: jest.fn().mockResolvedValue([])
                }
            },
            version: '7.0.0'
        };
        jest.spyOn(childProcessMock, 'spawn').mockReturnValueOnce(getChildProcessMock('home: /any/path'));
        jest.spyOn(projectModuleMock, 'loadModuleFromProject')
            .mockRejectedValueOnce('ERROR')
            .mockResolvedValue(cdsMock);
        jest.spyOn(file, 'fileExists').mockResolvedValueOnce(true);
        jest.spyOn(file, 'readJSON').mockResolvedValueOnce({ 'dependencies': { '@sap/cds': '6.0.0' } });

        // Test execution with object param
        const projectRoot = '/some/test/path';
        try {
            await getCapModelAndServices(projectRoot);
            fail(
                'Call to getCapModelAndServices() should have thrown error due to mismatch of cds versions, but did not.'
            );
        } catch (error) {
            // Result check
            expect(error.code).toBe('CDS_VERSION_MISMATCH');
            ['@sap/cds major version', '6.0.0', '7.0.0'].forEach((testString) => {
                expect(error.toString()).toContain(testString);
            });
        }
    });
});

describe('Test readCapServiceMetadataEdmx()', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    const getCdsMock = () => ({
        load: jest.fn().mockImplementation(() => Promise.resolve('MODEL')),
        compile: {
            to: {
                serviceinfo: jest.fn().mockImplementation(() => [
                    { name: 'ServiceOne', urlPath: 'service/one' },
                    { name: 'Service', urlPath: 'serviceone' },
                    { name: 'ServiceTwo', urlPath: 'service\\two' },
                    { name: 'serviceCatalog', urlPath: '\\odata\\v4\\service\\catalog/' }
                ]),
                edmx: jest.fn().mockImplementation(() => 'EDMX')
            }
        },
        env: jestMockEnv
    });

    test('Convert service to EDMX', async () => {
        // Mock setup
        const cdsMock = getCdsMock();
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue({ default: cdsMock });

        // Test execution
        const result = await readCapServiceMetadataEdmx('root', 'service/two');

        // Check results
        expect(result).toBe('EDMX');
        expect(cdsMock.compile.to.edmx).toBeCalledWith('MODEL', { service: 'ServiceTwo', version: 'v4' });
        expect(cdsMock.compile.to.serviceinfo).toBeCalledWith('MODEL', { root: 'root' });
    });

    test('Convert v2 service with backslash to EDMX', async () => {
        // Mock setup
        const cdsMock = getCdsMock();
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue({ default: cdsMock });

        // Test execution
        const result = await readCapServiceMetadataEdmx('root', '/service\\one/', 'v2');

        // Check results
        expect(result).toBe('EDMX');
        expect(cdsMock.compile.to.edmx).toBeCalledWith('MODEL', { service: 'ServiceOne', version: 'v2' });
    });

    test('Convert service with leading double backslashes', async () => {
        // Mock setup
        const cdsMock = getCdsMock();
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue({ default: cdsMock });

        // Test execution
        const result = await readCapServiceMetadataEdmx('root', '\\\\serviceone');

        // Check results
        expect(result).toBe('EDMX');
        expect(cdsMock.compile.to.edmx).toBeCalledWith('MODEL', { service: 'Service', version: 'v4' });
    });

    test('Convert service with leading windows backslashes', async () => {
        // Mock setup
        const cdsMock = getCdsMock();
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue({ default: cdsMock });

        // Test execution
        const result = await readCapServiceMetadataEdmx('root', 'odata/v4/service/catalog/');

        // Check results
        expect(result).toBe('EDMX');
        expect(cdsMock.compile.to.edmx).toBeCalledWith('MODEL', { service: 'serviceCatalog', version: 'v4' });
    });
    test('Convert none existing service to EDMX, should throw error', async () => {
        // Mock setup
        const cdsMock = getCdsMock();
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue({ default: cdsMock });

        // Test execution and check
        try {
            await readCapServiceMetadataEdmx('root', 'INVALID/SERVICE_URI');
            fail('Call to readCapServiceMetadataEdmx() with invalid service should have thrown error but did not.');
        } catch (error) {
            expect(error.toString()).toContain('INVALID/SERVICE_URI');
        }
    });

    test('Convert service to EDMX, compile throws error', async () => {
        // Mock setup
        const cdsMock = getCdsMock();
        cdsMock.compile.to.edmx = jest.fn().mockImplementationOnce(() => {
            throw 'COMPILE_ERROR';
        });
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue({ default: cdsMock });

        // Test execution and check
        try {
            await readCapServiceMetadataEdmx('', 'service/one');
            fail('Call to readCapServiceMetadataEdmx() should have thrown error but did not.');
        } catch (error) {
            expect(error.toString()).toContain('COMPILE_ERROR');
        }
    });
});

describe('Test getCapCustomPaths()', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Test custom CAP folders', async () => {
        // Mock setup
        const cdsMock = {
            env: jestMockEnv
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => Promise.resolve(cdsMock));

        // Test execution
        const path = await getCapCustomPaths('PROJECT_ROOT');

        // Check results
        expect(path).toEqual({
            app: 'MY_APP',
            db: 'MY_DB',
            srv: 'MY_SRV'
        });
        expect(cdsMock.env.for).toBeCalledWith('cds', 'PROJECT_ROOT');
    });

    test('Test fallback to default folders', async () => {
        // Mock setup
        const cdsMock = {
            env: {
                'for': () => null
            }
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => Promise.resolve(cdsMock));

        // Test execution
        const path = await getCapCustomPaths('PROJECT_ROOT');

        // Check results
        expect(path).toEqual({
            app: 'app/',
            db: 'db/',
            srv: 'srv/'
        });
    });
});

describe('Test getCapEnvironment()', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        // clearing cache after each test to make tests independent of each other
        clearGlobalCdsModulePromiseCache();
    });

    test('without default property', async () => {
        const forSpy = jestMockEnv.for;
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => {
            return Promise.resolve({
                env: {
                    for: forSpy
                }
            });
        });
        await getCapEnvironment('PROJECT_ROOT');
        expect(forSpy).toHaveBeenCalledWith('cds', 'PROJECT_ROOT');
    });
    test('default export', async () => {
        const forSpy = jestMockEnv.for;
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => {
            return Promise.resolve({
                default: {
                    env: {
                        for: forSpy
                    }
                }
            });
        });
        await getCapEnvironment('PROJECT_ROOT');
        expect(forSpy).toHaveBeenCalledWith('cds', 'PROJECT_ROOT');
    });

    test('Updating global.cds to fix issue with version switch', async () => {
        // Mock setup
        type GlobalCds = { cds?: object };
        delete (global as GlobalCds)?.cds;
        const cdsV1 = {
            version: 1,
            env: jestMockEnv
        };
        const cdsV2 = {
            version: 2,
            env: jestMockEnv
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject')
            .mockResolvedValueOnce(cdsV1)
            .mockResolvedValueOnce(cdsV2);

        await getCapEnvironment('PROJECT');
        expect((global as GlobalCds).cds).toBe(cdsV1);
        await getCapEnvironment('PROJECT');
        expect((global as GlobalCds).cds).toBe(cdsV2);
    });

    test('failed to load cds from any location', async () => {
        // Mock setup
        childProcessMock.spawn.mockReturnValueOnce(getChildProcessMock('WRONG'));
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockRejectedValueOnce('ERROR_LOCAL');

        // Test execution
        try {
            await getCapEnvironment('PROJECT_ROOT');
            fail('Call to getCapEnvironment() should have thrown error due to missing cds module but did not');
        } catch (error) {
            expect(error.toString()).toContain('ERROR_LOCAL');
            expect(error.toString()).toContain('@sap/cds-dk');
        }
    });

    test('call to cds --version does not contain result', async () => {
        // Mock setup
        jest.spyOn(childProcessMock, 'spawn').mockReturnValueOnce(getChildProcessMock(''));
        const loadSpy = jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockRejectedValueOnce('ERROR_LOCAL');

        // Test execution
        try {
            await getCapEnvironment('PROJECT_ROOT');
            fail('Call to getCapEnvironment() should have thrown error due to missing cds module path but did not');
        } catch (error) {
            expect(error.toString()).toContain('Error: Module path not found');
        }
        expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    test('call to cds --version throws error', async () => {
        // Mock setup
        jest.spyOn(childProcessMock, 'spawn').mockReturnValueOnce(getChildProcessMock('', true));
        const loadSpy = jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockRejectedValueOnce('ERROR_LOCAL');

        // Test execution
        try {
            await getCapEnvironment('PROJECT_ROOT');
            fail('Call to getCapEnvironment() should have thrown error due to missing cds module path but did not');
        } catch (error) {
            expect(error.toString()).toContain('Error: Module path not found');
        }
        expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    test('with cds loaded from other location than project', async () => {
        // Mock setup
        const spawnSpy = jest
            .spyOn(childProcessMock, 'spawn')
            .mockReturnValueOnce(getChildProcessMock('anyKey: anyValue\nhome: GLOBAL_ROOT\n'));
        const forSpy = jestMockEnv.for;
        const loadSpy = jest
            .spyOn(projectModuleMock, 'loadModuleFromProject')
            .mockRejectedValueOnce('ERROR_LOCAL')
            .mockResolvedValueOnce({ default: { env: { for: forSpy } } });

        // Test execution
        await getCapEnvironment('PROJECT_ROOT');

        // Result check
        expect(spawnSpy).toBeCalledWith('cds', ['--version'], { cwd: undefined, shell: true });
        expect(loadSpy).toHaveBeenNthCalledWith(1, 'PROJECT_ROOT', '@sap/cds');
        expect(loadSpy).toHaveBeenNthCalledWith(2, 'GLOBAL_ROOT', '@sap/cds');
        expect(forSpy).toBeCalledWith('cds', 'PROJECT_ROOT');
    });
});

describe('toReferenceUri', () => {
    beforeEach(async () => {
        jest.restoreAllMocks();
    });
    test('toReferenceUri with refUri starting with "../"', async () => {
        // mock reading of package json in root folder of sibling project
        jest.spyOn(file, 'readFile').mockImplementation(async (uri) => {
            return uri ===
                (os.platform() === 'win32'
                    ? '\\globalRoot\\monoRepo\\bookshop\\package.json'
                    : '/globalRoot/monoRepo/bookshop/package.json')
                ? '{"name": "@capire/bookshop"}'
                : '';
        });
        // prepare
        const projectRoot = join(' ', 'globalRoot', 'monoRepo', 'fiori').trim(); // root folder of fiori project within monorepo
        const relUriFrom = join('.', 'app', 'admin', 'fiori.cds'); // relative (to project root) uri of file for which the using statement should be generated
        const relUriTo = join('..', 'bookshop', 'srv', 'admin.cds'); // relative (to project root) Uri to the file that would be referenced with using statement (goes to sibling project in monorepo)
        // execute
        const refUri = await toReferenceUri(projectRoot, relUriFrom, relUriTo);
        // check
        expect(refUri).toBe('@capire/bookshop/srv/admin');
    });

    test('toReferenceUri with refUri starting with "../" custom cds paths', async () => {
        // mock reading of package json in root folder of sibling project
        jest.spyOn(file, 'readFile').mockImplementation(async () => {
            return '';
        });
        // prepare
        const projectRoot = join(__dirname, '..', 'test-data', 'cap-nodejs-1');
        const relUriFrom = join('sap', 'app', 'admin', 'fiori.cds'); // relative (to project root) uri of file for which the using statement should be generated
        const relUriTo = join('sap', 'srv', 'admin'); // relative (to project root) Uri to the file that would be referenced with using statement (goes to sibling project in monorepo)
        // execute
        const refUri = await toReferenceUri(projectRoot, relUriFrom, relUriTo);
        // check
        expect(refUri).toBe('../../srv/admin');
    });
});

describe('Test getCdsFiles()', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    test('Get CDS files from project', async () => {
        // Mock setup
        const cdsMock = {
            load: jest.fn().mockResolvedValue({ '$sources': ['file1', 'file2'] }),
            resolve: jest.fn().mockImplementation((path) => [path]),
            env: jestMockEnv
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue(cdsMock);

        // Test execution
        const cdsFiles = await getCdsFiles('');

        // Check results
        expect(cdsFiles).toEqual(['file1', 'file2']);
        expect(cdsMock.load).toBeCalledWith(
            [join('MY_DB'), join('MY_SRV'), join('MY_APP'), 'schema', 'services'],
            expect.any(Object)
        );
    });

    test('Get CDS files from project, but no $sources', async () => {
        // Mock setup
        const cdsMock = {
            load: jest.fn().mockResolvedValue({}),
            resolve: jest.fn(),
            env: jestMockEnv
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue(cdsMock);

        // Test execution
        const cdsFiles = await getCdsFiles('');

        // Check results
        expect(cdsFiles).toEqual([]);
    });

    test('Get CDS files from project with envRoot and ignoreErrors false', async () => {
        // Mock setup
        const cdsMock = {
            load: jest.fn().mockImplementation(() => {
                throw Error('CDS_LOAD_ERROR');
            }),
            env: jestMockEnv
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue(cdsMock);

        // Test execution and result check
        try {
            await getCdsFiles('', false, 'envroot');
            fail('Call to getCdsFiles() should have thrown error but did not.');
        } catch (error) {
            expect(error.message).toContain('CDS_LOAD_ERROR');
        }
    });

    test('Get CDS files from project with envRoot and ignoreErrors true, but no model data in exception', async () => {
        // Mock setup
        const cdsMock = {
            load: jest.fn().mockImplementation(() => {
                throw Error();
            })
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue(cdsMock);

        // Test execution and result check
        try {
            await getCdsFiles('', true, 'envroot');
            fail('Call to getCdsFiles() should have thrown error but did not.');
        } catch (error) {
            expect(error.message).toContain('envroot');
        }
    });

    test('Get CDS files from project with envRoot and ignoreErrors true and partial model data in exception', async () => {
        // Mock setup
        const cdsMock = {
            load: jest.fn().mockImplementation(() => {
                const error = new Error() as Error & { model: { sources: { [s: string]: { filename: string } | {} } } };
                error.model = {
                    sources: { 'source1': { filename: 'file1' }, 'source2': {} }
                };
                throw error;
            }),
            env: jestMockEnv
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue(cdsMock);

        // Test execution
        const cdsFiles = await getCdsFiles('', true, 'envroot');

        // Check results
        expect(cdsFiles).toEqual([`${sep}file1`]);
        expect(cdsMock.load).toBeCalledWith('envroot', expect.any(Object));
    });

    test('Get CDS files from project with envRoot and ignoreErrors true and model data in exception', async () => {
        // Mock setup
        const cdsMock = {
            load: jest.fn().mockImplementation(() => {
                const error = new Error() as Error & { model: { sources: { [s: string]: { filename: string } } } };
                error.model = { sources: { 'source1': { filename: 'file1' }, 'source2': { filename: `${sep}file2` } } };
                throw error;
            }),
            env: jestMockEnv
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue(cdsMock);

        // Test execution
        const cdsFiles = await getCdsFiles('', true, 'envroot');

        // Check results
        expect(cdsFiles).toEqual([`${sep}file1`, `${sep}file2`]);
        expect(cdsMock.load).toBeCalledWith('envroot', expect.any(Object));
    });
});

describe('Test getCdsRoots()', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    test('Get cds roots', async () => {
        // Mock setup
        const cdsMock = {
            env: jestMockEnv,
            resolve: jest.fn().mockImplementation((path) => [path])
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue(cdsMock);

        // Test execution
        const cdsRoots = await getCdsRoots(join('/my/project/root'));

        // Check results
        expect(cdsRoots).toEqual([
            join('/my/project/root/MY_DB'),
            join('/my/project/root/MY_SRV'),
            join('/my/project/root/MY_APP'),
            join('/my/project/root/schema'),
            join('/my/project/root/services')
        ]);
        expect(cdsMock.resolve).toHaveBeenCalledTimes(5);
        expect(cdsMock.resolve).toHaveBeenLastCalledWith(join('/my/project/root/services'), { 'skipModelCache': true });
    });

    test('Get cds roots with clearing cache', async () => {
        // Mock setup
        const cdsMock = {
            env: jestMockEnv,
            resolve: Object.assign(
                jest
                    .fn()
                    .mockImplementationOnce(() => undefined)
                    .mockImplementation((path) => [path]),
                { cache: undefined }
            )
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue(cdsMock);

        // Test execution
        const cdsRoots = await getCdsRoots(join('/any/project'), true);

        // Check results
        expect(cdsRoots).toEqual([
            join('/any/project/MY_SRV'),
            join('/any/project/MY_APP'),
            join('/any/project/schema'),
            join('/any/project/services')
        ]);
        expect(cdsMock.resolve.cache).toEqual({});
    });
});

describe('Test getCdsServices()', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    test('Get services, cds replies with array', async () => {
        // Mock setup
        const cdsMock = {
            load: jest.fn().mockResolvedValue({
                services: [
                    { kind: 'service', '@path': '/service1' },
                    { kind: 'service', '@path': '/service2' }
                ]
            }),
            linked: jest.fn().mockImplementation((l) => l),
            resolve: jest.fn().mockImplementation((path) => [path]),
            env: jestMockEnv
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue(cdsMock);

        // Test execution
        const services = await getCdsServices('any/root');

        // Check results
        expect(services).toEqual([
            { kind: 'service', '@path': '/service1' },
            { kind: 'service', '@path': '/service2' }
        ]);
    });

    test('Get services, cds throws error with service as object, ignoreErrors is true', async () => {
        // Mock setup
        const cdsMock = {
            load: jest.fn().mockImplementation(() => {
                const error = new Error() as Error & {
                    model: { services: { [service: string]: { kind: string; '@path': string } } };
                };
                error.model = {
                    services: {
                        service1: { kind: 'service', '@path': '/service1' },
                        service2: { kind: 'service', '@path': '/service2' }
                    }
                };
                throw error;
            }),
            linked: jest.fn().mockImplementation((l) => l),
            resolve: jest.fn().mockImplementation((path) => [path]),
            env: jestMockEnv
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue(cdsMock);

        // Test execution
        const services = await getCdsServices('any/root');

        // Check results
        expect(services).toEqual([
            { kind: 'service', '@path': '/service1' },
            { kind: 'service', '@path': '/service2' }
        ]);
    });

    test('Get services, cds throws error with service as object, ignoreErrors is false', async () => {
        // Mock setup
        const cdsMock = {
            load: jest.fn().mockImplementation(() => {
                throw new Error('CDS_LOAD_ERROR');
            }),
            resolve: jest.fn().mockImplementation((path) => [path]),
            env: jestMockEnv
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockResolvedValue(cdsMock);

        // Test execution and result check
        try {
            await getCdsServices('any/root', false);
            fail('Call to getCdsServices() should have thrown an error but did not');
        } catch (error) {
            expect(error.toString()).toContain('CDS_LOAD_ERROR');
        }
    });
});

describe('clearCdsModuleCache', () => {
    const projectRoot = 'PROJECT_ROOT';
    test('Clear CDS cache', async () => {
        // Mock setup
        const cdsMock = {
            load: jest.fn().mockImplementation(() => Promise.resolve('MODEL')),
            resolve: {
                cache: {
                    'dummy': {
                        'cached': {
                            'dummyPath': 'dummyValue'
                        }
                    }
                }
            },
            env: jestMockEnv
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => Promise.resolve(cdsMock));

        // Test execution
        const result = await clearCdsModuleCache(projectRoot);

        // Check results
        expect(result).toEqual(true);
        expect(cdsMock.resolve.cache).toStrictEqual({});
    });

    test('Unresolvable cds module - error is thrown', async () => {
        // Mock setup
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => Promise.resolve(undefined));
        // Test execution
        const result = await clearCdsModuleCache(projectRoot);
        expect(result).toEqual(false);
    });

    test('Unresolvable cds module - error is not thrown', async () => {
        // Mock setup
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() =>
            Promise.resolve({ default: undefined })
        );
        // Test execution
        const result = await clearCdsModuleCache(projectRoot);
        expect(result).toEqual(false);
    });
});

describe('getCapServiceName', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        const cdsMock = {
            load: jest.fn().mockImplementation(() => Promise.resolve('MODEL')),
            compile: {
                to: {
                    serviceinfo: jest.fn().mockImplementation(() => [{ name: 'ServiceOne', urlPath: 'service/one' }])
                }
            },
            env: jestMockEnv
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => Promise.resolve(cdsMock));
    });

    test('Return service name', async () => {
        const capServiceName = await getCapServiceName('/some/test/path', 'service/one');
        expect(capServiceName).toEqual('ServiceOne');
    });

    test('Service not found error message', async () => {
        try {
            await getCapServiceName('/some/test/path', 'service/two');
        } catch (error) {
            expect(error.message).toBe(
                'Service for uri: \'service/two\' not found. Available services: [{"name":"ServiceOne","urlPath":"service/one"}]'
            );
        }
    });
});

describe('deleteCapApp', () => {
    let memFs: Editor;
    const capProject = join(__dirname, '../test-data/project/info/cap-project');
    let deleteSpy: jest.SpyInstance;
    let store: Store;
    const getDeletedFiles = (): string[] => {
        const deletedFiles: string[] = [];
        // Iterate over the store to find files marked for deletion
        store.each((file) => {
            if (file.state === 'deleted') {
                deletedFiles.push(file.path);
            }
        });
        return deletedFiles;
    };
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.requireActual('mem-fs-editor');
        store = createStorage();
        memFs = create(store);
        memFs.copy(capProject, capProject);
        deleteSpy = jest.spyOn(memFs, 'delete');
    });

    test('Delete app "one" from CAP', async () => {
        // Execute test
        await deleteCapApp(join(capProject, 'apps', 'one'), memFs);

        // Check result
        expect(memFs.exists(join(capProject, 'apps', 'one', 'package.json'))).toEqual(false);
        expect(memFs.exists(join(capProject, 'apps', 'two', 'package.json'))).toEqual(true);
        // Check deleted and not deleted folders
        expect(deleteSpy).toBeCalledWith(join(capProject, 'apps', 'one'));
        expect(deleteSpy).not.toBeCalledWith(join(capProject, 'apps', 'two'));
        expect(getDeletedFiles()).toEqual([
            join(capProject, 'apps', FileName.IndexCds),
            join(capProject, 'apps', 'one', 'annotations.cds'),
            join(capProject, 'apps', 'one', FileName.Package),
            join(capProject, 'apps', 'one', FileName.Ui5Yaml),
            join(capProject, 'apps', 'one', 'source', 'webapp', FileName.Manifest)
        ]);
        const modifiedPackage = await readJSON<Package>(join(capProject, FileName.Package), memFs);
        expect(modifiedPackage?.scripts?.['watch-one']).toBeUndefined();
        expect(modifiedPackage?.scripts?.['watch-two']).toBeDefined();
        expect(modifiedPackage.sapux).toEqual(['apps\\two']);
        const serviceCds = await readFile(join(capProject, 'apps', FileName.ServiceCds), memFs);
        expect(serviceCds.indexOf('one')).toBe(-1);
        expect(serviceCds.indexOf('two')).not.toBe(-1);
        expect(serviceCds.indexOf('freestyle')).not.toBe(-1);
        expect(memFs.exists(join(capProject, 'apps', FileName.IndexCds))).toBeFalsy();
    });

    test('Delete app "two" from CAP', async () => {
        // Execute test
        await deleteCapApp(join(capProject, 'apps', 'two'), memFs);

        // Check result
        expect(memFs.exists(join(capProject, 'apps', 'one', 'package.json'))).toEqual(true);
        expect(memFs.exists(join(capProject, 'apps', 'two', 'package.json'))).toEqual(false);
        // Check deleted and not deleted folders
        expect(deleteSpy).toBeCalledWith(join(capProject, 'apps', 'two'));
        expect(deleteSpy).not.toBeCalledWith(join(capProject, 'apps', 'one'));
        expect(getDeletedFiles()).toEqual([
            join(capProject, 'apps', 'two', 'annotations.cds'),
            join(capProject, 'apps', 'two', FileName.Package),
            join(capProject, 'apps', 'two', 'webapp', FileName.Manifest)
        ]);
        const modifiedPackage = await readJSON<Package>(join(capProject, FileName.Package), memFs);
        expect(modifiedPackage?.scripts?.['watch-two']).toBeUndefined();
        expect(modifiedPackage?.scripts?.['watch-one']).toBeDefined();
        expect(modifiedPackage.sapux).toEqual(['apps/one']);
        expect(memFs.exists(join(capProject, 'apps', FileName.ServiceCds))).toBeTruthy();
        expect(memFs.exists(join(capProject, 'apps', FileName.IndexCds))).toBeTruthy();
    });

    test('Delete app "freestyle" from CAP', async () => {
        // Execute test
        await deleteCapApp(join(capProject, 'apps', 'freestyle'), memFs);

        // Check result
        expect(memFs.exists(join(capProject, 'apps', 'one', 'package.json'))).toEqual(true);
        expect(memFs.exists(join(capProject, 'apps', 'two', 'package.json'))).toEqual(true);
        expect(memFs.exists(join(capProject, 'apps', 'freestyle', 'package.json'))).toEqual(false);
        // Check deleted and not deleted folders
        expect(deleteSpy).toBeCalledWith(join(capProject, 'apps', 'freestyle'));
        expect(deleteSpy).not.toBeCalledWith(join(capProject, 'apps', 'one'));
        expect(deleteSpy).not.toBeCalledWith(join(capProject, 'apps', 'two'));
    });

    test('Delete all CAP apps,', async () => {
        // Setup mock
        const logggerMock = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn()
        } as unknown as Logger;

        // Execute test
        await deleteCapApp(join(capProject, 'apps', 'one'), memFs, logggerMock);
        expect(logggerMock.info).toHaveBeenCalled();
        expect(logggerMock.error).toHaveBeenCalledTimes(0);
        await deleteCapApp(join(capProject, 'apps', 'two'), memFs, logggerMock);
        jest.spyOn(fs, 'readdir').mockResolvedValueOnce([]);
        await deleteCapApp(join(capProject, 'apps', 'freestyle'), memFs, logggerMock);

        // Check result
        expect(deleteSpy).toBeCalledWith(join(capProject, 'apps'));
        expect(deleteSpy).toBeCalledWith(join(capProject, 'apps', 'one'));
        expect(deleteSpy).toBeCalledWith(join(capProject, 'apps', 'two'));
        expect(deleteSpy).toBeCalledWith(join(capProject, 'apps', 'freestyle'));
        const modifiedPackage = await readJSON<Package>(join(capProject, FileName.Package), memFs);
        expect(modifiedPackage?.scripts?.['watch-one']).toBeUndefined();
        expect(modifiedPackage?.scripts?.['watch-two']).toBeUndefined();
        expect(modifiedPackage.sapux).toBeUndefined();
    });

    test('Delete app "one" from CAP without "sapux"', async () => {
        const packageJsonPath = join(capProject, FileName.Package);
        const packageJson = await readJSON<Partial<Package>>(packageJsonPath, memFs);
        delete packageJson.sapux;
        await memFs.writeJSON(packageJsonPath, packageJson);
        // Execute test
        await deleteCapApp(join(capProject, 'apps', 'one'), memFs);

        // Check result
        expect(deleteSpy).toBeCalledWith(join(capProject, 'apps', 'one'));
        expect(deleteSpy).not.toBeCalledWith(join(capProject, 'apps', 'two'));
        const modifiedPackage = await readJSON<Package>(join(capProject, FileName.Package), memFs);
        expect(modifiedPackage?.scripts?.['watch-one']).toBeUndefined();
        expect(modifiedPackage?.scripts?.['watch-two']).toBeDefined();
        const serviceCds = await readFile(join(capProject, 'apps', FileName.ServiceCds), memFs);
        expect(serviceCds.indexOf('one')).toBe(-1);
        expect(serviceCds.indexOf('two')).not.toBe(-1);
        expect(memFs.exists(join(capProject, 'apps', FileName.IndexCds))).toBeFalsy();
    });

    test('No project root found', async () => {
        // Setup mock
        const logggerMock = {
            error: jest.fn(),
            warning: jest.fn(),
            info: jest.fn(),
            debug: jest.fn()
        } as unknown as Logger;
        jest.spyOn(search, 'findCapProjectRoot').mockResolvedValueOnce('');

        // Execute test
        await expect(
            async () => await deleteCapApp(join(capProject, 'apps', 'one'), memFs, logggerMock)
        ).rejects.toThrowError(/Project root was not found for CAP application/);
        expect(logggerMock.error).toBeCalled();
    });

    test('Delete app "one" from CAP, no services.cds, no index.cds', async () => {
        // Setup mock
        const logggerMock = {
            error: jest.fn(),
            warning: jest.fn(),
            info: jest.fn(),
            debug: jest.fn()
        } as unknown as Logger;
        await deleteFile(join(capProject, 'apps', FileName.ServiceCds), memFs);
        await deleteFile(join(capProject, 'apps', FileName.IndexCds), memFs);

        // Execute test
        await deleteCapApp(join(capProject, 'apps', 'one'), memFs, logggerMock);

        // Check result
        expect(logggerMock.info).toBeCalled();
        expect(deleteSpy).toBeCalledWith(join(capProject, 'apps', 'one'));
        expect(deleteSpy).not.toBeCalledWith(join(capProject, 'apps', 'two'));
        expect(deleteSpy).not.toBeCalledWith(join(capProject, 'apps', 'freestyle'));
        const modifiedPackage = await readJSON<Package>(join(capProject, FileName.Package), memFs);
        expect(modifiedPackage?.scripts?.['watch-one']).toBeUndefined();
        expect(modifiedPackage?.scripts?.['watch-two']).toBeDefined();
        expect(modifiedPackage.sapux).toEqual(['apps\\two']);
    });

    test('Delete app "one" from CAP - simulate cds file deletion failure', async () => {
        // Setup mock
        const logggerMock = {
            error: jest.fn(),
            warning: jest.fn(),
            info: jest.fn(),
            debug: jest.fn()
        } as unknown as Logger;
        // Simulate error while deleting cds file
        jest.spyOn(memFs, 'delete').mockImplementation((path: unknown) => {
            if (path === join(capProject, 'apps', FileName.IndexCds)) {
                throw new Error('aaaa');
            }
        });

        // Execute test
        await deleteCapApp(join(capProject, 'apps', 'one'), memFs, logggerMock);

        // Check result
        expect(deleteSpy).toBeCalledWith(join(capProject, 'apps', 'one'));
        expect(deleteSpy).not.toBeCalledWith(join(capProject, 'apps', 'two'));
        expect(deleteSpy).not.toBeCalledWith(join(capProject, 'apps', 'freestyle'));
        const modifiedPackage = await readJSON<Package>(join(capProject, FileName.Package), memFs);
        expect(modifiedPackage?.scripts?.['watch-one']).toBeUndefined();
        expect(modifiedPackage?.scripts?.['watch-two']).toBeDefined();
        expect(modifiedPackage.sapux).toEqual(['apps\\two']);
        const serviceCds = await readFile(join(capProject, 'apps', FileName.ServiceCds), memFs);
        expect(serviceCds.indexOf('one')).toBe(-1);
        expect(serviceCds.indexOf('two')).not.toBe(-1);
        // Deletion failed because of mock
        expect(memFs.exists(join(capProject, 'apps', FileName.IndexCds))).toBeTruthy();
        // Check error log
        expect(logggerMock.error).toBeCalledWith(
            `Could not modify file '${join(capProject, 'apps', FileName.IndexCds)}'. Skipping this file.`
        );
    });
});

function fail(message: string) {
    expect(message).toBeFalsy();
}

function getChildProcessMock(data: any, throwError = false): childProcess.ChildProcess {
    return {
        stdout: {
            on: (type: 'data', cb: (chunk: any) => void) => {
                if (type === 'data') {
                    cb(data);
                }
            }
        },
        on: (type: 'close' | 'error', cb: (error?: string) => void) => {
            if (type === 'close') {
                cb();
            }
            if (type === 'error' && throwError) {
                cb('ERROR');
            }
        }
    } as childProcess.ChildProcess;
}
