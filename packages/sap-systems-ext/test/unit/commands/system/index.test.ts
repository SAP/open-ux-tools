import type { ExtensionContext } from 'vscode';
import { registerSystemViewCommands } from '../../../../src/commands/system';
import * as vscodeMod from 'vscode';

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

        registerSystemViewCommands({ vscodeExtContext: mockContext });

        const subs = mockContext.subscriptions;

        expect(subs.length).toBe(6);
    });
});
