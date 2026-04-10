import { jest } from '@jest/globals';
import type { VSCodeInstance } from '@sap-ux/fiori-generator-shared';

// Mock @vscode-logging/logger before importing modules that depend on it
jest.unstable_mockModule('@vscode-logging/logger', () => ({
    getExtensionLogger: jest.fn()
}));

const { POST_LIB_GEN_COMMAND, runPostLibGenHook } = await import('../../../src/utils/eventHook');

describe('runPostLibGenHook', () => {
    const mockExecuteCommand = jest.fn();
    const getVscodeInstance = { commands: { executeCommand: mockExecuteCommand } };

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('calls default command when followUpCommand is not passed in', async () => {
        const generatedProjectRootPath = '/some/path';

        await runPostLibGenHook({
            path: generatedProjectRootPath,
            vscodeInstance: getVscodeInstance as unknown as VSCodeInstance
        });
        expect(mockExecuteCommand).toHaveBeenCalledWith(POST_LIB_GEN_COMMAND, {
            fsPath: generatedProjectRootPath
        });
    });

    it('does not throw an error when post generation command does', async () => {
        const generatedProjectRootPath = '/some/path';
        mockExecuteCommand.mockImplementationOnce(() => {
            throw new Error();
        });

        await expect(
            runPostLibGenHook({
                path: generatedProjectRootPath,
                vscodeInstance: getVscodeInstance as unknown as VSCodeInstance
            })
        ).resolves.not.toThrow();
    });

    it('if no vscode instance is passed in, nothing happens', async () => {
        const generatedProjectRootPath = '/some/path';

        await expect(
            runPostLibGenHook({
                path: generatedProjectRootPath
            })
        ).resolves.not.toThrow();
    });
});
