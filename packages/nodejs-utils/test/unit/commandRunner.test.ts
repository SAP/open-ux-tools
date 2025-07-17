import childProcess, { type SpawnOptionsWithoutStdio } from 'child_process';
import { CommandRunner } from '../../src/commandRunner';
import { type Logger } from '@sap-ux/logger';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockSpawn = require('mock-spawn');

// write test cases for the CommandRunner class
describe('CommandRunner', () => {
    let commandRunner: CommandRunner;
    let spawnMock: typeof mockSpawn;
    let spawnSpy: jest.SpyInstance;
    const expectedSpawnOpts: SpawnOptionsWithoutStdio = {};

    beforeEach(() => {
        commandRunner = new CommandRunner();
        spawnMock = mockSpawn();
        spawnSpy = jest.spyOn(childProcess, 'spawn').mockImplementation(spawnMock);
        if (process.platform === 'win32') {
            expectedSpawnOpts.shell = true;
        }
    });

    afterEach(() => {
        spawnSpy.mockRestore();
    });

    it('should run a command with arguments', async () => {
        const cmd = 'npm';
        const args = ['install'];
        const expectedResponse = 'npm install';
        spawnMock.setDefault(spawnMock.simple(0, expectedResponse));

        const response = await commandRunner.run(cmd, args);

        expect(response).toBe(expectedResponse);
        expect(spawnSpy).toHaveBeenCalledWith(cmd, args, expectedSpawnOpts);
    });

    it('should run a command with arguments and options', async () => {
        const cmd = 'npm';
        const args = ['install'];
        const opts = { cwd: '/some/path' };
        const expectedResponse = 'npm install';
        spawnMock.setDefault(spawnMock.simple(0, expectedResponse));

        const response = await commandRunner.run(cmd, args, opts);

        expect(response).toBe(expectedResponse);
        expect(spawnSpy).toHaveBeenCalledWith(cmd, args, { ...expectedSpawnOpts, ...opts });
    });

    it('should handle command errors', async () => {
        const cmd = 'npm';
        const args = ['install'];
        const expectedError = 'Command failed, `npm install';
        spawnMock.setDefault(spawnMock.simple(1, 'npm install'));

        await expect(commandRunner.run(cmd, args)).rejects.toContain(expectedError);
        expect(spawnSpy).toHaveBeenCalledWith(cmd, args, expectedSpawnOpts);
    });

    it('should handle command failures', async () => {
        const cmd = 'npm';
        const args = ['install'];
        const expectedError = 'Command failed, `npm install`, npm ERR! missing script: install';
        spawnMock.setDefault(spawnMock.simple(1, 'npm install', 'npm ERR! missing script: install'));

        await expect(commandRunner.run(cmd, args)).rejects.toContain(expectedError);
        expect(spawnSpy).toHaveBeenCalledWith(cmd, args, expectedSpawnOpts);
    });

    it('should log with provided logger, removing trailing newline or carriage returns', async () => {
        const cmd = 'npm';
        const args = ['install'];
        const logger = {
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        };
        let childProcessOutput = 'npm install\n\n\n';
        spawnMock.setDefault(spawnMock.simple(0, childProcessOutput));

        await commandRunner.run(cmd, args, {}, logger as unknown as Logger);

        expect(logger.debug).toHaveBeenCalledWith(`Running command: ${cmd} ${args.join(' ')}`);
        expect(logger.info).toHaveBeenCalledWith('npm install');

        childProcessOutput = 'npm install\r\r\r\r\r\r';
        spawnMock.setDefault(spawnMock.simple(0, childProcessOutput));

        await commandRunner.run(cmd, args, {}, logger as unknown as Logger);

        expect(logger.debug).toHaveBeenCalledWith(`Running command: ${cmd} ${args.join(' ')}`);
        expect(logger.info).toHaveBeenCalledWith('npm install');

        const expectedError = '"npm install" failed to run';

        spawnMock.sequence.add(function (this: any) {
            this.emit('error', new Error(expectedError));
        });
        await expect(commandRunner.run(cmd, args, {}, logger as unknown as Logger)).rejects.toThrowError(expectedError);
        expect(logger.error).toHaveBeenCalledWith(`Command failed with error: ${expectedError}`);
    });
});
