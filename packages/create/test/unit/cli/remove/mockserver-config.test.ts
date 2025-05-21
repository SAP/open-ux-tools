import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { addRemoveMockserverConfigCommand } from '../../../../src/cli/remove/mockserver-config';
import * as prompts from 'prompts';
import * as mockserverWriter from '@sap-ux/mockserver-config-writer';
import * as logger from '../../../../src/tracing/logger';
import { join } from 'path';

jest.mock('child_process');
jest.mock('prompts');

describe('Test command add mockserver-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/bare-minimum');
    let loggerMock: ToolsLogger;
    let logLevelSpy: jest.SpyInstance;

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
    });

    test('Test create-fiori remove mockserver-config <appRoot>, no deleted files', async () => {
        // Mock setup
        const fsMock = {
            dump: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        jest.spyOn(mockserverWriter, 'removeMockserverConfig').mockResolvedValue(fsMock);
        const promptSpy = jest.spyOn(prompts, 'prompt');

        // Test execution
        const command = new Command('remove');
        addRemoveMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot]));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(promptSpy).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
    });

    test('Test create-fiori remove mockserver-config <appRoot>, deleted files, confirm: no', async () => {
        // Mock setup
        const fsMock = {
            dump: jest.fn().mockReturnValue({ 'deleted.file': { state: 'deleted' } }),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        jest.spyOn(mockserverWriter, 'removeMockserverConfig').mockResolvedValue(fsMock);
        const promptSpy = jest.spyOn(prompts, 'prompt').mockResolvedValue({ doCommit: false });

        // Test execution
        const command = new Command('remove');
        addRemoveMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot]));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(promptSpy).toBeCalled();
        expect(fsMock.commit).not.toBeCalled();
    });

    test('Test create-fiori remove mockserver-config <appRoot>, deleted files, confirm: yes', async () => {
        // Mock setup
        const fsMock = {
            dump: jest.fn().mockReturnValue({ 'deleted.file': { state: 'deleted' } }),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        jest.spyOn(mockserverWriter, 'removeMockserverConfig').mockResolvedValue(fsMock);
        jest.spyOn(prompts, 'prompt').mockResolvedValue({ doCommit: true });

        // Test execution
        const command = new Command('remove');
        addRemoveMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot]));

        // Result check
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
    });

    test('Test create-fiori remove mockserver-config <appRoot> --force, deleted files', async () => {
        // Mock setup
        const fsMock = {
            dump: jest.fn().mockReturnValue({ 'deleted.file': { state: 'deleted' } }),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        jest.spyOn(mockserverWriter, 'removeMockserverConfig').mockResolvedValue(fsMock);
        const promptSpy = jest.spyOn(prompts, 'prompt');

        // Test execution
        const command = new Command('remove');
        addRemoveMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot, '--force']));

        // Result check
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(promptSpy).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
    });

    test('Test create-fiori remove mockserver-config --verbose', async () => {
        // Test execution
        const command = new Command('remove');
        addRemoveMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', '--verbose']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).toBeCalled();
    });

    test('Test create-fiori remove mockserver-config INVALID_PATH', async () => {
        // Test execution
        const command = new Command('remove');
        addRemoveMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', 'INVALID_PATH']));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).toBeCalled();
    });
});
