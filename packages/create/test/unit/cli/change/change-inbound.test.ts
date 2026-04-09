import { jest } from '@jest/globals';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { Command } from 'commander';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

import { createProjectAccessMock } from '../__mocks__/project-access-mock';

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
const mockValidateCloudAdpProject = jest.fn();
jest.unstable_mockModule('../../../../src/validation', () => ({
    validateBasePath: jest.fn(),
    validateAdpAppType: mockValidateAdpAppType,
    validateCloudAdpProject: mockValidateCloudAdpProject,
    hasFileDeletes: jest.fn()
}));

const mockGetAppType = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () => createProjectAccessMock({
    getAppType: mockGetAppType
}));

const mockIsCFEnvironment = jest.fn();
const mockGetVariant = jest.fn();
const mockGenerateChange = jest.fn();
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    isCFEnvironment: mockIsCFEnvironment,
    getVariant: mockGetVariant,
    generateChange: mockGenerateChange,
    ChangeType: { CHANGE_INBOUND: 'appdescr_app_changeInbound' },
    getPromptsForChangeInbound: jest.fn().mockReturnValue([])
}));

jest.unstable_mockModule('prompts', () => ({ default: jest.fn(), prompt: jest.fn() }));

const { addChangeInboundCommand } = await import('../../../../src/cli/change/change-inbound');

const cloudDescriptorVariant = JSON.parse(
    readFileSync(
        join(__dirname, '../../../fixtures/adaptation-project', 'manifest.appdescr_variant.cloud'),
        'utf-8'
    )
);

describe('change/inbound', () => {
    let loggerMock: ToolsLogger;
    const memFsEditorMock = {
        create: jest.fn().mockReturnValue({
            commit: jest.fn().mockImplementation((cb) => cb())
        }),
        commit: jest.fn().mockImplementation((cb) => cb())
    };
    const mockAnswers = {
        title: 'Some Title',
        subtitle: 'Some Subtitle',
        icon: 'Some Icon'
    };

    const getArgv = (...arg: string[]) => ['', '', 'inbound', ...arg];
    const appRoot = join(__dirname, '../../../fixtures');

    beforeEach(() => {
        jest.clearAllMocks();
        loggerMock = {
            debug: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        mockGetLogger.mockReturnValue(loggerMock);
        mockGetVariant.mockReturnValue(cloudDescriptorVariant);
        mockGetAppType.mockResolvedValue('Fiori Adaptation');
        mockValidateAdpAppType.mockResolvedValue(undefined);
        mockIsCFEnvironment.mockResolvedValue(false);
        mockValidateCloudAdpProject.mockResolvedValue(undefined);
        mockGenerateChange.mockResolvedValue(memFsEditorMock as Partial<Editor> as Editor);
        mockPromptYUIQuestions.mockResolvedValue(mockAnswers);
    });

    test('change-inbound - not an Adaptation Project', async () => {
        mockValidateAdpAppType.mockRejectedValueOnce(
            new Error('This command can only be used for an adaptation project')
        );

        const command = new Command('inbound');
        addChangeInboundCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith('This command can only be used for an adaptation project');
        expect(mockGenerateChange).not.toHaveBeenCalled();
    });

    test('change-inbound - CF environment', async () => {
        mockIsCFEnvironment.mockResolvedValueOnce(true);

        const command = new Command('inbound');
        addChangeInboundCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith('This command is not supported for Cloud Foundry projects.');
        expect(mockGenerateChange).not.toHaveBeenCalled();
    });

    test('change-inbound - onPremise project', async () => {
        mockValidateCloudAdpProject.mockRejectedValueOnce(
            new Error('This command can only be used for Cloud Adaptation Project.')
        );

        const command = new Command('inbound');
        addChangeInboundCommand(command);
        await command.parseAsync(getArgv(appRoot));
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith('This command can only be used for Cloud Adaptation Project.');
        expect(mockGenerateChange).not.toHaveBeenCalled();
    });

    test('change-inbound - --simulate', async () => {
        const command = new Command('inbound');
        addChangeInboundCommand(command);
        await command.parseAsync(getArgv(appRoot, '--simulate'));
        expect(mockPromptYUIQuestions).toHaveBeenCalled();
        expect(mockGenerateChange).toHaveBeenCalled();
        expect(mockTraceChanges).toHaveBeenCalled();
    });

    test('change-inbound - cloudProject', async () => {
        const command = new Command('inbound');
        addChangeInboundCommand(command);
        await command.parseAsync(getArgv(appRoot));
        expect(mockPromptYUIQuestions).toHaveBeenCalled();
        expect(mockGenerateChange).toHaveBeenCalled();
    });

    test('change-inbound - no basePath', async () => {
        const command = new Command('inbound');
        addChangeInboundCommand(command);
        await command.parseAsync(getArgv(''));
        expect(mockGenerateChange).toHaveBeenCalled();
    });
});
