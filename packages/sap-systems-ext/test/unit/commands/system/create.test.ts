import type { SystemCommandContext } from '../../../../src/types';
import { createSystemCommandHandler, createNewSystemCommandHandler } from '../../../../src/commands/system/create';
import { PanelManager, type SystemPanel } from '../../../../src/panel';
import { BackendSystem } from '@sap-ux/store';

describe('Test the create system command handler', () => {
    it('should create and reveal a new system panel using external panel key', async () => {
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

        // Should use EXTERNAL_SYSTEM_PANEL_KEY for external tool invocations
        expect(getOrCreateNewPanelSpy).toHaveBeenCalledWith('__EXTERNAL_SYSTEM_PANEL__', expect.any(Function));
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

        expect(getOrCreateNewPanelSpy).toHaveBeenCalledWith('__EXTERNAL_SYSTEM_PANEL__', expect.any(Function));
    });

    it('should dispose existing external panel before creating new one', async () => {
        const panelManager = new PanelManager<SystemPanel>();
        const deleteAndDisposeSpy = jest.spyOn(panelManager, 'deleteAndDispose');
        const hasSpy = jest.spyOn(panelManager, 'has');

        // Mock that an external panel exists
        hasSpy.mockReturnValue(true);

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

        expect(hasSpy).toHaveBeenCalledWith('__EXTERNAL_SYSTEM_PANEL__');
        expect(deleteAndDisposeSpy).toHaveBeenCalledWith('__EXTERNAL_SYSTEM_PANEL__');
    });

    it('should not interfere with user-initiated NEW_SYSTEM_PANEL', async () => {
        const panelManager = new PanelManager<SystemPanel>();
        const deleteAndDisposeSpy = jest.spyOn(panelManager, 'deleteAndDispose');
        const hasSpy = jest.spyOn(panelManager, 'has');

        // Mock that user-initiated panel exists but external panel doesn't
        hasSpy.mockImplementation((key: string) => key === '__NEW_SYSTEM_PANEL__');

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

        // Should only check/dispose EXTERNAL panel, not NEW panel
        expect(hasSpy).toHaveBeenCalledWith('__EXTERNAL_SYSTEM_PANEL__');
        expect(deleteAndDisposeSpy).not.toHaveBeenCalledWith('__NEW_SYSTEM_PANEL__');
    });
});

describe('Test the createNew system command handler', () => {
    it('should create and reveal a new empty system panel using new panel key', async () => {
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

        const handler = createNewSystemCommandHandler(mockContext);
        await handler();

        // Should use NEW_SYSTEM_PANEL_KEY for user-initiated creation
        expect(getOrCreateNewPanelSpy).toHaveBeenCalledWith('__NEW_SYSTEM_PANEL__', expect.any(Function));
    });

    it('should always create empty panel regardless of arguments', async () => {
        const panelManager = new PanelManager<SystemPanel>();
        const getOrCreateNewPanelSpy = jest.spyOn(panelManager, 'getOrCreateNewPanel');
        let capturedBackendSystem: any;

        // Spy on getOrCreateNewPanel to capture what's passed to the factory
        getOrCreateNewPanelSpy.mockImplementation((key, factory) => {
            const panel = factory();
            // Capture the backendSystem from the created panel
            capturedBackendSystem = (panel as any).backendSystem;
            return panel;
        });

        const mockContext = {
            panelManager,
            extContext: {
                vscodeExtContext: {
                    extensionPath: '/mock/extension/path'
                }
            }
        } as SystemCommandContext;

        const handler = createNewSystemCommandHandler(mockContext);
        await handler();

        expect(getOrCreateNewPanelSpy).toHaveBeenCalledWith('__NEW_SYSTEM_PANEL__', expect.any(Function));
        // Verify that undefined was passed (empty form)
        expect(capturedBackendSystem).toBeUndefined();
    });
});
