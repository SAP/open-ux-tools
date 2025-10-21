import type { ExtensionContext } from 'vscode';
import * as vscodeMod from 'vscode';
import { registerExtensionCommands } from '../../../../src/commands/extension';

describe('Test registering the systems commands', () => {
    it('should register all system commands', () => {
        // Mock the ExtensionContext
        const mockContext = {
            subscriptions: [] as any[]
        } as ExtensionContext;

        const cmds = vscodeMod.commands;

        const vscodeCommandsRegisterSpy = jest.spyOn(cmds, 'registerCommand').mockImplementation(() => {
            return { dispose: () => {} };
        });

        registerExtensionCommands(mockContext);

        const subs = mockContext.subscriptions;
        expect(subs.length).toBe(1);

        expect(vscodeCommandsRegisterSpy).toHaveBeenCalledWith(
            'sap.ux.storedSystens.openOutputChannel',
            expect.any(Function)
        );
    });
});
