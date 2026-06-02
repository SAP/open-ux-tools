import { jest } from '@jest/globals';
import { platform } from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mockSpawnLib = require('mock-spawn');

// Pre-import actual child_process
const actualChildProcess = await import('node:child_process');

let mockedSpawn = mockSpawnLib();

jest.unstable_mockModule('node:child_process', () => ({
    ...actualChildProcess,
    spawn: (...args: any[]) => mockedSpawn(...args)
}));

const { CommandRunner } = await import('../../../src/utils/command-runner');
const { initI18nFioriAppSubGenerator } = await import('../../../src/utils/i18n');

describe('Test command-runner', () => {
    beforeAll(async () => {
        mockedSpawn = mockSpawnLib();
    });

    it('Fails to spawn with error', async () => {
        await initI18nFioriAppSubGenerator();
        mockedSpawn.sequence.add(function (cb: Function) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            this.emit('error', new Error('spawn ENOENT'));
            setTimeout(function () {
                return cb(1);
            }, 10);
        });
        const cmdRunner = new CommandRunner(console as any);
        await expect(cmdRunner.run('fakeCmd')).rejects.toThrow('Command failed with error.:');
    });

    test('Test CommandRunner ', async () => {
        mockedSpawn = mockSpawnLib();
        const consoleSpy = jest.spyOn(console, 'info');
        const runner = new CommandRunner(console as any);
        const npm = platform() === 'win32' ? 'npm.cmd' : 'npm';

        await expect(runner.run(npm, ['-v'], { shell: true }, true)).toBeDefined(); // Dont wait for O/S to return as this is a long time and variable
        expect(consoleSpy).toHaveBeenCalledTimes(1);
        if (npm === 'npm') {
            expect(consoleSpy).toHaveBeenNthCalledWith(1, 'Running: `npm -v`');
        } else {
            expect(consoleSpy).toHaveBeenNthCalledWith(1, 'Running: `npm.cmd -v`');
        }
        await expect(runner.run(npm, ['-v'], { shell: true }, false)).toBeDefined();
    });
});
