import type { Manifest } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import type { CustomMiddleware } from '@sap-ux/ui5-config';
import { Command } from 'commander';
import { addChangeDataSourceCommand } from '../../../../src/cli/change/change-data-source';
import * as tracer from '../../../../src/tracing/trace';
import * as common from '../../../../src/common';
import * as logger from '../../../../src/tracing/logger';
import * as adp from '@sap-ux/adp-tooling';
import { UI5Config } from '@sap-ux/ui5-config';
import * as mockFs from 'fs';
import { join } from 'path';

const appManifest = jest
    .requireActual('fs')
    .readFileSync(join(__dirname, '../../../fixtures/adaptation-project', 'manifest.json'), 'utf-8');
const descriptorVariant = JSON.parse(
    jest
        .requireActual('fs')
        .readFileSync(join(__dirname, '../../../fixtures/adaptation-project', 'manifest.appdescr_variant'), 'utf-8')
);

jest.mock('fs');
jest.mock('prompts');

const mockAppInfo = { ExampleApp: { manifestUrl: 'https://sap.example' } };
const abapServicesMock = {
    getAppInfo: jest.fn().mockResolvedValue(mockAppInfo),
    getManifest: jest.fn().mockResolvedValue(JSON.parse(appManifest))
};

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
        create: jest.fn().mockReturnValue({
            commit: jest.fn().mockImplementation((cb) => cb())
        })
    };
    const traceSpy = jest.spyOn(tracer, 'traceChanges');
    jest.spyOn(adp, 'getManifest').mockResolvedValue(JSON.parse(appManifest));
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

    const appRoot = join(__dirname, '../../../fixtures');
    beforeEach(() => {
        jest.clearAllMocks();
        loggerMock = {
            debug: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        jest.spyOn(logger, 'getLogger').mockImplementation(() => loggerMock);
        jest.spyOn(mockFs, 'existsSync').mockImplementation(() => false);
        jest.spyOn(mockFs, 'readFileSync').mockImplementation(() => JSON.stringify(descriptorVariant));
        jest.spyOn(UI5Config, 'newInstance').mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue({
                configuration: {
                    adp: {
                        target: {
                            url: 'https://sap.example',
                            client: '100'
                        }
                    }
                }
            } as Partial<CustomMiddleware> as CustomMiddleware<object>)
        } as Partial<UI5Config> as UI5Config);
    });

    test('change-data-source - CF environment', async () => {
        jest.spyOn(mockFs, 'existsSync').mockImplementationOnce(() => true);
        jest.spyOn(mockFs, 'readFileSync').mockReturnValueOnce(JSON.stringify({ environment: 'CF' }));

        const command = new Command('change-data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.error).toBeCalledWith('Changing data source is not supported for CF projects.');
        expect(generateChangeSpy).not.toBeCalled();
    });

    test('change-data-source - no system configuration', async () => {
        jest.spyOn(UI5Config, 'newInstance').mockResolvedValue({
            findCustomMiddleware: jest.fn().mockReturnValue(undefined)
        } as Partial<UI5Config> as UI5Config);
        jest.spyOn(UI5Config, 'newInstance').mockResolvedValue(UI5Config.newInstance(''));
        jest.spyOn(UI5Config.prototype, 'findCustomMiddleware').mockReturnValue({
            configuration: { backend: [] }
        } as Partial<CustomMiddleware> as CustomMiddleware<object>);

        const command = new Command('change-data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv());

        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.error).toBeCalledWith('No system configuration found in ui5.yaml');
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
        jest.spyOn(adp, 'getManifest').mockRejectedValueOnce({
            message: '401:Unauthorized',
            response: { status: 401 }
        });

        const command = new Command('data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.error).toBeCalledWith('401:Unauthorized');
        expect(loggerMock.error).toBeCalledWith(
            'Authentication failed. Please check your credentials. Login attempts left: 2'
        );
        expect(loggerMock.debug).not.toBeCalledWith();
        expect(promptYUIQuestionsSpy).toBeCalled();
        expect(generateChangeSpy).toBeCalled();
    });

    test('change data-source - no data sources in manifest', async () => {
        jest.spyOn(adp, 'getManifest').mockResolvedValueOnce({ 'sap.app': {} } as unknown as Manifest);

        const command = new Command('data-source');
        addChangeDataSourceCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.error).toBeCalledWith('No data sources found in the manifest');
        expect(promptYUIQuestionsSpy).not.toBeCalled();
        expect(generateChangeSpy).not.toBeCalled();
    });
});
