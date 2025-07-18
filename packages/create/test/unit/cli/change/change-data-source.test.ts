import type { ManifestNamespace } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { Command } from 'commander';
import { addChangeDataSourceCommand } from '../../../../src/cli/change/change-data-source';
import * as tracer from '../../../../src/tracing/trace';
import * as common from '../../../../src/common';
import * as logger from '../../../../src/tracing/logger';
import * as validations from '../../../../src/validation/validation';
import * as adp from '@sap-ux/adp-tooling';
import * as projectAccess from '@sap-ux/project-access';
import { UI5Config } from '@sap-ux/ui5-config';
import { readFileSync } from 'fs';
import { join } from 'path';

const appManifest = readFileSync(join(__dirname, '../../../fixtures/adaptation-project', 'manifest.json'), 'utf-8');
const descriptorVariant = JSON.parse(
    readFileSync(join(__dirname, '../../../fixtures/adaptation-project', 'manifest.appdescr_variant'), 'utf-8')
);

jest.mock('prompts');
jest.mock('@sap-ux/adp-tooling');

const mockAppInfo = { ExampleApp: { manifestUrl: 'https://sap.example' } };
const abapServicesMock = {
    getAppInfo: jest.fn().mockResolvedValue(mockAppInfo),
    getManifest: jest.fn().mockResolvedValue(JSON.parse(appManifest))
};

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

jest.mock('@sap-ux/system-access', () => {
    return {
        ...jest.requireActual('@sap-ux/system-access'),
        createAbapServiceProvider: () => {
            return {
                getAppIndex: jest.fn().mockReturnValue({
                    getAppInfo: abapServicesMock.getAppInfo
                }),
                getLayeredRepository: jest.fn().mockReturnValue({
                    getManifest: abapServicesMock.getManifest
                })
            };
        }
    };
});

describe('change/data-source', () => {
    let loggerMock: ToolsLogger;
    const memFsEditorMock = {
        commit: jest.fn().mockImplementation((cb) => cb())
    };
    const traceSpy = jest.spyOn(tracer, 'traceChanges');
    const generateChangeSpy = jest
        .spyOn(adp, 'generateChange')
        .mockResolvedValue(memFsEditorMock as Partial<Editor> as Editor);
    const getArgv = (...arg: string[]) => ['', '', 'data-source', ...arg];
    const mockAnswers = {
        targetODataSource: 'mainService',
        targetODataUrl: '/sap/opu/odata/test',
        annotationUri: '/sap/opu/odata/test/annotation',
        maxAge: 60
    };
    const promptYUIQuestionsSpy = jest.spyOn(common, 'promptYUIQuestions').mockResolvedValue(mockAnswers);
    jest.spyOn(adp, 'getAdpConfig').mockResolvedValue({
        target: {
            url: 'https://sap.example',
            client: '100'
        }
    });
    jest.spyOn(validations, 'validateAdpProject').mockResolvedValue(undefined);
    jest.spyOn(adp.ManifestService, 'initBaseManifest').mockResolvedValue({
        fetchBaseManifest: jest.fn(),
        fetchMergedManifest: jest.fn(),
        getManifest: jest.fn(),
        fetchAppInfo: jest.fn(),
        getManifestDataSources: jest.fn().mockReturnValue(mockDataSources),
        getDataSourceMetadata: jest.fn().mockResolvedValue('<>metadata</>')
    } as unknown as adp.ManifestService);
    jest.spyOn(adp, 'getPromptsForChangeDataSource').mockImplementation(() => []);
    const appRoot = join(__dirname, '../../../fixtures');
    beforeEach(() => {
        jest.clearAllMocks();
        loggerMock = {
            debug: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        jest.spyOn(logger, 'getLogger').mockImplementation(() => loggerMock);
        jest.spyOn(adp, 'getVariant').mockReturnValue(descriptorVariant);
        jest.spyOn(projectAccess, 'getAppType').mockResolvedValue('Fiori Adaptation');
    });

    test('change-data-source - CF environment', async () => {
        jest.spyOn(validations, 'validateAdpProject').mockRejectedValueOnce(
            new Error('This command is not supported for CF projects.')
        );

        const command = new Command('change-data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.error).toBeCalledWith('This command is not supported for CF projects.');
        expect(generateChangeSpy).not.toBeCalled();
    });

    test('change-data-source - no system configuration', async () => {
        jest.spyOn(adp, 'getAdpConfig').mockRejectedValueOnce(new Error('No system configuration found in ui5.yaml'));

        const command = new Command('change-data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv());

        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.error).toBeCalledWith('No system configuration found in ui5.yaml');
        expect(generateChangeSpy).not.toBeCalled();
    });

    test('change-data-source - not an adaptation project', async () => {
        jest.spyOn(validations, 'validateAdpProject').mockRejectedValueOnce(
            new Error('This command can only be used for an adaptation project')
        );

        const command = new Command('change-data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.error).toBeCalledWith('This command can only be used for an adaptation project');
        expect(generateChangeSpy).not.toBeCalled();
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

        expect(promptYUIQuestionsSpy).toBeCalled();
        expect(generateChangeSpy).toBeCalled();
    });

    test('change data-source - --simulate', async () => {
        const command = new Command('data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv(appRoot, '--simulate'));

        expect(promptYUIQuestionsSpy).toBeCalled();
        expect(generateChangeSpy).toBeCalled();
        expect(traceSpy).toBeCalled();
    });

    test('change data-source - authentication error', async () => {
        jest.spyOn(adp.ManifestService, 'initBaseManifest')
            .mockRejectedValueOnce({
                message: '401:Unauthorized',
                response: { status: 401 }
            } as unknown as adp.ManifestService)
            .mockRejectedValueOnce({
                message: '401:Unauthorized',
                response: { status: 401 }
            } as unknown as adp.ManifestService)
            .mockRejectedValueOnce({
                message: '401:Unauthorized',
                response: { status: 401 }
            } as unknown as adp.ManifestService)
            .mockRejectedValueOnce({
                message: '401:Unauthorized',
                response: { status: 401 }
            } as unknown as adp.ManifestService);

        const command = new Command('data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.error).toBeCalledWith('401:Unauthorized');
        expect(loggerMock.error).toBeCalledWith(
            'Authentication failed. Please check your credentials. Login attempts left: 2'
        );
        expect(loggerMock.debug).not.toBeCalledWith();
        expect(promptYUIQuestionsSpy).not.toBeCalled();
        expect(generateChangeSpy).not.toBeCalled();
    });

    test('change data-source - no data sources in manifest', async () => {
        jest.spyOn(adp.ManifestService, 'initBaseManifest').mockResolvedValueOnce({
            getManifestDataSources: jest.fn().mockImplementation(() => {
                throw new Error('No data sources found in the manifest');
            })
        } as unknown as adp.ManifestService);
        const command = new Command('data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.error).toBeCalledWith('No data sources found in the manifest');
        expect(promptYUIQuestionsSpy).not.toBeCalled();
        expect(generateChangeSpy).not.toBeCalled();
    });
});
