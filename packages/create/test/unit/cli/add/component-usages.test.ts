import { jest } from '@jest/globals';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Editor } from 'mem-fs-editor';
import { Command } from 'commander';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockGetLogger = jest.fn();
jest.unstable_mockModule('../../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: jest.fn()
}));

const mockTraceChanges = jest.fn();
jest.unstable_mockModule('../../../../src/tracing/trace', () => ({
    traceChanges: mockTraceChanges
}));

const mockPromptYUIQuestions = jest.fn();
jest.unstable_mockModule('../../../../src/common', () => ({
    promptYUIQuestions: mockPromptYUIQuestions,
    runNpmInstallCommand: jest.fn()
}));

const mockValidateAdpAppType = jest.fn();
const validationMock = {
    validateBasePath: jest.fn(),
    validateAdpAppType: mockValidateAdpAppType,
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: jest.fn()
};
jest.unstable_mockModule('../../../../src/validation', () => validationMock);
jest.unstable_mockModule('../../../../src/validation/validation', () => validationMock);

jest.unstable_mockModule('prompts', () => ({ default: jest.fn(), prompt: jest.fn() }));

const mockIsCFEnvironment = jest.fn();
const mockGetVariant = jest.fn();
const mockGenerateChange = jest.fn();
const mockGetPromptsForAddComponentUsages = jest.fn();
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    isCFEnvironment: mockIsCFEnvironment,
    getVariant: mockGetVariant,
    generateChange: mockGenerateChange,
    ChangeType: { ADD_COMPONENT_USAGES: 'appdescr_ui5_addComponentUsages' },
    getPromptsForAddComponentUsages: mockGetPromptsForAddComponentUsages
}));

const { addComponentUsagesCommand } = await import('../../../../src/cli/add/component-usages');

describe('add/component-usages', () => {
    let loggerMock: ToolsLogger;
    const memFsEditorMock = {
        create: jest.fn().mockReturnValue({
            commit: jest.fn().mockImplementation((cb) => cb())
        })
    };
    const getArgv = (...arg: string[]) => ['', '', 'component-usages', ...arg];
    const mockAnswers = {
        id: 'customer.test',
        name: 'test.name',
        isLazy: 'true',
        data: '"key1": "value1"',
        settings: '"key2": "value2"',
        shouldAddLibrary: true,
        library: 'customer.library',
        libraryIsLazy: 'true'
    };

    const appRoot = join(__dirname, '../../../fixtures');

    beforeEach(() => {
        jest.clearAllMocks();
        loggerMock = {
            debug: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        mockGetLogger.mockReturnValue(loggerMock);

        const descriptorVariant = JSON.parse(
            readFileSync(join(__dirname, '../../../fixtures/adaptation-project', 'manifest.appdescr_variant'), 'utf-8')
        );
        mockGetVariant.mockReturnValue(descriptorVariant);
        mockValidateAdpAppType.mockResolvedValue(undefined);
        mockIsCFEnvironment.mockResolvedValue(false);
        mockGenerateChange.mockResolvedValue(memFsEditorMock as Partial<Editor> as Editor);
        mockPromptYUIQuestions.mockResolvedValue(mockAnswers);
        mockGetPromptsForAddComponentUsages.mockImplementation(() => []);
    });

    test('should result in error when executed for CF projects', async () => {
        mockIsCFEnvironment.mockResolvedValueOnce(true);

        const command = new Command('component-usages');
        addComponentUsagesCommand(command);
        await command.parseAsync(getArgv());

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith('This command is not supported for CF projects.');
        expect(mockGenerateChange).not.toHaveBeenCalled();
    });

    test('should result in error when the project is not adaptation project', async () => {
        mockValidateAdpAppType.mockRejectedValueOnce(
            new Error('This command can only be used for an adaptation project')
        );

        const command = new Command('component-usages');
        addComponentUsagesCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith('This command can only be used for an adaptation project');
        expect(mockGenerateChange).not.toHaveBeenCalled();
    });

    test('should pass succesfully and commit changes', async () => {
        const command = new Command('component-usages');
        addComponentUsagesCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(mockPromptYUIQuestions).toHaveBeenCalled();
        expect(mockGenerateChange).toHaveBeenCalled();
        expect(mockTraceChanges).not.toHaveBeenCalled();
    });

    test('should not commit changes when called with simulate', async () => {
        const command = new Command('component-usages');
        addComponentUsagesCommand(command);
        await command.parseAsync(getArgv(appRoot, '--simulate'));

        expect(mockPromptYUIQuestions).toHaveBeenCalled();
        expect(mockGenerateChange).toHaveBeenCalled();
        expect(mockTraceChanges).toHaveBeenCalled();
    });
});
