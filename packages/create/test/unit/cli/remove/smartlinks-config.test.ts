import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import * as prompts from 'prompts';
import type { ToolsLogger } from '@sap-ux/logger';
import * as appConfigWriter from '@sap-ux/app-config-writer';
import * as logger from '../../../../src/tracing/logger';
import { addRemoveSmartLinksConfigCommand } from '../../../../src/cli/remove/smartlinks-config';

jest.mock('prompts');

describe('Test command remove smartlinks-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/ui5-deploy-config');
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

    test('Test create-fiori remove smartlinks-config <appRoot>, no deleted files', async () => {
        // Mock setup
        const fsMock = {
            dump: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        jest.spyOn(appConfigWriter, 'removeSmartLinksConfig').mockResolvedValue(fsMock);
        const promptSpy = jest.spyOn(prompts, 'prompt');

        // Test execution
        const command = new Command('remove');
        addRemoveSmartLinksConfigCommand(command);
        await command.parseAsync(getArgv(['smartlinks-config', appRoot]));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(promptSpy).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
    });

    test('Test create-fiori remove smartlinks-config <appRoot>, deleted files, confirm: no', async () => {
        // Mock setup
        const fsMock = {
            dump: jest.fn().mockReturnValue({ 'deleted.file': { state: 'deleted' } }),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        jest.spyOn(appConfigWriter, 'removeSmartLinksConfig').mockResolvedValue(fsMock);
        const promptSpy = jest.spyOn(prompts, 'prompt').mockResolvedValue({ doCommit: false });

        // Test execution
        const command = new Command('remove');
        addRemoveSmartLinksConfigCommand(command);
        await command.parseAsync(getArgv(['smartlinks-config', appRoot]));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(promptSpy).toBeCalled();
        expect(fsMock.commit).not.toBeCalled();
    });

    test('Test create-fiori remove smartlinks-config <appRoot>, deleted files, confirm: yes', async () => {
        // Mock setup
        const fsMock = {
            dump: jest.fn().mockReturnValue({ 'deleted.file': { state: 'deleted' } }),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        jest.spyOn(appConfigWriter, 'removeSmartLinksConfig').mockResolvedValue(fsMock);
        jest.spyOn(prompts, 'prompt').mockResolvedValue({ doCommit: true });

        // Test execution
        const command = new Command('remove');
        addRemoveSmartLinksConfigCommand(command);
        await command.parseAsync(getArgv(['smartlinks-config', appRoot]));

        // Result check
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
    });

    test('Test create-fiori remove smartlinks-config <appRoot> --force, deleted files', async () => {
        // Mock setup
        const fsMock = {
            dump: jest.fn().mockReturnValue({ 'deleted.file': { state: 'deleted' } }),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        jest.spyOn(appConfigWriter, 'removeSmartLinksConfig').mockResolvedValue(fsMock);
        const promptSpy = jest.spyOn(prompts, 'prompt');

        // Test execution
        const command = new Command('remove');
        addRemoveSmartLinksConfigCommand(command);
        await command.parseAsync(getArgv(['smartlinks-config', appRoot, '--force']));

        // Result check
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(promptSpy).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
    });

    test('Test create-fiori remove smartlinks-config --verbose', async () => {
        // Test execution
        const command = new Command('remove');
        addRemoveSmartLinksConfigCommand(command);
        await command.parseAsync(getArgv(['smartlinks-config', '--verbose']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).toBeCalled();
    });

    test('Test create-fiori remove smartlinks-config INVALID_PATH', async () => {
        // Test execution
        const command = new Command('remove');
        addRemoveSmartLinksConfigCommand(command);
        await command.parseAsync(getArgv(['smartlinks-config', 'INVALID_PATH']));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).toBeCalled();
    });
});
