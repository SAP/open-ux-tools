import type { IMessageSeverity } from '@sap-devx/yeoman-ui-types';
import { Severity } from '@sap-devx/yeoman-ui-types';
import type { Answers } from 'inquirer';
import type { CommonPromptOptions } from '../../../dist';
import {
    extendAdditionalMessages,
    extendValidate,
    extendWithOptions,
    withCondition
} from '../../../src/prompts/helpers';
import type { PromptDefaultValue, YUIQuestion } from '../../../src/types';

describe('helpers', () => {
    describe('extendAdditionalMessages', () => {
        it('should return the extended prompt message first', () => {
            const question = {
                name: 'test',
                additionalMessages: (value: unknown) => {
                    if (value === 'test') {
                        return 'test message';
                    }
                }
            } as YUIQuestion;

            const addMsgFunc = (value: unknown) => {
                if (value === 'test') {
                    return { message: 'extended test message', severity: Severity.error };
                }
            };
            const extendedFunc = extendAdditionalMessages(question, addMsgFunc);
            expect(extendedFunc('test')).toStrictEqual({ message: 'extended test message', severity: Severity.error });
        });

        it('should return the original prompt message if the extended message is not valid', () => {
            const question = {
                additionalMessages: (value: unknown) => {
                    if (value === 'test') {
                        return 'test message';
                    }
                }
            } as YUIQuestion;
            const addMsgFunc = (value: unknown) => {
                if (value === 'test') {
                    return undefined;
                }
            };
            const extendedFunc = extendAdditionalMessages(question, addMsgFunc);
            expect(extendedFunc('test')).toBe('test message');
        });

        it('should return the original prompt message if the extended message is not a function', () => {
            const question = {
                additionalMessages: {}
            } as YUIQuestion;

            const addMsgFunc = (value: unknown) => {
                if (value === 'test') {
                    return undefined;
                }
            };
            const extendedFunc = extendAdditionalMessages(question, addMsgFunc);
            expect(extendedFunc('test')).toBe(undefined);
        });
    });

    describe('extendValidate', () => {
        test('should return the extended validate function', () => {
            const question = {
                validate: (input: string) => (input === 'test' ? true : false)
            } as YUIQuestion;

            const validateFunc = (val: string) => (!val ? 'bad input' : true);
            const extendedFunc = extendValidate(question, validateFunc);
            expect(extendedFunc('')).toBe('bad input');
            expect(extendedFunc('test')).toBe(true);
            expect(extendedFunc('badtest')).toBe(false);
        });

        test('should ex', () => {
            const question = {
                validate: (input: string) => (input === 'test' ? true : false)
            } as YUIQuestion;

            const validateFunc = (val: string) => (!val ? 'bad input' : true);
            const extendedFunc = extendValidate(question, validateFunc);
            expect(extendedFunc('')).toBe('bad input');
            expect(extendedFunc('test')).toBe(true);
            expect(extendedFunc('badtest')).toBe(false);
        });
    });

    test('withCondition', () => {
        const questions = [
            {
                type: 'input',
                name: 'A',
                message: 'Message A'
            },
            {
                when: () => false,
                type: 'list',
                name: 'B',
                message: 'Message B'
            },
            {
                when: false,
                type: 'list',
                name: 'C',
                message: 'Message C'
            },
            {
                when: () => true,
                type: 'list',
                name: 'D',
                message: 'Message D'
            },
            {
                when: true,
                type: 'list',
                name: 'E',
                message: 'Message E'
            },
            {
                when: (answers: Record<string, string>) => answers.A === 'answerA',
                type: 'list',
                name: 'F',
                message: 'Message F'
            }
        ];

        const questionsWithTrueCondition = withCondition(questions, () => true);
        expect(questionsWithTrueCondition[0].name).toEqual('A');
        expect((questionsWithTrueCondition[0].when as Function)()).toEqual(true);
        expect(questionsWithTrueCondition[1].name).toEqual('B');
        expect((questionsWithTrueCondition[1].when as Function)()).toEqual(false);
        expect(questionsWithTrueCondition[2].name).toEqual('C');
        expect((questionsWithTrueCondition[2].when as Function)()).toEqual(false);
        expect(questionsWithTrueCondition[3].name).toEqual('D');
        expect((questionsWithTrueCondition[3].when as Function)()).toEqual(true);
        expect(questionsWithTrueCondition[4].name).toEqual('E');
        expect((questionsWithTrueCondition[4].when as Function)()).toEqual(true);
        expect(questionsWithTrueCondition[5].name).toEqual('F');
        expect((questionsWithTrueCondition[5].when as Function)({ A: 'answerA' })).toEqual(true);
        expect((questionsWithTrueCondition[5].when as Function)({ A: 'answerA1' })).toEqual(false);

        const questionsWithAnswersCondition = withCondition(
            questions,
            (answers: Record<string, string>) => answers.B === 'answerB'
        );
        expect(questionsWithAnswersCondition[0].name).toEqual('A');
        expect((questionsWithAnswersCondition[0].when as Function)({ B: 'answerB' })).toEqual(true);
        expect(questionsWithAnswersCondition[1].name).toEqual('B');
        expect((questionsWithAnswersCondition[1].when as Function)({ B: 'answerB' })).toEqual(false);
        expect(questionsWithAnswersCondition[2].name).toEqual('C');
        expect((questionsWithAnswersCondition[2].when as Function)({ B: 'answerB' })).toEqual(false);
        expect(questionsWithAnswersCondition[3].name).toEqual('D');
        expect((questionsWithAnswersCondition[3].when as Function)({ B: 'answerB' })).toEqual(true);
        expect(questionsWithAnswersCondition[4].name).toEqual('E');
        expect((questionsWithAnswersCondition[4].when as Function)({ B: 'answerB' })).toEqual(true);
        expect(questionsWithAnswersCondition[5].name).toEqual('F');
        expect((questionsWithAnswersCondition[5].when as Function)({ B: 'answerB' })).toEqual(false);
        expect((questionsWithAnswersCondition[5].when as Function)({ A: 'answerA', B: 'answerB' })).toEqual(true);

        const questionsWithFalseCondition = withCondition(questions, () => false);
        expect(questionsWithFalseCondition[0].name).toEqual('A');
        expect((questionsWithFalseCondition[0].when as Function)()).toEqual(false);
    });

    test('extendWithOptions, no options specified', () => {
        const promptNameA = 'promptA';
        const promptNameB = 'promptB';
        const questions = [
            {
                type: 'input',
                name: promptNameA,
                message: 'Message A',
                validate: (input: string) => !!input
            },
            {
                type: 'input',
                name: promptNameB,
                message: 'Message B',
                validate: (input: string) => !!input
            }
        ] as YUIQuestion[];

        // No options provided
        const extQuestions = extendWithOptions(questions, {});
        expect(extendWithOptions(questions, {})).toEqual(questions);
        const nameQuestionValidate = extQuestions.find((question) => question.name === promptNameA)
            ?.validate as Function;
        expect(nameQuestionValidate('')).toEqual(false);
        expect(nameQuestionValidate('a')).toEqual(true);

        const descriptionQuestionValidate = extQuestions.find((question) => question.name === promptNameB)
            ?.validate as Function;
        expect(descriptionQuestionValidate('')).toEqual(false);
        expect(descriptionQuestionValidate('a')).toEqual(true);
    });

    test('extendWithOptions, `validate` and `default` prompt options specified', () => {
        const promptNameA = 'promptA';
        const questionA = {
            type: 'input',
            name: promptNameA,
            message: 'Message',
            default: false
        };

        let promptOptions: Record<string, CommonPromptOptions & PromptDefaultValue<string | boolean>> = {
            [promptNameA]: {
                validate: (val) => (!val ? 'bad input' : true),
                default: () => 'some default val from func'
            }
        };

        let extQuestions = extendWithOptions([questionA], promptOptions);
        let nameQuestion = extQuestions.find((question) => question.name === promptNameA);
        let nameQuestionDefault = nameQuestion?.default as Function;
        // Default value should override original value
        expect(nameQuestionDefault()).toEqual('some default val from func');
        // No validate in original question, should apply extension
        let nameQuestionValidate = nameQuestion?.validate as Function;
        expect(nameQuestionValidate(undefined)).toEqual('bad input');
        expect(nameQuestionValidate('good')).toEqual(true);

        // Test that original validator is still applied
        const questionB = {
            type: 'input',
            name: promptNameA,
            message: 'Message',
            default: false,
            validate: (val: string) => (val === 'bad input B' ? `Input: "${val}" is invalid` : true)
        };

        promptOptions = {
            [promptNameA]: {
                validate: (val) => (!val ? 'bad input' : true)
            }
        };

        extQuestions = extendWithOptions([questionB], promptOptions);
        nameQuestion = extQuestions.find((question) => question.name === promptNameA);
        nameQuestionDefault = nameQuestion?.default;
        // Default value should override original value
        // Default value should use original value
        expect(nameQuestionDefault).toEqual(false);
        // Both original and extended validation is applied
        nameQuestionValidate = nameQuestion?.validate as Function;
        expect(nameQuestionValidate(undefined)).toEqual('bad input');
        expect(nameQuestionValidate('bad input B')).toEqual('Input: "bad input B" is invalid');
        expect(nameQuestionValidate('good')).toEqual(true);

        // Previous answers are provided to extended validator/default funcs
        const promptNameB = 'promptB';
        const questions = [
            {
                type: 'input',
                name: promptNameA,
                message: 'Message A'
            },
            {
                type: 'input',
                name: promptNameB,
                message: 'Message B',
                validate: (input: string) => !!input,
                default: 'description'
            }
        ] as YUIQuestion[];

        promptOptions = {
            [promptNameA]: {
                validate: (input: string, answers: Answers | undefined) =>
                    input === 'name1' && answers?.description === 'abcd'
            },
            [promptNameB]: {
                default: (answers: Answers | undefined) => (answers?.name === '1234' ? '1234 description' : 'none')
            }
        };

        // Options with validate funcs
        extQuestions = extendWithOptions(questions, promptOptions);
        nameQuestionValidate = extQuestions.find((question) => question.name === promptNameA)?.validate as Function;
        expect(nameQuestionValidate('name1', { description: 'abcd' })).toEqual(true);
        expect(nameQuestionValidate('name1', { description: 'efgh' })).toEqual(false);

        // Defaults should be replaced
        const descriptionQuestionDefault = extQuestions.find((question) => question.name === promptNameB)?.default;
        expect(descriptionQuestionDefault()).toEqual('none');
        expect(descriptionQuestionDefault({ name: '1234' })).toEqual('1234 description');
    });

    test('extendWithOptions: `additionaMessages` options specified', () => {
        const promptNameA = 'promptA';
        // Additional messages
        const confirmQuestion = {
            type: 'confirm',
            name: promptNameA,
            message: 'Message',
            default: false
        } as YUIQuestion;

        const addMessageWarn: IMessageSeverity = {
            message: 'You must enter something',
            severity: Severity.warning
        };

        const addMessageInfo: IMessageSeverity = { message: 'thanks!', severity: Severity.information };

        let promptOptions: Record<string, CommonPromptOptions> = {
            [promptNameA]: {
                additionalMessages: (val) => (!val ? addMessageWarn : addMessageInfo)
            }
        };

        let extQuestions = extendWithOptions([confirmQuestion], promptOptions);
        let additionalMessages = extQuestions.find((question) => question.name === promptNameA)
            ?.additionalMessages as Function;
        // Default value should use original value
        expect(additionalMessages()).toEqual(addMessageWarn);
        expect(additionalMessages(true)).toEqual(addMessageInfo);

        // Ensure override behaviour, use existing message if no message (undefined) returned
        const baseMsgWarn = {
            message: 'This is the base msg',
            severity: Severity.warning
        };
        const promptNameB = 'propmtNameB';
        const inputQuestion = {
            type: 'input',
            name: promptNameB,
            message: 'Message',
            default: false,
            additionalMessages: (): IMessageSeverity => baseMsgWarn
        } as YUIQuestion;
        const addMessageError = {
            message: 'The input value will result in an error',
            severity: Severity.warning
        };
        const previousAnswers: Answers = {
            a: 123,
            b: true,
            c: {
                name: 'name',
                value: 'somevalue'
            }
        };
        promptOptions = {
            [promptNameB]: {
                additionalMessages: (val, previousAnswers) => {
                    if (val == 'abc' && previousAnswers?.a === 123) {
                        return addMessageError;
                    }
                    if (val === 'abc') {
                        return addMessageInfo;
                    }
                }
            }
        };
        extQuestions = extendWithOptions([inputQuestion], promptOptions);
        additionalMessages = extQuestions.find((question) => question.name === promptNameB)
            ?.additionalMessages as Function;
        // Default value should use original value
        expect(additionalMessages()).toEqual(baseMsgWarn);
        // Previous answers tests
        expect(additionalMessages('abc', previousAnswers)).toEqual(addMessageError);
        expect(additionalMessages('def')).toEqual(baseMsgWarn);

        // Ensure only relevant prompt is updated
        const testNameAddMsg = { message: 'success', severity: Severity.information };
        promptOptions = {
            ['A']: {
                additionalMessages: (val) => (val === 'testName' ? testNameAddMsg : undefined)
            }
        };
        extQuestions = extendWithOptions([{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }], promptOptions);
        expect(extQuestions).toMatchInlineSnapshot(`
            [
              {
                "additionalMessages": [Function],
                "name": "A",
              },
              {
                "name": "B",
              },
              {
                "name": "C",
              },
              {
                "name": "D",
              },
            ]
        `);
        additionalMessages = extQuestions.find((question) => question.name === 'A')?.additionalMessages as Function;
        expect(additionalMessages('testName')).toEqual(testNameAddMsg);
    });
});
