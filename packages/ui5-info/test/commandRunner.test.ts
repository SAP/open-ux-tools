// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockSpawn = require('mock-spawn');
import childProcess from 'child_process';
import { CommandRunner } from '../src/commandRunner';

const mockedSpawn = mockSpawn();
childProcess.spawn = mockedSpawn;

describe('Test commandRunner functions', () => {
    jest.setTimeout(10000);
    it('Fails to spawn with error', async () => {
        mockedSpawn.setDefault(mockedSpawn.simple(1, 'Some log', 'stderr buffer'));
        mockedSpawn.sequence.add({ throws: new Error('spawn ENOENT') });
        const runner = new CommandRunner();
        await runner.run('fakeCmd').catch((e) => {
            expect(e.message).toEqual('spawn ENOENT');
        });
    });
});
