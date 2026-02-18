import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import { join } from 'node:path';
import * as appConfigWriter from '@sap-ux/app-config-writer';
import type { ToolsLogger } from '@sap-ux/logger';
import * as logger from '../../../../src/tracing/logger';
import * as common from '../../../../src/common';
import { addConvertEslintCommand } from '../../../../src/cli/convert/eslint-config';

jest.mock('prompts');

describe('Test command convert eslint-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/ui5-deploy-config');
    let loggerMock: ToolsLogger;
    let fsMock: Editor;
    let logLevelSpy: jest.SpyInstance;
    let runNpmInstallSpy: jest.SpyInstance;

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
        jest.spyOn(appConfigWriter, 'convertEslintConfig').mockResolvedValue(fsMock);
        runNpmInstallSpy = jest.spyOn(common, 'runNpmInstallCommand').mockImplementation(() => undefined);
    });

    test('Test create-fiori convert eslint-config <appRoot>', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot]));

        // Result check
        expect(logLevelSpy).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalledWith(
            expect.stringContaining(
                "ESlint configuration converted. Ensure you install the new dependency by executing 'npm install'."
            )
        );
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(runNpmInstallSpy).toHaveBeenCalledWith(appRoot);
    });

    test('Test create-fiori convert eslint-config <appRoot> --simulate', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot]));

        // Result check
        expect(logLevelSpy).not.toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(runNpmInstallSpy).toHaveBeenCalled();
    });

    test('Test create-fiori convert eslint-config --verbose', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', '--verbose']));

        // Result check
        expect(logLevelSpy).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
        expect(runNpmInstallSpy).not.toHaveBeenCalled();
    });

    test('Test create-fiori convert eslint-config <appRoot> --skip-install', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot, '--skip-install']));

        // Result check
        expect(logLevelSpy).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalledWith(
            expect.stringContaining(
                "ESlint configuration converted. Ensure you install the new dependency by executing 'npm install'."
            )
        );
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('`npm install` was skipped'));
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(runNpmInstallSpy).not.toHaveBeenCalled();
    });

    test('Test create-fiori convert eslint-config <appRoot> --config strict', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot, '--config', 'strict']));

        // Result check
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalledWith(
            expect.stringContaining(
                "ESlint configuration converted. Ensure you install the new dependency by executing 'npm install'."
            )
        );
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(runNpmInstallSpy).toHaveBeenCalledWith(appRoot);
        expect(appConfigWriter.convertEslintConfig).toHaveBeenCalledWith(
            appRoot,
            expect.objectContaining({ config: 'strict' })
        );
    });

    test('Test create-fiori convert eslint-config with all options', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(
            getArgv(['eslint-config', appRoot, '--verbose', '--config', 'recommended', '--skip-install'])
        );

        // Result check
        expect(logLevelSpy).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalledWith(
            expect.stringContaining(
                "ESlint configuration converted. Ensure you install the new dependency by executing 'npm install'."
            )
        );
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('`npm install` was skipped'));
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(runNpmInstallSpy).not.toHaveBeenCalled();
        expect(appConfigWriter.convertEslintConfig).toHaveBeenCalledWith(
            appRoot,
            expect.objectContaining({ config: 'recommended' })
        );
    });

    test('Test create-fiori convert eslint-config handles errors gracefully', async () => {
        // Mock setup - simulate an error
        const errorMessage = 'Test error during conversion';
        jest.spyOn(appConfigWriter, 'convertEslintConfig').mockRejectedValue(new Error(errorMessage));

        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot]));

        // Result check
        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.stringContaining('Error while executing convert eslint-config')
        );
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
        expect(loggerMock.debug).toHaveBeenCalledWith(expect.any(Error));
        expect(fsMock.commit).not.toHaveBeenCalled();
        expect(runNpmInstallSpy).not.toHaveBeenCalled();
    });

    test('Test create-fiori convert eslint-config without path uses cwd', async () => {
        const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(appRoot);

        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config']));

        // Result check
        expect(cwdSpy).toHaveBeenCalled();
        expect(appConfigWriter.convertEslintConfig).toHaveBeenCalledWith(appRoot, expect.any(Object));
        expect(fsMock.commit).toHaveBeenCalled();
        expect(runNpmInstallSpy).toHaveBeenCalledWith(appRoot);

        cwdSpy.mockRestore();
    });

    test('Test create-fiori convert eslint-config with simulate and verbose', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot, '--verbose']));

        // Result check
        expect(logLevelSpy).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(runNpmInstallSpy).toHaveBeenCalled();
    });
});
