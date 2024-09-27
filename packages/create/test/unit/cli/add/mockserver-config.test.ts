import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { addAddMockserverConfigCommand } from '../../../../src/cli/add/mockserver-config';
import * as prompts from 'prompts';
import * as mockserverWriter from '@sap-ux/mockserver-config-writer';
import * as logger from '../../../../src/tracing/logger';
import * as childProcess from 'child_process';
import { join } from 'path';

jest.mock('child_process');
jest.mock('prompts');

describe('Test command add mockserver-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/bare-minimum');
    let loggerMock: ToolsLogger;
    let fsMock: Editor;
    let logLevelSpy: jest.SpyInstance;
    let spawnSpy: jest.SpyInstance;

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
    });

    test('Test create-fiori add mockserver-config <appRoot>', async () => {
        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot]));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
        expect(spawnSpy).toBeCalledWith(
            /^win/.test(process.platform) ? 'npm.cmd' : 'npm',
            ['install', '--save-dev', '@sap-ux/ui5-middleware-fe-mockserver'],
            { cwd: appRoot, stdio: [0, 1, 2] }
        );
    });

    test('Test create-fiori add mockserver-config <appRoot> --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot, '-s']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(spawnSpy).not.toBeCalled();
        expect(fsMock.commit).not.toBeCalled();
    });

    test('Test create-fiori add mockserver-config <appRoot> --skip-install', async () => {
        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot, '--skip-install']));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.warn).toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
        expect(spawnSpy).not.toBeCalled();
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
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(promptSpy).toBeCalledWith([{ webappPath: join(appRoot, 'webapp'), askForOverwrite: true }]);
        expect(fsMock.commit).toBeCalled();
        expect(spawnSpy).toBeCalled();
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
                message: 'Overwrite existing services'
            }
        ]);
        const promptSpy = jest.spyOn(prompts, 'prompt');

        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot, '--interactive']));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(promptSpy).toBeCalledWith([
            {
                name: 'path',
                type: 'text',
                message: 'Path to mocked service'
            },
            {
                message: 'Overwrite existing services',
                name: 'overwrite',
                type: 'confirm'
            }
        ]);
        expect(fsMock.commit).toBeCalled();
        expect(spawnSpy).toBeCalled();
    });

    test('Test create-fiori add mockserver-config --verbose', async () => {
        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', '--verbose']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.error).toBeCalled();
        expect(fsMock.commit).not.toBeCalled();
        expect(spawnSpy).not.toBeCalled();
    });
});
