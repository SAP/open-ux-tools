import { Command } from 'commander';
import type { MemFsEditor as Editor } from 'mem-fs-editor';
import { join } from 'path';
import * as prompts from 'prompts';
import * as appConfigWriter from '@sap-ux/app-config-writer';
import type { ToolsLogger } from '@sap-ux/logger';
import * as logger from '../../../../src/tracing/logger';
import { addInboundNavigationConfigCommand } from '../../../../src/cli/add/navigation-config';

jest.mock('prompts');

describe('Test command add navigation-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/bare-minimum');
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
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        jest.spyOn(appConfigWriter, 'promptInboundNavigationConfig').mockResolvedValue({
            config: undefined,
            fs: fsMock
        });
        jest.spyOn(prompts, 'prompt').mockResolvedValueOnce(undefined);
    });

    test('Test add navigation-config <appRoot>', async () => {
        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
    });

    test('Test add inbound-navigation <appRoot> --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot, '--simulate']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).not.toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).not.toBeCalled();
    });

    test('Test add inbound-navigation --verbose', async () => {
        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot, '--verbose']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
    });

    test('Test add inbound-navigation reports error', async () => {
        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        // No project at path
        await command.parseAsync(getArgv(['inbound-navigation', join(__dirname, '../../../fixtures/'), '--verbose']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.info).not.toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).toBeCalledWith(
            expect.stringMatching(/^Error while executing add inbound navigation configuration/)
        );
        expect(loggerMock.debug).nthCalledWith(
            1,
            expect.stringMatching(/^Called add inbound navigation-config for path/)
        );
        expect(loggerMock.debug).nthCalledWith(2, expect.any(Error));
        expect(fsMock.commit).not.toBeCalled();
    });

    test('Test add inbound-navigation calls generate when valid config is returned by prompting', async () => {
        const promptingResult = {
            config: {
                semanticObject: 'so1',
                action: 'act1',
                title: 'title1'
            },
            fs: fsMock
        };
        jest.spyOn(appConfigWriter, 'promptInboundNavigationConfig').mockResolvedValue(promptingResult);
        const genNavSpy = jest.spyOn(appConfigWriter, 'generateInboundNavigationConfig').mockResolvedValue(fsMock);
        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));
        expect(genNavSpy).toBeCalledWith(expect.stringContaining('bare-minimum'), promptingResult.config, true, fsMock);
    });
});
