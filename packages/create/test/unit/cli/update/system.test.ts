import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';
import { addUpdateSystemCommand } from '../../../../src/cli/update/system';
import * as logger from '../../../../src/tracing/logger';
import * as btpUtils from '@sap-ux/btp-utils';
import * as store from '@sap-ux/store';
import * as prompts from 'prompts';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn().mockReturnValue(false)
}));

jest.mock('prompts', () => ({
    ...jest.requireActual('prompts'),
    prompt: jest.fn()
}));

const mockPrompt = prompts.prompt as jest.Mock;
const { mockedService } = store as unknown as { mockedService: Record<string, jest.Mock> };
const isAppStudioMock = btpUtils.isAppStudio as jest.Mock;

describe('update/system', () => {
    let loggerMock: ToolsLogger;

    const getArgv = (args: string[]) => ['', '', ...args];

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.SAP_UX_SYSTEM_PASSWORD;

        loggerMock = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        jest.spyOn(logger, 'getLogger').mockReturnValue(loggerMock);
        isAppStudioMock.mockReturnValue(false);
        mockedService.partialUpdate.mockResolvedValue(undefined);
    });

    test('should update system name', async () => {
        // Given
        const command = new Command('update');
        addUpdateSystemCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://my-sap.example.com', '--name', 'Updated Name']));

        // Then
        expect(mockedService.partialUpdate).toHaveBeenCalledTimes(1);
        const [, patch] = mockedService.partialUpdate.mock.calls[0];
        expect(patch.name).toBe('Updated Name');
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('updated successfully'));
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('should update username and prompt for password', async () => {
        // Given
        mockPrompt.mockResolvedValueOnce({ password: 'newpassword' });
        const command = new Command('update');
        addUpdateSystemCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://example.com', '--username', 'newuser']));

        // Then
        expect(mockPrompt).toHaveBeenCalledWith(expect.objectContaining({ type: 'password' }));
        const [, patch] = mockedService.partialUpdate.mock.calls[0];
        expect(patch.username).toBe('newuser');
        expect(patch.password).toBe('newpassword');
    });

    test('should read new password from env var and skip prompt', async () => {
        // Given
        process.env.SAP_UX_SYSTEM_PASSWORD = 'newenvpwd';
        const command = new Command('update');
        addUpdateSystemCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://example.com', '--username', 'newuser']));

        // Then
        expect(mockPrompt).not.toHaveBeenCalled();
        const [, patch] = mockedService.partialUpdate.mock.calls[0];
        expect(patch.password).toBe('newenvpwd');
    });

    test('should clear credentials when --clear-credentials is passed', async () => {
        // Given
        const command = new Command('update');
        addUpdateSystemCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://example.com', '--clear-credentials']));

        // Then
        const [, patch] = mockedService.partialUpdate.mock.calls[0];
        expect(patch.username).toBeUndefined();
        expect(patch.password).toBeUndefined();
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('updated successfully'));
    });

    test('should log error when no fields to update', async () => {
        // Given
        const command = new Command('update');
        addUpdateSystemCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://example.com']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('No fields to update'));
        expect(mockedService.partialUpdate).not.toHaveBeenCalled();
    });

    test('should log error and exit when running in BAS', async () => {
        // Given
        isAppStudioMock.mockReturnValue(true);
        const command = new Command('update');
        addUpdateSystemCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://example.com', '--name', 'New Name']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Business Application Studio'));
        expect(mockedService.partialUpdate).not.toHaveBeenCalled();
    });

    test('should log error when partialUpdate throws', async () => {
        // Given
        mockedService.partialUpdate.mockRejectedValueOnce(new Error('System not found'));
        const command = new Command('update');
        addUpdateSystemCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--url', 'https://example.com', '--name', 'New Name']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith('System not found');
    });
});
