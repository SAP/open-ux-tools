import type { SystemCommandContext } from '../../../../src/types';
import { createSystemCommandHandler } from '../../../../src/commands/system/create';
import { PanelManager, type SystemPanel } from '../../../../src/panel';
import { BackendSystem } from '@sap-ux/store';

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

    it('should pass pre-populated BackendSystem to the panel when provided', async () => {
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

        const prePopulated = new BackendSystem({
            name: 'my.system.example.com',
            url: 'https://my.system.example.com',
            client: '010',
            systemType: 'OnPrem',
            connectionType: 'abap_catalog'
        });

        const handler = createSystemCommandHandler(mockContext);
        await handler(prePopulated);

        expect(getOrCreateNewPanelSpy).toHaveBeenCalledWith('__NEW_SYSTEM_PANEL__', expect.any(Function));
    });
});
