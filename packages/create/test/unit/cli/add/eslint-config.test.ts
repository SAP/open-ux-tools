import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import { join } from 'node:path';
import * as appConfigWriter from '@sap-ux/app-config-writer';
import type { ToolsLogger } from '@sap-ux/logger';
import * as logger from '../../../../src/tracing/logger';
import * as projectAccess from '@sap-ux/project-access';
import * as common from '../../../../src/common';
import { addAddEslintConfigCommand } from '../../../../src/cli/add/eslint-config';

jest.mock('prompts');

describe('Test command add eslint-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/ui5-deploy-config');
    let loggerMock: ToolsLogger;
    let fsMock: Editor;
    let logLevelSpy: jest.SpyInstance;
    let getProjectTypeSpy: jest.SpyInstance;
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
        jest.spyOn(appConfigWriter, 'generateEslintConfig').mockResolvedValue(fsMock);
        getProjectTypeSpy = jest.spyOn(projectAccess, 'getProjectType').mockResolvedValue('CAPNodejs');
        runNpmInstallSpy = jest.spyOn(common, 'runNpmInstallCommand').mockImplementation(() => undefined);
    });

    test('Test create-fiori add eslint-config <appRoot>', async () => {
        // Test execution
        const command = new Command('add');
        addAddEslintConfigCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot]));

        // Result check
        expect(logLevelSpy).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(runNpmInstallSpy).toHaveBeenCalledWith(appRoot);
    });

    test('Test create-fiori add eslint-config <appRoot> --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addAddEslintConfigCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot, '-s']));

        // Result check
        expect(logLevelSpy).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('Test create-fiori add eslint-config --verbose', async () => {
        // Test execution
        const command = new Command('add');
        addAddEslintConfigCommand(command);
        await command.parseAsync(getArgv(['eslint-config', '--verbose']));

        // Result check
        expect(logLevelSpy).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    describe('Project type specific behavior', () => {
        test('Test CAP project (CAPNodejs) shows additional lint instructions', async () => {
            // Mock setup
            getProjectTypeSpy.mockResolvedValue('CAPNodejs');

            // Test execution
            const command = new Command('add');
            addAddEslintConfigCommand(command);
            await command.parseAsync(getArgv(['eslint-config', appRoot]));

            // Result check
            expect(getProjectTypeSpy).toHaveBeenCalledWith(appRoot);
            expect(loggerMock.info).toHaveBeenCalledWith(
                expect.stringContaining('npm run lint --workspaces --if-present')
            );
            expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('CAP project root'));
            expect(fsMock.commit).toHaveBeenCalled();
        });

        test('Test EDMXBackend project does not show additional lint instructions', async () => {
            // Mock setup
            getProjectTypeSpy.mockResolvedValue('EDMXBackend');

            // Test execution
            const command = new Command('add');
            addAddEslintConfigCommand(command);
            await command.parseAsync(getArgv(['eslint-config', appRoot]));

            // Result check
            expect(getProjectTypeSpy).toHaveBeenCalledWith(appRoot);
            expect(loggerMock.info).toHaveBeenCalledWith(
                expect.stringContaining(
                    "ESlint configuration written. Ensure you install the new dependency by executing 'npm install'."
                )
            );
            // Should not show CAP-specific messages
            const infoMockCalls = (loggerMock.info as jest.Mock).mock.calls;
            const hasCapMessage = infoMockCalls.some((call) =>
                call[0].includes('npm run lint --workspaces --if-present')
            );
            expect(hasCapMessage).toBe(false);
            expect(fsMock.commit).toHaveBeenCalled();
        });
    });

    describe('npm install behavior', () => {
        test('Test --skip-install option skips npm install', async () => {
            // Test execution
            const command = new Command('add');
            addAddEslintConfigCommand(command);
            await command.parseAsync(getArgv(['eslint-config', appRoot, '--skip-install']));

            // Result check
            expect(runNpmInstallSpy).not.toHaveBeenCalled();
            expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('`npm install` will be skipped'));
            expect(loggerMock.info).toHaveBeenCalledWith(
                expect.stringContaining('Please make sure to install the dependencies')
            );
            expect(fsMock.commit).toHaveBeenCalled();
        });

        test('Test -n option (short form) skips npm install', async () => {
            // Test execution
            const command = new Command('add');
            addAddEslintConfigCommand(command);
            await command.parseAsync(getArgv(['eslint-config', appRoot, '-n']));

            // Result check
            expect(runNpmInstallSpy).not.toHaveBeenCalled();
            expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('`npm install` will be skipped'));
            expect(fsMock.commit).toHaveBeenCalled();
        });
    });
});
