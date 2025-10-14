import * as views from '../../src/views';
import * as commands from '../../src/commands/registerCommands';
import { activate } from '../../src/extension';
import type { ExtensionContext } from 'vscode';

describe('Test the extension activate/deactivate', () => {
    it('should register commands and views with the extension context', () => {
        // Mock the ExtensionContext
        const mockContext = {
            subscriptions: [] as any[]
        } as ExtensionContext;

        const registerViewsSpy = jest.spyOn(views, 'registerViews').mockImplementationOnce(() => {});
        const registerCommandsSpy = jest.spyOn(commands, 'registerCommands').mockImplementationOnce(() => {});

        activate(mockContext);

        expect(registerViewsSpy).toHaveBeenCalledWith(mockContext);
        expect(registerCommandsSpy).toHaveBeenCalledWith(mockContext);
    });
});
