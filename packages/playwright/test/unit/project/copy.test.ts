import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathExists, remove } from 'fs-extra';
import { jest } from '@jest/globals';

const testDirname = dirname(fileURLToPath(import.meta.url));

const mockRemoveProjectContent = jest.fn<() => Promise<void>>();
const mockRemoveNodeModules = jest.fn<() => Promise<void>>();
const mockInstall = jest.fn<() => Promise<void>>();

// Inline getDestinationProjectRoot to avoid importing the real module inside the mock factory
const getDestinationProjectRoot = (sourceProjectRoot: string): string => {
    const projectName = sourceProjectRoot.split(sep).pop() ?? 'unknown';
    return join(process.cwd(), 'test', 'fixtures-copy', projectName);
};

jest.unstable_mockModule('../../../src/project/project.js', () => ({
    removeProjectContent: mockRemoveProjectContent,
    removeNodeModules: mockRemoveNodeModules,
    getDestinationProjectRoot
}));

jest.unstable_mockModule('../../../src/project/npm.js', () => ({
    install: mockInstall
}));

const { copyProject } = await import('../../../src/project/copy.js');
type CopyOptions = import('../../../src/types.js').CopyOptions;

const projectRoot = join(testDirname, '..', '..', 'fixtures', 'simple-app');
const des = getDestinationProjectRoot(projectRoot);

describe('copyProject', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test('createCopy', async () => {
        // remove to ensure consistency
        await remove(des);

        const options: CopyOptions = {
            projectRoot,
            remove: {
                content: false,
                nodeModules: false
            },
            npmI: false
        };
        await copyProject(options);
        await expect(pathExists(des)).resolves.toBe(true);
    });
    test('removeProjectContent', async () => {
        mockRemoveProjectContent.mockResolvedValue();
        const options: CopyOptions = {
            projectRoot,
            remove: {
                content: true
            },
            npmI: false
        };
        await copyProject(options);
        expect(mockRemoveProjectContent.mock.calls).toHaveLength(1);
    });
    test('removeNodeModules', async () => {
        mockRemoveNodeModules.mockResolvedValue();
        const options: CopyOptions = {
            projectRoot,
            remove: {
                content: false,
                nodeModules: true
            },
            npmI: false
        };
        await copyProject(options);
        expect(mockRemoveNodeModules.mock.calls).toHaveLength(1);
    });
    test('cb', async () => {
        const cbFn = jest.fn().mockResolvedValue(undefined);
        const options: CopyOptions = {
            projectRoot,
            remove: {
                content: false,
                nodeModules: false
            },
            cb: cbFn,
            npmI: false
        };
        await copyProject(options);
        expect(cbFn.mock.calls).toHaveLength(1);
    });
    test('npmI', async () => {
        mockInstall.mockResolvedValue();
        const options: CopyOptions = {
            projectRoot,
            remove: {
                content: false,
                nodeModules: true
            },
            npmI: true
        };
        await copyProject(options);
        expect(mockInstall.mock.calls).toHaveLength(1);
    });
});
