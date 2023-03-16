import * as cp from 'child_process';
import { spawnCommand } from '../src/command';

jest.mock('child_process');
const mockedCp = jest.mocked(cp, { shallow: true });

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

        await spawnCommand('fakeCmd', ['arg']).catch((e) => {
            expect(e).toEqual(new Error('spawn ENOENT'));
        });
    });
});
