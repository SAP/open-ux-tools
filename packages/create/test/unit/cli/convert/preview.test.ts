import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { addConvertPreviewCommand } from '../../../../src/cli/convert/preview';
import * as appConfigWriter from '@sap-ux/app-config-writer';
import * as logger from '../../../../src/tracing/logger';
import * as childProcess from 'child_process';
import { join } from 'path';
jest.mock('child_process');
jest.mock('prompts');

describe('Test command convert preview', () => {
    const appRoot = join(__dirname, '../../../fixtures/bare-minimum');
    let loggerMock: ToolsLogger;
    let fsMock: Editor;
    let logLevelSpy: jest.SpyInstance;
    let spawnSpy: jest.SpyInstance;
    const simulatePromptSpy = jest.spyOn(appConfigWriter, 'simulatePrompt');
    const includeTestRunnersPromptSpy = jest.spyOn(appConfigWriter, 'includeTestRunnersPrompt');

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
        jest.spyOn(logger, 'getLogger').mockImplementation(() => loggerMock);
        logLevelSpy = jest.spyOn(logger, 'setLogLevelVerbose').mockImplementation(() => undefined);
        fsMock = {
            dump: jest.fn(),
            exists: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        jest.spyOn(appConfigWriter, 'convertToVirtualPreview').mockResolvedValue(fsMock);
        spawnSpy = jest.spyOn(childProcess, 'spawnSync');
    });

    test('Test create-fiori convert preview <appRoot>', async () => {
        simulatePromptSpy.mockResolvedValue(false);
        includeTestRunnersPromptSpy.mockResolvedValue(false);
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config', appRoot]));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
        expect(spawnSpy).not.toBeCalled();
    });

    test('Test create-fiori convert preview <appRoot> --simulate=true', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config', appRoot, '-s=true']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(spawnSpy).not.toBeCalled();
        expect(fsMock.commit).not.toBeCalled();
    });

    test('Test create-fiori convert preview <appRoot> --simulate=false --test=FaLsE', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config', appRoot, '-s=false', '-t=FaLsE']));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(spawnSpy).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
    });

    test('Test create-fiori convert preview --verbose', async () => {
        simulatePromptSpy.mockResolvedValue(false);
        includeTestRunnersPromptSpy.mockResolvedValue(false);
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config', '--verbose']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
        expect(spawnSpy).not.toBeCalled();
    });

    test('Test create-fiori convert preview with simulate from prompt', async () => {
        simulatePromptSpy.mockResolvedValue(true);
        includeTestRunnersPromptSpy.mockResolvedValue(false);
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(spawnSpy).not.toBeCalled();
        expect(fsMock.commit).not.toBeCalled();
    });

    test('Test create-fiori convert preview with simulate cancelled from prompt', async () => {
        const mockExit = jest.spyOn(process, 'exit').mockImplementation();
        simulatePromptSpy.mockResolvedValue(Promise.reject(new Error('test error')));
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config']));

        // Result check
        expect(mockExit).toHaveBeenCalledWith(1);
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).toBeCalled();
        expect(spawnSpy).not.toBeCalled();
        //can't check for fs.commit here as we don't exit on process.exit(1)
    });

    test('Test create-fiori convert preview with simulate and test from prompt', async () => {
        simulatePromptSpy.mockResolvedValue(true);
        includeTestRunnersPromptSpy.mockResolvedValue(true);
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(spawnSpy).not.toBeCalled();
        expect(fsMock.commit).not.toBeCalled();
    });

    test('Test create-fiori convert preview with simulate and test cancelled from prompt', async () => {
        const mockExit = jest.spyOn(process, 'exit').mockImplementation();
        simulatePromptSpy.mockResolvedValue(true);
        includeTestRunnersPromptSpy.mockResolvedValue(Promise.reject(new Error('test error')));
        // Test execution
        const command = new Command('convert');
        addConvertPreviewCommand(command);
        await command.parseAsync(getArgv(['preview-config']));

        // Result check
        expect(mockExit).toHaveBeenCalledWith(1);
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).toBeCalled();
        expect(spawnSpy).not.toBeCalled();
        expect(fsMock.commit).not.toBeCalled();
    });
});
