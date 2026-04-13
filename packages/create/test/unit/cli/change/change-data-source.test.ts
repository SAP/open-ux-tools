import { jest } from '@jest/globals';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UI5Config } from '@sap-ux/ui5-config';

import { createProjectAccessMock } from '../__mocks__/project-access-mock';

const __dirname = dirname(fileURLToPath(import.meta.url));

const appManifest = readFileSync(join(__dirname, '../../../fixtures/adaptation-project', 'manifest.json'), 'utf-8');
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

const mockValidateAdpAppType = jest.fn();
jest.unstable_mockModule('../../../../src/validation', () => ({
    validateBasePath: jest.fn(),
    validateAdpAppType: mockValidateAdpAppType,
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: jest.fn()
}));

const mockGetAppType = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () =>
    createProjectAccessMock({
        getAppType: mockGetAppType
    })
);

const mockDataSources = {
    'annotation': {
        'settings': { 'localUri': 'localService/annotation.xml' },
        'type': 'ODataAnnotation',
        'uri': "/path/to/annotation;v=2/Annotations(TechnicalName='annotation',Version='0001')/$value/?sap-language=EN"
    },
    'service': {
        'settings': {
            'annotations': ['annotation'],
            'localUri': 'localService/mockdata/metadata.xml'
        },
        'type': 'OData',
        'uri': '/path/to/odata/service/'
    }
} as unknown as Record<string, ManifestNamespace.DataSource>;

const mockAppInfo = { ExampleApp: { manifestUrl: 'https://sap.example' } };
const abapServicesMock = {
    getAppInfo: jest.fn().mockResolvedValue(mockAppInfo),
    getManifest: jest.fn().mockResolvedValue(JSON.parse(appManifest))
};

jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: () => ({
        getAppIndex: jest.fn().mockReturnValue({
            getAppInfo: abapServicesMock.getAppInfo
        }),
        getLayeredRepository: jest.fn().mockReturnValue({
            getManifest: abapServicesMock.getManifest
        })
    })
}));

const mockIsCFEnvironment = jest.fn();
const mockGetAdpConfig = jest.fn();
const mockGetVariant = jest.fn();
const mockGenerateChange = jest.fn();
const mockGetPromptsForChangeDataSource = jest.fn();
const mockInitBaseManifest = jest.fn();
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    isCFEnvironment: mockIsCFEnvironment,
    getAdpConfig: mockGetAdpConfig,
    getVariant: mockGetVariant,
    generateChange: mockGenerateChange,
    ChangeType: { CHANGE_DATA_SOURCE: 'appdescr_app_changeDataSource' },
    getPromptsForChangeDataSource: mockGetPromptsForChangeDataSource,
    ManifestService: {
        initBaseManifest: mockInitBaseManifest
    }
}));

jest.unstable_mockModule('prompts', () => ({ default: jest.fn(), prompt: jest.fn() }));

const { addChangeDataSourceCommand } = await import('../../../../src/cli/change/change-data-source');

describe('change/data-source', () => {
    let loggerMock: ToolsLogger;
    const memFsEditorMock = {
        commit: jest.fn().mockImplementation((cb) => cb())
    };
    const getArgv = (...arg: string[]) => ['', '', 'data-source', ...arg];
    const mockAnswers = {
        targetODataSource: 'mainService',
        targetODataUrl: '/sap/opu/odata/test',
        annotationUri: '/sap/opu/odata/test/annotation',
        maxAge: 60
    };
    const appRoot = join(__dirname, '../../../fixtures');

    beforeEach(() => {
        jest.clearAllMocks();
        loggerMock = {
            debug: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        mockGetLogger.mockReturnValue(loggerMock);
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
        mockGetPromptsForChangeDataSource.mockImplementation(() => []);
        mockInitBaseManifest.mockResolvedValue({
            fetchBaseManifest: jest.fn(),
            fetchMergedManifest: jest.fn(),
            getManifest: jest.fn(),
            fetchAppInfo: jest.fn(),
            getManifestDataSources: jest.fn().mockReturnValue(mockDataSources),
            getDataSourceMetadata: jest.fn().mockResolvedValue('<>metadata</>')
        });
    });

    test('change-data-source - CF environment', async () => {
        mockIsCFEnvironment.mockResolvedValueOnce(true);

        const command = new Command('change-data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith('This command is not supported for Cloud Foundry projects.');
        expect(mockGenerateChange).not.toHaveBeenCalled();
    });

    test('change-data-source - not an adaptation project', async () => {
        mockValidateAdpAppType.mockRejectedValueOnce(
            new Error('This command can only be used for an adaptation project')
        );

        const command = new Command('change-data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith('This command can only be used for an adaptation project');
        expect(mockGenerateChange).not.toHaveBeenCalled();
    });

    test('change data-source - preview-middleware custom configuration', async () => {
        jest.spyOn(UI5Config, 'newInstance').mockResolvedValue({
            findCustomMiddleware: jest.fn().mockImplementation((customMiddleware: string) => {
                if (customMiddleware === 'fiori-tools-preview') {
                    return undefined;
                }
                return {
                    configuration: {
                        adp: {
                            target: {
                                url: 'https://sap.example',
                                client: '100'
                            }
                        }
                    }
                };
            })
        } as Partial<UI5Config> as UI5Config);

        const command = new Command('data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(mockPromptYUIQuestions).toHaveBeenCalled();
        expect(mockGenerateChange).toHaveBeenCalled();
    });

    test('change data-source - --simulate', async () => {
        const command = new Command('data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv(appRoot, '--simulate'));

        expect(mockPromptYUIQuestions).toHaveBeenCalled();
        expect(mockGenerateChange).toHaveBeenCalled();
        expect(mockTraceChanges).toHaveBeenCalled();
    });

    test('change data-source - authentication error', async () => {
        mockInitBaseManifest
            .mockRejectedValueOnce({ message: '401:Unauthorized', response: { status: 401 } })
            .mockRejectedValueOnce({ message: '401:Unauthorized', response: { status: 401 } })
            .mockRejectedValueOnce({ message: '401:Unauthorized', response: { status: 401 } })
            .mockRejectedValueOnce({ message: '401:Unauthorized', response: { status: 401 } });

        const command = new Command('data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.error).toHaveBeenCalledWith('401:Unauthorized');
        expect(loggerMock.error).toHaveBeenCalledWith(
            'Authentication failed. Please check your credentials. Login attempts left: 2'
        );
        expect(loggerMock.debug).not.toHaveBeenCalledWith();
        expect(mockPromptYUIQuestions).not.toHaveBeenCalled();
        expect(mockGenerateChange).not.toHaveBeenCalled();
    });

    test('change data-source - no data sources in manifest', async () => {
        mockInitBaseManifest.mockResolvedValueOnce({
            getManifestDataSources: jest.fn().mockImplementation(() => {
                throw new Error('No data sources found in the manifest');
            })
        });
        const command = new Command('data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.error).toHaveBeenCalledWith('No data sources found in the manifest');
        expect(mockPromptYUIQuestions).not.toHaveBeenCalled();
        expect(mockGenerateChange).not.toHaveBeenCalled();
    });
});
