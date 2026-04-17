import type { SystemCommandContext } from '../../../../src/types/system';
import type { SapSystemsProvider } from '../../../../src/providers';
import { refreshSystemsCommandHandler } from '../../../../src/commands/system/refresh';
import { PanelManager, type SystemPanel } from '../../../../src/panel';

describe('Test the refresh system command handler', () => {
    it('should refresh the list of systems', async () => {
        const panelManager = new PanelManager<SystemPanel>();
        const refresh = jest.fn();
        const systemsTreeDataProvider = {
            refresh
        } as Partial<SapSystemsProvider>;
        const mockContext = {
            panelManager,
            extContext: {
                vscodeExtContext: {
                    extensionPath: '/mock/extension/path'
                },
                systemsTreeDataProvider
            }
        } as SystemCommandContext;

        const handler = refreshSystemsCommandHandler(mockContext);
        await handler();

        expect(refresh).toHaveBeenCalledTimes(1);
    });
});
