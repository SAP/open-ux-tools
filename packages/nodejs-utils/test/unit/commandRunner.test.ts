import childProcess from 'child_process';
import { CommandRunner } from '../../src/commandRunner';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockSpawn = require('mock-spawn');

// write test cases for the CommandRunner class
describe('CommandRunner', () => {
    let commandRunner: CommandRunner;
    let spawnMock: typeof mockSpawn;
    let spawnSpy: jest.SpyInstance;

    beforeEach(() => {
        commandRunner = new CommandRunner();
        spawnMock = mockSpawn();
        spawnSpy = jest.spyOn(childProcess, 'spawn').mockImplementation(spawnMock);
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
        expect(spawnSpy).toHaveBeenCalledWith(cmd, args, {});
    });

    it('should handle command errors', async () => {
        const cmd = 'npm';
        const args = ['install'];
        const expectedError = 'Command failed, `npm install';
        spawnMock.setDefault(spawnMock.simple(1, 'npm install'));

        await expect(commandRunner.run(cmd, args)).rejects.toContain(expectedError);
        expect(spawnSpy).toHaveBeenCalledWith(cmd, args, {});
    });

    it('should handle command failures', async () => {
        const cmd = 'npm';
        const args = ['install'];
        const expectedError = 'Command failed, `npm install`, npm ERR! missing script: install';
        spawnMock.setDefault(spawnMock.simple(1, 'npm install', 'npm ERR! missing script: install'));

        await expect(commandRunner.run(cmd, args)).rejects.toContain(expectedError);
        expect(spawnSpy).toHaveBeenCalledWith(cmd, args, {});
    });
});
