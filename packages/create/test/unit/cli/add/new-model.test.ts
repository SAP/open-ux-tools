import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';

import { createProjectAccessMock } from '../__mocks__/project-access-mock';

const __dirname = dirname(fileURLToPath(import.meta.url));

const descriptorVariant = JSON.parse(
    readFileSync(join(__dirname, '../../../fixtures/adaptation-project', 'manifest.appdescr_variant'), 'utf-8')
);

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

jest.unstable_mockModule('../../../../src/validation/validation', () => ({
    validateBasePath: jest.fn(),
    validateAdpAppType: jest.fn(),
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: jest.fn()
}));

const mockGetAppType = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () =>
    createProjectAccessMock({
        getAppType: mockGetAppType
    })
);

const mockReadFileSync = jest.fn();
jest.unstable_mockModule('fs', () => ({
    readFileSync: mockReadFileSync,
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn()
}));

jest.unstable_mockModule('prompts', () => ({ default: jest.fn(), prompt: jest.fn() }));

const mockGenerateChange = jest.fn().mockResolvedValue({
    commit: jest.fn().mockImplementation((cb) => cb())
} as Partial<Editor> as Editor);
const mockGetPromptsForNewModel = jest.fn();
const mockGetVariant = jest.fn();
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    generateChange: mockGenerateChange,
    ChangeType: { ADD_NEW_MODEL: 'appdescr_ui5_addNewModel' },
    getPromptsForNewModel: mockGetPromptsForNewModel,
    getVariant: mockGetVariant,
    isCFEnvironment: jest.fn().mockResolvedValue(false)
}));

const { addNewModelCommand } = await import('../../../../src/cli/add/new-model');

const mockAnswers = {
    name: 'OData_ServiceName',
    uri: '/sap/opu/odata/some-name',
    version: '4.0',
    modelName: 'OData_ServiceModelName',
    modelSettings: '"key": "value"'
};

const mockAnswersWithAnnotation = {
    name: 'OData_ServiceName',
    uri: '/sap/opu/odata/some-name',
    version: '4.0',
    modelName: 'OData_ServiceModelName',
    modelSettings: '"key": "value"',
    addAnnotationMode: true,
    dataSourceName: 'OData_AnnotationName',
    dataSourceURI: '/sap/opu/odata/annotation/',
    annotationSettings: '"key2":"value2"'
};

const mockService = {
    name: 'OData_ServiceName',
    uri: '/sap/opu/odata/some-name',
    version: '4.0',
    modelName: 'OData_ServiceModelName',
    modelSettings: '"key": "value"'
};

const mockAnnotation = {
    dataSourceName: 'OData_AnnotationName',
    dataSourceURI: '/sap/opu/odata/annotation/',
    settings: '"key2":"value2"'
};

const getArgv = (...arg: string[]) => ['', '', 'model', ...arg];

describe('add/model', () => {
    let loggerMock: ToolsLogger;

    const appRoot = join(__dirname, '../../../fixtures');

    beforeEach(() => {
        loggerMock = {
            debug: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        mockGetLogger.mockReturnValue(loggerMock);
        mockPromptYUIQuestions.mockResolvedValue(mockAnswers);
        mockGetAppType.mockResolvedValue('Fiori Adaptation');
        mockGetVariant.mockReturnValue(descriptorVariant);
        mockReadFileSync.mockReturnValue(JSON.stringify(descriptorVariant));
        mockTraceChanges.mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should generate change with correct data', async () => {
        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).not.toHaveBeenCalled();
        expect(mockTraceChanges).not.toHaveBeenCalled();
        expect(mockGenerateChange).toHaveBeenCalledWith(expect.anything(), 'appdescr_ui5_addNewModel', {
            service: mockAnswers,
            variant: descriptorVariant
        });
    });

    test('should generate change with correct data and annotation', async () => {
        mockPromptYUIQuestions.mockResolvedValue(mockAnswersWithAnnotation);

        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).not.toHaveBeenCalled();
        expect(mockTraceChanges).not.toHaveBeenCalled();
        expect(mockGenerateChange).toHaveBeenCalledWith(expect.anything(), 'appdescr_ui5_addNewModel', {
            service: mockService,
            annotation: mockAnnotation,
            variant: descriptorVariant
        });
    });

    test('should generate change with no base path and simulate true', async () => {
        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv('', '-s'));

        expect(loggerMock.debug).not.toHaveBeenCalled();
        expect(mockTraceChanges).toHaveBeenCalled();
        expect(mockGenerateChange).toHaveBeenCalledWith(expect.anything(), 'appdescr_ui5_addNewModel', {
            service: mockAnswers,
            variant: descriptorVariant
        });
    });

    test('should throw error and log it', async () => {
        mockGetPromptsForNewModel.mockImplementation(() => {
            throw new Error('Failed');
        });
        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(mockTraceChanges).not.toHaveBeenCalled();
        expect(mockGenerateChange).not.toHaveBeenCalled();
    });
});
