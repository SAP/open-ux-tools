import type { YUIQuestion, ListQuestion } from '@sap-ux/inquirer-common';
import { convertQuestion } from '../../../src/common/prompts';

const YUI_TEST_QUESTION: Record<string, YUIQuestion | ListQuestion> = {
    ListOfStringsWithValue: {
        type: 'list',
        name: 'ListOfStrings',
        message: 'List of strings',
        choices: ['a', 'b', 'c'],
        default: 1,
        validate: (value: string) => value === 'a'
    } as ListQuestion,
    ListOfObjectsWithIndex: {
        type: 'list',
        name: 'ListOfObjects',
        message: 'List of strings',
        choices: [
            { name: 'first', value: 'a' },
            { name: 'second', value: 'b' }
        ],
        default: 'b',
        validate: (value: string) => value === 'a'
    } as ListQuestion
};
//(choice) => ({ title: choice.name, value: choice.value })
describe('common', () => {
    describe('convertQuestion', () => {
        test('convert a simple list question', async () => {
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
            expect((result.initial as Function)()).toBe(1);
        });
        test('convert a simple list question', async () => {
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
    });

    describe('promptYUIQuestions', () => {
        test.todo('TBD');
    });
});
