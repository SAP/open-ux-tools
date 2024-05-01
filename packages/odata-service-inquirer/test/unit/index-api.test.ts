import { initI18nOdataServiceInquirer } from '../../src/i18n';
import * as prompts from '../../src/prompts';
import { PromptState } from '../../src/utils';
import { getPrompts } from '../../src/index';
import LoggerHelper from '../../src/prompts/logger-helper';
import { ErrorHandler } from '../../src/error-handler/error-handler';

jest.mock('../../src/prompts', () => ({
    __esModule: true, // Workaround to for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('../../src/prompts')
}));

describe('API tests', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
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
        expect(answers.odataService.metadata).toBe('metadata contents');

        // Ensure stateful properties are set correctly
        expect(PromptState.isYUI).toBe(true);
        expect(PromptState.odataService).toBe(answers.odataService);
        expect(LoggerHelper.logger).toBeDefined();
        expect(ErrorHandler.guidedAnswersEnabled).toBe(true);
        expect(ErrorHandler.logger).toBeDefined();
    });
});
