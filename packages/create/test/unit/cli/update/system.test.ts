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
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
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

const { addSystemUpdateCommand } = await import('../../../../src/cli/update/system.js');

describe('system/update (update command group)', () => {
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
        mockedService.partialUpdate.mockResolvedValue(undefined);
        // Default: system exists
        mockedService.read.mockResolvedValue({ name: 'My System' });
        mockCheckConnectionOrPrompt.mockResolvedValue(true);
        mockPrompts.mockResolvedValue({});
    });

    test('should update system name', async () => {
        // Given
        const command = new Command('update');
        addSystemUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://my-sap.example.com', '--name', 'Updated Name']));

        // Then
        expect(mockedService.partialUpdate).toHaveBeenCalledTimes(1);
        const [, patch] = mockedService.partialUpdate.mock.calls[0] as [unknown, { name: string }];
        expect(patch.name).toBe('Updated Name');
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('updated'));
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('should update username and password', async () => {
        // Given
        const command = new Command('update');
        addSystemUpdateCommand(command);

        // When
        await command.parseAsync(
            getArgv(['system', '--url', 'https://example.com', '--username', 'newuser', '--password', 'newpassword'])
        );

        // Then
        const [, patch] = mockedService.partialUpdate.mock.calls[0] as [
            unknown,
            { username: string; password: string }
        ];
        expect(patch.username).toBe('newuser');
        expect(patch.password).toBe('newpassword');
    });

    test('should update password only', async () => {
        // Given
        const command = new Command('update');
        addSystemUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://example.com', '--password', 'newpassword']));

        // Then
        const [, patch] = mockedService.partialUpdate.mock.calls[0] as [
            unknown,
            { username?: string; password: string }
        ];
        expect(patch.password).toBe('newpassword');
        expect(patch.username).toBeUndefined();
    });

    test('should clear credentials when --clear-credentials is passed', async () => {
        // Given
        const command = new Command('update');
        addSystemUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://example.com', '--clear-credentials']));

        // Then
        const [, patch] = mockedService.partialUpdate.mock.calls[0] as [
            unknown,
            { username?: string; password?: string }
        ];
        expect(patch.username).toBeUndefined();
        expect(patch.password).toBeUndefined();
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('updated'));
    });

    test('should log error when no fields to update', async () => {
        // Given
        mockPrompts.mockResolvedValueOnce({ fields: [] }); // User selects nothing in multi-select
        const command = new Command('update');
        addSystemUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://example.com', '--client', '']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith('At least one field must be selected');
        expect(mockedService.partialUpdate).not.toHaveBeenCalled();
    });

    test('should log error and exit when running in BAS', async () => {
        // Given
        isAppStudioMock.mockReturnValue(true);
        const command = new Command('update');
        addSystemUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://example.com', '--name', 'New Name']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Business Application Studio'));
        expect(mockedService.partialUpdate).not.toHaveBeenCalled();
    });

    test('should log error when partialUpdate throws', async () => {
        // Given
        mockedService.read.mockResolvedValueOnce({ name: 'existing' });
        mockedService.partialUpdate.mockRejectedValueOnce(new Error('Store error'));
        const command = new Command('update');
        addSystemUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://example.com', '--name', 'New Name']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith('Store error');
    });

    test('should log error when system does not exist', async () => {
        // Given
        mockedService.read.mockResolvedValueOnce(undefined);
        const command = new Command('update');
        addSystemUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://unknown.example.com', '--name', 'New Name']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
        expect(mockedService.partialUpdate).not.toHaveBeenCalled();
    });
});
