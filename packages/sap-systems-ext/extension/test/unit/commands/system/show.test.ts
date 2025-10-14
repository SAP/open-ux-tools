import type { SystemCommandContext } from '../../../../src/types/system';
import { showSystemsCommandHandler } from '../../../../src/commands/system/show';
import { PanelManager, type SystemPanel } from '../../../../src/panel';
import { initI18n } from '../../../../src/utils';
import * as vscodeMod from 'vscode';

const systemServiceReadMock = jest.fn();

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    SystemService: jest.fn().mockImplementation(() => ({
        read: systemServiceReadMock
    }))
}));

describe('Test the show system command handler', () => {
    const backendSystem = {
        url: 'https://example.com',
        client: '100',
        name: 'Test System',
        systemType: 'OnPrem'
    };

    const vsCodeWindow = vscodeMod.window;

    beforeAll(async () => {
        await initI18n();
    });

    it('should show the system panel for the specific system', async () => {
        const panelManager = new PanelManager<SystemPanel>();
        const getOrCreateNewPanelSpy = jest.spyOn(panelManager, 'getOrCreateNewPanel');
        const mockContext = {
            panelManager,
            extContext: {
                extensionPath: '/mock/extension/path'
            }
        } as SystemCommandContext;

        systemServiceReadMock.mockResolvedValue(backendSystem);

        const handler = showSystemsCommandHandler(mockContext);
        await handler({ url: 'https://example.com', client: '100' });

        expect(getOrCreateNewPanelSpy).toHaveBeenCalledWith('https://example.com/100', expect.any(Function));
    });

    it('should show an error when reading the store does not return a system', async () => {
        const panelManager = new PanelManager<SystemPanel>();
        const mockContext = {
            panelManager,
            extContext: {
                extensionPath: '/mock/extension/path'
            }
        } as SystemCommandContext;
        const showErrorMessageSpy = jest.spyOn(vsCodeWindow, 'showErrorMessage');

        systemServiceReadMock.mockResolvedValue(undefined);

        const handler = showSystemsCommandHandler(mockContext);
        await handler({ url: 'https://example.com', client: '100' });

        expect(showErrorMessageSpy).toHaveBeenCalledWith(
            'System [https://example.com/100] not found in the secure store. Please ensure the system is saved correctly.'
        );
    });

    it('should show an error when reading the store does not return a system', async () => {
        const panelManager = new PanelManager<SystemPanel>();
        const mockContext = {
            panelManager,
            extContext: {
                extensionPath: '/mock/extension/path'
            }
        } as SystemCommandContext;
        const showErrorMessageSpy = jest.spyOn(vsCodeWindow, 'showErrorMessage');

        systemServiceReadMock.mockRejectedValueOnce(undefined);

        const handler = showSystemsCommandHandler(mockContext);
        await handler({ url: 'https://example.com', client: '100' });

        expect(showErrorMessageSpy).toHaveBeenCalledWith('Error executing command to view system details.');
    });
});
