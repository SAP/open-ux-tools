import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';
import { addSystemAddCommand } from '../../../../src/cli/system/add';
import * as logger from '../../../../src/tracing/logger';
import * as btpUtils from '@sap-ux/btp-utils';
import * as store from '@sap-ux/store';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn().mockReturnValue(false)
}));

const { mockedService } = store as unknown as { mockedService: Record<string, jest.Mock> };
const isAppStudioMock = btpUtils.isAppStudio as jest.Mock;

describe('system/add', () => {
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
        mockedService.read.mockResolvedValue(undefined);
        mockedService.write.mockResolvedValue(undefined);
    });

    test('should add a system with required options', async () => {
        // Given
        const command = new Command('add');
        addSystemAddCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--name', 'My System', '--url', 'https://my-sap.example.com']));

        // Then
        expect(mockedService.write).toHaveBeenCalledTimes(1);
        const written = mockedService.write.mock.calls[0][0];
        expect(written.name).toBe('My System');
        expect(written.url).toBe('https://my-sap.example.com');
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('added'));
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('should add a system with username and password', async () => {
        // Given
        const command = new Command('add');
        addSystemAddCommand(command);

        // When
        await command.parseAsync(
            getArgv([
                'system',
                '--name',
                'My System',
                '--url',
                'https://example.com',
                '--username',
                'user1',
                '--password',
                'secret'
            ])
        );

        // Then
        const written = mockedService.write.mock.calls[0][0];
        expect(written.username).toBe('user1');
        expect(written.password).toBe('secret');
    });

    test('should add a system without credentials', async () => {
        // Given
        const command = new Command('add');
        addSystemAddCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--name', 'My System', '--url', 'https://example.com']));

        // Then
        const written = mockedService.write.mock.calls[0][0];
        expect(written.username).toBeUndefined();
        expect(written.password).toBeUndefined();
    });

    test('should log error and exit when running in BAS', async () => {
        // Given
        isAppStudioMock.mockReturnValue(true);
        const command = new Command('add');
        addSystemAddCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--name', 'My System', '--url', 'https://example.com']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Business Application Studio'));
        expect(mockedService.write).not.toHaveBeenCalled();
    });

    test('should log error when write throws', async () => {
        // Given
        mockedService.write.mockRejectedValueOnce(new Error('System already exists'));
        const command = new Command('add');
        addSystemAddCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--name', 'My System', '--url', 'https://example.com']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith('System already exists');
    });

    test('should log error for invalid --type value', async () => {
        // Given
        const command = new Command('add');
        addSystemAddCommand(command);

        // When
        await command.parseAsync(
            getArgv(['system', '--name', 'My System', '--url', 'https://example.com', '--type', 'FooBar'])
        );

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining("Invalid system type 'FooBar'"));
        expect(mockedService.write).not.toHaveBeenCalled();
    });

    test('should log error for invalid --auth value', async () => {
        // Given
        const command = new Command('add');
        addSystemAddCommand(command);

        // When
        await command.parseAsync(
            getArgv(['system', '--name', 'My System', '--url', 'https://example.com', '--auth', 'notAnAuthType'])
        );

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining("Invalid auth type 'notAnAuthType'"));
        expect(mockedService.write).not.toHaveBeenCalled();
    });

    test('should log error for invalid --connection-type value', async () => {
        // Given
        const command = new Command('add');
        addSystemAddCommand(command);

        // When
        await command.parseAsync(
            getArgv(['system', '--name', 'My System', '--url', 'https://example.com', '--connection-type', 'bad_type'])
        );

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining("Invalid connection type 'bad_type'"));
        expect(mockedService.write).not.toHaveBeenCalled();
    });

    test('should log error for invalid URL', async () => {
        // Given
        const command = new Command('add');
        addSystemAddCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--name', 'My System', '--url', 'not-a-valid-url']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Invalid URL'));
        expect(mockedService.write).not.toHaveBeenCalled();
    });

    test('should log error when system already exists', async () => {
        // Given
        mockedService.read.mockResolvedValueOnce({ name: 'Existing System' });
        const command = new Command('add');
        addSystemAddCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--name', 'My System', '--url', 'https://example.com']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('already exists'));
        expect(mockedService.write).not.toHaveBeenCalled();
    });
});
