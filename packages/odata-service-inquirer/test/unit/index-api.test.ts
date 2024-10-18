import { ErrorHandler } from '../../src/error-handler/error-handler';
import { getPrompts } from '../../src/index';
import * as prompts from '../../src/prompts';
import * as utils from '../../src/utils';
import LoggerHelper from '../../src/prompts/logger-helper';
import { PromptState } from '../../src/utils';
import { hostEnvironment } from '../../src/types';
import { type BackendSystem } from '@sap-ux/store';

jest.mock('../../src/prompts', () => ({
    __esModule: true, // Workaround to for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('../../src/prompts')
}));

jest.mock('@sap-ux/store', () => ({
    __esModule: true, // Workaround to for spyOn TypeError: Jest cannot redefine property
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

    test('getPrompts, i18n is loaded', async () => {
        jest.spyOn(utils, 'getHostEnvironment').mockReturnValueOnce(hostEnvironment.cli);
        const { prompts: questions } = await getPrompts(undefined, undefined, true, undefined, true);

        expect(questions).toMatchSnapshot();
    });
});
