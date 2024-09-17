import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import CommandExecutor from '../../../src/adp/command-executor';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type DesignTimeMetadata from 'sap/ui/dt/DesignTimeMetadata';
import CommandFactory from 'mock/sap/ui/rta/command/CommandFactory';
import MessageToast from 'mock/sap/m/MessageToast';
import type { FlexSettings } from 'sap/ui/rta/RuntimeAuthoring';

describe('client/command-executor', () => {
    describe('generateAndExecuteCommand', () => {
        const pushAndExecuteSpy = jest.fn().mockResolvedValue({});
        const rta = {
            getCommandStack: () => {
                return {
                    pushAndExecute: pushAndExecuteSpy
                };
            }
        };

        afterEach(() => {
            pushAndExecuteSpy.mockRestore();
        });

        test('generates command and executes command', async () => {
            const commandExecutor = new CommandExecutor(rta as unknown as RuntimeAuthoring);
            await commandExecutor.pushAndExecuteCommand({} as FlexCommand);

            expect(pushAndExecuteSpy.mock.calls.length).toBe(1);
        });

        test('throws error when pushAndExecute fails', async () => {

            pushAndExecuteSpy.mockRejectedValueOnce(new Error('Could not execute command!'));
            const commandExecutor = new CommandExecutor(rta as unknown as RuntimeAuthoring);
            try {
                await commandExecutor.pushAndExecuteCommand({} as FlexCommand);
            } catch (e) {
                expect(e.message).toBe('Could not execute command!');
                expect(pushAndExecuteSpy.mock.calls.length).toBe(1);
            }
        });
    });

    describe('getCommand', () => {
        const mockRuntimeControl = {};
        const commandName = 'addXML';
        const modifiedValue = { fragmentPath: 'fragments/Share.fragment.xml' };
        const designMetadata = {};
        const flexSettings = { scenario: 'ADAPTATION_PROJECT' };
        const mockCommand = { mProperties: { moduleName: '' } };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should successfully get a command', async () => {
            CommandFactory.getCommandFor.mockResolvedValue(mockCommand);

            const commandExecutor = new CommandExecutor({} as unknown as RuntimeAuthoring);
            const result = await commandExecutor.getCommand(
                mockRuntimeControl as ManagedObject,
                commandName,
                modifiedValue,
                designMetadata as DesignTimeMetadata,
                flexSettings as FlexSettings
            );

            expect(result).toBe(mockCommand);
            expect(CommandFactory.getCommandFor).toHaveBeenCalledWith(
                mockRuntimeControl,
                commandName,
                modifiedValue,
                designMetadata,
                flexSettings
            );
        });

        it('should show a message toast and throw an error if getting command fails', async () => {
            const errorMessage = 'Missing properties';
            CommandFactory.getCommandFor.mockImplementation(() => {
                throw new Error(errorMessage);
            });

            const commandExecutor = new CommandExecutor({} as unknown as RuntimeAuthoring);

            await expect(
                commandExecutor.getCommand(
                    mockRuntimeControl as ManagedObject,
                    commandName,
                    modifiedValue,
                    designMetadata as DesignTimeMetadata,
                    flexSettings as FlexSettings
                )
            ).rejects.toThrow(`Could not get command for '${commandName}'. ${errorMessage}`);

            expect(MessageToast.show).toHaveBeenCalledWith(expect.stringContaining(commandName));
            expect(MessageToast.show).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
        });
    });
});
