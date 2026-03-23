import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import { join } from 'node:path';
import * as appConfigWriter from '@sap-ux/app-config-writer';
import type { ToolsLogger } from '@sap-ux/logger';
import * as logger from '../../../../src/tracing/logger';
import * as common from '../../../../src/common';
import * as projectAccess from '@sap-ux/project-access';
import { addConvertEslintCommand } from '../../../../src/cli/convert/eslint-config';

jest.mock('prompts');

describe('Test command convert eslint-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/ui5-deploy-config');
    let loggerMock: ToolsLogger;
    let fsMock: Editor;
    let logLevelSpy: jest.SpyInstance;
    let runNpmInstallSpy: jest.SpyInstance;
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
            exists: jest.fn(),
            delete: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        jest.spyOn(appConfigWriter, 'convertEslintConfig').mockResolvedValue(fsMock);
        runNpmInstallSpy = jest.spyOn(common, 'runNpmInstallCommand').mockImplementation(() => undefined);
        execNpmCommandSpy = jest.spyOn(projectAccess, 'execNpmCommand').mockResolvedValue('');
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
                "ESlint configuration converted. Ensure the new configuration is working correctly before deleting old configuration files like '.eslintrc.json' or '.eslintignore'."
            )
        );
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        // package-lock.json is staged for deletion before fs.commit, so it is flushed in the same commit
        expect(fsMock.delete).toHaveBeenCalledWith(join(appRoot, 'package-lock.json'));
        // Uninstall should be called with --no-save (does not modify package.json)
        expect(execNpmCommandSpy).toHaveBeenCalledWith(
            ['uninstall', '@sap-ux/eslint-plugin-fiori-tools', '--no-save'],
            expect.objectContaining({ cwd: appRoot, logger: loggerMock })
        );
        // npm install should be called only after uninstall resolves
        expect(runNpmInstallSpy).toHaveBeenCalledWith(
            appRoot,
            undefined,
            expect.objectContaining({ logger: loggerMock })
        );
    });

    test('Test create-fiori convert eslint-config --verbose without path', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', '--verbose']));

        // Result check
        expect(logLevelSpy).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalled();
        expect(fsMock.delete).not.toHaveBeenCalled();
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
                "ESlint configuration converted. Ensure the new configuration is working correctly before deleting old configuration files like '.eslintrc.json' or '.eslintignore'."
            )
        );
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('`npm install` was skipped'));
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(fsMock.delete).not.toHaveBeenCalled();
        expect(execNpmCommandSpy).not.toHaveBeenCalled();
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
                "ESlint configuration converted. Ensure the new configuration is working correctly before deleting old configuration files like '.eslintrc.json' or '.eslintignore'."
            )
        );
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(fsMock.delete).toHaveBeenCalledWith(join(appRoot, 'package-lock.json'));
        expect(execNpmCommandSpy).toHaveBeenCalledWith(
            ['uninstall', '@sap-ux/eslint-plugin-fiori-tools', '--no-save'],
            expect.objectContaining({ cwd: appRoot, logger: loggerMock })
        );
        expect(runNpmInstallSpy).toHaveBeenCalledWith(
            appRoot,
            undefined,
            expect.objectContaining({ logger: loggerMock })
        );
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
                "ESlint configuration converted. Ensure the new configuration is working correctly before deleting old configuration files like '.eslintrc.json' or '.eslintignore'."
            )
        );
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('`npm install` was skipped'));
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(fsMock.delete).not.toHaveBeenCalled();
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
        expect(fsMock.delete).not.toHaveBeenCalled();
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
        expect(fsMock.delete).toHaveBeenCalledWith(join(appRoot, 'package-lock.json'));
        expect(execNpmCommandSpy).toHaveBeenCalledWith(
            ['uninstall', '@sap-ux/eslint-plugin-fiori-tools', '--no-save'],
            expect.objectContaining({ cwd: appRoot, logger: loggerMock })
        );
        expect(runNpmInstallSpy).toHaveBeenCalledWith(
            appRoot,
            undefined,
            expect.objectContaining({ logger: loggerMock })
        );

        cwdSpy.mockRestore();
    });

    test('Test create-fiori convert eslint-config <appRoot> --simulate', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot, '--simulate']));

        // Result check
        expect(logLevelSpy).toHaveBeenCalled(); // simulate should set verbose
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.delete).not.toHaveBeenCalled(); // simulate should not stage any deletions
        expect(fsMock.commit).not.toHaveBeenCalled(); // simulate should not commit
        expect(runNpmInstallSpy).not.toHaveBeenCalled(); // simulate should not run npm install
    });

    test('Test create-fiori convert eslint-config <appRoot> --simulate --config strict', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot, '--simulate', '--config', 'strict']));

        // Result check
        expect(logLevelSpy).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.delete).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
        expect(runNpmInstallSpy).not.toHaveBeenCalled();
        expect(appConfigWriter.convertEslintConfig).toHaveBeenCalledWith(
            appRoot,
            expect.objectContaining({ config: 'strict' })
        );
    });

    test('Test create-fiori convert eslint-config --simulate with error', async () => {
        // Mock setup - simulate an error
        const errorMessage = 'Test error during simulated conversion';
        jest.spyOn(appConfigWriter, 'convertEslintConfig').mockRejectedValue(new Error(errorMessage));

        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot, '--simulate']));

        // Result check
        expect(logLevelSpy).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.stringContaining('Error while executing convert eslint-config')
        );
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
        expect(loggerMock.debug).toHaveBeenCalledWith(expect.any(Error));
        expect(fsMock.delete).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
        expect(runNpmInstallSpy).not.toHaveBeenCalled();
    });

    test('Test create-fiori convert eslint-config <appRoot> - npm install not called when uninstall fails', async () => {
        // Given: uninstall rejects
        const uninstallError = new Error('uninstall failed');
        execNpmCommandSpy.mockRejectedValue(uninstallError);

        // When
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot]));

        // Then: error is logged and npm install is NOT triggered
        expect(fsMock.commit).toHaveBeenCalled();
        // package-lock.json is staged and committed before the async uninstall runs
        expect(fsMock.delete).toHaveBeenCalledWith(join(appRoot, 'package-lock.json'));
        expect(execNpmCommandSpy).toHaveBeenCalledWith(
            ['uninstall', '@sap-ux/eslint-plugin-fiori-tools', '--no-save'],
            expect.objectContaining({ cwd: appRoot, logger: loggerMock })
        );
        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.stringContaining(`npm (un)install failed. '${uninstallError.message}'`)
        );
        expect(runNpmInstallSpy).not.toHaveBeenCalled();
    });
});
