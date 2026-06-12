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

const { addSystemGetCommand } = await import('../../../../src/cli/get/system.js');

const mockSystem = new BackendSystem({
    name: 'My System',
    url: 'https://my-sap.example.com',
    systemType: SystemType.AbapOnPrem,
    connectionType: ConnectionType.AbapCatalog,
    authenticationType: AuthenticationType.Basic,
    username: 'user1',
    password: 'secret'
});

describe('system/get', () => {
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
    });

    test('should print system details in human-readable format', async () => {
        // Given
        const command = new Command('get');
        addSystemGetCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://my-sap.example.com']));

        // Then
        expect(mockedService.read).toHaveBeenCalledTimes(1);
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('My System'));
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('https://my-sap.example.com'));
        // Sensitive data must never appear
        expect(loggerMock.info).not.toHaveBeenCalledWith(expect.stringContaining('secret'));
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('should output system as JSON', async () => {
        // Given
        const writes: string[] = [];
        const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
            writes.push(chunk as string);
            return true;
        });
        const command = new Command('get');
        addSystemGetCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://my-sap.example.com', '--json']));

        // Then — find the call that contains the JSON payload (other writes may originate from
        // the test runner's own stdout output and are not relevant to this assertion).
        const jsonCall = stdoutSpy.mock.calls.find((call) => typeof call[0] === 'string' && call[0].includes('"name"'));
        expect(jsonCall).toBeDefined();
        const parsed = JSON.parse((jsonCall![0] as string).trim());
        expect(parsed.name).toBe('My System');
        expect(parsed.password).toBeUndefined();
        expect(parsed.username).toBeUndefined();
    });

    test('should log error when system not found', async () => {
        // Given
        mockedService.read.mockResolvedValue(undefined);
        const command = new Command('get');
        addSystemGetCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://unknown.example.com']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });

    test('should log error and exit when running in BAS', async () => {
        // Given
        isAppStudioMock.mockReturnValue(true);
        const command = new Command('get');
        addSystemGetCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://my-sap.example.com']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Business Application Studio'));
        expect(mockedService.read).not.toHaveBeenCalled();
    });
});
