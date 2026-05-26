import { jest } from '@jest/globals';
import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';
import { BackendSystem, SystemType, ConnectionType, AuthenticationType } from '@sap-ux/store';

const mockGetLogger = jest.fn();
const mockSetLogLevelVerbose = jest.fn();
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

const { addSystemListCommand } = await import('../../../../src/cli/list/system.js');

const mockSystem = new BackendSystem({
    name: 'My System',
    url: 'https://my-sap.example.com',
    client: '100',
    systemType: SystemType.AbapOnPrem,
    connectionType: ConnectionType.AbapCatalog,
    authenticationType: AuthenticationType.Basic,
    username: 'user1',
    password: 'secret'
});

describe('system/list', () => {
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
        mockedService.getAll.mockResolvedValue([mockSystem]);
    });

    test('should list systems in human-readable format', async () => {
        // Given
        const command = new Command('list');
        addSystemListCommand(command);

        // When
        await command.parseAsync(getArgv(['system']));

        // Then
        expect(mockedService.getAll).toHaveBeenCalledTimes(1);
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('Systems (1)'));
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('My System'));
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('https://my-sap.example.com'));
        // Sensitive data must never appear in output
        expect(loggerMock.info).not.toHaveBeenCalledWith(expect.stringContaining('secret'));
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('should list systems as JSON', async () => {
        // Given
        const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const command = new Command('list');
        addSystemListCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--json']));

        // Then
        expect(stdoutSpy).toHaveBeenCalledTimes(1);
        const parsed = JSON.parse((stdoutSpy.mock.calls[0][0] as string).trim());
        expect(parsed[0].name).toBe('My System');
        expect(parsed[0].password).toBeUndefined();
        expect(parsed[0].username).toBeUndefined();
        stdoutSpy.mockRestore();
    });

    test('should show message when no systems found', async () => {
        // Given
        mockedService.getAll.mockResolvedValue([]);
        const command = new Command('list');
        addSystemListCommand(command);

        // When
        await command.parseAsync(getArgv(['system']));

        // Then
        expect(loggerMock.info).toHaveBeenCalledWith('No systems found.');
    });

    test('should log error and exit when running in BAS', async () => {
        // Given
        isAppStudioMock.mockReturnValue(true);
        const command = new Command('list');
        addSystemListCommand(command);

        // When
        await command.parseAsync(getArgv(['system']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Business Application Studio'));
        expect(mockedService.getAll).not.toHaveBeenCalled();
    });

    test('should log error when getAll throws', async () => {
        // Given
        mockedService.getAll.mockRejectedValueOnce(new Error('Store error'));
        const command = new Command('list');
        addSystemListCommand(command);

        // When
        await command.parseAsync(getArgv(['system']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith('Store error');
    });
});
