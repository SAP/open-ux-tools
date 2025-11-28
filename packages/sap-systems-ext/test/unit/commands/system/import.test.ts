import type { SystemCommandContext } from '../../../../src/types/system';
import { PanelManager, type SystemPanel } from '../../../../src/panel';
import { importSystemCommandHandler } from '../../../../src/commands/system/import';
import { join } from 'path';
import * as utils from '../../../../src/utils';
import * as vscodeMod from 'vscode';
import { SystemPanelViewType } from '../../../../src/utils/constants';

const systemServiceReadMock = jest.fn();

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn().mockImplementation(() => ({
        read: systemServiceReadMock
    }))
}));

jest.mock('../../../../src/utils', () => ({
    ...jest.requireActual('../../../../src/utils'),
    confirmPrompt: jest.fn(),
    logTelemetryEvent: jest.fn()
}));

describe('Test the import system command handler', () => {
    const panelManager = new PanelManager<SystemPanel>();
    const mockContext = {
        panelManager,
        extContext: {
            extensionPath: '/mock/extension/path'
        }
    } as SystemCommandContext;

    const vsCodeWindow = vscodeMod.window;
    const getOrCreateNewPanelSpy = jest.spyOn(panelManager, 'getOrCreateNewPanel');

    beforeAll(async () => {
        await utils.initI18n();
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

        expect(showErrorMessageSpy).toHaveBeenCalledWith('Failed to import system configuration.');
    });

    it('should show error message that config is incomplete and missing system url', async () => {
        jest.spyOn(vsCodeWindow, 'showOpenDialog').mockResolvedValue([
            { path: join(__dirname, '../../../fixtures/import/no-url-test.json') } as vscodeMod.Uri
        ]);
        const showErrorMessageSpy = jest.spyOn(vsCodeWindow, 'showErrorMessage');

        const handler = importSystemCommandHandler(mockContext);
        await handler();

        expect(showErrorMessageSpy).toHaveBeenCalledWith('System configuration is incomplete. A URL is required.');
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
                `No systems defined in configuration file: ${join(
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
        jest.spyOn(utils, 'confirmPrompt').mockResolvedValue(false);
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

        jest.spyOn(utils, 'confirmPrompt').mockResolvedValue(true);

        const handler = importSystemCommandHandler(mockContext);
        await handler();

        expect(getOrCreateNewPanelSpy).toHaveReturnedWith(
            expect.objectContaining({ systemPanelViewType: SystemPanelViewType.View })
        );
    });
});
