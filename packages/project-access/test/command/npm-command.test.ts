import childProcessMock from 'child_process';
import type { Logger } from '@sap-ux/logger';
import { execNpmCommand } from '../../src/command';

const originalPlatform = process.platform;

describe('Test execNpmCommand(), simulate linux/mac', () => {
    beforeAll(() => {
        Object.defineProperty(process, 'platform', {
            value: 'darwin'
        });
    });

    beforeEach(() => {
        jest.resetAllMocks();
    });

    afterAll(() => {
        Object.defineProperty(process, 'platform', {
            value: originalPlatform
        });
    });

    test('Install node module, no options', async () => {
        // Mock setup
        const processMock = getProcessMock((event, cb) => {
            if (event === 'exit') {
                cb();
            }
        });
        const spawnMock = jest.spyOn(childProcessMock, 'spawn').mockReturnValueOnce(processMock);

        // Test execution
        const stdout = await execNpmCommand(['install', '@scope/module@1.2.3']);

        // Result check
        expect(stdout).toBe('data-STDOUT_MOCK_DATA');
        expect(spawnMock).toHaveBeenCalledWith('npm', ['install', '@scope/module@1.2.3'], {});
    });

    test('Install node module, cwd and logger option ', async () => {
        // Mock setup
        const processMock = getProcessMock((event, cb) => {
            if (event === 'exit') {
                cb();
            }
        });
        const spawnMock = jest.spyOn(childProcessMock, 'spawn').mockReturnValueOnce(processMock);
        const logger = {
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;

        // Test execution
        await execNpmCommand(['install', 'mock-module'], { cwd: 'some/path', logger });

        // Result check
        expect(spawnMock).toHaveBeenCalledWith('npm', ['install', 'mock-module'], { cwd: 'some/path' });
        expect(logger.error).toBeCalledWith(expect.stringContaining('data-STDERR_MOCK_DATA'));
        expect(logger.info).toBeCalledWith(expect.stringContaining('data-STDOUT_MOCK_DATA'));
    });

    test('Error handling with logger', async () => {
        // Mock setup
        const processMock = getProcessMock((event, cb) => {
            if (event === 'error') {
                cb(Error('ERROR_MOCK'));
            }
        });
        jest.spyOn(childProcessMock, 'spawn').mockReturnValueOnce(processMock);
        const logger = {
            error: jest.fn()
        } as unknown as Logger;

        // Test execution
        try {
            await execNpmCommand(['mock-command'], { logger });
            expect('Function execNpmCommand should have thrown exception but did not').toBe('Error');
        } catch (error) {
            expect(error.message).toContain('ERROR_MOCK');
        }
        expect(logger.error).toBeCalledWith(expect.stringContaining('ERROR_MOCK'));
    });
});

describe('Test execNpmCommand(), simulate windows', () => {
    beforeAll(() => {
        Object.defineProperty(process, 'platform', {
            value: 'win'
        });
    });

    beforeEach(() => {
        jest.resetAllMocks();
    });

    afterAll(() => {
        Object.defineProperty(process, 'platform', {
            value: originalPlatform
        });
    });

    test('Install node module with logger', async () => {
        // Mock setup
        const processMock = getProcessMock((event, cb) => {
            if (event === 'exit') {
                cb();
            }
        });
        const spawnMock = jest.spyOn(childProcessMock, 'spawn').mockReturnValueOnce(processMock);

        // Test execution
        const stdout = await execNpmCommand(['install', '@scope/module@1.2.3']);

        // Result check
        expect(stdout).toBe('data-STDOUT_MOCK_DATA');
        expect(spawnMock).toHaveBeenCalledWith('npm.cmd', ['install', '@scope/module@1.2.3'], {
            windowsVerbatimArguments: true,
            shell: true
        });
    });

    test('Install node module, windows, cwd', async () => {
        // Mock setup
        const processMock = getProcessMock((event, cb) => {
            if (event === 'exit') {
                cb();
            }
        });
        const spawnMock = jest.spyOn(childProcessMock, 'spawn').mockReturnValueOnce(processMock);

        // Test execution
        const stdout = await execNpmCommand(['install', '@scope/module@1.2.3'], { cwd: 'some/path' });

        // Result check
        expect(stdout).toBe('data-STDOUT_MOCK_DATA');
        expect(spawnMock).toHaveBeenCalledWith('npm.cmd', ['install', '@scope/module@1.2.3'], {
            windowsVerbatimArguments: true,
            shell: true,
            cwd: 'some/path'
        });
    });

    test('Error handling', async () => {
        // Mock setup
        const processMock = getProcessMock((event, cb) => {
            if (event === 'error') {
                cb(Error('ERROR_MOCK'));
            }
        });
        jest.spyOn(childProcessMock, 'spawn').mockReturnValueOnce(processMock);

        // Test execution
        try {
            await execNpmCommand(['mock-command']);
            expect('Function execNpmCommand should have thrown exception but did not').toBe('Error');
        } catch (error) {
            expect(error.message).toContain('ERROR_MOCK');
        }
    });
});

/**
 * Helper function to get a mock implementation of child_process.ChildProcess.
 *
 * @param onHandler - handler for process.on
 * @returns - mock implementation of child_process.ChildProcess
 */
function getProcessMock(onHandler: (event: string, cb: (data?: any) => void) => void): childProcessMock.ChildProcess {
    return {
        stdout: {
            on: jest.fn().mockImplementationOnce((event, cb) => cb(`${event}-STDOUT_MOCK_DATA`))
        },
        stderr: {
            on: jest.fn().mockImplementationOnce((event, cb) => cb(`${event}-STDERR_MOCK_DATA`))
        },
        on: jest.fn().mockImplementation(onHandler)
    } as unknown as childProcessMock.ChildProcess;
}
