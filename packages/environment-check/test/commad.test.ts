// import { spawnCommand } from '../src/command';
// import { spawn } from 'child_process';

// jest.mock('child_process', () => ({
//     spawn: jest.fn()
// }));
// const mockSpawn = spawn as jest.Mock;
// describe('Test command functions', () => {
//     beforeEach(() => {
//         jest.resetAllMocks();
//     });

//     test('spawnCommand', async () => {
//         mockSpawn.mockImplementationOnce(() => {
//             return 'some/path/lib';
//         });
//         const output = await spawnCommand('npm', ['root', '-g']);

//     });
// });

import { spawnCommand } from '../src/command';
import * as cp from 'child_process';

jest.mock('child_process');
const mockedCp = jest.mocked(cp, true);

describe('Test commandRunner functions', () => {
    jest.setTimeout(10000);

    it('Fails to spawn with error', async () => {
        mockedCp.spawn.mockImplementation((): any => {
            return {
                stdout: {
                    on: jest.fn(),
                    setEncoding: jest.fn()
                },
                stderr: {
                    on: jest.fn(),
                    setEncoding: jest.fn()
                },
                on: jest.fn().mockImplementation((event, cb) => {
                    if (event === 'error') {
                        cb(new Error('spawn ENOENT'));
                    }
                })
            };
        });

        const spawnedCmd = await spawnCommand('fakeCmd', ['arg']).catch((e) => {
            expect(e).toEqual(new Error('spawn ENOENT'));
        });
    });
});
