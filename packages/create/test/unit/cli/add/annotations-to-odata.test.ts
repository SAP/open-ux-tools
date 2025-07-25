import type { ManifestNamespace } from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Editor } from 'mem-fs-editor';
import { Command } from 'commander';
import { addAnnotationsToOdataCommand } from '../../../../src/cli/add/annotations-to-odata';
import * as tracer from '../../../../src/tracing/trace';
import * as common from '../../../../src/common';
import * as logger from '../../../../src/tracing/logger';
import * as validations from '../../../../src/validation/validation';
import * as adp from '@sap-ux/adp-tooling';
import * as projectAccess from '@sap-ux/project-access';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as oDataWriter from '@sap-ux/odata-service-writer';

const descriptorVariant = JSON.parse(
    readFileSync(join(__dirname, '../../../fixtures/adaptation-project', 'manifest.appdescr_variant'), 'utf-8')
);

jest.mock('prompts');
jest.mock('@sap-ux/adp-tooling');
jest.mock('@sap-ux/system-access');

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
    const traceSpy = jest.spyOn(tracer, 'traceChanges');
    const generateChangeSpy = jest
        .spyOn(adp, 'generateChange')
        .mockResolvedValue(memFsEditorMock as Partial<Editor> as Editor);
    const getArgv = (...arg: string[]) => ['', '', 'annotations', ...arg];
    const mockAnswers: adp.AddAnnotationsAnswers = {
        id: 'mainService',
        fileSelectOption: 2
    };
    const promptYUIQuestionsSpy = jest.spyOn(common, 'promptYUIQuestions').mockResolvedValue(mockAnswers);
    jest.spyOn(adp, 'getAdpConfig').mockResolvedValue({
        target: {
            url: 'https://sap.example',
            client: '100'
        }
    });
    jest.spyOn(validations, 'validateAdpProject').mockResolvedValue(undefined);
    jest.spyOn(adp, 'getPromptsForAddAnnotationsToOData').mockImplementation(() => []);
    jest.spyOn(adp.ManifestService, 'initMergedManifest').mockResolvedValue({
        fetchBaseManifest: jest.fn(),
        fetchMergedManifest: jest.fn(),
        getManifest: jest.fn(),
        fetchAppInfo: jest.fn(),
        getManifestDataSources: jest.fn().mockReturnValue(mockDataSources),
        getDataSourceMetadata: jest.fn().mockResolvedValue('<>metadata</>')
    } as unknown as adp.ManifestService);
    jest.spyOn(oDataWriter, 'getAnnotationNamespaces').mockReturnValue([
        {
            alias: 'alias',
            namespace: 'namespace'
        }
    ]);

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

    test('should result in error when executed for CF projects', async () => {
        jest.spyOn(validations, 'validateAdpProject').mockRejectedValueOnce(
            new Error('This command is not supported for CF projects.')
        );

        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith('This command is not supported for CF projects.');
        expect(generateChangeSpy).not.toHaveBeenCalled();
    });

    test('should result in error when system configuration is missing', async () => {
        jest.spyOn(adp, 'getAdpConfig').mockRejectedValueOnce(new Error('No system configuration found in ui5.yaml'));

        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv());

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith('No system configuration found in ui5.yaml');
        expect(generateChangeSpy).not.toHaveBeenCalled();
    });

    test('should result in error when the project is not adaptation project', async () => {
        jest.spyOn(validations, 'validateAdpProject').mockRejectedValueOnce(
            new Error('This command can only be used for an adaptation project')
        );

        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith('This command can only be used for an adaptation project');
        expect(generateChangeSpy).not.toHaveBeenCalled();
    });

    test('should pass succesfully when missing fiori-tools-preview configuration but has preview-middleware configuration', async () => {
        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(promptYUIQuestionsSpy).toHaveBeenCalled();
        expect(generateChangeSpy).toHaveBeenCalled();
    });

    test('should not commit changes when called with simulate', async () => {
        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv(appRoot, '--simulate'));

        expect(promptYUIQuestionsSpy).toHaveBeenCalled();
        expect(generateChangeSpy).toHaveBeenCalled();
        expect(traceSpy).toHaveBeenCalled();
    });

    test('should not fetch metadata when file path is provided', async () => {
        jest.spyOn(oDataWriter, 'getAnnotationNamespaces');
        mockAnswers.fileSelectOption = 1;
        mockAnswers.filePath = 'path/to/file.xml';
        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv(appRoot, '--simulate'));
        mockAnswers.fileSelectOption = 2;
        mockAnswers.filePath = undefined;

        expect(promptYUIQuestionsSpy).toHaveBeenCalled();
        expect(generateChangeSpy).toHaveBeenCalled();
        expect(traceSpy).toHaveBeenCalled();
        expect(oDataWriter.getAnnotationNamespaces).not.toHaveBeenCalled();
    });

    test('should fail with authentication error after 3 attempts', async () => {
        jest.spyOn(adp.ManifestService, 'initMergedManifest')
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

        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.error).toHaveBeenCalledWith('401:Unauthorized');
        expect(loggerMock.error).toHaveBeenCalledWith(
            'Authentication failed. Please check your credentials. Login attempts left: 2'
        );
        expect(loggerMock.debug).not.toHaveBeenCalledWith();
        expect(promptYUIQuestionsSpy).not.toHaveBeenCalled();
        expect(generateChangeSpy).not.toHaveBeenCalled();
    });

    test('should fail when no data sources found in base application manifest', async () => {
        jest.spyOn(adp.ManifestService, 'initMergedManifest').mockResolvedValueOnce({
            getManifestDataSources: jest.fn().mockImplementation(() => {
                throw new Error('No data sources found in the manifest');
            })
        } as unknown as adp.ManifestService);

        const command = new Command('annotations');
        addAnnotationsToOdataCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.error).toHaveBeenCalledWith('No data sources found in the manifest');
        expect(promptYUIQuestionsSpy).not.toHaveBeenCalled();
        expect(generateChangeSpy).not.toHaveBeenCalled();
    });
});
