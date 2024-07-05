import { join } from 'path';
import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import { readFileSync } from 'fs';

import type { ToolsLogger } from '@sap-ux/logger';
import * as projectAccess from '@sap-ux/project-access';
import { generateChange, getPromptsForNewModel } from '@sap-ux/adp-tooling';

import * as common from '../../../../src/common';
import * as tracer from '../../../../src/tracing/trace';
import * as logger from '../../../../src/tracing/logger';
import { addNewModelCommand } from '../../../../src/cli/add/new-model';

const descriptorVariant = JSON.parse(
    jest
        .requireActual('fs')
        .readFileSync(join(__dirname, '../../../fixtures/adaptation-project', 'manifest.appdescr_variant'), 'utf-8')
);

const readFileSyncMock = readFileSync as jest.Mock;
const generateChangeMock = generateChange as jest.Mock;
const getPromptsForNewModelMock = getPromptsForNewModel as jest.Mock;

const mockAnswers = {
    name: 'OData_ServiceName',
    uri: '/sap/opu/odata/some-name',
    version: '4.0',
    modelName: 'OData_ServiceModelName',
    modelSettings: '"key": "value"',
    addAnnotationMode: false
};

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn()
}));

jest.mock('prompts');

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    generateChange: jest.fn().mockResolvedValue({
        commit: jest.fn().mockImplementation((cb) => cb())
    } as Partial<Editor> as Editor),
    getPromptsForNewModel: jest.fn()
}));

const getArgv = (...arg: string[]) => ['', '', 'new-model', ...arg];

