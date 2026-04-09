import { jest } from '@jest/globals';
import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockGetLogger = jest.fn();
const mockSetLogLevelVerbose = jest.fn();
jest.unstable_mockModule('../../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: mockSetLogLevelVerbose
}));

const mockGenerateSmartLinksConfig = jest.fn();
jest.unstable_mockModule('@sap-ux/app-config-writer', () => ({
    generateSmartLinksConfig: mockGenerateSmartLinksConfig,
    getSmartLinksTargetFromPrompt: jest.fn()
}));

const mockPrompt = jest.fn();
jest.unstable_mockModule('prompts', () => ({
    default: mockPrompt,
    prompt: mockPrompt
}));

const { addAddSmartLinksConfigCommand } = await import('../../../../src/cli/add/smartlinks-config');

describe('Test command add smartlinks-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/ui5-deploy-config');
    let loggerMock: ToolsLogger;
    let fsMock: Editor;

    const getArgv = (arg: string[]) => ['', '', ...arg];

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock setup
        loggerMock = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        mockGetLogger.mockReturnValue(loggerMock);
        mockSetLogLevelVerbose.mockImplementation(() => undefined);
        fsMock = {
            dump: jest.fn(),
            exists: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        mockGenerateSmartLinksConfig.mockResolvedValue(fsMock);
        // 1. prompt: target, 2. prompt: user
        mockPrompt
            .mockResolvedValueOnce({ url: 'url', client: '100' })
            .mockResolvedValueOnce({ username: 'user', password: 'password' });
    });

    test('Test create-fiori add smartlinks-config <appRoot>', async () => {
        // Test execution
        const command = new Command('add');
        addAddSmartLinksConfigCommand(command);
        await command.parseAsync(getArgv(['smartlinks-config', appRoot]));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('Test create-fiori add smartlinks-config <appRoot> --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addAddSmartLinksConfigCommand(command);
        await command.parseAsync(getArgv(['smartlinks-config', appRoot, '-s']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('Test create-fiori add smartlinks-config --verbose', async () => {
        // Test execution
        const command = new Command('add');
        addAddSmartLinksConfigCommand(command);
        await command.parseAsync(getArgv(['smartlinks-config', '--verbose']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });
});
