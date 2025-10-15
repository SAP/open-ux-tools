import { Severity } from '@sap-devx/yeoman-ui-types';
import { ErrorHandler } from '@sap-ux/inquirer-common';
import { type BackendSystem } from '@sap-ux/store';
import type { OdataServicePromptOptions } from '../../src/index';
import { getPrompts, getSystemSelectionQuestions, OdataVersion, promptNames } from '../../src/index';
import * as prompts from '../../src/prompts';
import * as systemSelection from '../../src/prompts/datasources/sap-system/system-selection';
import LoggerHelper from '../../src/prompts/logger-helper';
import { PromptState } from '../../src/utils';

jest.mock('../../src/prompts', () => ({
    __esModule: true, // Workaround for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('../../src/prompts')
}));

jest.mock('../../src/prompts/datasources/sap-system/system-selection', () => ({
    __esModule: true, // Workaround for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('../../src/prompts/datasources/sap-system/system-selection')
}));

jest.mock('@sap-ux/store', () => ({
    __esModule: true, // Workaround for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('@sap-ux/store'),
    SystemService: jest.fn().mockImplementation(() => ({
        getAll: jest.fn().mockResolvedValue([
            {
                name: 'storedSystem1',
                url: 'http://url1',
                systemType: 'OnPrem'
            },
            {
                name: 'storedSystem2',
                url: 'http://url2',
                systemType: 'BTP'
            }
        ] as BackendSystem[])
    }))
}));

describe('API tests', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    test('getPrompts', async () => {
        jest.spyOn(prompts, 'getQuestions').mockResolvedValue([
            {
                name: 'prompt1',
                validate: () => (PromptState.odataService.metadata = 'metadata contents')
            }
        ]);

        const prompOptions: OdataServicePromptOptions = {
            [promptNames.serviceUrl]: {
                requiredOdataVersion: OdataVersion.v4,
                showCollaborativeDraftWarning: false,
                additionalMessages: (input: any) => {
                    if (input === 'X') {
                        return {
                            message: 'X may mark the spot',
                            severity: Severity.information
                        };
                    }
                }
            }
        };

        const { prompts: questions, answers } = await getPrompts(prompOptions);

        expect(questions).toHaveLength(1);
        // execute the validate function as it would be done by inquirer
        (questions[0].validate as Function)();
        expect(answers.metadata).toBe('metadata contents');

        // Ensure stateful properties are set correctly
        expect(PromptState.isYUI).toBe(false);
        expect(PromptState.odataService).toBe(answers);
        // Default logger created
        expect(LoggerHelper.logger).toBeDefined();
        expect(ErrorHandler.logger).toBeDefined();
        expect(ErrorHandler.guidedAnswersEnabled).toBe(false);
    });

    test('getSystemSelectionQuestions', async () => {
        PromptState.isYUI = false;
        jest.spyOn(systemSelection, 'getSystemSelectionQuestions').mockResolvedValue([
            {
                name: 'prompt1',
                validate: () => (PromptState.odataService.servicePath = '/path/to/service')
            }
        ]);

        const { prompts: questions, answers } = await getSystemSelectionQuestions();
        expect(PromptState.isYUI).toBe(false);
        expect(questions).toHaveLength(1);
        (questions[0].validate as Function)();
        expect(answers.servicePath).toBe('/path/to/service');

        await getSystemSelectionQuestions(undefined, true);
        expect(PromptState.isYUI).toBe(true);
    });

    test('getPrompts, i18n is loaded', async () => {
        const { prompts: questions } = await getPrompts(undefined, undefined, true, undefined, true);

        expect(questions).toMatchSnapshot();
    });
});
