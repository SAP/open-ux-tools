import { jest } from '@jest/globals';
import type { SystemCommandContext } from '../../../../src/types/system';
import { join } from 'node:path';
import * as vscodeMod from 'vscode';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const systemServiceReadMock = jest.fn();
const mockConfirmPrompt = jest.fn();
const mockLogTelemetryEvent = jest.fn();

const realStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    getService: jest.fn().mockImplementation(() => ({
        read: systemServiceReadMock
    }))
}));

const realUtils = await import('../../../../src/utils');
jest.unstable_mockModule('../../../../src/utils', () => ({
    ...realUtils,
    confirmPrompt: mockConfirmPrompt,
    logTelemetryEvent: mockLogTelemetryEvent
}));

const { importSystemCommandHandler } = await import('../../../../src/commands/system/import');
const { PanelManager } = await import('../../../../src/panel');
type SystemPanel = import('../../../../src/panel').SystemPanel;
const { initI18n } = await import('../../../../src/utils');
const { SystemPanelViewType } = await import('../../../../src/utils/constants');

describe('Test the import system command handler', () => {
    const panelManager = new PanelManager<SystemPanel>();
    const mockContext = {
        panelManager,
        extContext: {
            vscodeExtContext: {
                extensionPath: '/mock/extension/path'
            }
        }
    } as SystemCommandContext;

    const vsCodeWindow = vscodeMod.window;
    const getOrCreateNewPanelSpy = jest.spyOn(panelManager, 'getOrCreateNewPanel');

    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should import a system and reveal a new system panel', async () => {
        jest.spyOn(vsCodeWindow, 'showOpenDialog').mockResolvedValue([
            { path: join(__dirname, '../../../fixtures/import/valid-test.json') } as vscodeMod.Uri
        ]);
        systemServiceReadMock.mockResolvedValue(undefined);

        const handler = importSystemCommandHandler(mockContext);
        await handler();

        expect(getOrCreateNewPanelSpy).toHaveBeenCalledWith('https://import.test.url.com/100', expect.any(Function));
    });

    it('should show error message that no (config) file was selected for importing', async () => {
        jest.spyOn(vsCodeWindow, 'showOpenDialog').mockResolvedValue(undefined);
        const showErrorMessageSpy = jest.spyOn(vsCodeWindow, 'showErrorMessage');

        const handler = importSystemCommandHandler(mockContext);
        await handler();

        expect(showErrorMessageSpy).toHaveBeenCalledWith('No file selected for import.');
    });

    it('should show error message when read from store throws an error', async () => {
        jest.spyOn(vsCodeWindow, 'showOpenDialog').mockResolvedValue([
            { path: join(__dirname, '../../../fixtures/import/valid-test.json') } as vscodeMod.Uri
        ]);
        const showErrorMessageSpy = jest.spyOn(vsCodeWindow, 'showErrorMessage');
        systemServiceReadMock.mockRejectedValueOnce(undefined);

        const handler = importSystemCommandHandler(mockContext);
        await handler();

        expect(showErrorMessageSpy).toHaveBeenCalledWith('Failed to import the connection configuration.');
    });

    it('should show error message that config is incomplete and missing system url', async () => {
        jest.spyOn(vsCodeWindow, 'showOpenDialog').mockResolvedValue([
            { path: join(__dirname, '../../../fixtures/import/no-url-test.json') } as vscodeMod.Uri
        ]);
        const showErrorMessageSpy = jest.spyOn(vsCodeWindow, 'showErrorMessage');

        const handler = importSystemCommandHandler(mockContext);
        await handler();

        expect(showErrorMessageSpy).toHaveBeenCalledWith('Connection configuration is incomplete. A URL is required.');
    });

    it('should show error message that config is does not contain any system configs', async () => {
        jest.spyOn(vsCodeWindow, 'showOpenDialog').mockResolvedValue([
            { path: join(__dirname, '../../../fixtures/import/invalid-test.json') } as vscodeMod.Uri
        ]);
        const showErrorMessageSpy = jest.spyOn(vsCodeWindow, 'showErrorMessage');

        const handler = importSystemCommandHandler(mockContext);
        await handler();

        expect(showErrorMessageSpy).toHaveBeenCalledWith(
            expect.stringContaining(
                `No connections defined in the configuration file: ${join(
                    __dirname,
                    '../../../fixtures/import/invalid-test.json'
                )}`
            )
        );
    });

    it('should show a warning message when the user does not accept the confirm prompt', async () => {
        jest.spyOn(vsCodeWindow, 'showOpenDialog').mockResolvedValue([
            { path: join(__dirname, '../../../fixtures/import/valid-test.json') } as vscodeMod.Uri
        ]);
        systemServiceReadMock.mockResolvedValue({
            url: 'https://import.test.url.com',
            client: '100',
            name: 'Existing System',
            systemType: 'OnPrem'
        });
        mockConfirmPrompt.mockResolvedValue(false);
        const showWarningMessageSpy = jest.spyOn(vsCodeWindow, 'showWarningMessage');

        const handler = importSystemCommandHandler(mockContext);
        await handler();

        expect(showWarningMessageSpy).toHaveBeenCalledWith('Import cancelled.');
    });

    it('should launch the system panel in view mode when a system exists', async () => {
        getOrCreateNewPanelSpy.mockClear();
        jest.spyOn(vsCodeWindow, 'showOpenDialog').mockResolvedValue([
            { path: join(__dirname, '../../../fixtures/import/existing-test.json') } as vscodeMod.Uri
        ]);
        systemServiceReadMock.mockResolvedValue({
            url: 'https://existing.system.test.url.com',
            client: '100',
            name: 'Existing System',
            systemType: 'OnPrem',
            username: 'existingUser',
            password: 'existingPass'
        });

        mockConfirmPrompt.mockResolvedValue(true);

        const handler = importSystemCommandHandler(mockContext);
        await handler();

        expect(getOrCreateNewPanelSpy).toHaveReturnedWith(
            expect.objectContaining({ systemPanelViewType: SystemPanelViewType.View })
        );
    });

    it('should import a system with odata_service connection type', async () => {
        jest.spyOn(vsCodeWindow, 'showOpenDialog').mockResolvedValue([
            { path: join(__dirname, '../../../fixtures/import/valid-odata-service-test.json') } as vscodeMod.Uri
        ]);
        systemServiceReadMock.mockResolvedValue(undefined);

        const handler = importSystemCommandHandler(mockContext);
        await handler();

        expect(getOrCreateNewPanelSpy).toHaveBeenCalledWith(
            'https://odata.service.test.url.com/sap/opu/odata/sap/SERVICE_NAME',
            expect.any(Function)
        );
    });

    it('should default to abap_catalog connection type when not specified', async () => {
        jest.spyOn(vsCodeWindow, 'showOpenDialog').mockResolvedValue([
            { path: join(__dirname, '../../../fixtures/import/existing-test.json') } as vscodeMod.Uri
        ]);
        systemServiceReadMock.mockResolvedValue(undefined);

        const handler = importSystemCommandHandler(mockContext);
        await handler();

        expect(getOrCreateNewPanelSpy).toHaveBeenCalled();
        const createPanelFn = getOrCreateNewPanelSpy.mock.calls[0][1];
        const panel = createPanelFn();

        // Access the backendSystem property through the protected/private API
        expect((panel as any).backendSystem?.connectionType).toBe('abap_catalog');
    });
});
