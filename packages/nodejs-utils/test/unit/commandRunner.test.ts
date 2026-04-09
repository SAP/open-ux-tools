import { jest } from '@jest/globals';
import { createRequire } from 'node:module';
import type { SpawnOptionsWithoutStdio } from 'node:child_process';
import type { Logger } from '@sap-ux/logger';

const require = createRequire(import.meta.url);
const mockSpawnFactory = require('mock-spawn');

// Create the mock spawn function that we'll control
const mockSpawnFn = jest.fn();

// Mock node:child_process before importing CommandRunner
jest.unstable_mockModule('node:child_process', () => ({
    spawn: mockSpawnFn
}));

// Import after mocking
const { CommandRunner } = await import('../../src/commandRunner');

// write test cases for the CommandRunner class
describe('CommandRunner', () => {
    let commandRunner: CommandRunner;
    let spawnMock: ReturnType<typeof mockSpawnFactory>;
    const expectedSpawnOpts: SpawnOptionsWithoutStdio = {};

    beforeEach(() => {
        commandRunner = new CommandRunner();
        spawnMock = mockSpawnFactory();
        mockSpawnFn.mockImplementation(spawnMock);
        if (process.platform === 'win32') {
            expectedSpawnOpts.shell = true;
        }
    });

    afterEach(() => {
        mockSpawnFn.mockReset();
    });

    it('should run a command with arguments', async () => {
        const cmd = 'npm';
        const args = ['install'];
        const expectedResponse = 'npm install';
        spawnMock.setDefault(spawnMock.simple(0, expectedResponse));

        const response = await commandRunner.run(cmd, args);

        expect(response).toBe(expectedResponse);
        expect(mockSpawnFn).toHaveBeenCalledWith(cmd, args, expectedSpawnOpts);
    });

    it('should run a command with arguments and options', async () => {
        const cmd = 'npm';
        const args = ['install'];
        const opts = { cwd: '/some/path' };
        const expectedResponse = 'npm install';
        spawnMock.setDefault(spawnMock.simple(0, expectedResponse));

        const response = await commandRunner.run(cmd, args, opts);

        expect(response).toBe(expectedResponse);
        expect(mockSpawnFn).toHaveBeenCalledWith(cmd, args, { ...expectedSpawnOpts, ...opts });
    });

    it('should handle command errors', async () => {
        const cmd = 'npm';
        const args = ['install'];
        const expectedError = 'Command failed, `npm install';
        spawnMock.setDefault(spawnMock.simple(1, 'npm install'));

        await expect(commandRunner.run(cmd, args)).rejects.toContain(expectedError);
        expect(mockSpawnFn).toHaveBeenCalledWith(cmd, args, expectedSpawnOpts);
    });

    it('should handle command failures', async () => {
        const cmd = 'npm';
        const args = ['install'];
        const expectedError = 'Command failed, `npm install`, npm ERR! missing script: install';
        spawnMock.setDefault(spawnMock.simple(1, 'npm install', 'npm ERR! missing script: install'));

        await expect(commandRunner.run(cmd, args)).rejects.toContain(expectedError);
        expect(mockSpawnFn).toHaveBeenCalledWith(cmd, args, expectedSpawnOpts);
    });

    it('should log with provided logger, removing trailing newline or carriage returns', async () => {
        const cmd = 'npm';
        const args = ['install'];
        const logger = {
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        };
        let childProcessOutput = 'npm install\n';
        spawnMock.setDefault(spawnMock.simple(0, childProcessOutput));

        await commandRunner.run(cmd, args, {}, logger as unknown as Logger);

        expect(logger.debug).toHaveBeenCalledWith(`Running command: ${cmd} ${args.join(' ')}`);
        expect(logger.info).toHaveBeenCalledWith('npm install');

        childProcessOutput = 'npm install\r\r';
        spawnMock.setDefault(spawnMock.simple(0, childProcessOutput));

        await commandRunner.run(cmd, args, {}, logger as unknown as Logger);

        expect(logger.debug).toHaveBeenCalledWith(`Running command: ${cmd} ${args.join(' ')}`);
        expect(logger.info).toHaveBeenCalledWith('npm install\r');

        const expectedError = '"npm install" failed to run';

        spawnMock.sequence.add(function (this: any) {
            this.emit('error', new Error(expectedError));
        });
        await expect(commandRunner.run(cmd, args, {}, logger as unknown as Logger)).rejects.toThrow(expectedError);
        expect(logger.error).toHaveBeenCalledWith(`Command failed with error: ${expectedError}`);
    });
});
