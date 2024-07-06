import type { PromptQuestion } from '../../src';

export const questions: { [key: string]: PromptQuestion } = {
    input: {
        type: 'input',
        name: 'testInput',
        validate: jest.fn(),
        placeholder: undefined,
        required: undefined,
        default: undefined,
        groupId: 'group0'
    },
    staticList: {
        type: 'list',
        selectType: 'static',
        name: 'testStaticList',
        choices: [],
        message: 'testStaticListLabel',
        dependantPromptNames: [],
        placeholder: undefined,
        required: undefined,
        default: undefined,
        groupId: 'group0'
    },
    dynamicList: {
        type: 'list',
        selectType: 'dynamic',
        name: 'testDynamicList',
        choices: [],
        message: 'testDynamicListLabel',
        dependantPromptNames: [],
        placeholder: undefined,
        required: undefined,
        default: undefined,
        groupId: 'group1'
    },
    checkbox: {
        type: 'checkbox',
        name: 'testCheckbox',
        choices: [],
        message: 'testCheckboxLabel',
        placeholder: undefined,
        required: undefined,
        default: undefined,
        groupId: 'group1'
    }
};
