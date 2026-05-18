import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';
import { addSystemGetCommand } from '../../../../src/cli/system/get';
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
        jest.spyOn(logger, 'getLogger').mockReturnValue(loggerMock);
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
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const command = new Command('get');
        addSystemGetCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://my-sap.example.com', '--json']));

        // Then
        expect(consoleSpy).toHaveBeenCalledTimes(1);
        const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(parsed.name).toBe('My System');
        expect(parsed.password).toBeUndefined();
        expect(parsed.username).toBeUndefined();
        consoleSpy.mockRestore();
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
