import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import { Question } from '../../../src/components';
import type { QuestionProps } from '../../../src/components';
import type { ListPromptQuestion } from '../../../src/types';
import { questions } from '../../mock-data/questions';

describe('Question', () => {
    initIcons();

    const props: QuestionProps = {
        question: { name: 'testQuestion' },
        answers: {},
        onChange: jest.fn(),
        choices: [],
        validation: {}
    };

    for (const question of Object.values(questions)) {
        it(`Render question - ${question.name} with message`, () => {
            const guiOptions = {
                ...question.guiOptions,
                placeholder: `${question.name} placeholder`
            };
            render(<Question {...props} question={{ ...question, guiOptions }} />);
            const label = question.message?.toString() ?? question.name;
            expect(screen.getByText(label)).toBeDefined();
            expect(screen.getByPlaceholderText(`${question.name} placeholder`)).toBeDefined();
        });

        it(`Render question default value - ${question.name} with message`, () => {
            render(
                <Question
                    {...props}
                    question={{ ...question }}
                    answers={{
                        [question.name]: 'testValue0'
                    }}
                    choices={[{ name: 'testName0', value: 'testValue0' }]}
                />
            );
            if (question.type === 'input') {
                expect(screen.getByDisplayValue('testValue0')).toBeDefined();
            } else {
                expect(screen.getByDisplayValue('testName0')).toBeDefined();
            }
        });

        it(`Render question default value - ${question.name} with choices as string array`, () => {
            render(
                <Question
                    {...props}
                    question={{ ...question }}
                    answers={{
                        [question.name]: 'Page'
                    }}
                    choices={['Page', 'Control', 'None']}
                />
            );
            expect(screen.getByDisplayValue('Page')).toBeDefined();
        });

        it(`Render question required - ${question.name} with message`, () => {
            render(<Question {...props} question={{ ...question, guiOptions: { mandatory: true } }} />);
            expect(document.getElementsByClassName('is-required')).toBeDefined();
        });

        it(`Test question answers - ${question.name} with choices as string array`, () => {
            render(
                <Question
                    {...props}
                    question={question}
                    answers={{
                        testInput: 'None',
                        testStaticList: 'None',
                        testDynamicList: 'None',
                        testCheckbox: 'None'
                    }}
                    choices={['Page', 'Control', 'None']}
                />
            );
            expect(screen.getByDisplayValue('None')).toBeDefined();
        });

        it(`Test question answers - ${question.name}`, () => {
            render(
                <Question
                    {...props}
                    question={question}
                    answers={{
                        testInput: 'testName0',
                        testStaticList: 'testValue0',
                        testDynamicList: 'testValue0',
                        testCheckbox: 'testValue0'
                    }}
                    choices={[
                        { name: 'testName0', value: 'testValue0' },
                        { name: 'testName1', value: 'testValue1' },
                        { name: 'testName2', value: 'testValue2' }
                    ]}
                />
            );
            expect(screen.getByDisplayValue('testName0')).toBeDefined();
        });

        it(`Test question validation error - ${question.name}`, () => {
            render(
                <Question
                    {...props}
                    question={question}
                    validation={{
                        [question.name!]: { isValid: false, errorMessage: `${question.name} value error` }
                    }}
                />
            );
            expect(screen.getByRole('alert')).toBeDefined();
        });
    }

    it(`Render question - unsupported type`, () => {
        render(<Question {...props} question={{ ...questions.input, type: undefined }} />);
        expect(screen.getByText('Unsupported')).toBeDefined();
    });

    describe('Test question choices', () => {
        const testCases = [
            {
                name: 'Dynamic choices applied',
                choices: [
                    { value: 'testValue0', name: 'testName0' },
                    { value: 'testValue1', name: 'testName1' }
                ],
                expected: ['testName0', 'testName1']
            },
            {
                name: 'Dynamic choices applied - empty',
                choices: [],
                expected: []
            },
            {
                name: 'Dynamic choices are not applied - use original',
                choices: undefined,
                expected: ['original1']
            }
        ];
        test.each(testCases)('Restricted properties. $name', async ({ choices, expected }) => {
            render(
                <Question
                    {...props}
                    question={
                        {
                            ...questions.dynamicList,
                            choices: [{ value: 'original1', name: 'original1' }]
                        } as ListPromptQuestion
                    }
                    choices={choices}
                />
            );
            const input = screen.getByRole('combobox');
            expect(input).toBeDefined();
            const button = document.getElementsByClassName('ms-Button')[0];
            fireEvent.click(button);
            expect(screen.queryAllByRole('option')).toHaveLength(expected.length);
            expect(screen.queryAllByRole('option').map((option) => option.textContent)).toEqual(expected);
        });
    });

    it(`Test question validate - ${questions.input.name}`, () => {
        const validateFn = jest.fn();
        render(<Question {...props} question={{ ...questions.input, validate: validateFn() }} />);
        const input = screen.getByRole('textbox');
        expect(input).toBeDefined();
        fireEvent.change(input, { target: { value: 'testValue' } });
        expect(validateFn).toHaveBeenCalled();
    });

    it(`Test question dependantPromptNames - ${questions.staticList.name}`, () => {
        const onChangeFn = jest.fn();
        render(
            <Question
                {...props}
                question={
                    {
                        ...questions.staticList,
                        guiOptions: { ...questions.staticList.guiOptions, dependantPromptNames: ['dependantPrompt'] }
                    } as ListPromptQuestion
                }
                answers={{
                    testStaticList: 'testValue0'
                }}
                onChange={onChangeFn}
                choices={[
                    { name: 'testName0', value: 'testValue0' },
                    { name: 'testName1', value: 'testValue1' }
                ]}
            />
        );
        expect(screen.getByDisplayValue('testName0')).toBeDefined();
        const button = document.getElementsByClassName('ms-Button')[0];
        fireEvent.click(button);
        const options = screen.queryAllByRole('option');
        expect(options[0]).toBeDefined();
        fireEvent.click(options[1]);
        expect(screen.getByDisplayValue('testName1')).toBeDefined();
        expect(onChangeFn).toHaveBeenCalled();
        expect(onChangeFn).toHaveBeenCalledWith('testStaticList', 'testValue1');
    });
});
