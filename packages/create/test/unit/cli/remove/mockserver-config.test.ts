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

const mockRemoveMockserverConfig = jest.fn();
jest.unstable_mockModule('@sap-ux/mockserver-config-writer', () => ({
    removeMockserverConfig: mockRemoveMockserverConfig,
    generateMockserverConfig: jest.fn(),
    getMockserverConfigQuestions: jest.fn()
}));

const mockValidateBasePath = jest.fn();
const mockHasFileDeletes = jest.fn().mockReturnValue(false);
jest.unstable_mockModule('../../../../src/validation', () => ({
    validateBasePath: mockValidateBasePath,
    validateAdpAppType: jest.fn(),
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: mockHasFileDeletes
}));
jest.unstable_mockModule('../../../../src/validation/validation', () => ({
    validateBasePath: mockValidateBasePath,
    validateAdpAppType: jest.fn(),
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: mockHasFileDeletes
}));

jest.unstable_mockModule('node:child_process', () => ({
    spawn: jest.fn(),
    spawnSync: jest.fn(),
    execSync: jest.fn(),
    exec: jest.fn()
}));

const mockPrompt = jest.fn();
jest.unstable_mockModule('prompts', () => ({
    default: mockPrompt,
    prompt: mockPrompt
}));

const { addRemoveMockserverConfigCommand } = await import('../../../../src/cli/remove/mockserver-config');

describe('Test command add mockserver-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/bare-minimum');
    let loggerMock: ToolsLogger;

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
    });

    test('Test create-fiori remove mockserver-config <appRoot>, no deleted files', async () => {
        // Mock setup
        const fsMock = {
            dump: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        mockRemoveMockserverConfig.mockResolvedValue(fsMock);

        // Test execution
        const command = new Command('remove');
        addRemoveMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot]));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(mockPrompt).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('Test create-fiori remove mockserver-config <appRoot>, deleted files, confirm: no', async () => {
        // Mock setup
        const fsMock = {
            dump: jest.fn().mockReturnValue({ 'deleted.file': { state: 'deleted' } }),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        mockRemoveMockserverConfig.mockResolvedValue(fsMock);
        mockPrompt.mockResolvedValue({ doCommit: false });
        mockHasFileDeletes.mockReturnValueOnce(true);

        // Test execution
        const command = new Command('remove');
        addRemoveMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot]));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(mockPrompt).toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('Test create-fiori remove mockserver-config <appRoot>, deleted files, confirm: yes', async () => {
        // Mock setup
        const fsMock = {
            dump: jest.fn().mockReturnValue({ 'deleted.file': { state: 'deleted' } }),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        mockRemoveMockserverConfig.mockResolvedValue(fsMock);
        mockPrompt.mockResolvedValue({ doCommit: true });
        mockHasFileDeletes.mockReturnValueOnce(true);

        // Test execution
        const command = new Command('remove');
        addRemoveMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot]));

        // Result check
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('Test create-fiori remove mockserver-config <appRoot> --force, deleted files', async () => {
        // Mock setup
        const fsMock = {
            dump: jest.fn().mockReturnValue({ 'deleted.file': { state: 'deleted' } }),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        mockRemoveMockserverConfig.mockResolvedValue(fsMock);
        mockHasFileDeletes.mockReturnValueOnce(true);

        // Test execution
        const command = new Command('remove');
        addRemoveMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot, '--force']));

        // Result check
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(mockPrompt).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('Test create-fiori remove mockserver-config --verbose', async () => {
        mockValidateBasePath.mockRejectedValueOnce(new Error('Required file does not exist.'));

        // Test execution
        const command = new Command('remove');
        addRemoveMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', '--verbose']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalled();
    });

    test('Test create-fiori remove mockserver-config INVALID_PATH', async () => {
        mockValidateBasePath.mockRejectedValueOnce(new Error('Required file does not exist.'));

        // Test execution
        const command = new Command('remove');
        addRemoveMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', 'INVALID_PATH']));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalled();
    });
});
