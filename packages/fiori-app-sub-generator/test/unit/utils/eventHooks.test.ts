import { DEFAULT_POST_APP_GEN_COMMAND, runHooks } from '../../../src/utils/eventHooks';

describe('runHooks', () => {
    const mockExecuteCommand = jest.fn();
    const getVscodeInstance = { commands: { executeCommand: mockExecuteCommand } };

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('calls default command when followUpCommand is not passed in', async () => {
        const generatedProjectRootPath = '/some/path';

        await runHooks('app-generated', {
            hookParameters: { fsPath: generatedProjectRootPath },
            vscodeInstance: getVscodeInstance
        });
        expect(mockExecuteCommand).toBeCalledWith(DEFAULT_POST_APP_GEN_COMMAND, {
            fsPath: generatedProjectRootPath
        });
    });

    it('calls followUpCommand when it is passed in', async () => {
        const generatedProjectRootPath = '/some/path';
        const postGenCommand = 'dummy.command';

        await runHooks('app-generated', {
            hookParameters: { fsPath: generatedProjectRootPath },
            vscodeInstance: getVscodeInstance,
            options: { followUpCommand: postGenCommand }
        });
        expect(mockExecuteCommand).toBeCalledWith(postGenCommand, { fsPath: generatedProjectRootPath });
    });

    it('does not throw an error when post generation command does', async () => {
        const generatedProjectRootPath = '/some/path';
        mockExecuteCommand.mockImplementationOnce(() => {
            throw new Error();
        });

        await expect(
            runHooks('app-generated', {
                hookParameters: { fsPath: generatedProjectRootPath },
                vscodeInstance: getVscodeInstance
            })
        ).resolves.not.toThrowError();
    });

    it('if no vscode instance is passed in, nothing happens', async () => {
        const generatedProjectRootPath = '/some/path';

        await expect(
            runHooks('app-generated', {
                hookParameters: { fsPath: generatedProjectRootPath }
            })
        ).resolves.not.toThrowError();
    });
});
