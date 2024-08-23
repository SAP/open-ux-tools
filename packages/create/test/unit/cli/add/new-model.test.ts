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

const getArgv = (...arg: string[]) => ['', '', 'model', ...arg];

describe('add/model', () => {
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

    test('should generate change with correct data', async () => {
        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).not.toBeCalled();
        expect(traceSpy).not.toBeCalled();
        expect(generateChangeMock).toBeCalledWith(expect.anything(), 'appdescr_ui5_addNewModel', {
            service: mockAnswers,
            variant: descriptorVariant
        });
    });

    test('should generate change with correct data and annotation', async () => {
        jest.spyOn(common, 'promptYUIQuestions').mockResolvedValue(mockAnswersWithAnnotation);

        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).not.toBeCalled();
        expect(traceSpy).not.toBeCalled();
        expect(generateChangeMock).toBeCalledWith(expect.anything(), 'appdescr_ui5_addNewModel', {
            service: mockService,
            annotation: mockAnnotation,
            variant: descriptorVariant
        });
    });

    test('should generate change with no base path and simulate true', async () => {
        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv('', '-s'));

        expect(loggerMock.debug).not.toBeCalled();
        expect(traceSpy).toBeCalled();
        expect(generateChangeMock).toBeCalledWith(expect.anything(), 'appdescr_ui5_addNewModel', {
            service: mockAnswers,
            variant: descriptorVariant
        });
    });

    test('should throw error and log it', async () => {
        getPromptsForNewModelMock.mockImplementation(() => {
            throw new Error('Failed');
        });
        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(traceSpy).not.toBeCalled();
        expect(generateChangeMock).not.toBeCalled();
    });
});
