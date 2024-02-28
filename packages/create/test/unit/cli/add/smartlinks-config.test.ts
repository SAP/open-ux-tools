import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import * as prompts from 'prompts';
import * as appConfigWriter from '@sap-ux/app-config-writer';
import type { ToolsLogger } from '@sap-ux/logger';
import * as logger from '../../../../src/tracing/logger';
import { addAddSmartLinksConfigCommand } from '../../../../src/cli/add/smartlinks-config';

jest.mock('prompts');

describe('Test command add smartlinks-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/ui5-deploy-config');
    let loggerMock: ToolsLogger;
    let fsMock: Editor;
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
        fsMock = {
            dump: jest.fn(),
            exists: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        jest.spyOn(appConfigWriter, 'generateSmartLinksConfig').mockResolvedValue(fsMock);
        // 1. prompt: target, 2. prompt: user
        jest.spyOn(prompts, 'prompt')
            .mockResolvedValueOnce({ url: 'url', client: '100' })
            .mockResolvedValueOnce({ username: 'user', password: 'password' });
    });

    test('Test create-fiori add smartlinks-config <appRoot>', async () => {
        // Test execution
        const command = new Command('add');
        addAddSmartLinksConfigCommand(command);
        await command.parseAsync(getArgv(['smartlinks-config', appRoot]));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
    });

    test('Test create-fiori add smartlinks-config <appRoot> --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addAddSmartLinksConfigCommand(command);
        await command.parseAsync(getArgv(['smartlinks-config', appRoot, '-s']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).not.toBeCalled();
    });

    test('Test create-fiori add smartlinks-config --verbose', async () => {
        // Test execution
        const command = new Command('add');
        addAddSmartLinksConfigCommand(command);
        await command.parseAsync(getArgv(['smartlinks-config', '--verbose']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.error).toBeCalled();
        expect(fsMock.commit).not.toBeCalled();
    });
});
