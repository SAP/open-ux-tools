import * as systemCommands from '../../../src/commands/system';
import * as vscodeMod from 'vscode';
import { registerCommands } from '../../../src/commands/registerCommands';
import type { ExtensionContext } from 'vscode';

describe('Test registering commands', () => {
    it('should register extension and system commands', () => {
        // Mock the ExtensionContext
        const mockContext = {
            subscriptions: [] as any[]
        } as ExtensionContext;

        const registerSystemViewCommandsSpy = jest
            .spyOn(systemCommands, 'registerSystemViewCommands')
            .mockImplementationOnce(() => {});

        const cmds = vscodeMod.commands;

        const vscodeCommandsRegisterSpy = jest.spyOn(cmds, 'registerCommand').mockImplementation(() => {
            return { dispose: () => {} };
        });

        registerCommands(mockContext);

        expect(vscodeCommandsRegisterSpy).toHaveBeenCalledWith(
            'sap.ux.tools.sapSystems.openOutputChannel',
            expect.any(Function)
        );
        expect(registerSystemViewCommandsSpy).toHaveBeenCalledWith(mockContext);
    });
});
