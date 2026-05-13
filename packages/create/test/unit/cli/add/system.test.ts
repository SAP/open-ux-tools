import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';
import { addSystemCommand } from '../../../../src/cli/add/system';
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

describe('add/system', () => {
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
        mockedService.write.mockResolvedValue(undefined);
    });

    test('should add a system with required options', async () => {
        // Given
        const command = new Command('add');
        addSystemCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--name', 'My System', '--url', 'https://my-sap.example.com']));

        // Then
        expect(mockedService.write).toHaveBeenCalledTimes(1);
        const written = mockedService.write.mock.calls[0][0];
        expect(written.name).toBe('My System');
        expect(written.url).toBe('https://my-sap.example.com');
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('added successfully'));
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('should prompt for password when username is provided', async () => {
        // Given
        mockPrompt.mockResolvedValueOnce({ password: 'secret' });
        const command = new Command('add');
        addSystemCommand(command);

        // When
        await command.parseAsync(
            getArgv(['system', '--name', 'My System', '--url', 'https://example.com', '--username', 'user1'])
        );

        // Then
        expect(mockPrompt).toHaveBeenCalledWith(expect.objectContaining({ type: 'password' }));
        const written = mockedService.write.mock.calls[0][0];
        expect(written.username).toBe('user1');
        expect(written.password).toBe('secret');
    });

    test('should read password from env var and skip prompt', async () => {
        // Given
        process.env.SAP_UX_SYSTEM_PASSWORD = 'envpassword';
        const command = new Command('add');
        addSystemCommand(command);

        // When
        await command.parseAsync(
            getArgv(['system', '--name', 'My System', '--url', 'https://example.com', '--username', 'user1'])
        );

        // Then
        expect(mockPrompt).not.toHaveBeenCalled();
        const written = mockedService.write.mock.calls[0][0];
        expect(written.password).toBe('envpassword');
    });

    test('should not prompt for password when no username given', async () => {
        // Given
        const command = new Command('add');
        addSystemCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--name', 'My System', '--url', 'https://example.com']));

        // Then
        expect(mockPrompt).not.toHaveBeenCalled();
    });

    test('should log error and exit when running in BAS', async () => {
        // Given
        isAppStudioMock.mockReturnValue(true);
        const command = new Command('add');
        addSystemCommand(command);

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
        addSystemCommand(command);

        // When
        await command.parseAsync(getArgv(['system', '--name', 'My System', '--url', 'https://example.com']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith('System already exists');
    });
});
