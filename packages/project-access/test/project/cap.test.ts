import { join } from 'path';
import * as projectModuleMock from '../../src/project/module-loader';
import type { Package } from '../../src';
import { FileName } from '../../src/constants';
import {
    getCapCustomPaths,
    getCapEnvironment,
    isCapNodeJsProject,
    isCapJavaProject,
    getCapModelAndServices,
    getCapProjectType,
    readCapServiceMetadataEdmx
} from '../../src';
import { toReferenceUri } from '../../src/project/cap';
import * as file from '../../src/file';
import os from 'os';

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

    test('cds v7 exports', async () => {
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
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() => {
            return Promise.resolve({
                default: cdsMock
            });
        });
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
        }
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

describe('Test getCapEnvironment', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('without default property', async () => {
        const forSpy = jest.fn();
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
        const forSpy = jest.fn();
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
