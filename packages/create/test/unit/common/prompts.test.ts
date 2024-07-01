import type { YUIQuestion, ListQuestion } from '@sap-ux/inquirer-common';
import { convertQuestion, promptYUIQuestions } from '../../../src/common/prompts';
import prompts from 'prompts';

const YUI_TEST_QUESTION: Record<string, YUIQuestion | ListQuestion> = {
    ListOfStringsWithValue: {
        type: 'list',
        name: 'ListOfStrings',
        message: 'List of strings',
        choices: ['a', 'b', 'c'],
        default: 'a',
        validate: (value: string) => (value === 'a' ? true : 'Only "a" is valid')
    } as ListQuestion,
    ListOfObjectsWithIndex: {
        type: 'list',
        name: 'ListOfObjects',
        message: 'List of strings',
        choices: [
            { name: 'first', value: 'a' },
            { name: 'second', value: 'b' }
        ],
        default: 'b'
    } as ListQuestion,
    OptionalQuestion: {
        type: 'input',
        name: 'OptionalQuestion',
        message: async () => 'Optional question',
        guiOptions: { mandatory: false }
    } as YUIQuestion
};

describe('common', () => {
    describe('convertQuestion', () => {
        test('convert a list question with list of strings', async () => {
            const question = YUI_TEST_QUESTION.ListOfStringsWithValue;
            const answers = {};
            const result = await convertQuestion(question, answers);
            expect(result).toEqual({
                type: 'autocomplete',
                name: 'ListOfStrings',
                message: 'List of strings',
                choices: [
                    { title: 'a', value: 'a' },
                    { title: 'b', value: 'b' },
                    { title: 'c', value: 'c' }
                ],
                validate: expect.any(Function),
                initial: expect.any(Function)
            });
            expect((result.initial as Function)()).toBe(0);
        });
        test('convert a list question with list of objects', async () => {
            const question = YUI_TEST_QUESTION.ListOfObjectsWithIndex;
            const answers = {};
            const result = await convertQuestion(question, answers);
            expect(result).toEqual({
                type: 'autocomplete',
                name: question.name,
                message: question.message,
                choices: [
                    { title: 'first', value: 'a' },
                    { title: 'second', value: 'b' }
                ],
                validate: expect.any(Function),
                initial: expect.any(Function)
            });
            expect((result.initial as Function)()).toBe(1);
        });
        test('convert an optional question', async () => {
            const question = YUI_TEST_QUESTION.OptionalQuestion;
            const answers = {};
            const result = await convertQuestion(question, answers);
            expect(typeof result.message === 'string' && result.message.endsWith('(optional)')).toBe(true);
        });
    });

    describe('promptYUIQuestions', () => {
        test('dont prompt just use defaults', async () => {
            const answers = await promptYUIQuestions(Object.values(YUI_TEST_QUESTION), true);
            expect(answers[YUI_TEST_QUESTION.ListOfStringsWithValue.name]).toBe('a');
            expect(answers[YUI_TEST_QUESTION.ListOfObjectsWithIndex.name]).toBe('b');
        });

        test('prompt a few list questions with validation functions', async () => {
            prompts.inject(['a', 'a']);
            const answers = await promptYUIQuestions(Object.values(YUI_TEST_QUESTION), false);
            expect(answers[YUI_TEST_QUESTION.ListOfStringsWithValue.name]).toBe('a');
            expect(answers[YUI_TEST_QUESTION.ListOfObjectsWithIndex.name]).toBe('a');
        });

        test('prompt a list question with validation functions and wrong inputs at first', async () => {
            prompts.inject(['c', 'd', 'a']);
            const answers = await promptYUIQuestions([YUI_TEST_QUESTION.ListOfStringsWithValue], false);
            expect(answers[YUI_TEST_QUESTION.ListOfStringsWithValue.name]).toBe('a');
        });
    });
});
