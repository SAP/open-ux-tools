import { POST_LIB_GEN_COMMAND, runPostLibGenHook } from '../../../src/utils/eventHook';

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
            vscodeInstance: getVscodeInstance
        });
        expect(mockExecuteCommand).toBeCalledWith(POST_LIB_GEN_COMMAND, {
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
                vscodeInstance: getVscodeInstance
            })
        ).resolves.not.toThrowError();
    });

    it('if no vscode instance is passed in, nothing happens', async () => {
        const generatedProjectRootPath = '/some/path';

        await expect(
            runPostLibGenHook({
                path: generatedProjectRootPath
            })
        ).resolves.not.toThrowError();
    });
});
