import type { SystemCommandContext } from '../../../../src/types/system';
import { PanelManager, type SystemPanel } from '../../../../src/panel';
import { deleteSystemCommandHandler } from '../../../../src/commands/system/delete';
import * as utils from '../../../../src/utils';
import * as vscodeMod from 'vscode';

const systemServiceReadMock = jest.fn();
const systemServiceDeleteMock = jest.fn();

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    SystemService: jest.fn().mockImplementation(() => ({
        read: systemServiceReadMock,
        delete: systemServiceDeleteMock
    }))
}));

jest.mock('../../../../src/utils', () => ({
    ...jest.requireActual('../../../../src/utils'),
    confirmPrompt: jest.fn(),
    logTelemetryEvent: jest.fn()
}));

describe('Test the delete system command handler', () => {
    beforeAll(async () => {
        await utils.initI18n();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

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

    it('should delete the specific system and dispose the associated panel', async () => {
        const deleteAndDisposeSpy = jest.spyOn(panelManager, 'deleteAndDispose');
        const vsCodeWindow = vscodeMod.window;
        const showInformationMessageSpy = jest.spyOn(vsCodeWindow, 'showInformationMessage');
        const confirmPromptSpy = jest.spyOn(utils, 'confirmPrompt');

        confirmPromptSpy.mockResolvedValue(true);
        systemServiceReadMock.mockResolvedValue(backendSystem);
        systemServiceDeleteMock.mockResolvedValue(true);

        const mockContext = {
            panelManager,
            extContext: {
                extensionPath: '/mock/extension/path'
            }
        } as SystemCommandContext;

        const handler = deleteSystemCommandHandler(mockContext);
        await handler({ url: 'https://example.com', client: '100' });

        expect(deleteAndDisposeSpy).toHaveBeenCalledWith(expect.any(String));
        expect(showInformationMessageSpy).toHaveBeenCalledWith('System [Test System] deleted.');
    });

    it('should show a warning message if the deletion of the specific system is not successful', async () => {
        const vsCodeWindow = vscodeMod.window;
        const showWarningMessageSpy = jest.spyOn(vsCodeWindow, 'showWarningMessage');
        const confirmPromptSpy = jest.spyOn(utils, 'confirmPrompt');

        confirmPromptSpy.mockResolvedValue(true);
        systemServiceReadMock.mockResolvedValue(backendSystem);
        systemServiceDeleteMock.mockResolvedValue(false);

        const mockContext = {
            panelManager,
            extContext: {
                extensionPath: '/mock/extension/path'
            }
        } as SystemCommandContext;

        const handler = deleteSystemCommandHandler(mockContext);
        await handler({ url: 'https://example.com', client: '100' });

        expect(showWarningMessageSpy).toHaveBeenCalledWith('Error deleting system: [Test System].');
    });

    it('should show an error message if the system does not exist', async () => {
        const vsCodeWindow = vscodeMod.window;
        const showErrorMessageSpy = jest.spyOn(vsCodeWindow, 'showErrorMessage');

        systemServiceReadMock.mockResolvedValue(undefined);

        const handler = deleteSystemCommandHandler(mockContext);
        await handler({ url: 'https://nonexistent.com', client: '200' });

        expect(showErrorMessageSpy).toHaveBeenCalledWith(
            'System [https://nonexistent.com/200] not found in the secure store. Please ensure the system is saved correctly.'
        );
    });

    it('should not delete the system if the user cancels the confirmation prompt', async () => {
        const vsCodeWindow = vscodeMod.window;
        const showWarningMessageSpy = jest.spyOn(vsCodeWindow, 'showWarningMessage');
        const confirmPromptSpy = jest.spyOn(utils, 'confirmPrompt');

        confirmPromptSpy.mockResolvedValue(false);
        systemServiceReadMock.mockResolvedValue({
            url: 'https://example.com',
            client: '100',
            name: 'Test System',
            systemType: 'OnPrem'
        });

        const handler = deleteSystemCommandHandler(mockContext);
        await handler({ url: 'https://example.com', client: '100' });

        expect(showWarningMessageSpy).toHaveBeenCalledWith('Deletion cancelled for system: [Test System].');
        expect(systemServiceDeleteMock).not.toHaveBeenCalled();
    });
});
