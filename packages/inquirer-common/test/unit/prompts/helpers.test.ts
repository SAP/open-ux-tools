import { Severity } from '@sap-devx/yeoman-ui-types';
import type { YUIQuestion } from '../../../src/types';
import { extendAdditionalMessages, withCondition } from '../../../src/prompts/helpers';

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
});
