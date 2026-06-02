import { jest } from '@jest/globals';

const mockSpawn = jest.fn();
jest.unstable_mockModule('node:child_process', () => ({
    spawn: mockSpawn
}));

const { spawnCommand } = await import('../src/command');

describe('Test commandRunner functions', () => {
    jest.setTimeout(10000);

    it('Fails to spawn with error', async () => {
        mockSpawn.mockImplementation((): any => {
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
