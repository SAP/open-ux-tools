import { jest } from '@jest/globals';
import type { SystemCommandContext } from '../../../../src/types/system';
import * as vscodeMod from 'vscode';

const systemServiceReadMock = jest.fn();
const systemServiceDeleteMock = jest.fn();
const mockConfirmPrompt = jest.fn();
const mockLogTelemetryEvent = jest.fn();

const realStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    getService: jest.fn().mockImplementation(() => ({
        read: systemServiceReadMock,
        delete: systemServiceDeleteMock
    }))
}));

const realUtils = await import('../../../../src/utils');
jest.unstable_mockModule('../../../../src/utils', () => ({
    ...realUtils,
    confirmPrompt: mockConfirmPrompt,
    logTelemetryEvent: mockLogTelemetryEvent
}));

const { deleteSystemCommandHandler } = await import('../../../../src/commands/system/delete');
const { PanelManager } = await import('../../../../src/panel');
type SystemPanel = import('../../../../src/panel').SystemPanel;
const { initI18n } = await import('../../../../src/utils');

describe('Test the delete system command handler', () => {
    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const panelManager = new PanelManager<SystemPanel>();

    const mockContext = {
        panelManager,
        extContext: {
            vscodeExtContext: {
                extensionPath: '/mock/extension/path'
            }
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

        mockConfirmPrompt.mockResolvedValue(true);
        systemServiceReadMock.mockResolvedValue(backendSystem);
        systemServiceDeleteMock.mockResolvedValue(true);

        const mockContext = {
            panelManager,
            extContext: {
                vscodeExtContext: {
                    extensionPath: '/mock/extension/path'
                }
            }
        } as SystemCommandContext;

        const handler = deleteSystemCommandHandler(mockContext);
        await handler({ url: 'https://example.com', client: '100' });

        expect(deleteAndDisposeSpy).toHaveBeenCalledWith(expect.any(String));
        expect(showInformationMessageSpy).toHaveBeenCalledWith('Connection [Test System] deleted.');
    });

    it('should show a warning message if the deletion of the specific system is not successful', async () => {
        const vsCodeWindow = vscodeMod.window;
        const showWarningMessageSpy = jest.spyOn(vsCodeWindow, 'showWarningMessage');

        mockConfirmPrompt.mockResolvedValue(true);
        systemServiceReadMock.mockResolvedValue(backendSystem);
        systemServiceDeleteMock.mockResolvedValue(false);

        const mockContext = {
            panelManager,
            extContext: {
                vscodeExtContext: {
                    extensionPath: '/mock/extension/path'
                }
            }
        } as SystemCommandContext;

        const handler = deleteSystemCommandHandler(mockContext);
        await handler({ url: 'https://example.com', client: '100' });

        expect(showWarningMessageSpy).toHaveBeenCalledWith(
            'An error occurred when deleting connection: [Test System].'
        );
    });

    it('should show an error message if the system does not exist', async () => {
        const vsCodeWindow = vscodeMod.window;
        const showErrorMessageSpy = jest.spyOn(vsCodeWindow, 'showErrorMessage');

        systemServiceReadMock.mockResolvedValue(undefined);

        const handler = deleteSystemCommandHandler(mockContext);
        await handler({ url: 'https://nonexistent.com', client: '200' });

        expect(showErrorMessageSpy).toHaveBeenCalledWith(
            'Connection [https://nonexistent.com/200] not found in the secure store. Please ensure the connection is saved correctly.'
        );
    });

    it('should not delete the system if the user cancels the confirmation prompt', async () => {
        const vsCodeWindow = vscodeMod.window;
        const showWarningMessageSpy = jest.spyOn(vsCodeWindow, 'showWarningMessage');

        mockConfirmPrompt.mockResolvedValue(false);
        systemServiceReadMock.mockResolvedValue({
            url: 'https://example.com',
            client: '100',
            name: 'Test System',
            systemType: 'OnPrem'
        });

        const handler = deleteSystemCommandHandler(mockContext);
        await handler({ url: 'https://example.com', client: '100' });

        expect(showWarningMessageSpy).toHaveBeenCalledWith('Deletion cancelled for connection: [Test System].');
        expect(systemServiceDeleteMock).not.toHaveBeenCalled();
    });
});
