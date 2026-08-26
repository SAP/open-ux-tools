import { jest } from '@jest/globals';
import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';

const mockGetLogger = jest.fn() as jest.Mock;
const mockSetLogLevelVerbose = jest.fn() as jest.Mock;
jest.unstable_mockModule('../../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: mockSetLogLevelVerbose
}));

const isAppStudioMock = jest.fn().mockReturnValue(false);
const actualBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...actualBtpUtils,
    isAppStudio: isAppStudioMock
}));

// Mock prompts - return empty object (no interactive prompting)
const mockPrompts = jest.fn().mockResolvedValue({});
jest.unstable_mockModule('prompts', () => ({
    default: mockPrompts
}));

// Mock connection check to always succeed and not prompt
const mockCheckConnectionOrPrompt = jest.fn().mockResolvedValue(true);
jest.unstable_mockModule('../../../../src/cli/utils/system-connection', () => ({
    checkConnectionOrPrompt: mockCheckConnectionOrPrompt,
    checkSystemConnection: jest.fn().mockResolvedValue({ success: true })
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

const { addSystemAddCommand } = await import('../../../../src/cli/add/system.js');

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
        mockGetLogger.mockReturnValue(loggerMock);
        isAppStudioMock.mockReturnValue(false);
        mockedService.read.mockResolvedValue(undefined);
        mockedService.write.mockResolvedValue(undefined);
        mockCheckConnectionOrPrompt.mockResolvedValue(true);
        mockPrompts.mockResolvedValue({});
    });

    test('should add a system with all flags provided (no prompting)', async () => {
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
                'https://my-sap.example.com',
                '--client',
                '',
                '--username',
                'testuser',
                '--password',
                'testpass',
                '--skip-check'
            ])
        );

        // Then
        expect(mockedService.write).toHaveBeenCalledTimes(1);
        const written = mockedService.write.mock.calls[0][0] as { name: string; url: string };
        expect(written.name).toBe('My System');
        expect(written.url).toBe('https://my-sap.example.com');
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('added'));
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(mockPrompts).not.toHaveBeenCalled(); // No interactive prompting when all provided
        expect(mockCheckConnectionOrPrompt).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'https://my-sap.example.com'
            }),
            true // skipCheck = true
        );
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
                'secret',
                '--skip-check'
            ])
        );

        // Then
        const written = mockedService.write.mock.calls[0][0] as { username: string; password: string };
        expect(written.username).toBe('user1');
        expect(written.password).toBe('secret');
    });

    test('should add a system without credentials', async () => {
        // Given
        const command = new Command('add');
        addSystemAddCommand(command);

        // When
        await command.parseAsync(
            getArgv(['system', '--name', 'My System', '--url', 'https://example.com', '--skip-check'])
        );

        // Then
        const written = mockedService.write.mock.calls[0][0] as { username?: string; password?: string };
        expect(written.username).toBeUndefined();
        expect(written.password).toBeUndefined();
    });

    test('should check connection when not using --skip-check', async () => {
        // Given
        const command = new Command('add');
        addSystemAddCommand(command);

        // When
        await command.parseAsync(
            getArgv(['system', '--name', 'My System', '--url', 'https://example.com', '--username', 'user1'])
        );

        // Then
        expect(mockCheckConnectionOrPrompt).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'https://example.com',
                username: 'user1'
            }),
            false // skipCheck = false
        );
    });

    test('should not save system when connection check fails and user declines', async () => {
        // Given
        mockCheckConnectionOrPrompt.mockResolvedValue(false); // User said "No" to save anyway
        const command = new Command('add');
        addSystemAddCommand(command);

        // When
        await command.parseAsync(
            getArgv(['system', '--name', 'My System', '--url', 'https://example.com', '--username', 'user1'])
        );

        // Then
        expect(mockCheckConnectionOrPrompt).toHaveBeenCalled();
        expect(mockedService.write).not.toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalledWith('System was not saved.');
    });

    test('should log error and exit when running in BAS', async () => {
        // Given
        isAppStudioMock.mockReturnValue(true);
        const command = new Command('add');
        addSystemAddCommand(command);

        // When
        await command.parseAsync(
            getArgv(['system', '--name', 'My System', '--url', 'https://example.com', '--skip-check'])
        );

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
        await command.parseAsync(
            getArgv(['system', '--name', 'My System', '--url', 'https://example.com', '--skip-check'])
        );

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith('System already exists');
    });

    test('should log error for invalid --type value', async () => {
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
                '--type',
                'FooBar',
                '--skip-check'
            ])
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
            getArgv([
                'system',
                '--name',
                'My System',
                '--url',
                'https://example.com',
                '--auth',
                'notAnAuthType',
                '--skip-check'
            ])
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
            getArgv([
                'system',
                '--name',
                'My System',
                '--url',
                'https://example.com',
                '--connection-type',
                'bad_type',
                '--skip-check'
            ])
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
        await command.parseAsync(
            getArgv(['system', '--name', 'My System', '--url', 'not-a-valid-url', '--skip-check'])
        );

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Invalid URL'));
        expect(mockedService.write).not.toHaveBeenCalled();
    });

    test('should log error for invalid client format', async () => {
        // Given
        const command = new Command('add');
        addSystemAddCommand(command);

        // When - test with 2-digit client (invalid)
        await command.parseAsync(
            getArgv(['system', '--name', 'My System', '--url', 'https://example.com', '--client', '12', '--skip-check'])
        );

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Invalid client'));
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('000-999'));
        expect(mockedService.write).not.toHaveBeenCalled();
    });

    test('should accept valid 3-digit client', async () => {
        // Given
        const command = new Command('add');
        addSystemAddCommand(command);

        // When - test with valid 3-digit client
        await command.parseAsync(
            getArgv([
                'system',
                '--name',
                'My System',
                '--url',
                'https://example.com',
                '--client',
                '100',
                '--skip-check'
            ])
        );

        // Then
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(mockedService.write).toHaveBeenCalled();
    });

    test('should accept empty client', async () => {
        // Given
        const command = new Command('add');
        addSystemAddCommand(command);

        // When - test with empty client
        await command.parseAsync(
            getArgv(['system', '--name', 'My System', '--url', 'https://example.com', '--client', '', '--skip-check'])
        );

        // Then
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(mockedService.write).toHaveBeenCalled();
    });

    test('should log error when system already exists', async () => {
        // Given
        mockedService.read.mockResolvedValueOnce({ name: 'Existing System' });
        const command = new Command('add');
        addSystemAddCommand(command);

        // When
        await command.parseAsync(
            getArgv(['system', '--name', 'My System', '--url', 'https://example.com', '--skip-check'])
        );

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('already exists'));
        expect(mockedService.write).not.toHaveBeenCalled();
    });
});
