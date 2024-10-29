import * as childProcess from 'child_process';
import type { Editor } from 'mem-fs-editor';
import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';
import * as capConfigWriterMock from '@sap-ux/cap-config-writer';
import * as logger from '../../../../src/tracing/logger';
import * as npmCommand from '@sap-ux/project-access';
import { addAddCdsPluginUi5Command } from '../../../../src/cli/add/cds-plugin-ui';
import { join } from 'path';

jest.mock('child_process');

describe('Test command add cds-plugin-ui5', () => {
    let loggerMock: ToolsLogger;
    let fsMock: Editor;
    let logLevelSpy: jest.SpyInstance;
    let spawnSpy: jest.SpyInstance;
    let command: Command;
    let execNpmCommandSpy: jest.SpyInstance;

    const getArgv = (arg: string[]) => ['', '', ...arg];

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(logger, 'getLogger').mockImplementation(() => loggerMock);

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
        jest.spyOn(capConfigWriterMock, 'enableCdsUi5Plugin').mockResolvedValue(fsMock);
        spawnSpy = jest.spyOn(childProcess, 'spawnSync');
        execNpmCommandSpy = jest.spyOn(npmCommand, 'execNpmCommand');
        command = new Command('add');
        addAddCdsPluginUi5Command(command);
    });

    test('Test create-fiori add cds-plugin-ui5 __dirname', async () => {
        // Test execution
        await command.parseAsync(getArgv(['cds-plugin-ui5', __dirname]));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
        expect(execNpmCommandSpy).toBeCalledWith(
            ['install'],
            { cwd: __dirname, logger: undefined }
        );
    });

    test('Test create-fiori add cds-plugin-ui5 --simulate', async () => {
        // Test execution
        await command.parseAsync(getArgv(['cds-plugin-ui5', '--simulate']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).not.toBeCalled();
    });

    test('Test create-fiori add cds-plugin-ui5 --simulate', async () => {
        // Test execution
        await command.parseAsync(getArgv(['cds-plugin-ui5', '--skip-install']));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
        expect(spawnSpy).not.toBeCalled();
    });

    test(`Test create-fiori add cds-plugin-ui5 --skip-install --verbose join(__dirname, '..')`, async () => {
        // Test execution
        const parentDir = join(__dirname, '..');
        await command.parseAsync(getArgv(['cds-plugin-ui5', '--skip-install', '--verbose', parentDir]));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
        expect(spawnSpy).not.toBeCalled();
        const loggerInfoCalls = (loggerMock.info as jest.Mock).mock.calls;
        const hasCdInfo = !!loggerInfoCalls.find(
            (c) => Array.isArray(c) && c.length >= 1 && typeof c[0] === 'string' && c[0].startsWith('cd ')
        );
        expect(hasCdInfo).toBe(true);
    });

    test('Error handling with --verbose', async () => {
        // Mock setup
        jest.spyOn(capConfigWriterMock, 'enableCdsUi5Plugin').mockRejectedValueOnce('ENABLE_ERROR');

        // Test execution
        await command.parseAsync(getArgv(['cds-plugin-ui5']));

        // Result check
        expect(loggerMock.error).toBeCalledWith(expect.stringContaining('ENABLE_ERROR'));
        expect(loggerMock.debug).toBeCalled();
    });

    test('Error handling with non-string error', async () => {
        // Mock setup
        jest.spyOn(capConfigWriterMock, 'enableCdsUi5Plugin').mockRejectedValueOnce(undefined);

        // Test execution
        await command.parseAsync(getArgv(['cds-plugin-ui5']));

        // Result check
        expect(loggerMock.error).toBeCalled();
    });
});
