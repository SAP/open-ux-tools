import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { Logger } from '@sap-ux/logger';

const mockExecNpmCommand = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    execNpmCommand: (...args: unknown[]) => mockExecNpmCommand(...args)
}));

const { runNpmInstallCommand } = await import('../../../src/common/index.js');

describe('runNpmInstallCommand', () => {
    let loggerMock: Logger;

    beforeEach(() => {
        jest.clearAllMocks();
        loggerMock = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        } as Partial<Logger> as Logger;
    });

    test('should run npm install with default args and log success', async () => {
        mockExecNpmCommand.mockResolvedValue(undefined);

        await runNpmInstallCommand('/my/project', [], { logger: loggerMock });

        expect(mockExecNpmCommand).toHaveBeenCalledWith(['install'], { cwd: '/my/project', logger: loggerMock });
        expect(loggerMock.info).toHaveBeenCalled();
    });

    test('should forward additional install arguments', async () => {
        mockExecNpmCommand.mockResolvedValue(undefined);

        await runNpmInstallCommand('/my/project', ['--no-audit', '--prefer-offline']);

        expect(mockExecNpmCommand).toHaveBeenCalledWith(['install', '--no-audit', '--prefer-offline'], {
            cwd: '/my/project',
            logger: undefined
        });
    });

    test('should log and rethrow when npm install fails', async () => {
        const error = new Error('install failed');
        mockExecNpmCommand.mockRejectedValue(error);

        await expect(runNpmInstallCommand('/my/project', [], { logger: loggerMock })).rejects.toThrow('install failed');

        expect(loggerMock.error).toHaveBeenCalled();
    });

    test('should rethrow without a logger', async () => {
        mockExecNpmCommand.mockRejectedValue(new Error('boom'));

        await expect(runNpmInstallCommand('/my/project')).rejects.toThrow('boom');
    });
});
