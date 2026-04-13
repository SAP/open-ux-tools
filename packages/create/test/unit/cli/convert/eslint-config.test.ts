import { jest } from '@jest/globals';
import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ToolsLogger } from '@sap-ux/logger';

import { createProjectAccessMock } from '../__mocks__/project-access-mock';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockGetLogger = jest.fn();
const mockSetLogLevelVerbose = jest.fn();
jest.unstable_mockModule('../../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: mockSetLogLevelVerbose
}));

const mockRunNpmInstallCommand = jest.fn();
jest.unstable_mockModule('../../../../src/common', () => ({
    promptYUIQuestions: jest.fn(),
    runNpmInstallCommand: mockRunNpmInstallCommand
}));

const mockConvertEslintConfig = jest.fn();
jest.unstable_mockModule('@sap-ux/app-config-writer', () => ({
    convertEslintConfig: mockConvertEslintConfig
}));

const mockExecNpmCommand = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () =>
    createProjectAccessMock({
        execNpmCommand: mockExecNpmCommand
    })
);

jest.unstable_mockModule('prompts', () => ({ default: jest.fn(), prompt: jest.fn() }));

const { addConvertEslintCommand } = await import('../../../../src/cli/convert/eslint-config');

describe('Test command convert eslint-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/ui5-deploy-config');
    let loggerMock: ToolsLogger;
    let fsMock: Editor;

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
        mockGetLogger.mockReturnValue(loggerMock);
        mockSetLogLevelVerbose.mockImplementation(() => undefined);
        fsMock = {
            dump: jest.fn(),
            exists: jest.fn(),
            delete: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        mockConvertEslintConfig.mockResolvedValue(fsMock);
        mockRunNpmInstallCommand.mockImplementation(() => Promise.resolve());
        mockExecNpmCommand.mockResolvedValue('');
    });

    test('Test create-fiori convert eslint-config <appRoot>', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot]));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
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
        expect(mockExecNpmCommand).toHaveBeenCalledWith(
            ['uninstall', '@sap-ux/eslint-plugin-fiori-tools', '--no-save'],
            expect.objectContaining({ cwd: appRoot, logger: loggerMock })
        );
        // npm install should be called only after uninstall resolves
        expect(mockRunNpmInstallCommand).toHaveBeenCalledWith(
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
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalled();
        expect(fsMock.delete).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
        expect(mockRunNpmInstallCommand).not.toHaveBeenCalled();
    });

    test('Test create-fiori convert eslint-config <appRoot> --skip-install', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot, '--skip-install']));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
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
        expect(mockExecNpmCommand).not.toHaveBeenCalled();
        expect(mockRunNpmInstallCommand).not.toHaveBeenCalled();
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
        expect(mockExecNpmCommand).toHaveBeenCalledWith(
            ['uninstall', '@sap-ux/eslint-plugin-fiori-tools', '--no-save'],
            expect.objectContaining({ cwd: appRoot, logger: loggerMock })
        );
        expect(mockRunNpmInstallCommand).toHaveBeenCalledWith(
            appRoot,
            undefined,
            expect.objectContaining({ logger: loggerMock })
        );
        expect(mockConvertEslintConfig).toHaveBeenCalledWith(appRoot, expect.objectContaining({ config: 'strict' }));
    });

    test('Test create-fiori convert eslint-config with all options', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(
            getArgv(['eslint-config', appRoot, '--verbose', '--config', 'recommended', '--skip-install'])
        );

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
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
        expect(mockRunNpmInstallCommand).not.toHaveBeenCalled();
        expect(mockConvertEslintConfig).toHaveBeenCalledWith(
            appRoot,
            expect.objectContaining({ config: 'recommended' })
        );
    });

    test('Test create-fiori convert eslint-config handles errors gracefully', async () => {
        // Mock setup - simulate an error
        const errorMessage = 'Test error during conversion';
        mockConvertEslintConfig.mockRejectedValue(new Error(errorMessage));

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
        expect(mockRunNpmInstallCommand).not.toHaveBeenCalled();
    });

    test('Test create-fiori convert eslint-config without path uses cwd', async () => {
        const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(appRoot);

        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config']));

        // Result check
        expect(cwdSpy).toHaveBeenCalled();
        expect(mockConvertEslintConfig).toHaveBeenCalledWith(appRoot, expect.any(Object));
        expect(fsMock.commit).toHaveBeenCalled();
        expect(fsMock.delete).toHaveBeenCalledWith(join(appRoot, 'package-lock.json'));
        expect(mockExecNpmCommand).toHaveBeenCalledWith(
            ['uninstall', '@sap-ux/eslint-plugin-fiori-tools', '--no-save'],
            expect.objectContaining({ cwd: appRoot, logger: loggerMock })
        );
        expect(mockRunNpmInstallCommand).toHaveBeenCalledWith(
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
        expect(mockSetLogLevelVerbose).toHaveBeenCalled(); // simulate should set verbose
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.delete).not.toHaveBeenCalled(); // simulate should not stage any deletions
        expect(fsMock.commit).not.toHaveBeenCalled(); // simulate should not commit
        expect(mockRunNpmInstallCommand).not.toHaveBeenCalled(); // simulate should not run npm install
    });

    test('Test create-fiori convert eslint-config <appRoot> --simulate --config strict', async () => {
        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot, '--simulate', '--config', 'strict']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.delete).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
        expect(mockRunNpmInstallCommand).not.toHaveBeenCalled();
        expect(mockConvertEslintConfig).toHaveBeenCalledWith(appRoot, expect.objectContaining({ config: 'strict' }));
    });

    test('Test create-fiori convert eslint-config --simulate with error', async () => {
        // Mock setup - simulate an error
        const errorMessage = 'Test error during simulated conversion';
        mockConvertEslintConfig.mockRejectedValue(new Error(errorMessage));

        // Test execution
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot, '--simulate']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.stringContaining('Error while executing convert eslint-config')
        );
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
        expect(loggerMock.debug).toHaveBeenCalledWith(expect.any(Error));
        expect(fsMock.delete).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
        expect(mockRunNpmInstallCommand).not.toHaveBeenCalled();
    });

    test('Test create-fiori convert eslint-config <appRoot> - npm install not called when uninstall fails', async () => {
        // Given: uninstall rejects
        const uninstallError = new Error('uninstall failed');
        mockExecNpmCommand.mockRejectedValue(uninstallError);

        // When
        const command = new Command('convert');
        addConvertEslintCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot]));

        // Then: error is logged and npm install is NOT triggered
        expect(fsMock.commit).toHaveBeenCalled();
        // package-lock.json is staged and committed before the async uninstall runs
        expect(fsMock.delete).toHaveBeenCalledWith(join(appRoot, 'package-lock.json'));
        expect(mockExecNpmCommand).toHaveBeenCalledWith(
            ['uninstall', '@sap-ux/eslint-plugin-fiori-tools', '--no-save'],
            expect.objectContaining({ cwd: appRoot, logger: loggerMock })
        );
        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.stringContaining(`npm command failed. '${uninstallError.message}'`)
        );
        expect(mockRunNpmInstallCommand).not.toHaveBeenCalled();
    });
});
