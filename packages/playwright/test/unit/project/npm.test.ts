import { join } from 'node:path';
import { copyProject, getDestinationProjectRoot } from '../../../src';
import type { CopyOptions } from '../../../src';
import { install } from '../../../src/project/npm';
import * as childProcess from 'promisify-child-process';

jest.mock('promisify-child-process');
const childProcessMock = jest.mocked(childProcess, { shallow: true });

const projectRoot = join(__dirname, '..', '..', 'fixtures', 'simple-app');
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
        const spawnSyncMocked = jest.spyOn(childProcessMock, 'spawn').mockResolvedValue('success');
        await install(des);
        expect(spawnSyncMocked.mock.calls).toHaveLength(2);
        expect(spawnSyncMocked.mock.calls[0][0]).toStrictEqual('npm');
        expect(spawnSyncMocked.mock.calls[0][1]).toStrictEqual(['install', '--ignore-engines', '--force']);
        expect(spawnSyncMocked.mock.calls[1][0]).toStrictEqual('npm');
        expect(spawnSyncMocked.mock.calls[1][1]).toStrictEqual(['list', '--depth=0']);
    });
    test('fails', async () => {
        const spawnSyncMocked = jest
            .spyOn(childProcessMock, 'spawn')
            .mockReturnValue({ code: 1, stderr: { toString: () => 'error' } });
        await expect(install(des)).rejects.toThrow('error');
        expect(spawnSyncMocked.mock.calls).toHaveLength(1);
    });
});
