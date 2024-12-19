import { ErrorHandler } from '@sap-ux/inquirer-common';
import { getPrompts, getSystemSelectionQuestions } from '../../src/index';
import * as prompts from '../../src/prompts';
import * as systemSelection from '../../src/prompts/datasources/sap-system/system-selection';
import LoggerHelper from '../../src/prompts/logger-helper';
import { PromptState } from '../../src/utils';
import { type BackendSystem } from '@sap-ux/store';

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
                url: 'http://url1'
            },
            {
                name: 'storedSystem2',
                url: 'http://url2'
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
        const { prompts: questions, answers } = await getPrompts(undefined, undefined, true, undefined, true);

        expect(questions).toHaveLength(1);
        // execute the validate function as it would be done by inquirer
        (questions[0].validate as Function)();
        expect(answers.metadata).toBe('metadata contents');

        // Ensure stateful properties are set correctly
        expect(PromptState.isYUI).toBe(true);
        expect(PromptState.odataService).toBe(answers);
        expect(LoggerHelper.logger).toBeDefined();
        expect(ErrorHandler.guidedAnswersEnabled).toBe(true);
        expect(ErrorHandler.logger).toBeDefined();
    });

    test('getSystemSelectionQuestions', async () => {
        jest.spyOn(systemSelection, 'getSystemSelectionQuestions').mockResolvedValue([
            {
                name: 'prompt1',
                validate: () => (PromptState.odataService.servicePath = '/path/to/service')
            }
        ]);

        const { prompts: questions, answers } = await getSystemSelectionQuestions();

        expect(questions).toHaveLength(1);
        (questions[0].validate as Function)();
        expect(answers.servicePath).toBe('/path/to/service');
    });

    test('getPrompts, i18n is loaded', async () => {
        const { prompts: questions } = await getPrompts(undefined, undefined, true, undefined, true);

        expect(questions).toMatchSnapshot();
    });
});
