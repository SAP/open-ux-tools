import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { addFlpEmbeddedConfigCommand } from '../../../../src/cli/add/flp-embedded-config';
import * as appConfigWriter from '@sap-ux/app-config-writer';
import * as logger from '../../../../src/tracing/logger';
import { join } from 'node:path';

jest.mock('prompts');

describe('Test command add flp-embedded-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/bare-minimum');
    let loggerMock: ToolsLogger;
    let fsMock: Editor;
    let logLevelSpy: jest.SpyInstance;

    const getArgv = (arg: string[]) => ['', '', ...arg];

    beforeEach(() => {
        jest.clearAllMocks();

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
        jest.spyOn(appConfigWriter, 'generateFlpEmbeddedConfig').mockResolvedValue(fsMock);
    });

    test('add flp-embedded-config with required bspApplication option', async () => {
        const command = new Command('add');
        addFlpEmbeddedConfigCommand(command);
        await command.parseAsync(getArgv(['flp-embedded-config', appRoot, '-b', 'my-bsp-app']));

        expect(logLevelSpy).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(appConfigWriter.generateFlpEmbeddedConfig).toHaveBeenCalledWith(
            appRoot,
            'my-bsp-app',
            expect.any(String),
            expect.any(String),
            undefined,
            loggerMock
        );
    });

    test('add flp-embedded-config --simulate', async () => {
        const command = new Command('add');
        addFlpEmbeddedConfigCommand(command);
        await command.parseAsync(getArgv(['flp-embedded-config', appRoot, '-b', 'my-bsp-app', '--simulate']));

        expect(logLevelSpy).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('add flp-embedded-config --verbose', async () => {
        const command = new Command('add');
        addFlpEmbeddedConfigCommand(command);
        await command.parseAsync(getArgv(['flp-embedded-config', appRoot, '-b', 'my-bsp-app', '--verbose']));

        expect(logLevelSpy).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('add flp-embedded-config passes error to logger when generateFlpEmbeddedConfig throws', async () => {
        jest.spyOn(appConfigWriter, 'generateFlpEmbeddedConfig').mockRejectedValue(new Error('something went wrong'));
        const command = new Command('add');
        addFlpEmbeddedConfigCommand(command);
        await command.parseAsync(getArgv(['flp-embedded-config', appRoot, '-b', 'my-bsp-app']));

        expect(loggerMock.error).toHaveBeenCalledWith(
            'Error while executing add flp-embedded-config: something went wrong'
        );
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('add flp-embedded-config passes commit error to logger', async () => {
        fsMock.commit = jest.fn().mockImplementation((callback) => callback(new Error('disk full')));
        const command = new Command('add');
        addFlpEmbeddedConfigCommand(command);
        await command.parseAsync(getArgv(['flp-embedded-config', appRoot, '-b', 'my-bsp-app']));

        expect(loggerMock.error).toHaveBeenCalledWith('Error while executing add flp-embedded-config: disk full');
        expect(loggerMock.info).not.toHaveBeenCalled();
    });
});
