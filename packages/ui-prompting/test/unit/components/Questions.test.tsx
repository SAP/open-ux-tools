import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import { Questions } from '../../../src/components';
import { PromptsLayoutType, TRANSLATE_EVENT_UPDATE, TRANSLATE_EVENT_SHOW } from '../../../src/types';
import type { ListPromptQuestion, PromptQuestion } from '../../../src/types';
import type { QuestionsProps } from '../../../src';
import { questions } from '../../mock-data/questions';
import { getDependantQuestions } from '../../../src/utilities';
import { acceptI18nCallout, clickI18nButton, isI18nLoading, translationInputSelectors } from '../utils';
import { SapShortTextType } from '@sap-ux/i18n';

describe('Questions', () => {
    initIcons();

    const props: QuestionsProps = {
        questions: [],
        answers: {},
        choices: {},
        validation: {},
        onChoiceRequest: jest.fn(),
        onChange: jest.fn(),
        layoutType: undefined,
        groups: [],
        showDescriptions: undefined
    };

    const getValueByLabel = (label: string): string | undefined | null => {
        return screen.queryByLabelText(label)?.parentNode?.querySelector('input')?.getAttribute('value');
    };

    const getRootElementId = (): string | undefined => {
        const rootElement = document.querySelector('.prompt-entries-wrapper');
        return rootElement?.getAttribute('id') ?? undefined;
    };

    it('Render questions component - empty question array, SingleColumn layout', async () => {
        render(<Questions {...props} />);
        expect(document.getElementsByClassName('prompt-entries')).toBeDefined();
        expect(document.getElementsByClassName('prompt-entries-wrapper-single')[0]).toBeDefined();
    });

    it('Render questions component - 4 items question array, 2 groups, MultipleColumn layout with description', async () => {
        render(
            <Questions
                {...props}
                layoutType={PromptsLayoutType.MultiColumn}
                questions={Object.values(questions)}
                showDescriptions={true}
                groups={[
                    { title: 'group0', id: 'group0', description: ['description0'] },
                    { title: 'group1', id: 'group1', description: ['description1'] }
                ]}
            />
        );
        expect(document.getElementsByClassName('prompt-entry')).toHaveLength(4);
        expect(document.getElementsByClassName('prompts-group')).toHaveLength(2);
        expect(screen.getByText('description0')).toBeDefined();
        expect(document.getElementsByClassName('prompt-entries-wrapper-multi')[0]).toBeDefined();
    });

    it('Render questions component - onChoiceRequest', async () => {
        const onChoiceRequestFn = jest.fn();
        render(<Questions {...props} questions={[questions.dynamicList]} onChoiceRequest={onChoiceRequestFn} />);
        expect(onChoiceRequestFn).toHaveBeenCalled();
    });

    it('Render questions component - onChange', async () => {
        const onChangeFn = jest.fn();
        render(<Questions {...props} questions={[questions.input]} onChange={onChangeFn} />);
        const input = screen.getByRole('textbox');
        expect(input).toBeDefined();
        fireEvent.change(input, { target: { value: 'new value' } });
        expect(onChangeFn).toHaveBeenCalledWith({ 'testInput': 'new value' }, 'testInput', 'new value');
    });

    it(`Test question dependantPromptNames onChange, onChoiceRequest`, () => {
        const onChangeFn = jest.fn();
        const onChoiceRequestFn = jest.fn();
        const questionsInProps = [
            {
                ...questions.staticList,
                guiOptions: { ...questions.staticList.guiOptions, dependantPromptNames: ['dependantPrompt'] }
            } as ListPromptQuestion,
            { ...questions.dynamicList, name: 'dependantPrompt' }
        ];
        render(
            <Questions
                {...props}
                questions={questionsInProps}
                answers={{
                    testStaticList: 'testValue0'
                }}
                choices={{
                    'testStaticList': [
                        { name: 'testName0', value: 'testValue0' },
                        { name: 'testName1', value: 'testValue1' }
                    ]
                }}
                onChange={onChangeFn}
                onChoiceRequest={onChoiceRequestFn}
            />
        );
        const dependantPrompts = getDependantQuestions([questionsInProps[0]], 'testStaticList');
        expect(dependantPrompts).toEqual(['dependantPrompt']);
        const button = document.getElementsByClassName('ms-Button')[0];
        fireEvent.click(button);
        const options = screen.queryAllByRole('option');
        expect(options[0]).toBeDefined();
        fireEvent.click(options[1]);
        fireEvent.click(button);
        expect(screen.getByDisplayValue('testName1')).toBeDefined();
        expect(onChangeFn).toHaveBeenCalled();
        expect(onChangeFn).toHaveBeenCalledWith(
            { 'dependantPrompt': undefined, 'testStaticList': 'testValue1' },
            'testStaticList',
            'testValue1'
        );
        expect(onChoiceRequestFn).toHaveBeenCalled();
        expect(onChoiceRequestFn).toHaveBeenCalledWith(['dependantPrompt'], {
            'dependantPrompt': undefined,
            'testStaticList': 'testValue1'
        });
    });

    it('Render questions component - validation', async () => {
        const { rerender } = render(<Questions {...props} questions={Object.values(questions)} />);
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
        rerender(
            <Questions
                {...props}
                questions={Object.values(questions)}
                validation={{
                    testInput: { isValid: false, errorMessage: 'validation failure' },
                    testStaticList: { isValid: false, errorMessage: 'validation failure' },
                    testDynamicList: { isValid: false, errorMessage: 'validation failure' },
                    testCheckbox: { isValid: false, errorMessage: 'validation failure' }
                }}
            />
        );
        expect(screen.queryAllByRole('alert')).toHaveLength(4);
    });

    describe('Test component "id"', () => {
        it('Render without external id', async () => {
            const { rerender } = render(<Questions {...props} questions={Object.values(questions)} />);
            const firstRenderId = getRootElementId();
            expect(firstRenderId?.startsWith('ui-prompt')).toEqual(true);
            // Check if input elements for questions with id exists
            for (const key in questions) {
                expect(document.querySelector(`[id="${firstRenderId}--${questions[key].name}--input"]`)).not.toEqual(
                    null
                );
            }
            // Rerender should not generate new id
            rerender(<Questions {...props} questions={Object.values(questions)} />);
            const secondRenderId = getRootElementId();
            expect(firstRenderId).toEqual(secondRenderId);
        });

        it('Render with external id', async () => {
            render(<Questions {...props} questions={Object.values(questions)} id="my-prompt" />);
            const firstRenderId = getRootElementId();
            expect(firstRenderId).toEqual('my-prompt');
            // Check if input elements for questions with id exists
            for (const key in questions) {
                expect(document.querySelector(`[id="my-prompt--${questions[key].name}--input"]`)).not.toEqual(null);
            }
        });
    });

    describe('Handle answers', () => {
        const testQuestions: PromptQuestion[] = [
            {
                type: 'input',
                name: 'test1.key1'
            },
            {
                type: 'input',
                name: 'test1.key2'
            },
            {
                type: 'input',
                name: 'test2.key1'
            },
            {
                type: 'input',
                name: 'test2.key2'
            }
        ];
        it('Render questions component - answers and choices', async () => {
            render(
                <Questions
                    {...props}
                    questions={Object.values(questions)}
                    answers={{
                        testInput: 'testName0',
                        testStaticList: 'testValue0',
                        testDynamicList: 'testValue0',
                        testCheckbox: 'testValue0'
                    }}
                    choices={{
                        testStaticList: [{ name: 'testName0', value: 'testValue0' }],
                        testDynamicList: [{ name: 'testName0', value: 'testValue0' }],
                        testCheckbox: [{ name: 'testName0', value: 'testValue0' }]
                    }}
                />
            );
            expect(screen.queryAllByDisplayValue('testName0')).toHaveLength(4);
        });

        it('Render questions component - external answers only', async () => {
            const onChangeFn = jest.fn();
            const externalAnswers = {
                test1: {
                    key2: 'External value 1'
                },
                test2: {
                    key1: 'External value 2'
                }
            };
            const { rerender } = render(
                <Questions {...props} onChange={onChangeFn} questions={testQuestions} answers={externalAnswers} />
            );
            expect(onChangeFn).toBeCalledTimes(1);
            expect(onChangeFn).toBeCalledWith({
                'test1': {
                    'key2': 'External value 1'
                },
                'test2': {
                    'key1': 'External value 2'
                }
            });
            expect(getValueByLabel('test1.key1')).toEqual('');
            expect(getValueByLabel('test1.key2')).toEqual('External value 1');
            expect(getValueByLabel('test2.key1')).toEqual('External value 2');
            expect(getValueByLabel('test2.key2')).toEqual('');
            rerender(
                <Questions {...props} onChange={onChangeFn} questions={testQuestions} answers={externalAnswers} />
            );
            // Should not trigger change as value was not changed
            expect(onChangeFn).toBeCalledTimes(1);
        });

        it('Render questions component - merge external answers and questions with default answers', async () => {
            const questionsTemp: PromptQuestion[] = JSON.parse(JSON.stringify(testQuestions));
            questionsTemp[0].default = 'Default value';
            const onChangeFn = jest.fn();
            const externalAnswers = {
                test1: {
                    key2: 'External value 1'
                },
                test2: {
                    key1: 'External value 2'
                }
            };
            const { rerender } = render(
                <Questions {...props} onChange={onChangeFn} questions={questionsTemp} answers={externalAnswers} />
            );
            expect(onChangeFn).toBeCalledTimes(1);
            expect(onChangeFn).toBeCalledWith({
                'test1': {
                    'key1': 'Default value',
                    'key2': 'External value 1'
                },
                'test2': {
                    'key1': 'External value 2'
                }
            });
            expect(getValueByLabel('test1.key1')).toEqual('Default value');
            expect(getValueByLabel('test1.key2')).toEqual('External value 1');
            expect(getValueByLabel('test2.key1')).toEqual('External value 2');
            expect(getValueByLabel('test2.key2')).toEqual('');
            rerender(
                <Questions
                    {...props}
                    onChange={onChangeFn}
                    questions={questionsTemp}
                    answers={{ ...externalAnswers }}
                />
            );
            // Should not trigger change as value was not changed
            expect(onChangeFn).toBeCalledTimes(1);
        });
    });

    describe('Translation input', () => {
        const translationAnnotation = {
            type: SapShortTextType.GeneralText,
            annotation: 'Dummy text'
        };
        const question: PromptQuestion = {
            message: 'Translatable empty',
            name: 'testInput',
            type: 'input',
            default: 'dummy value',
            guiOptions: {
                translationProperties: translationAnnotation
            }
        };

        it('Trigger creation of i18n entry', async () => {
            const onTranslateEvent = jest.fn();
            render(
                <Questions
                    {...props}
                    id="my-prompt"
                    questions={[question]}
                    translationProps={{
                        bundle: {},
                        onEvent: onTranslateEvent
                    }}
                />
            );
            // Check that there no loader
            expect(isI18nLoading()).toEqual(false);
            // Act
            clickI18nButton();
            acceptI18nCallout('my-prompt--testInput--input');
            // Check result
            expect(onTranslateEvent).toBeCalledTimes(1);
            expect(onTranslateEvent).toBeCalledWith('testInput', {
                entry: { key: { value: 'dummyValue' }, value: { value: 'dummy value' } },
                name: TRANSLATE_EVENT_UPDATE,
                properties: translationAnnotation
            });
        });

        it('Trigger show existing i18n entry', async () => {
            const onTranslateEvent = jest.fn();
            render(
                <Questions
                    {...props}
                    id="my-prompt"
                    questions={[{ ...question, default: '{i18n>test}' }]}
                    translationProps={{
                        bundle: { test: [{ key: { value: 'test' }, value: { value: 'Test value' } }] },
                        onEvent: onTranslateEvent
                    }}
                />
            );
            // Act
            clickI18nButton(false);
            // Check result
            expect(onTranslateEvent).toBeCalledTimes(1);
            expect(onTranslateEvent).toBeCalledWith('testInput', {
                entry: { key: { value: 'test' }, value: { value: 'Test value' } },
                name: TRANSLATE_EVENT_SHOW
            });
        });

        it('Mark translation field busy', () => {
            render(
                <Questions
                    {...props}
                    id="my-prompt"
                    questions={[{ ...question, default: '{i18n>test}' }]}
                    translationProps={{
                        bundle: {},
                        onEvent: jest.fn(),
                        pendingQuestions: ['testInput']
                    }}
                />
            );
            // Check result
            expect(isI18nLoading()).toEqual(true);
        });

        it('Do not show translation input when no translation props passed', async () => {
            render(<Questions {...props} id="my-prompt" questions={[question]} translationProps={undefined} />);
            // Check that there no translation input rendered
            expect(document.querySelectorAll(translationInputSelectors.button).length).toEqual(0);
        });
    });
});
