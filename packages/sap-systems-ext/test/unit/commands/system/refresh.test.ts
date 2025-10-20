import type { SystemCommandContext } from '../../../../src/types/system';
import { refreshSystemsCommandHandler } from '../../../../src/commands/system/refresh';
import { PanelManager, type SystemPanel } from '../../../../src/panel';
import { SapSystemsProvider } from '../../../../src/providers';

describe('Test the refresh system command handler', () => {
    it('should refresh the list of systems', async () => {
        const panelManager = new PanelManager<SystemPanel>();
        const mockContext = {
            panelManager,
            extContext: {
                extensionPath: '/mock/extension/path'
            }
        } as SystemCommandContext;
        const refreshSpy = jest.spyOn(SapSystemsProvider.prototype, 'refresh');

        const handler = refreshSystemsCommandHandler(mockContext);
        await handler();

        expect(refreshSpy).toHaveBeenCalledTimes(1);
    });
});
