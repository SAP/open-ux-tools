import { CheckboxPromptQuestion, InputPromptQuestion, ListPromptQuestion, PromptQuestion } from '../../src/types';
import { QuestionProps } from '../../src/components';

export const inputs = [
    {
        type: 'input',
        name: 'testInput',
        value: 'test value',
        onChange: jest.fn(),
        additionalInfo: 'test input label',
        placeholder: 'test_input_placeholder'
    } as InputPromptQuestion,
    {
        type: 'list',
        selectType: 'static',
        name: 'testList',
        onChange: jest.fn(),
        options: [{ key: 'test', text: 'test' }],
        additionalInfo: 'test list label 0',
        placeholder: 'test_list_placeholder_0'
    } as ListPromptQuestion,
    {
        type: 'list',
        name: 'testDynamicList',
        selectType: 'dynamic',
        onChange: jest.fn(),
        options: [{ key: 'test', text: 'test' }],
        additionalInfo: 'test list label 1',
        placeholder: 'test_list_placeholder_1'
    } as ListPromptQuestion,
    {
        type: 'list',
        name: 'filterBarId',
        selectType: 'dynamic',
        options: [],
        onChange: jest.fn(),
        additionalInfo: 'test list label 2',
        placeholder: 'Enter a new ID'
    } as ListPromptQuestion,
    {
        type: 'list',
        name: 'filterBarId',
        selectType: 'dynamic',
        options: [{ key: 'test', text: 'test' }],
        onChange: jest.fn(),
        additionalInfo: 'test list label 2',
        placeholder: 'test_list_placeholder_2'
    } as ListPromptQuestion,
    {
        type: 'checkbox',
        name: 'testCheckbox',
        options: [],
        onChange: jest.fn(),
        additionalInfo: 'test checkbox label',
        placeholder: 'test_checkbox_placeholder'
    } as CheckboxPromptQuestion
];

export const questions: QuestionProps[] = inputs.map((q) => ({
    answers: {},
    validation: {},
    onChange: (q as QuestionProps).onChange || jest.fn(),
    question: q,
    additionalInfo: (q as PromptQuestion).additionalInfo,
    placeholder: (q as PromptQuestion).placeholder,
    required: (q as PromptQuestion).required,
    pending: (q as QuestionProps).pending,
    dependantPromptNames: (q as ListPromptQuestion).dependantPromptNames
}));
