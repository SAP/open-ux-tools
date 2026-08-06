import type { SystemCommandContext } from '../../../../src/types/system';
import { importFromAdtCommandHandler } from '../../../../src/commands/system/importFromAdt';
import * as utils from '../../../../src/utils';
import * as vscodeMod from 'vscode';
import { isSystemNameInUse } from '@sap-ux/store';
import { SystemCommands } from '../../../../src/utils/constants';

const listAdtDestinationsMock = jest.fn();
const resolveAdtDestinationMock = jest.fn();
const isSystemNameInUseMock = isSystemNameInUse as jest.Mock;

jest.mock('../../../../src/utils', () => ({
    ...jest.requireActual('../../../../src/utils'),
    listAdtDestinations: (protocol?: string[]): unknown => listAdtDestinationsMock(protocol),
    resolveAdtDestination: (id: string): unknown => resolveAdtDestinationMock(id)
}));

const RFC_DEST = { id: 'SID_100_USER_EN', protocol: 'rfc', systemId: 'SID', client: '000', user: 'USER' };

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
        isSystemNameInUseMock.mockResolvedValue(false);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('lists only RFC destinations, resolves the picked one, opens the panel and prompts for the password', async () => {
        listAdtDestinationsMock.mockResolvedValue([RFC_DEST]);
        resolveAdtDestinationMock.mockResolvedValue({ ...RFC_DEST, url: 'https://host:port' });
        jest.spyOn(vsCodeWindow, 'showQuickPick').mockImplementation(async (items) => (await items)[0]);
        const infoSpy = jest.spyOn(vsCodeWindow, 'showInformationMessage');

        await importFromAdtCommandHandler(mockContext)();

        // Listing is restricted to RFC destinations and does not resolve every endpoint.
        expect(listAdtDestinationsMock).toHaveBeenCalledWith(['rfc']);
        // Only the picked destination is resolved (the single connection).
        expect(resolveAdtDestinationMock).toHaveBeenCalledTimes(1);
        expect(resolveAdtDestinationMock).toHaveBeenCalledWith('SID_100_USER_EN');

        expect(executeCommandMock).toHaveBeenCalledTimes(1);
        const [command, backendSystem] = executeCommandMock.mock.calls[0];
        expect(command).toBe(SystemCommands.Create);
        expect(backendSystem).toMatchObject({
            name: 'SID_100_USER_EN',
            url: 'https://host:port',
            client: '000',
            username: 'USER',
            userDisplayName: 'USER',
            systemType: 'OnPrem',
            connectionType: 'abap_catalog',
            systemInfo: { systemId: 'SID', client: '000' }
        });
        expect(infoSpy).toHaveBeenCalled();
    });

    it('does nothing when the user cancels the picker (and does not resolve/connect)', async () => {
        listAdtDestinationsMock.mockResolvedValue([RFC_DEST]);
        jest.spyOn(vsCodeWindow, 'showQuickPick').mockResolvedValue(undefined);

        await importFromAdtCommandHandler(mockContext)();

        expect(resolveAdtDestinationMock).not.toHaveBeenCalled();
        expect(executeCommandMock).not.toHaveBeenCalled();
    });

    it('tells the user and does not connect when a system already exists for the destination', async () => {
        listAdtDestinationsMock.mockResolvedValue([RFC_DEST]);
        jest.spyOn(vsCodeWindow, 'showQuickPick').mockImplementation(async (items) => (await items)[0]);
        isSystemNameInUseMock.mockResolvedValue(true);
        const infoSpy = jest.spyOn(vsCodeWindow, 'showInformationMessage');

        await importFromAdtCommandHandler(mockContext)();

        expect(isSystemNameInUseMock).toHaveBeenCalledWith('SID_100_USER_EN');
        // Name check happens before resolving, so no connection is attempted.
        expect(resolveAdtDestinationMock).not.toHaveBeenCalled();
        expect(executeCommandMock).not.toHaveBeenCalled();
        expect(infoSpy).toHaveBeenCalled();
    });

    it('shows an info message when there are no RFC destinations', async () => {
        listAdtDestinationsMock.mockResolvedValue([]);
        const infoSpy = jest.spyOn(vsCodeWindow, 'showInformationMessage');

        await importFromAdtCommandHandler(mockContext)();

        expect(resolveAdtDestinationMock).not.toHaveBeenCalled();
        expect(executeCommandMock).not.toHaveBeenCalled();
        expect(infoSpy).toHaveBeenCalled();
    });

    it('warns when the picked destination could not be resolved to an HTTP endpoint', async () => {
        listAdtDestinationsMock.mockResolvedValue([RFC_DEST]);
        resolveAdtDestinationMock.mockResolvedValue({ ...RFC_DEST }); // no url
        jest.spyOn(vsCodeWindow, 'showQuickPick').mockImplementation(async (items) => (await items)[0]);
        const warnSpy = jest.spyOn(vsCodeWindow, 'showWarningMessage');

        await importFromAdtCommandHandler(mockContext)();

        expect(executeCommandMock).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalled();
    });

    it('shows an error when listing throws', async () => {
        listAdtDestinationsMock.mockRejectedValue(new Error('boom'));
        const errorSpy = jest.spyOn(vsCodeWindow, 'showErrorMessage');

        await importFromAdtCommandHandler(mockContext)();

        expect(errorSpy).toHaveBeenCalled();
    });
});
