import { join } from 'path';
import * as fsMock from 'fs';
import * as promisesMock from 'fs/promises';
// Needs to be done before importing getModule() to mock the module cache path
const moduleCacheRoot = join(__dirname, '../test-data/module-loader');
const modulePath = join(moduleCacheRoot, '@scope/module/1.2.3');
jest.doMock('../../src/constants', () => ({
    ...(jest.requireActual('../../src/constants') as {}),
    moduleCacheRoot
}));
import { FileName, loadModuleFromProject } from '../../src';
import { deleteModule, getModule } from '../../src/project/module-loader';
import * as commandMock from '../../src/command/npm-command';
import { ToolsLogger } from '@sap-ux/logger';

jest.mock('fs', () => {
    const actual = jest.requireActual<typeof fsMock>('fs');
    return { ...actual, existsSync: jest.fn().mockImplementation(actual.existsSync) };
});

jest.mock('fs/promises', () => {
    const actual = jest.requireActual<typeof fsMock>('fs');
    return {
        ...actual,
        rm: jest.fn().mockImplementation(actual.rm),
        mkdir: jest.fn().mockImplementation(actual.mkdir),
        writeFile: jest.fn().mockImplementation(actual.writeFile)
    };
});

describe('Test loadModuleFromProject()', () => {
    test('Load module', async () => {
        const projectModule = await loadModuleFromProject<{ FileName: {} }>(
            join(__dirname, '..'),
            '@sap-ux/ui5-config'
        );
        expect(typeof projectModule).toEqual('object');
    });

    test('Module not install in project, should throw error', async () => {
        try {
            await loadModuleFromProject('NONE/EXISTING_PATH', 'not-existing-node-module');
            fail(`Call to function loadModuleFromProject() should have thrown exception but did not.`);
        } catch (error) {
            expect(error.toString()).toContain('not-existing-node-module');
        }
    });
});

describe('Test getModule()', () => {
    type Module = { exec: () => string };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    test('Module exists', async () => {
        const module = await getModule<Module>('@scope/module', '1.2.3');
        expect(module.exec()).toBe('works');
    });

    test('Module does not exists, triggers npm install (mocked)', async () => {
        // Mock setup
        jest.spyOn(fsMock, 'existsSync').mockReturnValueOnce(false).mockReturnValueOnce(true);
        const rmSpy = jest.spyOn(promisesMock, 'rm').mockResolvedValueOnce();
        const mkdirSpy = jest.spyOn(promisesMock, 'mkdir').mockResolvedValueOnce('');
        const npmCommandSpy = jest.spyOn(commandMock, 'execNpmCommand').mockResolvedValueOnce('');

        // Test execution
        const logger = new ToolsLogger();
        const module = await getModule<Module>('@scope/module', '1.2.3', { logger });

        // Result check
        expect(module.exec()).toBe('works');
        expect(rmSpy).toBeCalledWith(modulePath, { recursive: true });
        expect(mkdirSpy).toBeCalledWith(modulePath, { recursive: true });
        expect(npmCommandSpy).toBeCalledWith(['install', '--prefix', modulePath, '@scope/module@1.2.3'], {
            'cwd': modulePath,
            logger
        });
    });
});

describe('Test deleteModule()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    test('Delete existing module (mocked)', async () => {
        // Mock setup
        const rmSpy = jest.spyOn(promisesMock, 'rm').mockResolvedValueOnce();

        // Test execution
        await deleteModule('@scope/module', '1.2.3');

        // Result check
        expect(rmSpy).toBeCalledWith(modulePath, { recursive: true });
    });

    test('Delete non existing module (mocked)', async () => {
        // Mock setup
        const rmSpy = jest.spyOn(promisesMock, 'rm').mockResolvedValueOnce();

        // Test execution
        await deleteModule('@scope/module', '1.2.4');

        // Result check
        expect(rmSpy).not.toBeCalled();
    });
});
