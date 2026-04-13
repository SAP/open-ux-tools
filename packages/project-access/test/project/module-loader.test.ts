import { jest } from '@jest/globals';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type * as fsMock from 'node:fs';
import type * as promisesMock from 'node:fs/promises';
import type * as commandType from '../../src/command/npm-command';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// Mock constants before importing getModule() to mock the module cache path
const moduleCacheRoot = join(__dirname, '../test-data/module-loader');
const modulePath = join(moduleCacheRoot, '@scope/module/1.2.3');

const realConstants = await import('../../src/constants');
jest.unstable_mockModule('../../src/constants', () => ({
    ...realConstants,
    moduleCacheRoot
}));

const mockExecNpmCommand = jest.fn<typeof commandType.execNpmCommand>();
const realCommand = await import('../../src/command/npm-command');
jest.unstable_mockModule('../../src/command/npm-command', () => ({
    ...realCommand,
    execNpmCommand: mockExecNpmCommand
}));

// Mock fs module
const realFs = await import('node:fs');
const mockExistsSync = jest.fn<typeof fsMock.existsSync>(realFs.existsSync);
jest.unstable_mockModule('node:fs', () => ({
    ...realFs,
    default: {
        ...realFs.default,
        existsSync: mockExistsSync,
        promises: realFs.default.promises
    },
    existsSync: mockExistsSync
}));

// Mock fs/promises module
const realFsPromises = await import('node:fs/promises');
const mockRm = jest.fn<typeof promisesMock.rm>(realFsPromises.rm);
const mockMkdir = jest.fn<typeof promisesMock.mkdir>(realFsPromises.mkdir);
const mockWriteFilePromise = jest.fn<typeof promisesMock.writeFile>(realFsPromises.writeFile);
jest.unstable_mockModule('node:fs/promises', () => ({
    ...realFsPromises,
    default: {
        ...realFsPromises,
        rm: mockRm,
        mkdir: mockMkdir,
        writeFile: mockWriteFilePromise
    },
    rm: mockRm,
    mkdir: mockMkdir,
    writeFile: mockWriteFilePromise
}));

const { FileName, loadModuleFromProject } = await import('../../src');
const { deleteModule, getModule } = await import('../../src/project/module-loader');
const { ToolsLogger } = await import('@sap-ux/logger');

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
        mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);
        mockRm.mockResolvedValueOnce();
        mockMkdir.mockResolvedValueOnce('');
        mockExecNpmCommand.mockResolvedValueOnce('');

        // Test execution
        const logger = new ToolsLogger();
        const module = await getModule<Module>('@scope/module', '1.2.3', { logger });

        // Result check
        expect(module.exec()).toBe('works');
        expect(mockRm).toHaveBeenCalledWith(modulePath, { recursive: true });
        expect(mockMkdir).toHaveBeenCalledWith(modulePath, { recursive: true });
        expect(mockExecNpmCommand).toHaveBeenCalledWith(['install', '--prefix', modulePath, '@scope/module@1.2.3'], {
            'cwd': modulePath,
            logger
        });
    });

    test('Module failed to load and there no "package-lock.json" -> run "npm i"', async () => {
        mockExecNpmCommand.mockResolvedValueOnce('');
        mockExistsSync.mockReturnValueOnce(true).mockImplementationOnce(() => {
            throw new Error('Simulate load failure');
        });
        const logger = new ToolsLogger();
        const module = await getModule<Module>('@scope/module', '1.2.3', { logger });

        expect(module.exec()).toBe('works');
        expect(mockExecNpmCommand).toHaveBeenCalledWith(['install', '--prefix', modulePath, '@scope/module@1.2.3'], {
            'cwd': modulePath,
            logger
        });
    });

    test('Module failed to load and there is "package-lock.json" -> run "npm ci"', async () => {
        mockExecNpmCommand.mockResolvedValueOnce('');
        mockExistsSync
            .mockReturnValueOnce(true)
            .mockImplementationOnce(() => {
                throw new Error('Simulate load failure');
            })
            .mockReturnValueOnce(true);
        const logger = new ToolsLogger();
        const module = await getModule<Module>('@scope/module', '1.2.3', { logger });

        expect(module.exec()).toBe('works');
        expect(mockExecNpmCommand).toHaveBeenCalledWith(['ci'], {
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
        mockRm.mockResolvedValueOnce();

        // Test execution
        await deleteModule('@scope/module', '1.2.3');

        // Result check
        expect(mockRm).toHaveBeenCalledWith(modulePath, { recursive: true });
    });

    test('Delete non existing module (mocked)', async () => {
        // Mock setup
        mockRm.mockResolvedValueOnce();

        // Test execution
        await deleteModule('@scope/module', '1.2.4');

        // Result check
        expect(mockRm).not.toHaveBeenCalled();
    });
});

function fail(message: string) {
    expect(message).toBeFalsy();
}
