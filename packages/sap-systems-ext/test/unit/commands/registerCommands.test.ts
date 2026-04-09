import { jest } from '@jest/globals';
import * as vscodeMod from 'vscode';
import type { ExtensionContext } from 'vscode';

const mockRegisterSystemViewCommands = jest.fn();

jest.unstable_mockModule('../../../src/commands/system', () => ({
    registerSystemViewCommands: mockRegisterSystemViewCommands
}));

const { registerCommands } = await import('../../../src/commands/registerCommands');

describe('Test registering commands', () => {
    it('should register extension and system commands', () => {
        // Mock the ExtensionContext
        const mockContext = {
            subscriptions: [] as any[]
        } as ExtensionContext;

        const cmds = vscodeMod.commands;

        const vscodeCommandsRegisterSpy = jest.spyOn(cmds, 'registerCommand').mockImplementation(() => {
            return { dispose: () => {} };
        });

        registerCommands({ vscodeExtContext: mockContext });

        expect(vscodeCommandsRegisterSpy).toHaveBeenCalledWith(
            'sap.ux.tools.sapSystems.openOutputChannel',
            expect.any(Function)
        );
        expect(mockRegisterSystemViewCommands).toHaveBeenCalledWith({
            vscodeExtContext: mockContext
        });
    });
});