describe('add/new-model', () => {
    let loggerMock: ToolsLogger;
    let traceSpy: jest.SpyInstance;

    const appRoot = join(__dirname, '../../../fixtures');

    beforeEach(() => {
        loggerMock = {
            debug: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        jest.spyOn(common, 'promptYUIQuestions').mockResolvedValue(mockAnswers);
        jest.spyOn(logger, 'getLogger').mockImplementation(() => loggerMock);
        jest.spyOn(projectAccess, 'getAppType').mockResolvedValue('Fiori Adaptation');
        readFileSyncMock.mockReturnValue(JSON.stringify(descriptorVariant));
        traceSpy = jest.spyOn(tracer, 'traceChanges').mockResolvedValue();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('new-model', async () => {
        const command = new Command('new-model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).not.toBeCalled();
        expect(traceSpy).not.toBeCalled();
        expect(generateChangeMock).toBeCalledWith(expect.anything(), 'appdescr_ui5_addNewModel', {
            answers: mockAnswers,
            variant: descriptorVariant
        });
    });

    test('new-model with no base path and simulate true', async () => {
        const command = new Command('new-model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv('', '-s'));

        expect(loggerMock.debug).not.toBeCalled();
        expect(traceSpy).toBeCalled();
        expect(generateChangeMock).toBeCalledWith(expect.anything(), 'appdescr_ui5_addNewModel', {
            answers: mockAnswers,
            variant: descriptorVariant
        });
    });

    test('new-model throws error and logs it', async () => {
        getPromptsForNewModelMock.mockImplementation(() => {
            throw new Error('Failed');
        });
        const command = new Command('new-model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(traceSpy).not.toBeCalled();
        expect(generateChangeMock).not.toBeCalled();
    });

    // test('new-model  - no system configuration', async () => {
    //     jest.spyOn(UI5Config, 'newInstance').mockResolvedValue({
    //         findCustomMiddleware: jest.fn().mockReturnValue(undefined)
    //     } as Partial<UI5Config> as UI5Config);
    //     jest.spyOn(UI5Config, 'newInstance').mockResolvedValue(UI5Config.newInstance(''));
    //     jest.spyOn(UI5Config.prototype, 'findCustomMiddleware').mockReturnValue({
    //         configuration: { backend: [] }
    //     } as Partial<CustomMiddleware> as CustomMiddleware<object>);

    //     const command = new Command('change-data-source');
    //     addChangeDataSourceCommand(command);
    //     await command.parseAsync(getArgv());

    //     expect(loggerMock.debug).toBeCalled();
    //     expect(loggerMock.error).toBeCalledWith('No system configuration found in ui5.yaml');
    //     expect(generateChangeSpy).not.toBeCalled();
    // });

    // test('change-data-source - not an Adaptation Project', async () => {
    //     jest.spyOn(projectAccess, 'getAppType').mockResolvedValueOnce('SAPUI5 Extension');

    //     const command = new Command('change-data-source');
    //     addChangeDataSourceCommand(command);
    //     await command.parseAsync(getArgv(appRoot));

    //     expect(loggerMock.debug).toBeCalled();
    //     expect(loggerMock.error).toBeCalledWith('This command can only be used for an Adaptation Project');
    //     expect(generateChangeSpy).not.toBeCalled();
    // });

    // test('change data-source - preview-middleware custom configuration', async () => {
    //     jest.spyOn(UI5Config, 'newInstance').mockResolvedValue({
    //         findCustomMiddleware: jest.fn().mockImplementation((customMiddleware: string) => {
    //             if (customMiddleware === 'fiori-tools-preview') {
    //                 return undefined;
    //             }
    //             return {
    //                 configuration: {
    //                     adp: {
    //                         target: {
    //                             url: 'https://sap.example',
    //                             client: '100'
    //                         }
    //                     }
    //                 }
    //             };
    //         })
    //     } as Partial<UI5Config> as UI5Config);

    //     const command = new Command('data-source');
    //     addChangeDataSourceCommand(command);
    //     await command.parseAsync(getArgv(appRoot));

    //     expect(promptYUIQuestionsSpy).toBeCalled();
    //     expect(generateChangeSpy).toBeCalled();
    // });

    // test('change data-source - --simulate', async () => {
    //     const command = new Command('data-source');
    //     addChangeDataSourceCommand(command);
    //     await command.parseAsync(getArgv(appRoot, '--simulate'));

    //     expect(promptYUIQuestionsSpy).toBeCalled();
    //     expect(generateChangeSpy).toBeCalled();
    //     expect(traceSpy).toBeCalled();
    // });

    // test('change data-source - relative path to ui5 confir provided', async () => {
    //     const command = new Command('data-source');
    //     addChangeDataSourceCommand(command);
    //     await command.parseAsync(getArgv(appRoot, '--simulate', '-c', 'ui5.yaml'));
    //     expect(mockFs.readFileSync).toBeCalledWith(join(appRoot, 'ui5.yaml'), 'utf-8');
    // });

    // test('change data-source - absolute path to ui5 confir provided', async () => {
    //     const command = new Command('data-source');
    //     addChangeDataSourceCommand(command);
    //     await command.parseAsync(getArgv(appRoot, '--simulate', '-c', '/path/to/ui5.yaml'));
    //     expect(mockFs.readFileSync).toBeCalledWith('/path/to/ui5.yaml', 'utf-8');
    // });

    // test('change data-source - authentication error', async () => {
    //     jest.spyOn(adp, 'getManifest').mockRejectedValueOnce({
    //         message: '401:Unauthorized',
    //         response: { status: 401 }
    //     });

    //     const command = new Command('data-source');
    //     addChangeDataSourceCommand(command);
    //     await command.parseAsync(getArgv(appRoot));

    //     expect(loggerMock.error).toBeCalledWith('401:Unauthorized');
    //     expect(loggerMock.error).toBeCalledWith(
    //         'Authentication failed. Please check your credentials. Login attempts left: 2'
    //     );
    //     expect(loggerMock.debug).not.toBeCalledWith();
    //     expect(promptYUIQuestionsSpy).toBeCalled();
    //     expect(generateChangeSpy).toBeCalled();
    // });

    // test('change data-source - no data sources in manifest', async () => {
    //     jest.spyOn(adp, 'getManifest').mockResolvedValueOnce({ 'sap.app': {} } as unknown as Manifest);

    //     const command = new Command('data-source');
    //     addChangeDataSourceCommand(command);
    //     await command.parseAsync(getArgv(appRoot));

    //     expect(loggerMock.error).toBeCalledWith('No data sources found in the manifest');
    //     expect(promptYUIQuestionsSpy).not.toBeCalled();
    //     expect(generateChangeSpy).not.toBeCalled();
    // });
});
