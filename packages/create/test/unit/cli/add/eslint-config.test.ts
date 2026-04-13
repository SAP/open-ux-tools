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

const mockGenerateEslintConfig = jest.fn();
jest.unstable_mockModule('@sap-ux/app-config-writer', () => ({
    generateEslintConfig: mockGenerateEslintConfig
}));

const mockGetProjectType = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () =>
    createProjectAccessMock({
        getProjectType: mockGetProjectType
    })
);

jest.unstable_mockModule('prompts', () => ({
    default: jest.fn(),
    prompt: jest.fn()
}));

const { addAddEslintConfigCommand } = await import('../../../../src/cli/add/eslint-config');

describe('Test command add eslint-config', () => {
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
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        mockGenerateEslintConfig.mockResolvedValue(fsMock);
        mockGetProjectType.mockResolvedValue('CAPNodejs');
        mockRunNpmInstallCommand.mockImplementation(() => Promise.resolve());
    });

    test('Test create-fiori add eslint-config <appRoot>', async () => {
        // Test execution
        const command = new Command('add');
        addAddEslintConfigCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot]));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(mockRunNpmInstallCommand).toHaveBeenCalledWith(appRoot, undefined, { logger: loggerMock });
    });

    test('Test create-fiori add eslint-config <appRoot> --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addAddEslintConfigCommand(command);
        await command.parseAsync(getArgv(['eslint-config', appRoot, '-s']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
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
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    describe('Project type specific behavior', () => {
        test('Test CAP project (CAPNodejs) shows additional lint instructions', async () => {
            // Mock setup
            mockGetProjectType.mockResolvedValue('CAPNodejs');

            // Test execution
            const command = new Command('add');
            addAddEslintConfigCommand(command);
            await command.parseAsync(getArgv(['eslint-config', appRoot]));

            // Result check
            expect(mockGetProjectType).toHaveBeenCalledWith(appRoot);
            expect(loggerMock.info).toHaveBeenCalledWith(
                expect.stringContaining('npm run lint --workspaces --if-present')
            );
            expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('CAP project root'));
            expect(fsMock.commit).toHaveBeenCalled();
        });

        test('Test EDMXBackend project does not show additional lint instructions', async () => {
            // Mock setup
            mockGetProjectType.mockResolvedValue('EDMXBackend');

            // Test execution
            const command = new Command('add');
            addAddEslintConfigCommand(command);
            await command.parseAsync(getArgv(['eslint-config', appRoot]));

            // Result check
            expect(mockGetProjectType).toHaveBeenCalledWith(appRoot);
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
            expect(mockRunNpmInstallCommand).not.toHaveBeenCalled();
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
            expect(mockRunNpmInstallCommand).not.toHaveBeenCalled();
            expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('`npm install` will be skipped'));
            expect(fsMock.commit).toHaveBeenCalled();
        });
    });
});
