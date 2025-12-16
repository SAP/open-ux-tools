import { CommandRunner } from '../../../src/utils/command-runner';
import { initI18nFioriAppSubGenerator } from '../../../src/utils/i18n';
import { platform } from 'node:os';
import childProcess from 'child_process';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockSpawn = require('mock-spawn');

describe('Test command-runner', () => {
    let mockedSpawn = mockSpawn();
    beforeAll(async () => {
        mockedSpawn = mockSpawn();
        childProcess.spawn = mockedSpawn;
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
        await expect(cmdRunner.run('fakeCmd')).rejects.toThrow('Command failed with error.: spawn ENOENT');
    });

    test('Test CommandRunner ', async () => {
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
