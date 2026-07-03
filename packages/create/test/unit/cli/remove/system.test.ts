import { jest } from '@jest/globals';
import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';
import { BackendSystem, SystemType, ConnectionType, AuthenticationType } from '@sap-ux/store';

const mockGetLogger = jest.fn() as jest.Mock;
const mockSetLogLevelVerbose = jest.fn() as jest.Mock;
jest.unstable_mockModule('../../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: mockSetLogLevelVerbose
}));

const isAppStudioMock = jest.fn().mockReturnValue(false);
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: isAppStudioMock
}));

const mockedService = {
    read: jest.fn<any>().mockResolvedValue(undefined),
    write: jest.fn<any>().mockResolvedValue(undefined),
    delete: jest.fn<any>().mockResolvedValue(true),
    getAll: jest.fn<any>().mockResolvedValue([]),
    partialUpdate: jest.fn<any>().mockResolvedValue(undefined)
};
const actualStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...actualStore,
    getService: jest.fn().mockResolvedValue(mockedService)
}));

const { addSystemRemoveCommand } = await import('../../../../src/cli/remove/system.js');

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
        mockGetLogger.mockReturnValue(loggerMock);
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
