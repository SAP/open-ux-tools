import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';
import { addSystemRemoveCommand } from '../../../../src/cli/system/remove';
import * as logger from '../../../../src/tracing/logger';
import * as btpUtils from '@sap-ux/btp-utils';
import * as store from '@sap-ux/store';
import { BackendSystem, SystemType, ConnectionType, AuthenticationType } from '@sap-ux/store';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn().mockReturnValue(false)
}));

const { mockedService } = store as unknown as { mockedService: Record<string, jest.Mock> };
const isAppStudioMock = btpUtils.isAppStudio as jest.Mock;

const mockSystem = new BackendSystem({
    name: 'My System',
    url: 'https://my-sap.example.com',
    systemType: SystemType.AbapOnPrem,
    connectionType: ConnectionType.AbapCatalog,
    authenticationType: AuthenticationType.Basic
});

describe('system/remove', () => {
    let loggerMock: ToolsLogger;

    const getArgv = (args: string[]) => ['', '', ...args];

    beforeEach(() => {
        jest.clearAllMocks();

        loggerMock = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        jest.spyOn(logger, 'getLogger').mockReturnValue(loggerMock);
        isAppStudioMock.mockReturnValue(false);
        mockedService.read.mockResolvedValue(mockSystem);
        mockedService.delete.mockResolvedValue(true);
    });

    test('should remove an existing system', async () => {
        // Given
        const command = new Command('remove');
        addSystemRemoveCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://my-sap.example.com']));

        // Then
        expect(mockedService.read).toHaveBeenCalledTimes(1);
        expect(mockedService.delete).toHaveBeenCalledWith(mockSystem);
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('removed'));
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('should log error when system not found', async () => {
        // Given
        mockedService.read.mockResolvedValue(undefined);
        const command = new Command('remove');
        addSystemRemoveCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://unknown.example.com']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
        expect(mockedService.delete).not.toHaveBeenCalled();
    });

    test('should log error when delete returns false', async () => {
        // Given
        mockedService.delete.mockResolvedValue(false);
        const command = new Command('remove');
        addSystemRemoveCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://my-sap.example.com']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Failed to remove'));
    });

    test('should log error and exit when running in BAS', async () => {
        // Given
        isAppStudioMock.mockReturnValue(true);
        const command = new Command('remove');
        addSystemRemoveCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://my-sap.example.com']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Business Application Studio'));
        expect(mockedService.delete).not.toHaveBeenCalled();
    });

    test('should log error when delete throws', async () => {
        // Given
        mockedService.delete.mockRejectedValueOnce(new Error('Keychain error'));
        const command = new Command('remove');
        addSystemRemoveCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://my-sap.example.com']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith('Keychain error');
    });
});
