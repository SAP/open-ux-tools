import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirname = dirname(fileURLToPath(import.meta.url));

const mockSpawn = jest.fn();

jest.unstable_mockModule('promisify-child-process', () => ({
    spawn: mockSpawn
}));

const { getDestinationProjectRoot } = await import('../../../src/project/project.js');
const { copyProject } = await import('../../../src/project/copy.js');
const { install } = await import('../../../src/project/npm.js');
type CopyOptions = import('../../../src/types.js').CopyOptions;

const projectRoot = join(testDirname, '..', '..', 'fixtures', 'simple-app');
const des = getDestinationProjectRoot(projectRoot);

describe('install', () => {
    beforeAll(async () => {
        // first create project copy
        const options: CopyOptions = {
            projectRoot,
            remove: {
                content: true,
                nodeModules: true
            },
            npmI: false
        };
        await copyProject(options);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    test('successful', async () => {
        mockSpawn.mockResolvedValue('success');
        await install(des);
        expect(mockSpawn.mock.calls).toHaveLength(2);
        expect(mockSpawn.mock.calls[0][0]).toStrictEqual('npm');
        expect(mockSpawn.mock.calls[0][1]).toStrictEqual(['install', '--ignore-engines', '--force']);
        expect(mockSpawn.mock.calls[1][0]).toStrictEqual('npm');
        expect(mockSpawn.mock.calls[1][1]).toStrictEqual(['list', '--depth=0']);
    });
    test('fails', async () => {
        mockSpawn.mockResolvedValue({ code: 1, stderr: { toString: () => 'error' } });
        await expect(install(des)).rejects.toThrow('error');
        expect(mockSpawn.mock.calls).toHaveLength(1);
    });
});
