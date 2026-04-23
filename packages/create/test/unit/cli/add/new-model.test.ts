import { join } from 'node:path';
import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import { readFileSync } from 'node:fs';

import type { ToolsLogger } from '@sap-ux/logger';
import * as projectAccess from '@sap-ux/project-access';
import { generateChange, getPromptsForNewModel, createNewModelData } from '@sap-ux/adp-tooling';

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
const createNewModelDataMock = createNewModelData as jest.Mock;

const mockAnswers = {
    modelAndDatasourceName: 'customer.OData_ServiceName',
    uri: '/sap/opu/odata/some-name',
    serviceType: 'OData v2',
    modelSettings: '"key": "value"'
};

const mockAnswersWithAnnotation = {
    modelAndDatasourceName: 'customer.OData_ServiceName',
    uri: '/sap/opu/odata/some-name',
    serviceType: 'OData v2',
    modelSettings: '"key": "value"',
    addAnnotationMode: true,
    dataSourceURI: '/sap/opu/odata/annotation/',
    annotationSettings: '"key2":"value2"'
};

const mockCFAnswers = {
    destination: { Host: 'https://cf.dest.example.com', Name: 'CF_DEST' },
    modelAndDatasourceName: 'customer.OData_ServiceName',
    uri: '/sap/opu/odata/some-name',
    serviceType: 'OData v2',
    modelSettings: '"key": "value"'
};

const mockNewModelData = { variant: descriptorVariant, serviceType: 'OData v2', isCloudFoundry: false };

jest.mock('node:fs', () => ({
    ...jest.requireActual('node:fs'),
    readFileSync: jest.fn()
}));

jest.mock('prompts');

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    generateChange: jest.fn().mockResolvedValue({
        commit: jest.fn().mockImplementation((cb) => cb())
    } as Partial<Editor> as Editor),
    getPromptsForNewModel: jest.fn(),
    createNewModelData: jest.fn()
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
        createNewModelDataMock.mockResolvedValue(mockNewModelData);
        traceSpy = jest.spyOn(tracer, 'traceChanges').mockResolvedValue();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should build model data and generate change', async () => {
        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).not.toHaveBeenCalled();
        expect(traceSpy).not.toHaveBeenCalled();
        expect(createNewModelDataMock).toHaveBeenCalledWith(appRoot, descriptorVariant, mockAnswers, loggerMock);
        expect(generateChangeMock).toHaveBeenCalledWith(appRoot, 'appdescr_ui5_addNewModel', mockNewModelData);
    });

    test('should pass annotation answers to createNewModelData', async () => {
        jest.spyOn(common, 'promptYUIQuestions').mockResolvedValue(mockAnswersWithAnnotation);

        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).not.toHaveBeenCalled();
        expect(createNewModelDataMock).toHaveBeenCalledWith(
            appRoot,
            descriptorVariant,
            mockAnswersWithAnnotation,
            loggerMock
        );
        expect(generateChangeMock).toHaveBeenCalledWith(appRoot, 'appdescr_ui5_addNewModel', mockNewModelData);
    });

    test('should pass CF answers to createNewModelData', async () => {
        jest.spyOn(common, 'promptYUIQuestions').mockResolvedValue(mockCFAnswers);

        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).not.toHaveBeenCalled();
        expect(createNewModelDataMock).toHaveBeenCalledWith(appRoot, descriptorVariant, mockCFAnswers, loggerMock);
        expect(generateChangeMock).toHaveBeenCalledWith(appRoot, 'appdescr_ui5_addNewModel', mockNewModelData);
    });

    test('should use cwd as base path and run in simulate mode', async () => {
        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv('', '-s'));

        expect(loggerMock.debug).not.toHaveBeenCalled();
        expect(traceSpy).toHaveBeenCalled();
        expect(createNewModelDataMock).toHaveBeenCalledWith(process.cwd(), descriptorVariant, mockAnswers, loggerMock);
        expect(generateChangeMock).toHaveBeenCalledWith(process.cwd(), 'appdescr_ui5_addNewModel', mockNewModelData);
    });

    test('should throw error and log it', async () => {
        getPromptsForNewModelMock.mockImplementation(() => {
            throw new Error('Failed');
        });
        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toHaveBeenCalled();
        expect(traceSpy).not.toHaveBeenCalled();
        expect(generateChangeMock).not.toHaveBeenCalled();
    });
});
