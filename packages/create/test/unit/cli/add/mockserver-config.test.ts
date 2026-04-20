import { jest } from '@jest/globals';
import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createProjectAccessMock } from '../__mocks__/project-access-mock';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockGetLogger = jest.fn();
const mockSetLogLevelVerbose = jest.fn();
jest.unstable_mockModule('../../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: mockSetLogLevelVerbose
}));

const mockValidateBasePath = jest.fn();
jest.unstable_mockModule('../../../../src/validation', () => ({
    validateBasePath: mockValidateBasePath,
    validateAdpAppType: jest.fn(),
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: jest.fn()
}));

const mockGenerateMockserverConfig = jest.fn();
const mockGetMockserverConfigQuestions = jest.fn();
jest.unstable_mockModule('@sap-ux/mockserver-config-writer', () => ({
    generateMockserverConfig: mockGenerateMockserverConfig,
    getMockserverConfigQuestions: mockGetMockserverConfigQuestions
}));

const mockGetWebappPath = jest.fn();
const mockExecNpmCommand = jest.fn().mockResolvedValue('');
jest.unstable_mockModule('@sap-ux/project-access', () =>
    createProjectAccessMock({
        getWebappPath: mockGetWebappPath,
        execNpmCommand: mockExecNpmCommand
    })
);

jest.unstable_mockModule('node:child_process', () => ({
    spawn: jest.fn(),
    spawnSync: jest.fn(),
    execSync: jest.fn(),
    exec: jest.fn()
}));

const mockPrompt = jest.fn();
// prompts default export is a function with 'prompt' as a property
const mockPromptsModule = Object.assign(mockPrompt, { prompt: mockPrompt });
jest.unstable_mockModule('prompts', () => ({
    default: mockPromptsModule
}));

const { addAddMockserverConfigCommand } = await import('../../../../src/cli/add/mockserver-config');

describe('Test command add mockserver-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/bare-minimum');
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
        mockGetWebappPath.mockResolvedValue(join(appRoot, 'webapp'));
        fsMock = {
            dump: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        mockGenerateMockserverConfig.mockResolvedValue(fsMock);
    });

    test('Test create-fiori add mockserver-config <appRoot>', async () => {
        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot]));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(mockExecNpmCommand).toHaveBeenCalledWith(
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
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('Test create-fiori add mockserver-config <appRoot> --skip-install', async () => {
        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot, '--skip-install']));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.warn).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('Test create-fiori add mockserver-config <appRoot> --interactive', async () => {
        // Mock setup
        mockGetMockserverConfigQuestions.mockImplementation((q: any) => [q]);

        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot, '--interactive']));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(mockPrompt).toHaveBeenCalledWith([{ webappPath: join(appRoot, 'webapp'), askForOverwrite: true }]);
        expect(fsMock.commit).toHaveBeenCalled();
        expect(mockExecNpmCommand).toHaveBeenCalled();
    });

    test('Test create-fiori add mockserver-config <appRoot> --interactive with overwrite option', async () => {
        // Mock setup
        mockGetMockserverConfigQuestions.mockReturnValue([
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

        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', appRoot, '--interactive']));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(mockPrompt).toHaveBeenCalledWith([
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
        expect(mockExecNpmCommand).toHaveBeenCalled();
    });

    test('Test create-fiori add mockserver-config --verbose', async () => {
        // Mock setup - validate base path should fail when no path given (uses cwd)
        mockValidateBasePath.mockRejectedValueOnce(new Error('Required file does not exist.'));

        // Test execution
        const command = new Command('add');
        addAddMockserverConfigCommand(command);
        await command.parseAsync(getArgv(['mockserver-config', '--verbose']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });
});
