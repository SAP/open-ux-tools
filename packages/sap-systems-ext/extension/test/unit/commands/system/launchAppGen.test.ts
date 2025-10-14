import type { SystemCommandContext } from '../../../../src/types/system';
import { launchAppGenCommandHandler } from '../../../../src/commands/system/launchAppGen';
import { PanelManager, type SystemPanel } from '../../../../src/panel';
import * as vscodeMod from 'vscode';
import { initI18n } from '../../../../src/utils';

const systemServiceReadMock = jest.fn();

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    SystemService: jest.fn().mockImplementation(() => ({
        read: systemServiceReadMock
    }))
}));

describe('Test the launch app generator command handler', () => {
    const panelManager = new PanelManager<SystemPanel>();
    const mockContext = {
        panelManager,
        extContext: {
            extensionPath: '/mock/extension/path'
        }
    } as SystemCommandContext;

    const backendSystem = {
        url: 'https://example.com',
        client: '100',
        name: 'Test System',
        systemType: 'OnPrem'
    };

    beforeAll(async () => {
        await initI18n();
    });

    it('should launch the application generator with the correct command data', async () => {
        systemServiceReadMock.mockResolvedValue(backendSystem);
        const vsCodeCommands = vscodeMod.commands;
        const executeCommandSpy = jest.spyOn(vsCodeCommands, 'executeCommand');

        const handler = launchAppGenCommandHandler(mockContext);
        await handler({
            url: backendSystem.url,
            client: backendSystem.client
        });

        expect(executeCommandSpy).toHaveBeenCalledWith('sap.ux.appGenerator.launch', {
            type: 'SAP_SYSTEMS_DATA',
            systemName: 'Test System'
        });
    });

    it('should show an error message if executing the command throws an error', async () => {
        systemServiceReadMock.mockResolvedValue(backendSystem);
        const vsCodeCommands = vscodeMod.commands;
        const executeCommandSpy = jest
            .spyOn(vsCodeCommands, 'executeCommand')
            .mockRejectedValue(new Error('Failed to launch'));
        const vsCodeWindow = vscodeMod.window;
        const showErrorMessageSpy = jest.spyOn(vsCodeWindow, 'showErrorMessage');

        const handler = launchAppGenCommandHandler(mockContext);
        await handler({
            url: backendSystem.url,
            client: backendSystem.client
        });

        expect(executeCommandSpy).toHaveBeenCalled();
        expect(showErrorMessageSpy).toHaveBeenCalledWith(
            'Failed to launch the SAP Fiori application generator for [Test System].'
        );
    });
});
