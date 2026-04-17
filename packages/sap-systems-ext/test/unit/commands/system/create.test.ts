import type { SystemCommandContext } from '../../../../src/types';
import { createSystemCommandHandler } from '../../../../src/commands/system/create';
import { PanelManager, type SystemPanel } from '../../../../src/panel';

describe('Test the create system command handler', () => {
    it('should create and reveal a new system panel', async () => {
        const panelManager = new PanelManager<SystemPanel>();

        const getOrCreateNewPanelSpy = jest.spyOn(panelManager, 'getOrCreateNewPanel');

        const mockContext = {
            panelManager,
            extContext: {
                vscodeExtContext: {
                    extensionPath: '/mock/extension/path'
                }
            }
        } as SystemCommandContext;

        const handler = createSystemCommandHandler(mockContext);
        await handler();

        expect(getOrCreateNewPanelSpy).toHaveBeenCalledWith('__NEW_SYSTEM_PANEL__', expect.any(Function));
    });
});
