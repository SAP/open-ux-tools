import { jest } from '@jest/globals';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Editor } from 'mem-fs-editor';
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const validationMock = {
    validateBasePath: jest.fn(),
    validateAdpAppType: mockValidateAdpAppType,
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: jest.fn()
};
jest.unstable_mockModule('../../../../src/validation', () => validationMock);
jest.unstable_mockModule('../../../../src/validation/validation', () => validationMock);

const mockGetAppType = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () =>
    createProjectAccessMock({
        getAppType: mockGetAppType
    })
);

const mockGetAnnotationNamespaces = jest.fn();
jest.unstable_mockModule('@sap-ux/odata-service-writer', () => ({
    getAnnotationNamespaces: mockGetAnnotationNamespaces
}));

const mockIsCFEnvironment = jest.fn();
const mockGetAdpConfig = jest.fn();
const mockGetVariant = jest.fn();
const mockGenerateChange = jest.fn();
const mockGetPromptsForAddAnnotationsToOData = jest.fn();
const mockInitMergedManifest = jest.fn();
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    isCFEnvironment: mockIsCFEnvironment,
    getAdpConfig: mockGetAdpConfig,
    getVariant: mockGetVariant,
    generateChange: mockGenerateChange,
    ChangeType: { ADD_ANNOTATIONS_TO_ODATA: 'appdescr_app_addAnnotationsToOData' },
    getPromptsForAddAnnotationsToOData: mockGetPromptsForAddAnnotationsToOData,
    ManifestService: {
        initMergedManifest: mockInitMergedManifest
    }
}));

jest.unstable_mockModule('prompts', () => ({ default: jest.fn(), prompt: jest.fn() }));
jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: jest.fn()
}));

const { addAnnotationsToOdataCommand } = await import('../../../../src/cli/add/annotations-to-odata');

const mockDataSources = {
    'annotation': {
        'settings': { 'localUri': 'localService/annotation.xml' },
        'type': 'ODataAnnotation',
        'uri': "/path/to/annotation;v=2/Annotations(TechnicalName='annotation',Version='0001')/$value/?sap-language=EN"
    },
    'mainService': {
        'settings': {
            'annotations': ['annotation'],
            'localUri': 'localService/mockdata/metadata.xml'
        },
        'type': 'OData',
        'uri': '/path/to/odata/service/'
    }
} as unknown as Record<string, ManifestNamespace.DataSource>;

describe('add/annotations', () => {
    let loggerMock: ToolsLogger;
    const memFsEditorMock = {
        commit: jest.fn().mockImplementation((cb) => cb())
    };
    const getArgv = (...arg: string[]) => ['', '', 'annotations', ...arg];
    const mockAnswers: { id: string; fileSelectOption: number; filePath?: string } = {
        id: 'mainService',
        fileSelectOption: 2
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
        mockGetAppType.mockResolvedValue('Fiori Adaptation');
        mockValidateAdpAppType.mockResolvedValue(undefined);
        mockIsCFEnvironment.mockResolvedValue(false);
        mockGenerateChange.mockResolvedValue(memFsEditorMock as Partial<Editor> as Editor);
        mockPromptYUIQuestions.mockResolvedValue(mockAnswers);
        mockGetAdpConfig.mockResolvedValue({
            target: {
                url: 'https://sap.example',
                client: '100'
            }
        });
        mockGetPromptsForAddAnnotationsToOData.mockImplementation(() => []);
        mockInitMergedManifest.mockResolvedValue({
            fetchBaseManifest: jest.fn(),
            fetchMergedManifest: jest.fn(),
            getManifest: jest.fn(),
            fetchAppInfo: jest.fn(),
            getManifestDataSources: jest.fn().mockReturnValue(mockDataSources),
            getDataSourceMetadata: jest.fn().mockResolvedValue('<>metadata</>')
        });
        mockGetAnnotationNamespaces.mockReturnValue([{ alias: 'alias', namespace: 'namespace' }]);
    });

    test('should result in error when executed for CF projects', async () => {
        mockIsCFEnvironment.mockResolvedValueOnce(true);

        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv());

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith('This command is not supported for Cloud Foundry projects.');
        expect(mockGenerateChange).not.toHaveBeenCalled();
    });

    test('should result in error when system configuration is missing', async () => {
        mockGetAdpConfig.mockRejectedValueOnce(new Error('No system configuration found in ui5.yaml'));

        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv());

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith('No system configuration found in ui5.yaml');
        expect(mockGenerateChange).not.toHaveBeenCalled();
    });

    test('should result in error when the project is not adaptation project', async () => {
        mockValidateAdpAppType.mockRejectedValueOnce(
            new Error('This command can only be used for an adaptation project')
        );

        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith('This command can only be used for an adaptation project');
        expect(mockGenerateChange).not.toHaveBeenCalled();
    });

    test('should pass succesfully when missing fiori-tools-preview configuration but has preview-middleware configuration', async () => {
        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(mockPromptYUIQuestions).toHaveBeenCalled();
        expect(mockGenerateChange).toHaveBeenCalled();
    });

    test('should not commit changes when called with simulate', async () => {
        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv(appRoot, '--simulate'));

        expect(mockPromptYUIQuestions).toHaveBeenCalled();
        expect(mockGenerateChange).toHaveBeenCalled();
        expect(mockTraceChanges).toHaveBeenCalled();
    });

    test('should not fetch metadata when file path is provided', async () => {
        mockAnswers.fileSelectOption = 1;
        mockAnswers.filePath = 'path/to/file.xml';
        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv(appRoot, '--simulate'));
        mockAnswers.fileSelectOption = 2;
        mockAnswers.filePath = undefined;

        expect(mockPromptYUIQuestions).toHaveBeenCalled();
        expect(mockGenerateChange).toHaveBeenCalled();
        expect(mockTraceChanges).toHaveBeenCalled();
        expect(mockGetAnnotationNamespaces).not.toHaveBeenCalled();
    });

    test('should fail with authentication error after 3 attempts', async () => {
        mockInitMergedManifest
            .mockRejectedValueOnce({ message: '401:Unauthorized', response: { status: 401 } })
            .mockRejectedValueOnce({ message: '401:Unauthorized', response: { status: 401 } })
            .mockRejectedValueOnce({ message: '401:Unauthorized', response: { status: 401 } })
            .mockRejectedValueOnce({ message: '401:Unauthorized', response: { status: 401 } });

        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.error).toHaveBeenCalledWith('401:Unauthorized');
        expect(loggerMock.error).toHaveBeenCalledWith(
            'Authentication failed. Please check your credentials. Login attempts left: 2'
        );
        expect(loggerMock.debug).not.toHaveBeenCalledWith();
        expect(mockPromptYUIQuestions).not.toHaveBeenCalled();
        expect(mockGenerateChange).not.toHaveBeenCalled();
    });

    test('should fail when no data sources found in base application manifest', async () => {
        mockInitMergedManifest.mockResolvedValueOnce({
            getManifestDataSources: jest.fn().mockImplementation(() => {
                throw new Error('No data sources found in the manifest');
            })
        });

        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.error).toHaveBeenCalledWith('No data sources found in the manifest');
        expect(mockPromptYUIQuestions).not.toHaveBeenCalled();
        expect(mockGenerateChange).not.toHaveBeenCalled();
    });
});
