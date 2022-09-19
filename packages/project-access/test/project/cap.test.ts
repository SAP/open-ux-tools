import { join } from 'path';
import { default as localDevDepCds } from '@sap/cds';
import * as projectModuleMock from '../../src/project/moduleLoader';
import {
    getCapModelAndServices,
    getCapCustomPaths,
    isCapProject,
    isCapNodeJsProject,
    isCapJavaProject
} from '../../src/project/cap';

describe('Test isCapProject()', () => {
    test('Test if valid CAP project is recognized', async () => {
        expect(
            await isCapProject(join(__dirname, '..', 'test-data', 'project', 'find-all-apps', 'CAP', 'CAPnode_mix'))
        ).toBeTruthy();
    });

    test('Test if invalid CAP project is recognized', async () => {
        expect(await isCapProject('INVALID_PROJECT')).toBeFalsy();
    });
});

describe('Test isCapNodeJsProject()', () => {
    test('Test if valid CAP node.js project is recognized', async () => {
        expect(
            await isCapNodeJsProject(
                join(__dirname, '..', 'test-data', 'project', 'find-all-apps', 'CAP', 'CAPnode_mix')
            )
        ).toBeTruthy();
    });

    test('Test if invalid CAP node.js project is recognized', async () => {
        expect(
            await isCapNodeJsProject(
                join(__dirname, '..', 'test-data', 'project', 'find-all-apps', 'CAP', 'CAPJava_mix')
            )
        ).toBeFalsy();
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
        const projectRoot = join(__dirname, '..', 'test-data', 'project', 'cap', 'fe-garage-demo');

        // Mock setup
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(() =>
            Promise.resolve(localDevDepCds)
        );

        // Test execution
        const capMS = await getCapModelAndServices(projectRoot);

        // Check results
        expect(capMS.services.find((s) => s.name === 'IncidentService')).toBeDefined();
        expect(capMS.model).toBeDefined();
    });
});

describe('Test getCapCustomPaths()', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Get env from project', async () => {
        // Mock setup
        jest.spyOn(projectModuleMock, 'loadModuleFromProject').mockImplementation(
            (projectRoot: string, moduleName: string) =>
                Promise.resolve(moduleName === '@sap/cds' ? localDevDepCds : {})
        );

        // Test execution
        const path = await getCapCustomPaths(
            join(__dirname, '..', 'test-data', 'project', 'find-all-apps', 'CAP', 'CAPnode_freestyle')
        );

        // Check results
        expect(path).toEqual({ app: 'any/folder/app', db: 'db/', srv: 'srv/' });
    });
});
