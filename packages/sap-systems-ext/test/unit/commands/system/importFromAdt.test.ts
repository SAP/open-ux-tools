import type { SystemCommandContext } from '../../../../src/types/system';
import { importFromAdtCommandHandler } from '../../../../src/commands/system/importFromAdt';
import * as utils from '../../../../src/utils';
import * as vscodeMod from 'vscode';
import { isSystemNameInUse } from '@sap-ux/store';
import { SystemCommands } from '../../../../src/utils/constants';

const resolveAdtDestinationsMock = jest.fn();
const isSystemNameInUseMock = isSystemNameInUse as jest.Mock;

jest.mock('../../../../src/utils', () => ({
    ...jest.requireActual('../../../../src/utils'),
    resolveAdtDestinations: (): unknown => resolveAdtDestinationsMock()
}));

describe('Test the importFromAdt command handler', () => {
    const mockContext = {
        extContext: {}
    } as unknown as SystemCommandContext;

    const vsCodeWindow = vscodeMod.window;
    const executeCommandMock = vscodeMod.commands.executeCommand as jest.Mock;

    beforeAll(async () => {
        await utils.initI18n();
    });

    beforeEach(() => {
        // default: name not in use, so the panel opens
        isSystemNameInUseMock.mockResolvedValue(false);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('opens the selected destination in the edit webview and prompts for the password', async () => {
        resolveAdtDestinationsMock.mockResolvedValue([
            {
                id: 'SID_100_USER_EN',
                protocol: 'rfc',
                systemId: 'SID',
                client: '000',
                user: 'USER',
                url: 'https://host:port'
            },
            { id: 'SID2_100_USER_EN', protocol: 'rfc', systemId: 'SID2', client: '000' } // unresolved - filtered out
        ]);
        // User picks the first (only importable) destination.
        jest.spyOn(vsCodeWindow, 'showQuickPick').mockImplementation(async (items) => (await items)[0]);
        const infoSpy = jest.spyOn(vsCodeWindow, 'showInformationMessage');

        await importFromAdtCommandHandler(mockContext)();

        // Only the resolved destination is offered in the picker.
        const offered = (vsCodeWindow.showQuickPick as jest.Mock).mock.calls[0][0];
        expect(offered).toHaveLength(1);
        expect(offered[0].label).toBe('SID_100_USER_EN');

        // The public "create system" command is invoked with the pre-filled system.
        expect(executeCommandMock).toHaveBeenCalledTimes(1);
        const [command, backendSystem] = executeCommandMock.mock.calls[0];
        expect(command).toBe(SystemCommands.Create);
        expect(backendSystem).toMatchObject({
            name: 'SID_100_USER_EN', // destination id is used as the system name
            url: 'https://host:port',
            client: '000',
            username: 'USER', // destination user becomes the system user
            userDisplayName: 'USER',
            systemType: 'OnPrem',
            connectionType: 'abap_catalog',
            systemInfo: { systemId: 'SID', client: '000' }
        });
        // Password prompt references the imported system by name.
        expect(infoSpy).toHaveBeenCalled();
    });

    it('does nothing when the user cancels the picker', async () => {
        resolveAdtDestinationsMock.mockResolvedValue([
            { id: 'SID_100_USER_EN', protocol: 'rfc', systemId: 'SID', client: '000', url: 'https://host:port' }
        ]);
        jest.spyOn(vsCodeWindow, 'showQuickPick').mockResolvedValue(undefined);

        await importFromAdtCommandHandler(mockContext)();

        expect(executeCommandMock).not.toHaveBeenCalled();
    });

    it('tells the user and does not open the panel when a system already exists for the destination', async () => {
        resolveAdtDestinationsMock.mockResolvedValue([
            { id: 'SID_100_USER_EN', protocol: 'rfc', systemId: 'SID', client: '000', url: 'https://host:port' }
        ]);
        jest.spyOn(vsCodeWindow, 'showQuickPick').mockImplementation(async (items) => (await items)[0]);
        isSystemNameInUseMock.mockResolvedValue(true);
        const infoSpy = jest.spyOn(vsCodeWindow, 'showInformationMessage');

        await importFromAdtCommandHandler(mockContext)();

        expect(isSystemNameInUseMock).toHaveBeenCalledWith('SID_100_USER_EN');
        expect(executeCommandMock).not.toHaveBeenCalled();
        expect(infoSpy).toHaveBeenCalled();
    });

    it('shows an info message when there are no destinations', async () => {
        resolveAdtDestinationsMock.mockResolvedValue([]);
        const infoSpy = jest.spyOn(vsCodeWindow, 'showInformationMessage');

        await importFromAdtCommandHandler(mockContext)();

        expect(executeCommandMock).not.toHaveBeenCalled();
        expect(infoSpy).toHaveBeenCalled();
    });

    it('shows a message when destinations exist but none could be resolved', async () => {
        resolveAdtDestinationsMock.mockResolvedValue([{ id: 'SID_100_USER_EN', protocol: 'rfc' }]);
        const infoSpy = jest.spyOn(vsCodeWindow, 'showInformationMessage');

        await importFromAdtCommandHandler(mockContext)();

        expect(executeCommandMock).not.toHaveBeenCalled();
        expect(infoSpy).toHaveBeenCalled();
    });

    it('shows an error when resolution throws', async () => {
        resolveAdtDestinationsMock.mockRejectedValue(new Error('boom'));
        const errorSpy = jest.spyOn(vsCodeWindow, 'showErrorMessage');

        await importFromAdtCommandHandler(mockContext)();

        expect(errorSpy).toHaveBeenCalled();
    });
});
