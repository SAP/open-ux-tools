import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';
import { addListSystemCommand } from '../../../../src/cli/list/system';
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
    client: '100',
    systemType: SystemType.AbapOnPrem,
    connectionType: ConnectionType.AbapCatalog,
    authenticationType: AuthenticationType.Basic,
    username: 'user1',
    password: 'secret'
});

describe('list/system', () => {
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
        mockedService.getAll.mockResolvedValue([mockSystem]);
    });

    test('should list systems in human-readable format', async () => {
        // Given
        const command = new Command('list');
        addListSystemCommand(command);

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
        const command = new Command('list');
        addListSystemCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--json']));

        // Then
        const jsonCall = (loggerMock.info as jest.Mock).mock.calls.find((args) => {
            try {
                JSON.parse(args[0]);
                return true;
            } catch {
                return false;
            }
        });
        expect(jsonCall).toBeDefined();
        const parsed = JSON.parse(jsonCall[0]);
        expect(parsed[0].name).toBe('My System');
        expect(parsed[0].password).toBeUndefined();
        expect(parsed[0].username).toBeUndefined();
    });

    test('should show message when no systems found', async () => {
        // Given
        mockedService.getAll.mockResolvedValue([]);
        const command = new Command('list');
        addListSystemCommand(command);

        // When
        await command.parseAsync(getArgv(['system']));

        // Then
        expect(loggerMock.info).toHaveBeenCalledWith('No systems found.');
    });

    test('should log error and exit when running in BAS', async () => {
        // Given
        isAppStudioMock.mockReturnValue(true);
        const command = new Command('list');
        addListSystemCommand(command);

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
        addListSystemCommand(command);

        // When
        await command.parseAsync(getArgv(['system']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith('Store error');
    });
});
