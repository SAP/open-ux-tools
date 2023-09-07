import type ManagedObject from 'sap/ui/base/ManagedObject';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type DesignTimeMetadata from 'sap/ui/dt/DesignTimeMetadata';
import type { FlexSettings } from 'sap/ui/rta/command/CommandFactory';

import CommandExecutor from '../../../../src/preview/client/command-executor';

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
            await commandExecutor.generateAndExecuteCommand(
                {} as ManagedObject,
                'addXML',
                {},
                {} as DesignTimeMetadata,
                {} as FlexSettings
            );

            expect(pushAndExecuteSpy.mock.calls.length).toBe(1);
        });

        test('throws error when pushAndExecute fails', async () => {
            pushAndExecuteSpy.mockRejectedValueOnce({ message: 'Could not execute command!' });
            const commandExecutor = new CommandExecutor(rta as unknown as RuntimeAuthoring);
            try {
                await commandExecutor.generateAndExecuteCommand(
                    {} as ManagedObject,
                    'addXML',
                    {},
                    {} as DesignTimeMetadata,
                    {} as FlexSettings
                );
            } catch (e) {
                expect(e.message).toBe('Could not execute command!');
                expect(pushAndExecuteSpy.mock.calls.length).toBe(1);
            }
        });
    });
});
