import { jest } from '@jest/globals';
import type { ExtensionContext } from 'vscode';

const mockRegisterViews = jest.fn();
const mockRegisterCommands = jest.fn();

jest.unstable_mockModule('../../src/views', () => ({
    registerViews: mockRegisterViews
}));

jest.unstable_mockModule('../../src/commands/registerCommands', () => ({
    registerCommands: mockRegisterCommands
}));

const { activate } = await import('../../src/extension');

describe('Test the extension activate/deactivate', () => {
    it('should register commands and views with the extension context', async () => {
        // Mock the ExtensionContext
        const mockContext = {
            subscriptions: [] as any[]
        } as ExtensionContext;

        await activate(mockContext);

        expect(mockRegisterViews).toHaveBeenCalledWith({ vscodeExtContext: mockContext });
        expect(mockRegisterCommands).toHaveBeenCalledWith({ vscodeExtContext: mockContext });
    });
});
