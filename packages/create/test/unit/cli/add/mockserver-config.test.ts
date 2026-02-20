import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { addAddMockserverConfigCommand } from '../../../../src/cli/add/mockserver-config';
import * as prompts from 'prompts';
import * as mockserverWriter from '@sap-ux/mockserver-config-writer';
import * as logger from '../../../../src/tracing/logger';
import * as childProcess from 'node:child_process';
import * as npmCommand from '@sap-ux/project-access';
import { join } from 'node:path';

jest.mock('child_process');
jest.mock('prompts');

describe('Test command add mockserver-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/bare-minimum');
    let loggerMock: ToolsLogger;
    let fsMock: Editor;
    let logLevelSpy: jest.SpyInstance;
    let spawnSpy: jest.SpyInstance;
    let execNpmCommandSpy: jest.SpyInstance;

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
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        jest.spyOn(mockserverWriter, 'generateMockserverConfig').mockResolvedValue(fsMock);
        spawnSpy = jest.spyOn(childProcess, 'spawnSync');
        execNpmCommandSpy = jest.spyOn(npmCommand, 'execNpmCommand');
    });

    test('Test create-fiori add mockserver-config <appRoot>', async () => {
        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot]));

        // Result check
        expect(logLevelSpy).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(execNpmCommandSpy).toHaveBeenCalledWith(
            ['install', '--save-dev', '@sap-ux/ui5-middleware-fe-mockserver'],
            {
                cwd: appRoot,
                logger: undefined
            }
        );
    });

    test('Test create-fiori add mockserver-config <appRoot> --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot, '-s']));

        // Result check
        expect(logLevelSpy).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(spawnSpy).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('Test create-fiori add mockserver-config <appRoot> --skip-install', async () => {
        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot, '--skip-install']));

        // Result check
        expect(logLevelSpy).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.warn).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(spawnSpy).not.toHaveBeenCalled();
    });

    test('Test create-fiori add mockserver-config <appRoot> --interactive', async () => {
        // Mock setup
        jest.spyOn(mockserverWriter, 'getMockserverConfigQuestions').mockImplementation((q: any) => [q]);
        const promptSpy = jest.spyOn(prompts, 'prompt');

        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot, '--interactive']));

        // Result check
        expect(logLevelSpy).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(promptSpy).toHaveBeenCalledWith([{ webappPath: join(appRoot, 'webapp'), askForOverwrite: true }]);
        expect(fsMock.commit).toHaveBeenCalled();
        expect(execNpmCommandSpy).toHaveBeenCalled();
    });

    test('Test create-fiori add mockserver-config <appRoot> --interactive with overwrite option', async () => {
        // Mock setup
        jest.spyOn(mockserverWriter, 'getMockserverConfigQuestions').mockReturnValue([
            {
                name: 'path',
                type: 'text',
                message: 'Path to mocked service'
            },
            {
                type: 'confirm',
                name: 'overwrite',
                message: 'Overwrite services'
            }
        ]);
        const promptSpy = jest.spyOn(prompts, 'prompt');

        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot, '--interactive']));

        // Result check
        expect(logLevelSpy).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(promptSpy).toHaveBeenCalledWith([
            {
                name: 'path',
                type: 'text',
                message: 'Path to mocked service'
            },
            {
                message: 'Overwrite services',
                name: 'overwrite',
                type: 'confirm'
            }
        ]);
        expect(fsMock.commit).toHaveBeenCalled();
        expect(execNpmCommandSpy).toHaveBeenCalled();
    });

    test('Test create-fiori add mockserver-config --verbose', async () => {
        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', '--verbose']));

        // Result check
        expect(logLevelSpy).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
        expect(spawnSpy).not.toHaveBeenCalled();
    });
});
