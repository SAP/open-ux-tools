import { jest } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type * as fsMock from 'node:fs';
import type * as promisesMock from 'node:fs/promises';
import type * as commandType from '../../src/command/npm-command';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock constants before importing getModule() to mock the module cache path
const moduleCacheRoot = join(__dirname, '../test-data/module-loader');
const moduleParentPath = join(moduleCacheRoot, '@scope/module');
const modulePath = join(moduleParentPath, '1.2.3');

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

// Mock node:url module
const realUrl = await import('node:url');
const mockPathToFileURL = jest.fn<typeof realUrl.pathToFileURL>(realUrl.pathToFileURL);
jest.unstable_mockModule('node:url', () => ({
    ...realUrl,
    default: {
        ...realUrl.default,
        pathToFileURL: mockPathToFileURL
    },
    pathToFileURL: mockPathToFileURL
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

// Mock proper-lockfile so tests exercise acquireModuleLock without depending on the real fs lock.
// Without this mock, properLockfile.lock(<test fixture path>) either succeeds against the real fs
// or throws and is silently swallowed by the catch in acquireModuleLock — so the locking branch
// wouldn't be exercised at all.
const mockReleaseLock = jest.fn<() => Promise<void>>().mockResolvedValue();
const mockProperLockfileLock = jest.fn().mockResolvedValue(mockReleaseLock);
jest.unstable_mockModule('proper-lockfile', () => ({
    default: { lock: mockProperLockfileLock },
    lock: mockProperLockfileLock
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
        expect(mockPathToFileURL).toHaveBeenCalledTimes(1);
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
        // jest.clearAllMocks() resets the call history but does NOT clear implementations set
        // with mockImplementation in earlier tests. Reset pathToFileURL to its default delegating
        // implementation so per-test mockImplementation overrides start from a clean slate.
        mockPathToFileURL.mockImplementation(realUrl.pathToFileURL);
        // Re-prime proper-lockfile (clearAllMocks resets implementations on auto-mocked fns).
        mockReleaseLock.mockResolvedValue();
        mockProperLockfileLock.mockResolvedValue(mockReleaseLock);
    });

    test('Module exists', async () => {
        const module = await getModule<Module>('@scope/module', '1.2.3');
        expect(module.exec()).toBe('works');
        // Lock is acquired on the version directory (modulePath), not the parent. proper-lockfile
        // stores the lock as a sibling file so rm(modulePath) during reinstall does not orphan it.
        expect(mockProperLockfileLock).toHaveBeenCalledTimes(1);
        expect(mockProperLockfileLock.mock.calls[0]?.[0]).toBe(modulePath);
        expect(mockReleaseLock).toHaveBeenCalledTimes(1);
    });

    test('Module does not exists, triggers npm install (mocked)', async () => {
        // existsSync call order:
        //   1. existsSync(moduleDirectory)  → moduleDirectoryExisted check (false: dir is new)
        //   2. existsSync(modulePackagePath) → double-check inside lock (false: not yet installed)
        mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(false);
        mockMkdir.mockResolvedValueOnce('');
        mockExecNpmCommand.mockResolvedValueOnce('');

        // Test execution
        const logger = new ToolsLogger();
        const module = await getModule<Module>('@scope/module', '1.2.3', { logger });

        // Result check
        expect(module.exec()).toBe('works');
        // rm should NOT be called since moduleDirectoryExisted was false
        expect(mockRm).not.toHaveBeenCalled();
        expect(mockMkdir).toHaveBeenCalledWith(modulePath, { recursive: true });
        expect(mockExecNpmCommand).toHaveBeenCalledWith(['install', '--prefix', modulePath, '@scope/module@1.2.3'], {
            'cwd': modulePath,
            logger
        });
        expect(mockReleaseLock).toHaveBeenCalledTimes(1);
    });

    test('Module does not exists but directory existed, triggers rm + npm install (mocked)', async () => {
        // existsSync call order:
        //   1. existsSync(moduleDirectory)  → moduleDirectoryExisted check (true: stale/corrupt dir)
        //   2. existsSync(modulePackagePath) → double-check inside lock (false: not yet installed)
        mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
        mockRm.mockResolvedValueOnce();
        mockMkdir.mockResolvedValueOnce('').mockResolvedValueOnce('');
        mockExecNpmCommand.mockResolvedValueOnce('');

        const logger = new ToolsLogger();
        const module = await getModule<Module>('@scope/module', '1.2.3', { logger });

        expect(module.exec()).toBe('works');
        expect(mockRm).toHaveBeenCalledWith(modulePath, { recursive: true });
        expect(mockMkdir).toHaveBeenCalledWith(modulePath, { recursive: true });
        expect(mockExecNpmCommand).toHaveBeenCalledWith(['install', '--prefix', modulePath, '@scope/module@1.2.3'], {
            'cwd': modulePath,
            logger
        });
        expect(mockReleaseLock).toHaveBeenCalledTimes(1);
    });

    test('Double-check: another process installed while waiting for lock, skips npm install', async () => {
        // existsSync call order:
        //   1. existsSync(moduleDirectory)  → moduleDirectoryExisted (false)
        //   2. existsSync(modulePackagePath) → double-check inside lock (true: already installed)
        mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);

        const module = await getModule<Module>('@scope/module', '1.2.3');

        expect(module.exec()).toBe('works');
        expect(mockExecNpmCommand).not.toHaveBeenCalled();
        expect(mockReleaseLock).toHaveBeenCalledTimes(1);
    });

    test('Module failed to load and there no "package-lock.json" -> run "npm i"', async () => {
        // existsSync call order:
        //   1. existsSync(moduleDirectory)  → moduleDirectoryExisted (true)
        //   2. existsSync(modulePackagePath) → double-check (true: skip install, proceed to load)
        //   3. existsSync inside getNodeModulesPath throws → simulate load failure
        //   4. existsSync(modulePackageLockPath) → false → use installCommand
        mockExecNpmCommand.mockResolvedValueOnce('');
        mockExistsSync
            .mockReturnValueOnce(true) // moduleDirectoryExisted
            .mockReturnValueOnce(true) // double-check modulePackagePath → skip install
            .mockImplementationOnce(() => {
                throw new Error('Simulate load failure');
            })
            .mockReturnValueOnce(false); // modulePackageLockPath check
        const logger = new ToolsLogger();
        const module = await getModule<Module>('@scope/module', '1.2.3', { logger });

        expect(module.exec()).toBe('works');
        expect(mockExecNpmCommand).toHaveBeenCalledWith(['install', '--prefix', modulePath, '@scope/module@1.2.3'], {
            'cwd': modulePath,
            logger
        });
    });

    test('Module failed to load and there is "package-lock.json" -> run "npm ci"', async () => {
        // existsSync call order:
        //   1. existsSync(moduleDirectory)  → moduleDirectoryExisted (true)
        //   2. existsSync(modulePackagePath) → double-check (true: skip install, proceed to load)
        //   3. existsSync inside getNodeModulesPath throws → simulate load failure
        //   4. existsSync(modulePackageLockPath) → true → use 'npm ci'
        mockExecNpmCommand.mockResolvedValueOnce('');
        mockExistsSync
            .mockReturnValueOnce(true) // moduleDirectoryExisted
            .mockReturnValueOnce(true) // double-check modulePackagePath → skip install
            .mockImplementationOnce(() => {
                throw new Error('Simulate load failure');
            })
            .mockReturnValueOnce(true); // modulePackageLockPath → use 'npm ci'
        const logger = new ToolsLogger();
        const module = await getModule<Module>('@scope/module', '1.2.3', { logger });

        expect(module.exec()).toBe('works');
        expect(mockExecNpmCommand).toHaveBeenCalledWith(['ci'], {
            'cwd': modulePath,
            logger
        });
    });

    test('Retry path re-imports the module via loadModuleFromProject after the first load fails', async () => {
        // Force the first load attempt to fail by throwing inside existsSync (consumed by
        // getNodeModulesPath inside loadModuleFromProject). The retry path then re-runs install
        // and calls loadModuleFromProject again *with* the cacheBuster option — observable via
        // pathToFileURL being invoked a second time on the recovery attempt.
        //
        // existsSync call order:
        //   1. existsSync(moduleDirectory)  → moduleDirectoryExisted (true)
        //   2. existsSync(modulePackagePath) → double-check (true: skip install, proceed to load)
        //   3. existsSync inside getNodeModulesPath throws → simulate first load failure
        //   4. existsSync(modulePackageLockPath) → false → installCommand on retry
        mockExecNpmCommand.mockResolvedValueOnce('');
        mockExistsSync
            .mockReturnValueOnce(true) // moduleDirectoryExisted
            .mockReturnValueOnce(true) // double-check modulePackagePath → skip install
            .mockImplementationOnce(() => {
                throw new Error('Simulate first load failure');
            })
            .mockReturnValueOnce(false); // existsSync(modulePackageLockPath) → installCommand on retry

        await getModule<Module>('@scope/module', '1.2.3');

        // Retry must have invoked loadModuleFromProject again — observed via pathToFileURL being
        // called on the second attempt (the first attempt threw before reaching pathToFileURL).
        expect(mockPathToFileURL).toHaveBeenCalledTimes(1);
        expect(mockExecNpmCommand).toHaveBeenCalledWith(['install', '--prefix', modulePath, '@scope/module@1.2.3'], {
            cwd: modulePath,
            logger: undefined
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
