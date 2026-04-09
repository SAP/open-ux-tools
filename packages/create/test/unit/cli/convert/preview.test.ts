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

const mockConvertToVirtualPreview = jest.fn();
const mockSimulatePrompt = jest.fn();
const mockIncludeTestRunnersPrompt = jest.fn();
jest.unstable_mockModule('@sap-ux/app-config-writer', () => ({
    convertToVirtualPreview: mockConvertToVirtualPreview,
    simulatePrompt: mockSimulatePrompt,
    includeTestRunnersPrompt: mockIncludeTestRunnersPrompt
}));

jest.unstable_mockModule('node:child_process', () => ({
    spawn: jest.fn(),
    spawnSync: jest.fn(),
    execSync: jest.fn(),
    exec: jest.fn()
}));
jest.unstable_mockModule('prompts', () => ({ default: jest.fn(), prompt: jest.fn() }));

const { addConvertPreviewCommand } = await import('../../../../src/cli/convert/preview');

describe('Test command convert preview', () => {
    const appRoot = join(__dirname, '../../../fixtures/bare-minimum');
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
        mockConvertToVirtualPreview.mockResolvedValue(fsMock);
    });

    test('Test create-fiori convert preview <appRoot>', async () => {
        mockSimulatePrompt.mockResolvedValue(false);
        mockIncludeTestRunnersPrompt.mockResolvedValue(false);
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config', appRoot]));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('Test create-fiori convert preview <appRoot> --simulate=true', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config', appRoot, '-s=true']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('Test create-fiori convert preview <appRoot> --simulate=false --test=FaLsE', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config', appRoot, '-s=false', '-t=FaLsE']));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('Test create-fiori convert preview --verbose', async () => {
        mockSimulatePrompt.mockResolvedValue(false);
        mockIncludeTestRunnersPrompt.mockResolvedValue(false);
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config', '--verbose']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('Test create-fiori convert preview with simulate from prompt', async () => {
        mockSimulatePrompt.mockResolvedValue(true);
        mockIncludeTestRunnersPrompt.mockResolvedValue(false);
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('Test create-fiori convert preview with simulate cancelled from prompt', async () => {
        const mockExit = jest.spyOn(process, 'exit').mockImplementation();
        mockSimulatePrompt.mockResolvedValue(Promise.reject(new Error('test error')));
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config']));

        // Result check
        expect(mockExit).toHaveBeenCalledWith(1);
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalled();
    });

    test('Test create-fiori convert preview with simulate and test from prompt', async () => {
        mockSimulatePrompt.mockResolvedValue(true);
        mockIncludeTestRunnersPrompt.mockResolvedValue(true);
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('Test create-fiori convert preview with simulate and test cancelled from prompt', async () => {
        const mockExit = jest.spyOn(process, 'exit').mockImplementation();
        mockSimulatePrompt.mockResolvedValue(true);
        mockIncludeTestRunnersPrompt.mockResolvedValue(Promise.reject(new Error('test error')));
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config']));

        // Result check
        expect(mockExit).toHaveBeenCalledWith(1);
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });
});
