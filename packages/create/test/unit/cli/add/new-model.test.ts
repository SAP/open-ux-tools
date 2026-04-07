import { join } from 'node:path';
import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import { readFileSync } from 'node:fs';

import type { ToolsLogger } from '@sap-ux/logger';
import * as projectAccess from '@sap-ux/project-access';
import { generateChange, getPromptsForNewModel } from '@sap-ux/adp-tooling';
import * as adpTooling from '@sap-ux/adp-tooling';
import * as btpUtils from '@sap-ux/btp-utils';

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
    isCFEnvironment: jest.fn()
}));

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isOnPremiseDestination: jest.fn()
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
        jest.spyOn(adpTooling, 'isCFEnvironment').mockResolvedValue(false);
        jest.spyOn(btpUtils, 'isOnPremiseDestination').mockReturnValue(false);
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

        expect(loggerMock.debug).not.toHaveBeenCalled();
        expect(traceSpy).not.toHaveBeenCalled();
        expect(generateChangeMock).toHaveBeenCalledWith(
            expect.anything(),
            'appdescr_ui5_addNewModel',
            {
                variant: descriptorVariant,
                serviceType: 'OData v2',
                isCloudFoundry: false,
                destinationName: undefined,
                isOnPremiseDestination: undefined,
                service: {
                    name: 'customer.OData_ServiceName',
                    uri: '/sap/opu/odata/some-name',
                    modelName: 'customer.OData_ServiceName',
                    version: '2.0',
                    modelSettings: '"key": "value"'
                }
            },
            null,
            undefined,
            expect.anything()
        );
    });

    test('should generate change with correct data and annotation', async () => {
        jest.spyOn(common, 'promptYUIQuestions').mockResolvedValue(mockAnswersWithAnnotation);

        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).not.toHaveBeenCalled();
        expect(traceSpy).not.toHaveBeenCalled();
        expect(generateChangeMock).toHaveBeenCalledWith(
            expect.anything(),
            'appdescr_ui5_addNewModel',
            {
                variant: descriptorVariant,
                serviceType: 'OData v2',
                isCloudFoundry: false,
                destinationName: undefined,
                isOnPremiseDestination: undefined,
                service: {
                    name: 'customer.OData_ServiceName',
                    uri: '/sap/opu/odata/some-name',
                    modelName: 'customer.OData_ServiceName',
                    version: '2.0',
                    modelSettings: '"key": "value"'
                },
                annotation: {
                    dataSourceName: 'customer.OData_ServiceName.annotation',
                    dataSourceURI: '/sap/opu/odata/annotation/',
                    settings: '"key2":"value2"'
                }
            },
            null,
            undefined,
            expect.anything()
        );
    });

    test('should generate change with correct data for CF project', async () => {
        jest.spyOn(adpTooling, 'isCFEnvironment').mockResolvedValue(true);
        jest.spyOn(btpUtils, 'isOnPremiseDestination').mockReturnValue(true);
        jest.spyOn(common, 'promptYUIQuestions').mockResolvedValue(mockCFAnswers);

        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).not.toHaveBeenCalled();
        expect(traceSpy).not.toHaveBeenCalled();
        expect(generateChangeMock).toHaveBeenCalledWith(
            expect.anything(),
            'appdescr_ui5_addNewModel',
            {
                variant: descriptorVariant,
                serviceType: 'OData v2',
                isCloudFoundry: true,
                destinationName: 'CF_DEST',
                isOnPremiseDestination: true,
                service: {
                    name: 'customer.OData_ServiceName',
                    uri: '/sap/opu/odata/some-name',
                    modelName: 'customer.OData_ServiceName',
                    version: '2.0',
                    modelSettings: '"key": "value"'
                }
            },
            null,
            undefined,
            expect.anything()
        );
    });

    test('should generate change with no base path and simulate true', async () => {
        const command = new Command('model');
        addNewModelCommand(command);
        await command.parseAsync(getArgv('', '-s'));

        expect(loggerMock.debug).not.toHaveBeenCalled();
        expect(traceSpy).toHaveBeenCalled();
        expect(generateChangeMock).toHaveBeenCalledWith(
            expect.anything(),
            'appdescr_ui5_addNewModel',
            {
                variant: descriptorVariant,
                serviceType: 'OData v2',
                isCloudFoundry: false,
                destinationName: undefined,
                isOnPremiseDestination: undefined,
                service: {
                    name: 'customer.OData_ServiceName',
                    uri: '/sap/opu/odata/some-name',
                    modelName: 'customer.OData_ServiceName',
                    version: '2.0',
                    modelSettings: '"key": "value"'
                }
            },
            null,
            undefined,
            expect.anything()
        );
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
