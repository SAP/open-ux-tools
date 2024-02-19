import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import CommandExecutor from '../../../src/adp/command-executor';
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';

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
            pushAndExecuteSpy.mockRejectedValueOnce({ message: 'Could not execute command!' });
            const commandExecutor = new CommandExecutor(rta as unknown as RuntimeAuthoring);
            try {
                await commandExecutor.pushAndExecuteCommand({} as FlexCommand);
            } catch (e) {
                expect(e.message).toBe('Could not execute command!');
                expect(pushAndExecuteSpy.mock.calls.length).toBe(1);
            }
        });
    });
});
