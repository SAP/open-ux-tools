import { join } from 'path';
import * as projectModuleMock from '../../src/project/module-loader';
import type { Package } from '../../src';
import { FileName } from '../../src/constants';
import { isCapNodeJsProject, isCapJavaProject, getCapModelAndServices, getCapProjectType } from '../../src';
import { getCapCustomPaths } from '../../src/project/cap';
import { readJSON } from '../../src/file';

describe('Test getCapProjectType()', () => {
    test('Test if valid CAP Node.js project is recognized', async () => {
        expect(
            await getCapProjectType(
                join(__dirname, '..', 'test-data', 'project', 'find-all-apps', 'CAP', 'CAPnode_mix')
            )
        ).toBe('CAPNodejs');
    });

    test('Test if valid CAP Java project is recognized', async () => {
        expect(
            await getCapProjectType(
                join(__dirname, '..', 'test-data', 'project', 'find-all-apps', 'CAP', 'CAPJava_mix')
            )
        ).toBe('CAPJava');
    });

    test('Test if invalid CAP project is recognized', async () => {
        expect(await getCapProjectType('INVALID_PROJECT')).toBeUndefined();
    });
});

describe('Test isCapNodeJsProject()', () => {
    test('Test if valid CAP node.js project is recognized', async () => {
        const packageJson = await readJSON<Package>(
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
    });

    test('Get valid model and services, mock cds with local cds from devDependencies', async () => {
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
            load: jest.fn().mockImplementation(() => Promise.resolve('MODEL')),
            compile: { to: { serviceinfo: jest.fn().mockImplementation(() => 'SERVICES') } }
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => Promise.resolve(cdsMock));

        // Test execution
        const capMS = await getCapModelAndServices('PROJECT_ROOT');

        // Check results
        expect(capMS).toEqual({ model: 'MODEL', services: 'SERVICES' });
        expect(cdsMock.load).toBeCalledWith([
            join('PROJECT_ROOT', 'APP'),
            join('PROJECT_ROOT', 'SRV'),
            join('PROJECT_ROOT', 'DB')
        ]);
        expect(cdsMock.compile.to.serviceinfo).toBeCalledWith('MODEL', { root: 'PROJECT_ROOT' });
    });
});

describe('Test getCapCustomPaths()', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Test custom CAP folders', async () => {
        // Mock setup
        const cdsMock = {
            env: {
                'for': jest
                    .fn()
                    .mockImplementation(() => ({ folders: { app: 'CUSTOM_APP', db: 'CUSTOM_DB', srv: 'CUSTOM_SRV' } }))
            }
        };
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => Promise.resolve(cdsMock));

        // Test execution
        const path = await getCapCustomPaths('PROJECT_ROOT');

        // Check results
        expect(path).toEqual({
            app: 'CUSTOM_APP',
            db: 'CUSTOM_DB',
            srv: 'CUSTOM_SRV'
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
